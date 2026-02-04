import { NextRequest, NextResponse } from "next/server";
import { generateImage, isOpenAIImageGenConfigured, type ImageSize as DalleImageSize } from "@/lib/services/openaiImageGen";
import {
  batchGenerateRequestSchema,
  type BatchGenerateResponse,
  type PageResult,
} from "@/lib/batchGenerationTypes";
import {
  buildFinalColoringPrompt,
  assertPromptHasConstraints,
  type ImageSize,
} from "@/lib/coloringPagePromptEnforcer";

// Map legacy sizes to DALL-E 3 compatible sizes
const SIZE_TO_DALLE: Record<string, DalleImageSize> = {
  "1024x1024": "1024x1024",
  "1024x1792": "1024x1792",
  "1792x1024": "1792x1024",
  "1024x1536": "1024x1792", // Legacy portrait -> DALL-E 3 portrait
  "1536x1024": "1792x1024", // Legacy landscape -> DALL-E 3 landscape
};

/**
 * Route segment config - extend timeout for image generation
 * Vercel Pro: max 300s, Hobby: max 60s
 */
export const maxDuration = 300; // 5 minutes max

/**
 * POST /api/batch/generate
 * 
 * Generates images for multiple pages with STRICT enforcement of:
 * 1. Outline-only (no filled black areas)
 * 2. No border/frame
 * 3. Fill the canvas (90-95%) - especially the bottom
 * 4. Foreground/bottom fill (no empty bottom space)
 * 
 * Each prompt is validated and reinforced with constraints.
 * Retry logic adds EXTRA reinforcement on failures.
 */

const DELAY_BETWEEN_GENERATIONS = 500; // ms - reduced for faster processing

export async function POST(request: NextRequest) {
  if (!isOpenAIImageGenConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parseResult = batchGenerateRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { pages, size, concurrency } = parseResult.data;

    console.log(`[batch/generate] Starting generation of ${pages.length} pages (size: ${size})`);

    const results: PageResult[] = [];
    let successCount = 0;
    let failCount = 0;

    // Process pages with limited concurrency
    for (let i = 0; i < pages.length; i += concurrency) {
      const batch = pages.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (pageItem) => {
        return await generateSinglePage(pageItem.page, pageItem.prompt, size);
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        results.push(result);
        if (result.status === "done") {
          successCount++;
        } else {
          failCount++;
        }
      }

      // Delay between batches
      if (i + concurrency < pages.length) {
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_GENERATIONS));
      }

      console.log(`[batch/generate] Progress: ${results.length}/${pages.length}`);
    }

    const response: BatchGenerateResponse = {
      results,
      successCount,
      failCount,
    };

    console.log(`[batch/generate] Completed: ${successCount} success, ${failCount} failed`);

    return NextResponse.json(response);

  } catch (error) {
    console.error("[batch/generate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Batch generation failed" },
      { status: 500 }
    );
  }
}

/**
 * Generate a single page with constraint enforcement and retry logic.
 * 
 * Optimized for faster processing:
 * - Single retry on failure
 * - Shorter retry prompts
 */
async function generateSinglePage(
  pageNumber: number,
  prompt: string,
  size: ImageSize
): Promise<PageResult> {
  const maxRetries = 1; // Reduced from 2 to 1 for faster processing
  let lastError: string | undefined;

  // Apply constraints with reasonable max length
  let finalPrompt = buildFinalColoringPrompt(prompt, {
    includeNegativeBlock: true,
    maxLength: 3500, // Slightly reduced to avoid token limits
    size,
    extraBottomReinforcement: false,
  });

  // Validate constraints are present
  try {
    assertPromptHasConstraints(finalPrompt, size);
  } catch {
    console.warn(`[batch/generate] Page ${pageNumber}: Constraint validation warning, continuing...`);
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      let attemptPrompt = finalPrompt;
      
      // Add brief reinforcement on retry only
      if (attempt > 0) {
        attemptPrompt += `

RETRY: OUTLINE-ONLY line art, NO fills, fill 90% of canvas, ground at bottom.`;
      }

      console.log(`[batch/generate] Page ${pageNumber}: Attempt ${attempt + 1}/${maxRetries + 1}`);

      // Map size to DALL-E 3 compatible size
      const dalleSize = SIZE_TO_DALLE[size] || "1024x1792";

      const result = await generateImage({
        prompt: attemptPrompt,
        n: 1,
        size: dalleSize,
      });

      if (result.images && result.images.length > 0) {
        console.log(`[batch/generate] Page ${pageNumber}: Success`);
        return {
          page: pageNumber,
          status: "done" as const,
          imageBase64: result.images[0],
          enhanceStatus: "none" as const,
          finalLetterStatus: "none" as const,
          activeVersion: "original" as const,
          pageType: "coloring" as const,
        };
      }

      lastError = "No image generated";
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Generation failed";
      console.error(`[batch/generate] Page ${pageNumber}: Attempt ${attempt + 1} failed:`, lastError);

      // Don't retry on content policy errors
      if (lastError.includes("content_policy")) {
        break;
      }
    }

    // Brief delay before retry
    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`[batch/generate] Page ${pageNumber}: Failed`);
  return {
    page: pageNumber,
    status: "failed" as const,
    error: lastError,
    enhanceStatus: "none" as const,
    finalLetterStatus: "none" as const,
    activeVersion: "original" as const,
    pageType: "coloring" as const,
  };
}
