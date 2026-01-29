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

/**
 * Validate a generated image using OpenAI's vision model.
 * 
 * @param imageBase64 - Base64 encoded image data
 * @param characterProfile - Character identity profile (for storybook mode)
 * @param validateCharacter - Whether to validate character identity
 * @returns Validation result with issues and retry reinforcement
 */
export async function validateGeneratedImage(
  imageBase64: string,
  characterProfile?: CharacterIdentityProfile,
  validateCharacter: boolean = true
): Promise<ImageValidationResult> {
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
    validateOutlineOnly(imageBase64),
  ];
  
  if (validateCharacter && characterProfile) {
    validationPromises.push(validateCharacterIdentity(imageBase64, characterProfile));
  }

  const results = await Promise.all(validationPromises);
  
  const outlineResult = results[0] as OutlineValidationResult;
  const characterResult = validateCharacter && characterProfile 
    ? results[1] as CharacterValidationResult 
    : undefined;

  // Determine overall validity
  const valid = outlineResult.valid && (characterResult?.valid !== false);
  
  // Build retry reinforcement if needed
  const retryReinforcement = !valid 
    ? buildValidationRetryReinforcement(characterResult, outlineResult, characterProfile)
    : undefined;

  return {
    valid,
    characterValidation: characterResult,
    outlineValidation: outlineResult,
    retryReinforcement,
  };
}

/**
 * Validate that an image follows outline-only rules.
 */
async function validateOutlineOnly(imageBase64: string): Promise<OutlineValidationResult> {
  try {
    const systemPrompt = buildOutlineValidationPrompt();
    
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
    console.log("[imageValidator] Outline validation response:", content.slice(0, 200));
    
    return parseOutlineValidationResponse(content);
    
  } catch (error) {
    console.error("[imageValidator] Outline validation error:", error);
    // On error, assume valid to avoid blocking generation
    return {
      valid: true,
      hasBlackFills: false,
      hasGrayscale: false,
      hasUnwantedBorder: false,
      fillLocations: [],
      confidence: 0,
      notes: `Validation error: ${error instanceof Error ? error.message : "unknown"}`,
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

