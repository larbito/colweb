import { NextRequest, NextResponse } from "next/server";
import { generateImage, isOpenAIImageGenConfigured } from "@/lib/services/openaiImageGen";
import {
  batchGenerateRequestSchema,
  type BatchGenerateResponse,
  type PageResult,
} from "@/lib/batchGenerationTypes";
import {
  buildFinalColoringPrompt,
  hasRequiredConstraints,
  assertPromptHasConstraints,
  type ImageSize,
} from "@/lib/coloringPagePromptEnforcer";

/**
 * POST /api/batch/generate
 * 
 * Generates images for multiple pages with STRICT enforcement of:
 * 1. Outline-only (no filled black areas)
 * 2. No border/frame
 * 3. Fill the canvas (85-95%)
 * 
 * Each prompt is validated and reinforced with constraints.
 * Retry logic adds EXTRA reinforcement on failures.
 */

const DELAY_BETWEEN_GENERATIONS = 1500; // ms

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
 * Generate a single page with strong constraint enforcement and retry logic
 */
async function generateSinglePage(
  pageNumber: number,
  prompt: string,
  size: ImageSize
): Promise<PageResult> {
  const maxRetries = 2;
  let lastError: string | undefined;

  // ALWAYS apply constraints, even if prompt claims to have them
  // This ensures consistency across all generations
  let finalPrompt = buildFinalColoringPrompt(prompt, {
    includeNegativeBlock: true,
    maxLength: 4000,
    size,
  });

  // Validate constraints are present
  try {
    assertPromptHasConstraints(finalPrompt, size);
  } catch (error) {
    console.error(`[batch/generate] Page ${pageNumber}: Constraint validation failed, rebuilding prompt`);
    finalPrompt = buildFinalColoringPrompt(prompt, {
      includeNegativeBlock: true,
      maxLength: 4000,
      size,
    });
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      let attemptPrompt = finalPrompt;
      
      // Add EXTRA reinforcement on retries
      if (attempt > 0) {
        attemptPrompt += `

=== RETRY ${attempt} - EXTRA STRICT RULES ===
PREVIOUS GENERATION HAD ISSUES. Follow these rules EXACTLY:

1. ABSOLUTELY NO solid black fills - not even tiny areas
2. ONLY thin black OUTLINES on white
3. ALL interior regions must be WHITE (for coloring)
4. If character has dark patches (panda), draw them as OUTLINE SHAPES ONLY
5. NO shading, NO gradients, NO textures
6. Subject must FILL 85-95% of the canvas
7. NO border, NO frame lines

SIMPLIFY the design if needed to ensure pure outlines.`;

        // Extra framing reinforcement for landscape
        if (size === "1536x1024") {
          attemptPrompt += `
8. LANDSCAPE: Zoom in so artwork fills the FULL WIDTH
9. NO large white bands at top or bottom
10. Wide composition that uses all horizontal space`;
        }
      }

      console.log(`[batch/generate] Page ${pageNumber}: Attempt ${attempt + 1}/${maxRetries + 1}`);

      const result = await generateImage({
        prompt: attemptPrompt,
        n: 1,
        size,
      });

      if (result.images && result.images.length > 0) {
        console.log(`[batch/generate] Page ${pageNumber}: Success on attempt ${attempt + 1}`);
        return {
          page: pageNumber,
          status: "done",
          imageBase64: result.images[0],
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

    // Delay before retry
    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`[batch/generate] Page ${pageNumber}: Failed after all attempts`);
  return {
    page: pageNumber,
    status: "failed",
    error: lastError,
  };
}
