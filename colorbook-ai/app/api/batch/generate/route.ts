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
  type ImageSize,
} from "@/lib/coloringPagePromptEnforcer";

/**
 * POST /api/batch/generate
 * 
 * Generates images for multiple pages in sequence or with limited concurrency.
 * Each page prompt is processed through the no-fill constraint enforcer.
 * 
 * Input: { pages: [{page, prompt}], size?, concurrency? }
 * Output: { results: [{page, status, imageBase64?, error?}], successCount, failCount }
 */

// Rate limiting: delay between generations to avoid API throttling
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

    console.log(`[batch/generate] Starting generation of ${pages.length} pages with concurrency ${concurrency}`);

    const results: PageResult[] = [];
    let successCount = 0;
    let failCount = 0;

    // Process pages with limited concurrency
    for (let i = 0; i < pages.length; i += concurrency) {
      const batch = pages.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (pageItem) => {
        const result = await generateSinglePage(pageItem.page, pageItem.prompt, size);
        return result;
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

      // Add delay between batches to avoid rate limiting
      if (i + concurrency < pages.length) {
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_GENERATIONS));
      }

      console.log(`[batch/generate] Progress: ${results.length}/${pages.length} pages processed`);
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
 * Generate a single page image with retry logic
 */
async function generateSinglePage(
  pageNumber: number,
  prompt: string,
  size: ImageSize
): Promise<PageResult> {
  const maxRetries = 2;
  let lastError: string | undefined;

  // Ensure prompt has required constraints (including landscape framing if applicable)
  let finalPrompt = prompt;
  if (!hasRequiredConstraints(prompt, size)) {
    console.log(`[batch/generate] Page ${pageNumber}: Adding missing constraints (size: ${size})`);
    finalPrompt = buildFinalColoringPrompt(prompt, {
      includeNegativeBlock: true,
      maxLength: 4000,
      size,
    });
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add stricter constraints on retry
      let attemptPrompt = finalPrompt;
      if (attempt > 0) {
        attemptPrompt += `\n\nRETRY ${attempt}: Previous generation had issues. Be EXTRA careful:
- ABSOLUTELY NO solid black fills
- ONLY thin black outlines
- All interiors must be WHITE
- Simplify the design if needed`;
        
        // For landscape, reinforce framing on retry
        if (size === "1536x1024") {
          attemptPrompt += `\n- FILL THE CANVAS - zoom in so artwork fills 90-95% of the frame
- NO large white bands at top or bottom`;
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

