import { NextRequest, NextResponse } from "next/server";
import { generateImage, isOpenAIImageGenConfigured } from "@/lib/services/openaiImageGen";
import { z } from "zod";
import { buildFinalColoringPrompt, type ImageSize } from "@/lib/coloringPagePromptEnforcer";
import { validateGeneratedImage } from "@/lib/services/imageValidator";
import type { CharacterIdentityProfile } from "@/lib/characterIdentity";

/**
 * Route segment config
 */
export const maxDuration = 240;

const requestSchema = z.object({
  prompt: z.string().min(1),
  size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).default("1024x1536"),
  isStorybookMode: z.boolean().default(false),
  characterProfile: z.any().optional(),
  validateOutline: z.boolean().default(true),
  validateCharacter: z.boolean().default(true),
  validateComposition: z.boolean().default(true),
});

/**
 * POST /api/pages/:pageIndex/regenerate
 * 
 * Regenerates a single page with full validation pipeline.
 * Used for per-page regeneration in Review and Export steps.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pageIndex: string }> }
) {
  if (!isOpenAIImageGenConfigured()) {
    return NextResponse.json(
      { 
        ok: false,
        error: "OpenAI API key not configured",
        errorCode: "OPENAI_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  const { pageIndex: pageIndexStr } = await params;
  const pageIndex = parseInt(pageIndexStr);

  try {
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { 
          ok: false,
          error: "Invalid request", 
          errorCode: "VALIDATION_ERROR",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { 
      prompt, 
      size, 
      isStorybookMode,
      characterProfile,
      validateOutline,
      validateCharacter,
      validateComposition,
    } = parseResult.data;

    console.log(`[pages/${pageIndex}/regenerate] Starting regeneration`);

    const maxRetries = 3;
    let lastImage: string | null = null;
    let lastError: string | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Build final prompt with all constraints
        const finalPrompt = buildFinalColoringPrompt(prompt, {
          includeNegativeBlock: true,
          maxLength: 4500,
          size: size as ImageSize,
          isStorybookMode,
          extraBottomReinforcement: attempt > 1,
          extraCoverageReinforcement: attempt > 2,
        });

        console.log(`[pages/${pageIndex}/regenerate] Attempt ${attempt}/${maxRetries}`);

        // Generate image
        const result = await generateImage({
          prompt: finalPrompt,
          n: 1,
          size: size as ImageSize,
        });

        if (!result.images || result.images.length === 0) {
          lastError = "No image generated";
          continue;
        }

        const imageBase64 = result.images[0];
        lastImage = imageBase64;

        // Validate if requested
        if (validateOutline || (validateCharacter && characterProfile) || validateComposition) {
          const validationResult = await validateGeneratedImage(
            imageBase64,
            characterProfile as CharacterIdentityProfile | undefined,
            validateCharacter && !!characterProfile,
            validateComposition
          );

          if (validationResult.valid) {
            console.log(`[pages/${pageIndex}/regenerate] Success on attempt ${attempt}`);
            return NextResponse.json({
              ok: true,
              pageIndex,
              imageBase64,
              attempts: attempt,
              validation: {
                passed: true,
                outline: validationResult.outlineValidation,
                character: validationResult.characterValidation,
                bottomFill: validationResult.bottomFillValidation,
                coverage: validationResult.coverageValidation,
              },
            });
          }

          // Validation failed
          lastError = validationResult.retryReinforcement || "Validation failed";
          console.log(`[pages/${pageIndex}/regenerate] Validation failed: ${lastError}`);
        } else {
          // No validation - return immediately
          return NextResponse.json({
            ok: true,
            pageIndex,
            imageBase64,
            attempts: attempt,
          });
        }

      } catch (attemptError) {
        lastError = attemptError instanceof Error ? attemptError.message : "Generation error";
        console.error(`[pages/${pageIndex}/regenerate] Attempt ${attempt} error:`, lastError);
      }

      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // All attempts failed - return best image if we have one
    if (lastImage) {
      return NextResponse.json({
        ok: true,
        pageIndex,
        imageBase64: lastImage,
        attempts: maxRetries,
        warning: `Validation issues after ${maxRetries} attempts: ${lastError}`,
      });
    }

    return NextResponse.json({
      ok: false,
      error: `Failed after ${maxRetries} attempts: ${lastError}`,
      errorCode: "GENERATION_FAILED",
      pageIndex,
    }, { status: 422 });

  } catch (error) {
    console.error(`[pages/${pageIndex}/regenerate] Error:`, error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Regeneration failed",
        errorCode: "SERVER_ERROR",
        pageIndex,
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

