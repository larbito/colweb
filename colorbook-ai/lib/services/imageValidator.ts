/**
 * imageValidator.ts
 * 
 * Vision-based image validation service using OpenAI's vision model.
 * Validates generated coloring pages for:
 * 1. Character identity consistency (storybook mode)
 * 2. Outline-only compliance (no black fills, no grayscale)
 */

import { openai, isOpenAIConfigured } from "@/lib/openai";
import {
  type CharacterIdentityProfile,
  type CharacterValidationResult,
  type OutlineValidationResult,
  type ImageValidationResult,
  buildCharacterValidationPrompt,
  buildOutlineValidationPrompt,
  parseCharacterValidationResponse,
  parseOutlineValidationResponse,
  buildValidationRetryReinforcement,
} from "@/lib/characterIdentity";
import { BOTTOM_FILL_RETRY_REINFORCEMENT } from "@/lib/coloringPagePromptEnforcer";

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
 * Extended validation result including bottom fill check
 */
export interface ExtendedImageValidationResult extends ImageValidationResult {
  bottomFillValidation?: BottomFillValidationResult;
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
  
  const combinedResult = results[0] as { outline: OutlineValidationResult; bottomFill?: BottomFillValidationResult };
  const outlineResult = combinedResult.outline;
  const bottomFillResult = combinedResult.bottomFill;
  const characterResult = validateCharacter && characterProfile 
    ? results[1] as CharacterValidationResult 
    : undefined;

  // Determine overall validity (bottom fill doesn't fail validation, just triggers retry)
  const valid = outlineResult.valid && (characterResult?.valid !== false);
  
  // Build retry reinforcement if needed
  let retryReinforcement = !valid 
    ? buildValidationRetryReinforcement(characterResult, outlineResult, characterProfile)
    : undefined;
    
  // Add bottom fill reinforcement if bottom is too empty
  if (bottomFillResult && bottomFillResult.hasEmptyBottom) {
    const bottomReinforcement = BOTTOM_FILL_RETRY_REINFORCEMENT;
    retryReinforcement = retryReinforcement 
      ? `${retryReinforcement}\n${bottomReinforcement}`
      : bottomReinforcement;
  }

  return {
    valid: valid && !(bottomFillResult?.hasEmptyBottom),
    characterValidation: characterResult,
    outlineValidation: outlineResult,
    bottomFillValidation: bottomFillResult,
    retryReinforcement,
  };
}

/**
 * Validate outline-only rules AND bottom fill in a single API call.
 * More efficient than two separate calls.
 */
async function validateOutlineAndBottomFill(
  imageBase64: string, 
  checkBottomFill: boolean
): Promise<{ outline: OutlineValidationResult; bottomFill?: BottomFillValidationResult }> {
  try {
    const combinedPrompt = `You are a strict QA validator for coloring book images.

Analyze this image and check:
1. OUTLINE RULES - no solid black fills, no grayscale, no borders
2. BOTTOM FILL - is the bottom portion of the image properly filled with content?

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "hasBlackFills": true/false,
  "hasGrayscale": true/false,
  "hasUnwantedBorder": true/false,
  "fillLocations": ["list of areas with fills, e.g., 'eye patches', 'ears'"],
  "bottomEmptyPercent": 0-100 (estimate what % of the bottom 15% of image is empty/white),
  "hasEmptyBottom": true/false (true if bottom 15% is more than 85% white/empty),
  "confidence": 0.0-1.0,
  "notes": "brief explanation"
}

Be STRICT:
- Any solid black area larger than a thin line is a "fill"
- Panda patches, raccoon masks, dark ears should be outlines ONLY
- Gray shading anywhere = hasGrayscale true
- Rectangle around the image = hasUnwantedBorder true
- Bottom should have ground/floor/props reaching near the edge`;

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
      max_tokens: 600,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || "";
    console.log("[imageValidator] Combined validation response:", content.slice(0, 300));
    
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
    
    return { outline: outlineResult, bottomFill: bottomFillResult };
    
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

