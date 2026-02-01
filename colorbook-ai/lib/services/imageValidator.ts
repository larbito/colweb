/**
 * imageValidator.ts
 * 
 * Vision-based image validation service using OpenAI's vision model.
 * Validates generated coloring pages for:
 * 1. Character identity consistency (storybook mode)
 * 2. Outline-only compliance (no black fills, no grayscale)
 * 3. Coverage validation (full page utilization)
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
 * Validate a generated image using OpenAI's vision model.
 * 
 * @param imageBase64 - Base64 encoded image data
 * @param characterProfile - Character identity profile (for storybook mode)
 * @param validateCharacter - Whether to validate character identity
 * @param validateBottomFill - Whether to check for empty bottom space
 * @returns Validation result with issues and retry reinforcement
 */
export async function validateGeneratedImage(
  imageBase64: string,
  characterProfile?: CharacterIdentityProfile,
  validateCharacter: boolean = true,
  validateBottomFill: boolean = true
): Promise<ExtendedImageValidationResult> {
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

  // Run validations in parallel
  const validationPromises: Promise<unknown>[] = [
    validateOutlineAndBottomFill(imageBase64, validateBottomFill),
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

  console.log(`[imageValidator] Final result: valid=${valid} (outline=${outlineValid}, character=${characterValid}, bottom=${bottomValid}, coverage=${coverageValid})`);

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
 */
async function validateOutlineAndBottomFill(
  imageBase64: string, 
  checkBottomFill: boolean
): Promise<{ outline: OutlineValidationResult; bottomFill?: BottomFillValidationResult; coverage?: CoverageValidationResult }> {
  try {
    const combinedPrompt = `You are a strict QA validator for coloring book images (US Letter full-page format).

Analyze this image and check:
1. OUTLINE RULES - no solid black fills, no grayscale, no borders
2. BOTTOM FILL - is the bottom portion of the image properly filled with content?
3. COVERAGE - does the artwork fill the full page (no large empty areas)?

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "hasBlackFills": true/false,
  "hasGrayscale": true/false,
  "hasUnwantedBorder": true/false,
  "fillLocations": ["list of areas with fills, e.g., 'eye patches', 'ears'"],
  "bottomEmptyPercent": 0-100 (estimate what % of the bottom 15% of image is empty/white),
  "hasEmptyBottom": true/false (true if bottom 15% is more than 70% white/empty),
  "bboxTop": 0-100 (% from top where ink/content first appears),
  "bboxBottom": 0-100 (% from top where ink/content last appears),
  "bboxHeightRatio": 0-100 (what % of image height has content),
  "bottomInkRatio": 0-100 (% of bottom 10% that has ink/lines),
  "coveragePercent": 0-100 (overall estimate of how much of the page is filled with content),
  "hasCoverageIssue": true/false (true if content doesn't fill at least 88% of height OR bottom 10% is mostly empty),
  "confidence": 0.0-1.0,
  "notes": "brief explanation"
}

Be STRICT:
- Any solid black area larger than a thin line is a "fill"
- Panda patches, raccoon masks, dark ears should be outlines ONLY
- Gray shading anywhere = hasGrayscale true
- Rectangle around the image = hasUnwantedBorder true
- Bottom should have ground/floor/props reaching near the edge
- COVERAGE: Artwork should fill 88-95% of the canvas height
- hasCoverageIssue = true if:
  * bboxHeightRatio < 88% (content doesn't fill page vertically)
  * OR bboxBottom < 95% (ink doesn't reach near bottom)
  * OR bottomInkRatio < 5% (bottom is mostly empty)`;

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

    // Coverage validation with thresholds
    const bboxHeightRatio = data.bboxHeightRatio || 0;
    const bboxBottom = data.bboxBottom || 0;
    const bottomInkRatio = data.bottomInkRatio || 0;
    const hasCoverageIssue = data.hasCoverageIssue === true || 
      bboxHeightRatio < 88 || 
      bboxBottom < 95 || 
      bottomInkRatio < 5;

    const coverageResult: CoverageValidationResult = {
      valid: !hasCoverageIssue,
      bboxTop: data.bboxTop || 0,
      bboxBottom: bboxBottom,
      bboxHeightRatio: bboxHeightRatio,
      bottomInkRatio: bottomInkRatio,
      coveragePercent: data.coveragePercent || 0,
      hasCoverageIssue,
      notes: `Height: ${bboxHeightRatio}%, Bottom ink: ${bottomInkRatio}%, ${hasCoverageIssue ? 'NEEDS RETRY' : 'OK'}`,
    };

    console.log(`[imageValidator] Coverage: height=${bboxHeightRatio}%, bboxBottom=${bboxBottom}%, bottomInk=${bottomInkRatio}%, issue=${hasCoverageIssue}`);
    
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

