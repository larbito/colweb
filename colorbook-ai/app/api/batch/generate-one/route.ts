import { NextRequest, NextResponse } from "next/server";
import { generateImage, isOpenAIImageGenConfigured } from "@/lib/services/openaiImageGen";
import { z } from "zod";
import {
  buildFinalColoringPrompt,
  getRetryReinforcement,
  type ImageSize,
} from "@/lib/coloringPagePromptEnforcer";

/**
 * Route segment config - single image generation with retries
 */
export const maxDuration = 180; // 3 minutes for up to 2 retries

const requestSchema = z.object({
  page: z.number().int().min(1),
  prompt: z.string().min(1),
  size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).default("1024x1536"),
  maxRetries: z.number().int().min(0).max(2).default(2), // QA retries
});

/**
 * POST /api/batch/generate-one
 * 
 * Generates a SINGLE image for one page with QA retry logic.
 * If the generation might have issues, auto-retries with stronger constraints.
 * 
 * QA RETRY LOGIC:
 * - Attempt 1: Standard generation with all constraints
 * - Attempt 2: Add outline reinforcement #1
 * - Attempt 3: Add outline reinforcement #2 (strongest)
 */
export async function POST(request: NextRequest) {
  if (!isOpenAIImageGenConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { page, prompt, size, maxRetries } = parseResult.data;
    const totalAttempts = maxRetries + 1;

    console.log(`[generate-one] Page ${page}: Starting generation (max ${totalAttempts} attempts)`);

    // Try up to totalAttempts times with escalating reinforcement
    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      try {
        // Build prompt with appropriate reinforcement level
        let reinforcement = "";
        if (attempt > 1) {
          reinforcement = getRetryReinforcement(attempt - 1);
          console.log(`[generate-one] Page ${page}: Retry ${attempt - 1} with reinforcement`);
        }

        const promptWithReinforcement = attempt === 1 
          ? prompt 
          : `${prompt}\n\n${reinforcement}`;

        // Apply all constraints
        const finalPrompt = buildFinalColoringPrompt(promptWithReinforcement, {
          includeNegativeBlock: true,
          maxLength: 4000,
          size: size as ImageSize,
          extraBottomReinforcement: attempt > 1, // Add extra bottom fill on retries
        });

        console.log(`[generate-one] Page ${page}: Attempt ${attempt}/${totalAttempts} (prompt: ${finalPrompt.length} chars)`);

        // Generate single image
        const result = await generateImage({
          prompt: finalPrompt,
          n: 1,
          size: size as ImageSize,
        });

        if (result.images && result.images.length > 0) {
          console.log(`[generate-one] Page ${page}: Success on attempt ${attempt}`);
          return NextResponse.json({
            page,
            status: "done",
            imageBase64: result.images[0],
            attempts: attempt,
          });
        }

        console.log(`[generate-one] Page ${page}: No image on attempt ${attempt}`);
        
      } catch (attemptError) {
        const errorMsg = attemptError instanceof Error ? attemptError.message : "Generation error";
        console.error(`[generate-one] Page ${page}: Attempt ${attempt} failed: ${errorMsg}`);
        
        // If not the last attempt, continue to retry
        if (attempt < totalAttempts) {
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        // Last attempt failed
        throw attemptError;
      }
    }

    // All attempts exhausted without success
    console.log(`[generate-one] Page ${page}: All ${totalAttempts} attempts failed`);
    return NextResponse.json({
      page,
      status: "failed",
      error: "No image generated after all attempts",
      attempts: totalAttempts,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Generation failed";
    console.error("[generate-one] Error:", errorMsg);
    return NextResponse.json({
      page: 0,
      status: "failed",
      error: errorMsg,
    });
  }
}
