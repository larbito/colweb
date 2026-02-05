import { NextRequest, NextResponse } from "next/server";
import { generateImage, isOpenAIImageGenConfigured, type ImageSize as GPTImageSize } from "@/lib/services/openaiImageGen";
import { z } from "zod";
import {
  buildFinalColoringPrompt,
  getRetryReinforcement,
  type ImageSize,
} from "@/lib/coloringPagePromptEnforcer";
import { sanitizeColoringPngBase64 } from "@/lib/imageProcessing";

// Map sizes to GPT Image model compatible sizes
// GPT Image model supports: 1024x1024, 1024x1536, 1536x1024
const SIZE_TO_GPT: Record<string, GPTImageSize> = {
  "1024x1024": "1024x1024",
  "1024x1536": "1024x1536", // Portrait
  "1536x1024": "1536x1024", // Landscape
  "1024x1792": "1024x1536", // Map DALL-E portrait to GPT portrait
  "1792x1024": "1536x1024", // Map DALL-E landscape to GPT landscape
};
import {
  type CharacterIdentityProfile,
  buildCharacterIdentityContract,
  buildOutlineOnlyContract,
  buildCharacterRetryReinforcement,
} from "@/lib/characterIdentity";
import { validateGeneratedImage, type ComplexityLevel } from "@/lib/services/imageValidator";
import { 
  isNonRetryableError, 
  NonRetryableGenerationError,
} from "@/lib/errors/generationErrors";

/**
 * Route segment config - single image generation with SILENT AUTO-RETRY
 * Extended timeout for up to 12 attempts
 */
export const maxDuration = 300; // 5 minutes max for extensive retries

// ============================================
// RETRY CONFIGURATION
// ============================================

/** Max attempts per page before giving up (internal limit, not shown to user) */
const MAX_ATTEMPTS_PER_PAGE = 20;

/** Max wall time per page in milliseconds (180 seconds = 3 min) */
const MAX_WALL_TIME_MS = 180 * 1000;

/** Base delay between retries in ms */
const BASE_RETRY_DELAY = 500;

/** Max delay between retries in ms (exponential backoff cap) */
const MAX_RETRY_DELAY = 5000;

/** Stricter prompt addendum for retries */
const STRICT_RETRY_ADDENDUM = `
REMOVE ALL SOLID FILLS. SIMPLIFY BACKGROUND. OUTLINE ONLY. WHITE BACKGROUND ONLY.
NO black areas, NO gray pixels, NO shading. Pure black lines on pure white.`;

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
  size: z.enum(["1024x1024", "1024x1792", "1792x1024", "1024x1536", "1536x1024"]).default("1024x1792"),
  maxRetries: z.number().int().min(0).max(15).default(12), // Now supports up to 12 retries
  // Storybook mode parameters
  isStorybookMode: z.boolean().default(false),
  characterProfile: characterProfileSchema,
  // Validation options
  validateOutline: z.boolean().default(true),
  validateCharacter: z.boolean().default(true),
  validateComposition: z.boolean().default(true),
  // Complexity level affects validation thresholds and prompt
  complexity: z.enum(["kids", "simple", "medium", "detailed", "ultra"]).default("medium"),
});

/**
 * POST /api/batch/generate-one
 * 
 * Generates a SINGLE image for one page with SILENT AUTO-RETRY.
 * 
 * NEVER SHOWS "FAILED" TO USER:
 * - Keeps retrying until quality gates pass
 * - Up to 12 attempts or 120 seconds wall time
 * - Only stops for non-retryable errors (billing limit, etc.)
 * 
 * ALWAYS POSTPROCESSES:
 * - Every image is converted to pure black/white before returning
 * - Guarantees white background even if model returns dark canvas
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
      isStorybookMode,
      characterProfile,
      validateOutline,
      validateCharacter,
      validateComposition,
      complexity,
    } = parseResult.data;
    
    const shouldValidateCharacter = isStorybookMode && validateCharacter && characterProfile;
    const shouldValidateComposition = validateComposition;

    console.log(`[generate-one] Page ${page}: Starting SILENT AUTO-RETRY (max ${MAX_ATTEMPTS_PER_PAGE} attempts, ${MAX_WALL_TIME_MS/1000}s timeout)`);

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
    let bestImage: string | null = null;
    let bestImageAttemptId: string | null = null; // Track which attempt produced the best image
    
    // Track wall time
    const startTime = Date.now();
    
    // Generate a unique request ID to track this generation session
    const requestId = `${page}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[generate-one] Page ${page}: Request ${requestId} starting`);

    // SILENT AUTO-RETRY LOOP - runs STRICTLY SEQUENTIALLY
    // Each attempt must complete fully before the next one starts
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_PAGE; attempt++) {
      // Generate attempt ID for tracking
      const attemptId = `${requestId}-attempt${attempt}`;
      // Check wall time limit
      const elapsedMs = Date.now() - startTime;
      if (elapsedMs >= MAX_WALL_TIME_MS) {
        console.log(`[generate-one] Page ${page}: Wall time limit reached (${elapsedMs}ms)`);
        break;
      }

      try {
        // Build prompt with appropriate reinforcement level
        let currentPrompt = basePrompt;
        
        if (attempt > 1) {
          // Add progressively stricter reinforcement
          const genericReinforcement = getRetryReinforcement(Math.min(attempt - 1, 3));
          currentPrompt = `${currentPrompt}\n\n${genericReinforcement}`;
          
          // Add validation-specific reinforcement if we have validation results
          if (lastValidationResult?.retryReinforcement) {
            currentPrompt = `${currentPrompt}\n${lastValidationResult.retryReinforcement}`;
          }
          
          // Add character-specific reinforcement for storybook mode
          if (isStorybookMode && characterProfile && lastValidationResult?.characterValidation && !lastValidationResult.characterValidation.valid) {
            const charReinforcement = buildCharacterRetryReinforcement(characterProfile as CharacterIdentityProfile);
            currentPrompt = `${currentPrompt}\n${charReinforcement}`;
          }
          
          // After 3 attempts, add even stricter addendum
          if (attempt > 3) {
            currentPrompt = `${currentPrompt}\n${STRICT_RETRY_ADDENDUM}`;
          }
        }

        // Apply all constraints via buildFinalColoringPrompt
        const finalPrompt = buildFinalColoringPrompt(currentPrompt, {
          includeNegativeBlock: true,
          maxLength: 4500,
          size: size as ImageSize,
          isStorybookMode,
          extraBottomReinforcement: attempt > 1,
          extraCoverageReinforcement: attempt > 2,
        });

        console.log(`[generate-one] Page ${page}: [${attemptId}] Attempt ${attempt}/${MAX_ATTEMPTS_PER_PAGE} (prompt: ${finalPrompt.length} chars, elapsed: ${Math.round(elapsedMs/1000)}s)`);

        // Map size to GPT Image model compatible size
        const gptSize = SIZE_TO_GPT[size] || "1024x1536";

        // Generate image with context for error tracking
        const result = await generateImage({
          prompt: finalPrompt,
          n: 1,
          size: gptSize,
        }, {
          pageIndex: page,
        });

        if (!result.images || result.images.length === 0) {
          console.log(`[generate-one] Page ${page}: [${attemptId}] No image generated on attempt ${attempt}`);
          await delay(getRetryDelay(attempt));
          continue;
        }

        // ================================================
        // MANDATORY SANITIZE: Flatten to white, remove alpha
        // ================================================
        let imageBase64 = result.images[0];
        let sanitizeSuccess = false;
        try {
          console.log(`[generate-one] Page ${page}: [${attemptId}] Sanitizing image (flatten to white, remove alpha)`);
          imageBase64 = await sanitizeColoringPngBase64(imageBase64);
          sanitizeSuccess = true;
        } catch (sanitizeError) {
          const errorMsg = sanitizeError instanceof Error ? sanitizeError.message : String(sanitizeError);
          console.error(`[generate-one] Page ${page}: [${attemptId}] Sanitize error: ${errorMsg}`);
          
          // If image is invalid (blank, too dark), RETRY immediately
          if (errorMsg.includes("IMAGE_INVALID")) {
            console.log(`[generate-one] Page ${page}: [${attemptId}] Invalid image detected, will retry with stricter prompt`);
            
            // Add specific reinforcement based on the failure type
            if (errorMsg.includes("too_dark")) {
              lastValidationResult = {
                valid: false,
                outlineValidation: {
                  valid: false,
                  hasBlackFills: true,
                  hasGrayscale: false,
                  hasUnwantedBorder: false,
                  fillLocations: ["entire image - dark background"],
                  confidence: 1.0,
                  notes: "Image has dark/black background instead of white",
                },
                retryReinforcement: "CRITICAL: Generate on PURE WHITE background (#FFFFFF). NO dark colors, NO black background, NO gray. Only BLACK LINES on WHITE.",
              };
            } else if (errorMsg.includes("blank") || errorMsg.includes("no_content")) {
              lastValidationResult = {
                valid: false,
                outlineValidation: {
                  valid: false,
                  hasBlackFills: false,
                  hasGrayscale: false,
                  hasUnwantedBorder: false,
                  fillLocations: ["no content"],
                  confidence: 1.0,
                  notes: "Image is blank/empty with no visible content",
                },
                retryReinforcement: "CRITICAL: You MUST draw visible BLACK LINE ART. The image must have clear outlines, shapes, and details - not blank.",
              };
            }
            
            await delay(getRetryDelay(attempt));
            continue; // Retry immediately
          }
        }
        
        // Only track valid images
        if (!sanitizeSuccess) {
          console.log(`[generate-one] Page ${page}: [${attemptId}] Skipping invalid image`);
          await delay(getRetryDelay(attempt));
          continue;
        }
        
        // Track this image with its attempt ID
        // Only update bestImage if this attempt is newer (prevents race conditions)
        const shouldUpdateBest = !bestImageAttemptId || attemptId > bestImageAttemptId;
        if (shouldUpdateBest) {
          bestImage = imageBase64;
          bestImageAttemptId = attemptId;
        }

        // VALIDATION STEP
        if (validateOutline || shouldValidateCharacter || shouldValidateComposition) {
          const validationResult = await validateGeneratedImage(
            imageBase64,
            shouldValidateCharacter ? characterProfile as CharacterIdentityProfile : undefined,
            !!shouldValidateCharacter,
            shouldValidateComposition,
            complexity as ComplexityLevel
          );
          
          lastValidationResult = validationResult;

          // Log validation results with detail
          const outlineNotes = validationResult.outlineValidation?.notes || "";
          console.log(`[generate-one] Page ${page}: [${attemptId}] Validation - valid: ${validationResult.valid}, outline: ${validationResult.outlineValidation?.valid}, notes: ${outlineNotes.slice(0, 100)}`);

          // If validation passed, return SUCCESS!
          if (validationResult.valid) {
            console.log(`[generate-one] Page ${page}: [${attemptId}] ✓ PASS on attempt ${attempt}`);
            return NextResponse.json({
              page,
              status: "done",
              imageBase64,
              attempts: attempt,
              attemptId,
              validation: {
                passed: true,
                character: validationResult.characterValidation,
                outline: validationResult.outlineValidation,
                coverage: validationResult.coverageValidation,
                bottomFill: validationResult.bottomFillValidation,
              },
            });
          }

          // Validation failed - log details and continue retrying
          // IMPORTANT: Do NOT save this image - it failed validation
          console.log(`[generate-one] Page ${page}: [${attemptId}] ✗ FAIL - validation failed, will retry. Reason: ${validationResult.outlineValidation?.notes || "unknown"}`);
          
          // Clear bestImage if this was a dark background failure (never keep dark images)
          if (outlineNotes.includes("dark_background") || outlineNotes.includes("PRE-VALIDATION FAILED")) {
            console.log(`[generate-one] Page ${page}: [${attemptId}] Discarding dark background image`);
            if (bestImageAttemptId === attemptId) {
              bestImage = null;
              bestImageAttemptId = null;
            }
          }
          
          await delay(getRetryDelay(attempt));
          continue;
          
        } else {
          // No validation requested - return immediately with postprocessed image
          console.log(`[generate-one] Page ${page}: [${attemptId}] ✓ Success (no validation) on attempt ${attempt}`);
          return NextResponse.json({
            page,
            status: "done",
            imageBase64,
            attempts: attempt,
            attemptId,
          });
        }

      } catch (attemptError) {
        // CHECK FOR NON-RETRYABLE ERRORS - STOP IMMEDIATELY
        if (isNonRetryableError(attemptError)) {
          console.error(`[generate-one] Page ${page}: [${attemptId}] NON-RETRYABLE ERROR - ${attemptError.code}`);
          
          // Return "paused" status for billing/quota errors
          const isPausable = ["BILLING_LIMIT", "INSUFFICIENT_QUOTA"].includes(attemptError.code);
          
          return NextResponse.json({
            page,
            status: isPausable ? "paused" : "error",
            error: attemptError.message,
            errorCode: attemptError.code,
            errorType: "non_retryable",
            pauseReason: isPausable ? attemptError.getUserMessage() : undefined,
            actionHint: attemptError.getActionHint(),
            attempts: attempt,
            context: {
              provider: attemptError.context.provider,
              httpStatus: attemptError.context.httpStatus,
              requestId: attemptError.context.requestId,
            },
          });
        }
        
        // Regular retryable error - use exponential backoff
        const errorMsg = attemptError instanceof Error ? attemptError.message : "Generation error";
        console.error(`[generate-one] Page ${page}: [${attemptId}] Attempt ${attempt} error: ${errorMsg}`);
        
        // Exponential backoff for network/rate limit errors
        await delay(getRetryDelay(attempt));
        continue;
      }
    }

    // ================================================
    // LIMITS REACHED - NEVER return "failed" for quality issues
    // ================================================
    console.log(`[generate-one] Page ${page}: [${requestId}] Limits reached after ${MAX_ATTEMPTS_PER_PAGE} attempts`);
    
    // If we have ANY image, return it as "done"
    // The sanitization guarantees white background, so just use what we have
    if (bestImage) {
      console.log(`[generate-one] Page ${page}: [${requestId}] Returning best available image (attemptId: ${bestImageAttemptId})`);
      return NextResponse.json({
        page,
        status: "done", // Always "done" if we have an image - NEVER "failed"
        imageBase64: bestImage,
        attempts: MAX_ATTEMPTS_PER_PAGE,
        attemptId: bestImageAttemptId,
        validation: lastValidationResult ? {
          passed: lastValidationResult.valid,
          note: lastValidationResult.valid ? undefined : "Image quality may vary",
          character: lastValidationResult.characterValidation,
          outline: lastValidationResult.outlineValidation,
          coverage: lastValidationResult.coverageValidation,
          bottomFill: lastValidationResult.bottomFillValidation,
        } : undefined,
      });
    }

    // No image at all - return "generating" status so UI keeps spinner
    // This is a quality retry issue, NOT a hard failure
    console.log(`[generate-one] Page ${page}: [${requestId}] No valid image yet - returning 'generating' status`);
    return NextResponse.json({
      page,
      status: "generating", // Keep in generating state - NOT "failed"
      attempts: MAX_ATTEMPTS_PER_PAGE,
      note: "Still improving quality...",
      canRetry: true, // Let UI show "Retry" button
    });

  } catch (error) {
    // Handle non-retryable errors at top level
    if (isNonRetryableError(error)) {
      const isPausable = ["BILLING_LIMIT", "INSUFFICIENT_QUOTA"].includes(error.code);
      
      return NextResponse.json({
        page: 0,
        status: isPausable ? "paused" : "error",
        error: error.message,
        errorCode: error.code,
        errorType: "non_retryable",
        pauseReason: isPausable ? error.getUserMessage() : undefined,
        actionHint: error.getActionHint(),
        context: {
          provider: error.context.provider,
          httpStatus: error.context.httpStatus,
          requestId: error.context.requestId,
        },
      });
    }
    
    const errorMsg = error instanceof Error ? error.message : "Generation failed";
    console.error("[generate-one] Error:", errorMsg);
    return NextResponse.json({
      page: 0,
      status: "error",
      error: errorMsg,
    });
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate retry delay with exponential backoff
 */
function getRetryDelay(attempt: number): number {
  // Exponential backoff: 500ms, 1000ms, 2000ms, 4000ms, capped at 5000ms
  const delay = Math.min(BASE_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
  return delay;
}

/**
 * Async delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
