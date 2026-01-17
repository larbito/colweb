/**
 * promptBuilder.ts - Canonical prompt builder for coloring book generation
 * Enforces "Pandacorn Busy Day" KDP kids style on EVERY image
 */

import type { GenerationSpec, Complexity, LineThickness, CharacterType } from "./generationSpec";
import { CHARACTER_TYPES } from "./generationSpec";
import type { CharacterLock } from "./schemas";

/**
 * MANDATORY "Pandacorn Busy Day" KDP Style Block
 * This is appended to EVERY image generation prompt - no exceptions
 */
const PANDACORN_STYLE_BLOCK = `

=== MANDATORY KDP COLORING BOOK STYLE ===
Create a KDP-ready kids coloring book interior page (ages 3-8) in the SAME style as "Pandacorn Busy Day":

REQUIRED STYLE:
- PURE black-and-white line art ONLY
- Very thick clean outlines with smooth continuous strokes
- Simple rounded kawaii shapes
- Big open areas for easy coloring
- Centered main subject with wide safe margins
- Simple background with only 3-8 easy props (minimal clutter)
- All shapes must be CLOSED for coloring

LINE RULES:
- Thick outer contour lines (5-6pt equivalent)
- Slightly thinner inner detail lines (3-4pt equivalent)
- NO textures, NO crosshatching, NO halftone dots, NO shading
- Smooth vector-like linework

EYE RULES (CRITICAL):
- Eyes must be OUTLINED only - just the outline shape
- Tiny dot pupils allowed (2-3 pixels max)
- NO large filled black areas in eyes
- NO heavy black shadows around eyes
- Eye whites should be WHITE/empty for coloring

PRINT RULES:
- Pure white background (#FFFFFF)
- High contrast black lines (#000000)
- Clean vector-like appearance
- Portrait orientation

STRICTLY FORBIDDEN (will cause rejection):
✗ ANY color whatsoever
✗ ANY grayscale shading or gradients
✗ ANY shadows or shadow blocks
✗ ANY realistic rendering
✗ ANY intricate tiny patterns
✗ ANY dense/busy backgrounds
✗ ANY text, letters, numbers
✗ ANY logos or watermarks
✗ ANY borders or frames
✗ ANY filled black regions (except tiny pupils)
✗ ANY solid black eyes
✗ ANY halftone or stipple patterns`;

/**
 * Get species-specific traits for character locking
 */
export function getCharacterTraits(characterType: CharacterType): string {
  const found = (CHARACTER_TYPES as { value: CharacterType; label: string; traits: string }[])
    .find(c => c.value === characterType);
  return found?.traits || "";
}

/**
 * Get forbidden species list (all species EXCEPT the selected one)
 */
export function getForbiddenSpecies(characterType: CharacterType): string[] {
  const allSpecies = ["cat", "dog", "bunny", "rabbit", "bear", "panda", "unicorn", "dragon", "horse", "fox", "mouse", "sheep", "lamb", "pig", "cow", "chicken", "duck", "elephant", "lion", "tiger", "monkey", "bird"];
  
  // Map character type to species to exclude from forbidden list
  const speciesMap: Record<CharacterType, string[]> = {
    cat: ["cat", "kitten"],
    dog: ["dog", "puppy"],
    bunny: ["bunny", "rabbit"],
    bear: ["bear", "teddy"],
    panda: ["panda", "bear"],
    unicorn: ["unicorn", "horse"],
    dragon: ["dragon"],
    custom: [],
  };
  
  const allowed = speciesMap[characterType] || [];
  return allSpecies.filter(s => !allowed.includes(s));
}

/**
 * Build species lock block for series mode
 */
function buildSpeciesLockBlock(characterType: CharacterType, characterName?: string): string {
  if (characterType === "custom") return "";
  
  const traits = getCharacterTraits(characterType);
  const forbidden = getForbiddenSpecies(characterType);
  const typeLabel = characterType.toUpperCase();
  
  return `

=== CHARACTER SPECIES LOCK (MANDATORY) ===
The main character is a cute kawaii ${typeLabel} (NOT any other animal).
${characterName ? `Character name: ${characterName}` : ""}

REQUIRED ${typeLabel} FEATURES:
- Must have: ${traits}
- Kawaii style: big head, small body, cute proportions
- The character must be CLEARLY recognizable as a ${typeLabel}

FORBIDDEN SPECIES (character must NOT look like any of these):
${forbidden.join(", ")}

If the image shows any animal other than a ${typeLabel}, it will be REJECTED.`;
}

/**
 * Build anchor reference block
 */
function buildAnchorReferenceBlock(hasAnchor: boolean): string {
  if (!hasAnchor) return "";
  
  return `

=== ANCHOR STYLE REFERENCE (MANDATORY) ===
You MUST match the EXACT style of the provided anchor/reference image:
- Same character design (species, face, proportions, features)
- Same line thickness and weight
- Same level of detail and simplicity
- Same eye style (outlined, tiny pupils only)
- Same way of drawing fur/hair (outline strands, not filled)
- Same background simplicity level

The character in this page MUST be IDENTICAL to the anchor character.
Do NOT change the species, face shape, or any distinguishing features.`;
}

/**
 * Complexity descriptions
 */
const COMPLEXITY_RULES: Record<Complexity, string> = {
  simple: "ONE main subject + 2-4 simple props only, minimal/no background, very large coloring areas",
  medium: "1-2 subjects + 4-6 props, light simple background, moderate detail",
  detailed: "1-2 subjects + 6-8 props, more elements but still clean and simple",
};

/**
 * Build the complete image generation prompt
 * This is the ONLY function that should be used to build prompts
 */
export function buildImagePrompt(params: {
  sceneDescription: string;
  characterType?: CharacterType;
  characterName?: string;
  characterLock?: CharacterLock | null;
  spec: GenerationSpec;
  hasAnchor: boolean;
  isAnchorGeneration?: boolean;
}): string {
  const { 
    sceneDescription, 
    characterType, 
    characterName,
    characterLock, 
    spec, 
    hasAnchor,
    isAnchorGeneration 
  } = params;

  const parts: string[] = [];

  // Scene description
  parts.push(`SCENE TO DRAW: ${sceneDescription}`);

  // Character lock from AI (if available)
  if (characterLock) {
    parts.push(`
CHARACTER DETAILS:
- Name: ${characterLock.canonicalName}
- Body: ${characterLock.visualRules.proportions}
- Face: ${characterLock.visualRules.face}
- Features: ${characterLock.visualRules.uniqueFeatures.join(", ")}
- Outfit: ${characterLock.visualRules.outfit}`);
  }

  // Species lock (for series mode)
  if (characterType && spec.bookMode === "series") {
    parts.push(buildSpeciesLockBlock(characterType, characterName));
  }

  // Complexity guide
  parts.push(`
COMPLEXITY LEVEL: ${spec.complexity.toUpperCase()}
${COMPLEXITY_RULES[spec.complexity]}`);

  // Anchor reference (for non-anchor pages)
  if (hasAnchor && !isAnchorGeneration) {
    parts.push(buildAnchorReferenceBlock(true));
  }

  // MANDATORY Pandacorn style block - ALWAYS included
  parts.push(PANDACORN_STYLE_BLOCK);

  // Final instruction
  parts.push(`
Now generate this coloring page following ALL rules above exactly.
Keep the style identical to "Pandacorn Busy Day" KDP coloring books.`);

  return parts.join("\n");
}

/**
 * Build negative prompt for models that support it
 */
export function buildNegativePrompt(characterType?: CharacterType): string {
  const forbidden = characterType ? getForbiddenSpecies(characterType) : [];
  
  return [
    "color",
    "colored",
    "grayscale",
    "shading",
    "gradient",
    "texture",
    "halftone",
    "filled blacks",
    "solid black eyes",
    "shadow blocks",
    "shadows",
    "realistic",
    "photo",
    "3d",
    "text",
    "letters",
    "watermark",
    "border",
    "frame",
    ...forbidden,
  ].join(", ");
}

/**
 * Build stricter prompt suffix for retry after failed quality check
 */
export function buildStricterSuffix(failureReason: "color" | "species" | "blackfill"): string {
  const base = `

=== STRICT RETRY - PREVIOUS ATTEMPT FAILED ===`;

  switch (failureReason) {
    case "color":
      return `${base}
The previous image had color or grayscale. This time:
- Output ONLY pure black lines on pure white background
- Absolutely NO color, NO gray, NO shading
- Every pixel must be either #000000 or #FFFFFF`;

    case "species":
      return `${base}
The previous image showed the WRONG animal species. This time:
- Draw ONLY the specified character type
- Include ALL required features (ears, tail, nose, etc.)
- Do NOT draw any other animal species`;

    case "blackfill":
      return `${base}
The previous image had too much solid black. This time:
- Eyes: OUTLINE only with TINY dot pupils (2-3px max)
- Hair/fur: OUTLINE individual strands, NEVER fill with black
- No shadows, no filled regions anywhere
- Target: less than 8% of pixels should be black`;

    default:
      return base;
  }
}
