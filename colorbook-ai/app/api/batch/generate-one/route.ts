import { NextRequest, NextResponse } from "next/server";
import { generateImage, isOpenAIImageGenConfigured } from "@/lib/services/openaiImageGen";
import { z } from "zod";
import {
  buildFinalColoringPrompt,
  getRetryReinforcement,
  type ImageSize,
} from "@/lib/coloringPagePromptEnforcer";
import {
  type CharacterIdentityProfile,
  buildCharacterIdentityContract,
  buildOutlineOnlyContract,
  buildCharacterRetryReinforcement,
} from "@/lib/characterIdentity";
import { validateGeneratedImage, type ComplexityLevel } from "@/lib/services/imageValidator";

/**
 * Route segment config - single image generation with validation retries
 */
export const maxDuration = 240; // 4 minutes for generation + validation + retries

// Character profile schema for storybook mode
const characterProfileSchema = z.object({
  characterId: z.string(),
  species: z.string(),
  faceShape: z.string(),
  eyeStyle: z.string(),
  noseStyle: z.string(),
  mouthStyle: z.string(),
  earStyle: z.string(),
  hornStyle: z.string().optional(),
  hairTuft: z.string().optional(),
  proportions: z.string(),
  bodyShape: z.string(),
  tailStyle: z.string().optional(),
  wingStyle: z.string().optional(),
  markings: z.string(),
  defaultOutfit: z.string().optional(),
  doNotChange: z.array(z.string()),
  name: z.string().optional(),
}).optional();

const requestSchema = z.object({
  page: z.number().int().min(1),
  prompt: z.string().min(1),
  size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).default("1024x1536"),
  maxRetries: z.number().int().min(0).max(3).default(2), // QA retries
  // Storybook mode parameters
  isStorybookMode: z.boolean().default(false),
  characterProfile: characterProfileSchema,
  // Validation options
  validateOutline: z.boolean().default(true),
  validateCharacter: z.boolean().default(true),
  validateComposition: z.boolean().default(true), // check for empty bottom/coverage
  // Complexity level affects validation thresholds and prompt
  complexity: z.enum(["kids", "simple", "medium", "detailed", "ultra"]).default("medium"),
});

/**
 * POST /api/batch/generate-one
 * 
 * Generates a SINGLE image for one page with FULL VALIDATION pipeline.
 * 
 * VALIDATION PIPELINE (storybook mode):
 * 1. Generate image with character identity contract + outline contract
 * 2. Validate using vision model:
 *    - Character identity (species, face, proportions)
 *    - Outline compliance (no black fills, no grayscale)
 * 3. If validation fails, retry with specific reinforcement
 * 4. Up to 3 attempts total
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

    const { 
      page, 
      prompt, 
      size, 
      maxRetries,
      isStorybookMode,
      characterProfile,
      validateOutline,
      validateCharacter,
      validateComposition,
      complexity,
    } = parseResult.data;
    
    const totalAttempts = maxRetries + 1;
    const shouldValidateCharacter = isStorybookMode && validateCharacter && characterProfile;
    const shouldValidateComposition = validateComposition;

    console.log(`[generate-one] Page ${page}: Starting (storybook: ${isStorybookMode}, complexity: ${complexity}, validateChar: ${shouldValidateCharacter}, validateComp: ${shouldValidateComposition})`);

    // Build base prompt with contracts
    let basePrompt = prompt;
    
    // Add character identity contract for storybook mode
    if (isStorybookMode && characterProfile) {
      const identityContract = buildCharacterIdentityContract(characterProfile as CharacterIdentityProfile);
      basePrompt = `${prompt}\n${identityContract}`;
    }
    
    // Add outline-only contract (always)
    const outlineContract = buildOutlineOnlyContract();
    basePrompt = `${basePrompt}\n${outlineContract}`;

    let lastValidationResult: Awaited<ReturnType<typeof validateGeneratedImage>> | null = null;
    let lastImage: string | null = null;

    // Try up to totalAttempts times with validation-based retries
    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      try {
        // Build prompt with appropriate reinforcement level
        let currentPrompt = basePrompt;
        
        if (attempt > 1) {
          // Add generic retry reinforcement
          const genericReinforcement = getRetryReinforcement(attempt - 1);
          currentPrompt = `${currentPrompt}\n\n${genericReinforcement}`;
          
          // Add validation-specific reinforcement if we have validation results
          if (lastValidationResult?.retryReinforcement) {
            currentPrompt = `${currentPrompt}\n${lastValidationResult.retryReinforcement}`;
            console.log(`[generate-one] Page ${page}: Adding validation-specific reinforcement`);
          }
          
          // Add character-specific reinforcement for storybook mode
          if (isStorybookMode && characterProfile && lastValidationResult?.characterValidation && !lastValidationResult.characterValidation.valid) {
            const charReinforcement = buildCharacterRetryReinforcement(characterProfile as CharacterIdentityProfile);
            currentPrompt = `${currentPrompt}\n${charReinforcement}`;
            console.log(`[generate-one] Page ${page}: Adding character identity reinforcement`);
          }
        }

        // Apply all constraints via buildFinalColoringPrompt
        const finalPrompt = buildFinalColoringPrompt(currentPrompt, {
          includeNegativeBlock: true,
          maxLength: 4500, // Increased to accommodate contracts
          size: size as ImageSize,
          isStorybookMode,
          extraBottomReinforcement: attempt > 1,
        });

        console.log(`[generate-one] Page ${page}: Attempt ${attempt}/${totalAttempts} (prompt: ${finalPrompt.length} chars)`);

        // Generate image
        const result = await generateImage({
          prompt: finalPrompt,
          n: 1,
          size: size as ImageSize,
        });

        if (!result.images || result.images.length === 0) {
          console.log(`[generate-one] Page ${page}: No image generated on attempt ${attempt}`);
          continue;
        }

        const imageBase64 = result.images[0];
        lastImage = imageBase64;
        console.log(`[generate-one] Page ${page}: Image generated, starting validation`);

        // VALIDATION STEP
        if (validateOutline || shouldValidateCharacter || shouldValidateComposition) {
          const validationResult = await validateGeneratedImage(
            imageBase64,
            shouldValidateCharacter ? characterProfile as CharacterIdentityProfile : undefined,
            !!shouldValidateCharacter,
            shouldValidateComposition, // Pass composition validation flag
            complexity as ComplexityLevel // Pass complexity level for thresholds
          );
          
          lastValidationResult = validationResult;

          // Log validation results
          if (validationResult.outlineValidation) {
            console.log(`[generate-one] Page ${page}: Outline validation - valid: ${validationResult.outlineValidation.valid}, fills: ${validationResult.outlineValidation.hasBlackFills}, gray: ${validationResult.outlineValidation.hasGrayscale}`);
          }
          if (validationResult.characterValidation) {
            console.log(`[generate-one] Page ${page}: Character validation - valid: ${validationResult.characterValidation.valid}, species: ${validationResult.characterValidation.detectedSpecies}, matches: ${validationResult.characterValidation.matchesSpecies}`);
          }
          if (validationResult.coverageValidation) {
            console.log(`[generate-one] Page ${page}: Coverage validation - valid: ${validationResult.coverageValidation.valid}, height: ${validationResult.coverageValidation.bboxHeightRatio}%, bottomInk: ${validationResult.coverageValidation.bottomInkRatio}%`);
          }
          if (validationResult.bottomFillValidation) {
            console.log(`[generate-one] Page ${page}: Bottom fill - valid: ${validationResult.bottomFillValidation.valid}, empty: ${validationResult.bottomFillValidation.hasEmptyBottom}, coverage: ${validationResult.bottomFillValidation.bottomCoveragePercent}%`);
          }

          // If validation passed, return success
          if (validationResult.valid) {
            console.log(`[generate-one] Page ${page}: Validation PASSED on attempt ${attempt}`);
            return NextResponse.json({
              page,
              status: "done",
              imageBase64,
              attempts: attempt,
              validation: {
                passed: true,
                character: validationResult.characterValidation,
                outline: validationResult.outlineValidation,
                coverage: validationResult.coverageValidation,
                bottomFill: validationResult.bottomFillValidation,
              },
            });
          }

          // Validation failed - log details
          console.log(`[generate-one] Page ${page}: Validation FAILED on attempt ${attempt}`);
          
          if (validationResult.characterValidation && !validationResult.characterValidation.valid) {
            console.log(`[generate-one] Page ${page}: Character issue - detected ${validationResult.characterValidation.detectedSpecies}, expected ${characterProfile?.species}`);
          }
          if (validationResult.outlineValidation && !validationResult.outlineValidation.valid) {
            console.log(`[generate-one] Page ${page}: Outline issue - fills: ${validationResult.outlineValidation.fillLocations.join(", ")}`);
          }

          // If this is the last attempt, return FAILED (not done with warning)
          // User wants ONLY passing images in the grid
          if (attempt === totalAttempts) {
            console.log(`[generate-one] Page ${page}: Max retries reached, VALIDATION FAILED - returning failed status`);
            
            // Build a descriptive error message
            const issues: string[] = [];
            if (validationResult.characterValidation && !validationResult.characterValidation.valid) {
              issues.push(`character mismatch (expected ${characterProfile?.species}, got ${validationResult.characterValidation.detectedSpecies})`);
            }
            if (validationResult.outlineValidation && !validationResult.outlineValidation.valid) {
              issues.push(`outline issues (black fills at: ${validationResult.outlineValidation.fillLocations?.slice(0, 2).join(", ") || "unknown"})`);
            }
            if (validationResult.coverageValidation && !validationResult.coverageValidation.valid) {
              issues.push(`coverage too low (${validationResult.coverageValidation.bboxHeightRatio}%)`);
            }
            if (validationResult.bottomFillValidation && !validationResult.bottomFillValidation.valid) {
              issues.push(`empty bottom (${validationResult.bottomFillValidation.bottomCoveragePercent}%)`);
            }
            
            return NextResponse.json({
              page,
              status: "failed", // FAILED - not done with warning
              error: `Quality validation failed after ${attempt} attempts: ${issues.join("; ") || "unknown issues"}`,
              errorCode: "VALIDATION_FAILED",
              attempts: attempt,
              validation: {
                passed: false,
                character: validationResult.characterValidation,
                outline: validationResult.outlineValidation,
                coverage: validationResult.coverageValidation,
                bottomFill: validationResult.bottomFillValidation,
              },
              // Store the best candidate image for debugging (not shown in grid)
              bestCandidateBase64: imageBase64,
            });
          }

          // Continue to next attempt with reinforcement
          console.log(`[generate-one] Page ${page}: Will retry with reinforcement`);
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
          
        } else {
          // No validation requested - return immediately
          console.log(`[generate-one] Page ${page}: Success (no validation) on attempt ${attempt}`);
          return NextResponse.json({
            page,
            status: "done",
            imageBase64,
            attempts: attempt,
          });
        }

      } catch (attemptError) {
        const errorMsg = attemptError instanceof Error ? attemptError.message : "Generation error";
        console.error(`[generate-one] Page ${page}: Attempt ${attempt} failed: ${errorMsg}`);
        
        if (attempt < totalAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        throw attemptError;
      }
    }

    // All attempts exhausted without validation pass
    console.log(`[generate-one] Page ${page}: All ${totalAttempts} attempts exhausted without validation pass`);
    
    // Build error message from last validation
    let errorMessage = "No image generated after all attempts";
    if (lastValidationResult) {
      const issues: string[] = [];
      if (lastValidationResult.characterValidation && !lastValidationResult.characterValidation.valid) {
        issues.push("character mismatch");
      }
      if (lastValidationResult.outlineValidation && !lastValidationResult.outlineValidation.valid) {
        issues.push("outline/fill issues");
      }
      if (lastValidationResult.coverageValidation && !lastValidationResult.coverageValidation.valid) {
        issues.push("coverage too low");
      }
      if (lastValidationResult.bottomFillValidation && !lastValidationResult.bottomFillValidation.valid) {
        issues.push("empty bottom");
      }
      if (issues.length > 0) {
        errorMessage = `Quality validation failed: ${issues.join(", ")}`;
      }
    }

    return NextResponse.json({
      page,
      status: "failed",
      error: errorMessage,
      errorCode: lastImage ? "VALIDATION_FAILED" : "GENERATION_FAILED",
      attempts: totalAttempts,
      validation: lastValidationResult ? {
        passed: false,
        character: lastValidationResult.characterValidation,
        outline: lastValidationResult.outlineValidation,
        coverage: lastValidationResult.coverageValidation,
        bottomFill: lastValidationResult.bottomFillValidation,
      } : undefined,
      // Store best candidate for debugging (not shown in grid)
      bestCandidateBase64: lastImage || undefined,
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
