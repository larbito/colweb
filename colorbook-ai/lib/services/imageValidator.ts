/**
 * imageValidator.ts
 * 
 * Vision-based image validation service using OpenAI's vision model.
 * Validates generated coloring pages for:
 * 1. Character identity consistency (storybook mode)
 * 2. Outline-only compliance (no black fills, no grayscale)
 * 3. Coverage validation (full page utilization)
 * 
 * IMPORTANT: Validation must run on RAW PNG bytes with white background.
 * Do NOT validate screenshots, dark UI overlays, or composited previews.
 */

import { openai, isOpenAIConfigured } from "@/lib/openai";
import {
  type CharacterIdentityProfile,
  type CharacterValidationResult,
  type OutlineValidationResult,
  type ImageValidationResult,
  buildCharacterValidationPrompt,
  parseCharacterValidationResponse,
  buildValidationRetryReinforcement,
} from "@/lib/characterIdentity";
import { BOTTOM_FILL_RETRY_REINFORCEMENT, COVERAGE_RETRY_REINFORCEMENT } from "@/lib/coloringPagePromptEnforcer";

/**
 * Complexity level for validation thresholds
 */
export type ComplexityLevel = "kids" | "simple" | "medium" | "detailed" | "ultra";

/**
 * Validation thresholds based on complexity
 */
const COMPLEXITY_THRESHOLDS: Record<ComplexityLevel, {
  maxBlackRatio: number;       // Max % of black pixels allowed (dense art = higher)
  minCoverageHeight: number;   // Min % of canvas height with content
  minBottomInk: number;        // Min ink in bottom 10%
  allowDenseLineArt: boolean;  // Whether to allow dense hatching/crosshatching
}> = {
  kids: { maxBlackRatio: 0.08, minCoverageHeight: 80, minBottomInk: 3, allowDenseLineArt: false },
  simple: { maxBlackRatio: 0.12, minCoverageHeight: 85, minBottomInk: 4, allowDenseLineArt: false },
  medium: { maxBlackRatio: 0.18, minCoverageHeight: 88, minBottomInk: 5, allowDenseLineArt: true },
  detailed: { maxBlackRatio: 0.25, minCoverageHeight: 90, minBottomInk: 5, allowDenseLineArt: true },
  ultra: { maxBlackRatio: 0.32, minCoverageHeight: 92, minBottomInk: 6, allowDenseLineArt: true },
};

// Current complexity level (can be set per-request)
let currentComplexity: ComplexityLevel = "medium";

/**
 * Result of bottom-fill validation
 */
export interface BottomFillValidationResult {
  valid: boolean;
  hasEmptyBottom: boolean;
  bottomCoveragePercent: number;
  confidence: number;
  notes: string;
}

/**
 * Result of coverage validation (bounding box analysis)
 */
export interface CoverageValidationResult {
  valid: boolean;
  bboxTop: number; // % from top where ink starts
  bboxBottom: number; // % from top where ink ends
  bboxHeightRatio: number; // bbox height as % of image height
  bottomInkRatio: number; // ink ratio in bottom 10% of image
  coveragePercent: number; // overall coverage percentage
  hasCoverageIssue: boolean;
  notes: string;
}

/**
 * Extended validation result including bottom fill and coverage checks
 */
export interface ExtendedImageValidationResult extends ImageValidationResult {
  bottomFillValidation?: BottomFillValidationResult;
  coverageValidation?: CoverageValidationResult;
}

/**
 * Set the complexity level for validation thresholds.
 * Call this before validateGeneratedImage() to adjust thresholds.
 */
export function setValidationComplexity(complexity: ComplexityLevel): void {
  currentComplexity = complexity;
  console.log(`[imageValidator] Complexity set to: ${complexity}`);
}

/**
 * Get current complexity thresholds
 */
export function getComplexityThresholds(): typeof COMPLEXITY_THRESHOLDS[ComplexityLevel] {
  return COMPLEXITY_THRESHOLDS[currentComplexity];
}

/**
 * Pre-validation check: Ensure image has white background (not dark UI overlay).
 * Returns false if the image appears to be invalid input (e.g., screenshot of dark UI).
 * 
 * This is a CRITICAL guard to prevent validating the wrong image data.
 */
async function preValidateImageBackground(imageBase64: string): Promise<{ valid: boolean; reason?: string; blackRatio?: number }> {
  try {
    // Import sharp dynamically to avoid build issues
    const sharp = (await import("sharp")).default;
    
    const buffer = Buffer.from(imageBase64, "base64");
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      return { valid: false, reason: "Invalid image metadata" };
    }
    
    // Sample the border pixels (top 10px, bottom 10px, left 10px, right 10px)
    const { data: rawData } = await image.raw().toBuffer({ resolveWithObject: true });
    const width = metadata.width;
    const height = metadata.height;
    const channels = metadata.channels || 3;
    
    // Calculate average brightness of border region
    let borderSum = 0;
    let borderCount = 0;
    const borderSize = 10;
    
    // Sample top and bottom edges
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < Math.min(borderSize, height); y++) {
        const idx = (y * width + x) * channels;
        const brightness = channels >= 3 
          ? (rawData[idx] + rawData[idx + 1] + rawData[idx + 2]) / 3
          : rawData[idx];
        borderSum += brightness;
        borderCount++;
      }
      for (let y = Math.max(0, height - borderSize); y < height; y++) {
        const idx = (y * width + x) * channels;
        const brightness = channels >= 3 
          ? (rawData[idx] + rawData[idx + 1] + rawData[idx + 2]) / 3
          : rawData[idx];
        borderSum += brightness;
        borderCount++;
      }
    }
    
    // Sample left and right edges (excluding corners already counted)
    for (let y = borderSize; y < height - borderSize; y++) {
      for (let x = 0; x < Math.min(borderSize, width); x++) {
        const idx = (y * width + x) * channels;
        const brightness = channels >= 3 
          ? (rawData[idx] + rawData[idx + 1] + rawData[idx + 2]) / 3
          : rawData[idx];
        borderSum += brightness;
        borderCount++;
      }
      for (let x = Math.max(0, width - borderSize); x < width; x++) {
        const idx = (y * width + x) * channels;
        const brightness = channels >= 3 
          ? (rawData[idx] + rawData[idx + 1] + rawData[idx + 2]) / 3
          : rawData[idx];
        borderSum += brightness;
        borderCount++;
      }
    }
    
    const avgBorderBrightness = borderSum / borderCount;
    
    // Calculate overall black pixel ratio
    let blackPixels = 0;
    const totalPixels = width * height;
    const blackThreshold = 50; // Pixels darker than this are "black"
    
    for (let i = 0; i < rawData.length; i += channels) {
      const brightness = channels >= 3 
        ? (rawData[i] + rawData[i + 1] + rawData[i + 2]) / 3
        : rawData[i];
      if (brightness < blackThreshold) {
        blackPixels++;
      }
    }
    
    const blackRatio = blackPixels / totalPixels;
    
    console.log(`[imageValidator] Pre-validation: borderBrightness=${avgBorderBrightness.toFixed(1)}, blackRatio=${(blackRatio * 100).toFixed(1)}%`);
    
    // GUARD: Border brightness must be >= 240 (near white)
    // A coloring page should have pure white borders
    if (avgBorderBrightness < 240) {
      console.error(`[imageValidator] DARK BACKGROUND DETECTED: borderBrightness=${avgBorderBrightness.toFixed(1)} < 240. This image has a dark/non-white background.`);
      return { 
        valid: false, 
        reason: `dark_background: Border brightness ${avgBorderBrightness.toFixed(1)} < 240. Image has non-white background.`, 
        blackRatio 
      };
    }
    
    // GUARD: Black ratio must be <= 60%
    // More than 60% black means the image is mostly filled/dark
    if (blackRatio > 0.60) {
      console.error(`[imageValidator] TOO MUCH BLACK: ${(blackRatio * 100).toFixed(1)}% > 60%. This image is mostly dark.`);
      return { 
        valid: false, 
        reason: `dark_background: Black ratio ${(blackRatio * 100).toFixed(1)}% > 60%. Image is mostly dark.`, 
        blackRatio 
      };
    }
    
    return { valid: true, blackRatio };
    
  } catch (error) {
    console.error("[imageValidator] Pre-validation error:", error);
    // On error, FAIL SAFE - assume image is invalid and trigger retry
    // Better to retry than to show a potentially dark image
    return { 
      valid: false, 
      reason: `pre_validation_error: ${error instanceof Error ? error.message : "Unknown error"}` 
    };
  }
}

/**
 * Validate a generated image using OpenAI's vision model.
 * 
 * IMPORTANT: This function validates the RAW PNG bytes from the image generation API.
 * Do NOT pass:
 * - Screenshots of the UI
 * - Images rendered on dark backgrounds
 * - Composited previews with overlays
 * - Thumbnail images from HTML canvas
 * 
 * @param imageBase64 - Base64 encoded PNG data (raw generation output)
 * @param characterProfile - Character identity profile (for storybook mode)
 * @param validateCharacter - Whether to validate character identity
 * @param validateBottomFill - Whether to check for empty bottom space
 * @param complexity - Complexity level for thresholds
 * @returns Validation result with issues and retry reinforcement
 */
export async function validateGeneratedImage(
  imageBase64: string,
  characterProfile?: CharacterIdentityProfile,
  validateCharacter: boolean = true,
  validateBottomFill: boolean = true,
  complexity: ComplexityLevel = "medium"
): Promise<ExtendedImageValidationResult> {
  // Set complexity for this validation
  currentComplexity = complexity;
  const thresholds = COMPLEXITY_THRESHOLDS[complexity];
  
  if (!isOpenAIConfigured()) {
    console.warn("[imageValidator] OpenAI not configured, skipping validation");
    return {
      valid: true,
      outlineValidation: {
        valid: true,
        hasBlackFills: false,
        hasGrayscale: false,
        hasUnwantedBorder: false,
        fillLocations: [],
        confidence: 0,
        notes: "Validation skipped - OpenAI not configured",
      },
    };
  }

  // PRE-VALIDATION: Check that we have valid input (white background, reasonable black ratio)
  // This is a HARD FAIL - dark backgrounds MUST trigger retry, not pass through
  const preCheck = await preValidateImageBackground(imageBase64);
  if (!preCheck.valid) {
    console.error(`[imageValidator] Pre-validation HARD FAIL: ${preCheck.reason}`);
    // CRITICAL FIX: Return valid=FALSE to trigger retry
    // A dark background is a GENERATION ERROR, not an input error
    return {
      valid: false, // MUST be false to trigger retry
      outlineValidation: {
        valid: false,
        hasBlackFills: true, // Treat dark background as a "fill" issue
        hasGrayscale: false,
        hasUnwantedBorder: false,
        fillLocations: ["entire image - dark background detected"],
        confidence: 1.0,
        notes: `PRE-VALIDATION FAILED: ${preCheck.reason}`,
      },
      retryReinforcement: `CRITICAL ERROR: Generated image has dark/black background. MUST have PURE WHITE background (RGB 255,255,255). NO dark colors, NO gray background, NO filled areas. Only BLACK OUTLINES on WHITE.`,
    };
  }

  // Check if black ratio is within complexity threshold
  if (preCheck.blackRatio !== undefined && preCheck.blackRatio > thresholds.maxBlackRatio) {
    console.log(`[imageValidator] Black ratio ${(preCheck.blackRatio * 100).toFixed(1)}% exceeds threshold ${(thresholds.maxBlackRatio * 100).toFixed(1)}% for ${complexity} mode`);
    // For detailed/ultra modes, this is okay (dense line art)
    // For kids/simple modes, this might indicate too much ink
    if (!thresholds.allowDenseLineArt) {
      return {
        valid: false,
        outlineValidation: {
          valid: false,
          hasBlackFills: true,
          hasGrayscale: false,
          hasUnwantedBorder: false,
          fillLocations: ["overall - too much ink for kids mode"],
          confidence: 0.8,
          notes: `Image has ${(preCheck.blackRatio * 100).toFixed(1)}% black pixels, exceeds ${(thresholds.maxBlackRatio * 100).toFixed(1)}% limit for ${complexity} complexity`,
        },
        retryReinforcement: `CRITICAL: Simplify the design significantly. Use fewer lines, bigger shapes, more white space. Target audience is young children. Current design is too detailed/dark.`,
      };
    }
  }

  // Run validations in parallel
  const validationPromises: Promise<unknown>[] = [
    validateOutlineAndBottomFill(imageBase64, validateBottomFill, thresholds),
  ];
  
  if (validateCharacter && characterProfile) {
    validationPromises.push(validateCharacterIdentity(imageBase64, characterProfile));
  }

  const results = await Promise.all(validationPromises);
  
  const combinedResult = results[0] as { outline: OutlineValidationResult; bottomFill?: BottomFillValidationResult; coverage?: CoverageValidationResult };
  const outlineResult = combinedResult.outline;
  const bottomFillResult = combinedResult.bottomFill;
  const coverageResult = combinedResult.coverage;
  const characterResult = validateCharacter && characterProfile 
    ? results[1] as CharacterValidationResult 
    : undefined;

  // Determine overall validity - NOW includes coverage
  const outlineValid = outlineResult.valid;
  const characterValid = characterResult?.valid !== false;
  const bottomValid = !bottomFillResult?.hasEmptyBottom;
  const coverageValid = !coverageResult?.hasCoverageIssue;
  
  const valid = outlineValid && characterValid && bottomValid && coverageValid;
  
  // Build retry reinforcement if needed
  let retryReinforcement = !outlineValid || !characterValid
    ? buildValidationRetryReinforcement(characterResult, outlineResult, characterProfile)
    : undefined;
    
  // Add bottom fill reinforcement if bottom is too empty
  if (bottomFillResult && bottomFillResult.hasEmptyBottom) {
    retryReinforcement = retryReinforcement 
      ? `${retryReinforcement}\n${BOTTOM_FILL_RETRY_REINFORCEMENT}`
      : BOTTOM_FILL_RETRY_REINFORCEMENT;
  }

  // Add coverage reinforcement if coverage issue detected
  if (coverageResult && coverageResult.hasCoverageIssue) {
    console.log(`[imageValidator] Coverage issue detected: ${coverageResult.notes}`);
    retryReinforcement = retryReinforcement 
      ? `${retryReinforcement}\n${COVERAGE_RETRY_REINFORCEMENT}`
      : COVERAGE_RETRY_REINFORCEMENT;
  }

  console.log(`[imageValidator] Final result: valid=${valid} (outline=${outlineValid}, character=${characterValid}, bottom=${bottomValid}, coverage=${coverageValid}) [complexity=${complexity}]`);

  return {
    valid,
    characterValidation: characterResult,
    outlineValidation: outlineResult,
    bottomFillValidation: bottomFillResult,
    coverageValidation: coverageResult,
    retryReinforcement,
  };
}

/**
 * Validate outline-only rules, bottom fill, AND coverage in a single API call.
 * More efficient than multiple separate calls.
 * 
 * IMPORTANT: This validates the RAW image with white background.
 * Dense line-art is ACCEPTABLE - only flag actual SOLID FILLS (like filled rectangles/circles).
 */
async function validateOutlineAndBottomFill(
  imageBase64: string, 
  checkBottomFill: boolean,
  thresholds: typeof COMPLEXITY_THRESHOLDS[ComplexityLevel] = COMPLEXITY_THRESHOLDS.medium
): Promise<{ outline: OutlineValidationResult; bottomFill?: BottomFillValidationResult; coverage?: CoverageValidationResult }> {
  try {
    // Build prompt based on complexity thresholds
    const combinedPrompt = `You are a QA validator for coloring book images (black outlines on white background).

This is a COLORING PAGE generated by AI. The background should be WHITE and the art should be BLACK OUTLINES.

CRITICAL DISTINCTION - READ CAREFULLY:
- "SOLID FILL" = A shape that is completely filled in with solid black (like a filled rectangle, filled circle)
- "DENSE LINE ART" = Many lines close together (hatching, crosshatching, fur texture, hair strands) - this is ACCEPTABLE
- DO NOT confuse dense line-art with solid fills. Dense lines with white showing between them = ACCEPTABLE

Analyze this image:

1. BLACK FILLS - Look for TRULY SOLID filled shapes (no white gaps inside)
   - Eyes with solid black pupils larger than a dot = fill
   - Panda patches that are COMPLETELY black with no white = fill
   - BUT: Fur texture with many strokes = NOT a fill (that's line art)
   - BUT: Detailed hatching/crosshatching = NOT a fill (that's line art)

2. GRAYSCALE - Look for actual gray tones/shading (not optical gray from dense lines)

3. BOTTOM COVERAGE - Does content reach near the bottom edge?

Respond with ONLY valid JSON:
{
  "hasBlackFills": true/false (ONLY true for actual solid fills, NOT for dense line art),
  "hasGrayscale": true/false (actual gray pixels, not optical gray from lines),
  "hasUnwantedBorder": true/false (rectangular frame around the art),
  "fillLocations": ["only list ACTUAL solid fills, not dense line areas"],
  "bottomEmptyPercent": 0-100,
  "hasEmptyBottom": true/false (true if bottom 15% is more than 70% white),
  "bboxTop": 0-100 (% where content starts from top),
  "bboxBottom": 0-100 (% where content ends from top),
  "bboxHeightRatio": 0-100 (content height as % of image),
  "bottomInkRatio": 0-100 (ink % in bottom 10%),
  "coveragePercent": 0-100,
  "hasCoverageIssue": true/false (true if bboxHeightRatio < ${thresholds.minCoverageHeight}% OR bottomInkRatio < ${thresholds.minBottomInk}%),
  "confidence": 0.0-1.0,
  "notes": "brief explanation"
}

IMPORTANT:
- This is a coloring book page. Dense, detailed line-art is FINE.
- Only flag hasBlackFills=true if there are ACTUAL solid black shapes with NO white inside.
- If the image has lots of detailed lines/hatching but no solid fills, hasBlackFills should be FALSE.
- Dense fur textures, crosshatching, and detailed backgrounds are ${thresholds.allowDenseLineArt ? "ACCEPTABLE" : "too complex for kids mode"}.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: combinedPrompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${imageBase64}`,
                detail: "low",
              },
            },
          ],
        },
      ],
      max_tokens: 800,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || "";
    console.log("[imageValidator] Combined validation response:", content.slice(0, 400));
    
    // Parse combined response
    const cleaned = content
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/gi, "")
      .trim();
    
    const data = JSON.parse(cleaned);
    
    const outlineResult: OutlineValidationResult = {
      valid: data.hasBlackFills !== true && data.hasGrayscale !== true,
      hasBlackFills: data.hasBlackFills === true,
      hasGrayscale: data.hasGrayscale === true,
      hasUnwantedBorder: data.hasUnwantedBorder === true,
      fillLocations: data.fillLocations || [],
      confidence: data.confidence || 0.5,
      notes: data.notes || "",
    };
    
    const bottomFillResult: BottomFillValidationResult | undefined = checkBottomFill ? {
      valid: data.hasEmptyBottom !== true,
      hasEmptyBottom: data.hasEmptyBottom === true,
      bottomCoveragePercent: 100 - (data.bottomEmptyPercent || 0),
      confidence: data.confidence || 0.5,
      notes: data.notes || "",
    } : undefined;

    // Coverage validation with complexity-based thresholds
    const bboxHeightRatio = data.bboxHeightRatio || 0;
    const bboxBottom = data.bboxBottom || 0;
    const bottomInkRatio = data.bottomInkRatio || 0;
    
    // Use thresholds based on complexity level
    const hasCoverageIssue = data.hasCoverageIssue === true || 
      bboxHeightRatio < thresholds.minCoverageHeight || 
      bboxBottom < 95 || 
      bottomInkRatio < thresholds.minBottomInk;

    const coverageResult: CoverageValidationResult = {
      valid: !hasCoverageIssue,
      bboxTop: data.bboxTop || 0,
      bboxBottom: bboxBottom,
      bboxHeightRatio: bboxHeightRatio,
      bottomInkRatio: bottomInkRatio,
      coveragePercent: data.coveragePercent || 0,
      hasCoverageIssue,
      notes: `Height: ${bboxHeightRatio}% (min: ${thresholds.minCoverageHeight}%), Bottom ink: ${bottomInkRatio}% (min: ${thresholds.minBottomInk}%), ${hasCoverageIssue ? 'NEEDS RETRY' : 'OK'}`,
    };

    console.log(`[imageValidator] Coverage: height=${bboxHeightRatio}% (min:${thresholds.minCoverageHeight}%), bottomInk=${bottomInkRatio}% (min:${thresholds.minBottomInk}%), issue=${hasCoverageIssue}`);
    
    return { outline: outlineResult, bottomFill: bottomFillResult, coverage: coverageResult };
    
  } catch (error) {
    console.error("[imageValidator] Validation error:", error);
    return {
      outline: {
        valid: true,
        hasBlackFills: false,
        hasGrayscale: false,
        hasUnwantedBorder: false,
        fillLocations: [],
        confidence: 0,
        notes: `Validation error: ${error instanceof Error ? error.message : "unknown"}`,
      },
      bottomFill: checkBottomFill ? {
        valid: true,
        hasEmptyBottom: false,
        bottomCoveragePercent: 100,
        confidence: 0,
        notes: `Validation error: ${error instanceof Error ? error.message : "unknown"}`,
      } : undefined,
      coverage: {
        valid: true, // Don't fail on error
        bboxTop: 0,
        bboxBottom: 100,
        bboxHeightRatio: 100,
        bottomInkRatio: 100,
        coveragePercent: 100,
        hasCoverageIssue: false,
        notes: `Validation error: ${error instanceof Error ? error.message : "unknown"}`,
      },
    };
  }
}

/**
 * Validate that an image matches the character identity profile.
 */
async function validateCharacterIdentity(
  imageBase64: string,
  profile: CharacterIdentityProfile
): Promise<CharacterValidationResult> {
  try {
    const systemPrompt = buildCharacterValidationPrompt(profile);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: systemPrompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${imageBase64}`,
                detail: "low", // Use low detail for faster/cheaper validation
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.1, // Low temperature for consistent validation
    });

    const content = response.choices[0]?.message?.content || "";
    console.log("[imageValidator] Character validation response:", content.slice(0, 200));
    
    return parseCharacterValidationResponse(content, profile);
    
  } catch (error) {
    console.error("[imageValidator] Character validation error:", error);
    // On error, assume valid to avoid blocking generation
    return {
      valid: true,
      detectedSpecies: "unknown",
      matchesSpecies: true,
      matchesFace: true,
      matchesProportions: true,
      hasUnexpectedMarkings: false,
      confidence: 0,
      notes: `Validation error: ${error instanceof Error ? error.message : "unknown"}`,
    };
  }
}

/**
 * Quick check for obvious black fill issues using pixel analysis.
 * This is a fast heuristic check before the slower vision validation.
 * 
 * Note: Full implementation would require image processing library.
 * For now, we rely on vision-based validation.
 */
export function quickBlackFillCheck(imageBase64: string): boolean {
  // Placeholder - in production, use sharp or canvas to analyze pixels
  // For now, always return true (pass) and rely on vision validation
  return true;
}

