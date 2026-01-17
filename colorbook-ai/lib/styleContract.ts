/**
 * styleContract.ts - Locked style rules for consistent KDP coloring book output
 * The StyleContract is ALWAYS applied to every image generation
 */

import type { Complexity, LineThickness, CharacterType } from "./generationSpec";
import { CHARACTER_TYPES } from "./generationSpec";

/**
 * The StyleContract contains all locked rules for image generation
 */
export interface StyleContract {
  styleName: string;
  contractText: string;
  negativeText: string;
  eyeRules: string;
  fillRules: string;
  complexityRules: Record<Complexity, string>;
  thicknessRules: Record<LineThickness, string>;
}

/**
 * The default Pandacorn Busy Day KDP Kids style contract
 * This is the LOCKED style applied to every generation
 */
export const PANDACORN_STYLE_CONTRACT: StyleContract = {
  styleName: "Pandacorn Busy Day (KDP Kids)",
  
  contractText: `Create a KDP-ready kids coloring book interior page (ages 3-8).

STYLE REQUIREMENTS:
- PURE black-and-white line art ONLY (no color, no grayscale)
- Very thick clean outlines with smooth continuous strokes
- Simple rounded kawaii shapes with big heads and cute proportions
- Big open areas for easy coloring
- Centered main subject with wide safe margins (at least 0.5 inch from edges)
- Portrait orientation

LINE QUALITY:
- Thick outer contour lines (5-6pt equivalent)
- Slightly thinner inner detail lines (3-4pt equivalent)
- Smooth vector-like linework
- All shapes must be CLOSED (no open paths)
- No textures, no crosshatching, no halftone dots, no stippling`,

  eyeRules: `EYE RULES (CRITICAL - violations cause rejection):
- Eyes must be drawn as OUTLINED shapes only
- Tiny dot pupils allowed (max 2-3 pixels in final output)
- Eye whites must be WHITE/empty (for coloring)
- NO solid black filled eyes
- NO large black circles for eyes
- NO heavy shadows around eyes`,

  fillRules: `FILL RULES (CRITICAL - violations cause rejection):
- NO solid black filled regions anywhere
- Hair/fur: outline individual strands only, NEVER solid black fill
- Shadows: DO NOT draw any shadows at all
- Dark objects (shoes, hats, etc.): outline only, interior WHITE
- Maximum 10% of image pixels should be black after binarization`,

  negativeText: `FORBIDDEN (will cause automatic rejection):
- Any color or grayscale shading
- Gradients or shadows
- Realistic rendering style
- Intricate tiny patterns
- Dense/busy backgrounds
- Text, letters, numbers, logos, watermarks
- Borders or frames
- Solid black eyes
- Large filled black areas
- Halftone or stipple patterns`,

  complexityRules: {
    simple: "SIMPLE: 1 main character + 2-4 props only. Minimal background (1-2 elements max). Very large coloring areas.",
    medium: "MEDIUM: 1 main character + 4-6 props. Light background with 2-4 simple elements. Balanced coloring areas.",
    detailed: "DETAILED: 1 main character + 6-8 props. Background with 3-5 elements. Still clean and uncluttered.",
  },

  thicknessRules: {
    thin: "LINE WEIGHT: Medium outer lines (3-4pt), thin inner details (2pt).",
    medium: "LINE WEIGHT: Thick outer lines (4-5pt), medium inner details (3pt).",
    bold: "LINE WEIGHT: Very thick outer lines (5-6pt), thick inner details (4pt). Best for young children.",
  },
};

/**
 * Get species lock text for series mode
 */
export function getSpeciesLockText(characterType: CharacterType, characterName?: string): string {
  if (characterType === "custom") return "";
  
  const typeInfo = CHARACTER_TYPES.find(c => c.value === characterType);
  if (!typeInfo) return "";
  
  const typeLabel = characterType.toUpperCase();
  const allOtherSpecies = ["cat", "dog", "bunny", "rabbit", "bear", "panda", "unicorn", "dragon", "horse", "fox", "mouse", "sheep", "lamb", "pig", "cow", "chicken", "duck", "elephant", "lion", "tiger", "monkey", "bird"]
    .filter(s => s !== characterType && !s.includes(characterType));
  
  return `CHARACTER SPECIES LOCK:
The main character is a cute kawaii ${typeLabel}${characterName ? ` named "${characterName}"` : ""}.
REQUIRED ${typeLabel} FEATURES: ${typeInfo.traits}
FORBIDDEN SPECIES: ${allOtherSpecies.slice(0, 10).join(", ")}
The character must be CLEARLY recognizable as a ${typeLabel} in every image.`;
}

/**
 * Get anchor reference text
 */
export function getAnchorReferenceText(): string {
  return `ANCHOR STYLE MATCH (CRITICAL):
You MUST match the EXACT style of the provided anchor/reference image:
- Same character design (species, face, body proportions)
- Same line thickness and weight
- Same eye style (outlined with tiny pupils)
- Same level of detail
- Same background simplicity
Do NOT deviate from the anchor style in any way.`;
}

/**
 * Build the complete final prompt from scene idea + style contract
 * This is the ONLY way to build prompts for image generation
 */
export function buildFinalPrompt(params: {
  scenePrompt: string;
  styleContract?: StyleContract;
  bookMode: "series" | "collection";
  characterType?: CharacterType;
  characterName?: string;
  complexity: Complexity;
  lineThickness: LineThickness;
  hasAnchor: boolean;
  isAnchorGeneration?: boolean;
  retryAttempt?: number;
}): string {
  const {
    scenePrompt,
    styleContract = PANDACORN_STYLE_CONTRACT,
    bookMode,
    characterType,
    characterName,
    complexity,
    lineThickness,
    hasAnchor,
    isAnchorGeneration,
    retryAttempt = 0,
  } = params;

  const parts: string[] = [];

  // 1. Scene description (user content)
  parts.push(`SCENE TO DRAW:\n${scenePrompt}`);

  // 2. Character species lock (series mode)
  if (bookMode === "series" && characterType) {
    parts.push(getSpeciesLockText(characterType, characterName));
  }

  // 3. Anchor match instruction (for non-anchor pages when anchor exists)
  if (hasAnchor && !isAnchorGeneration) {
    parts.push(getAnchorReferenceText());
  }

  // 4. Complexity rules
  parts.push(styleContract.complexityRules[complexity]);

  // 5. Thickness rules
  parts.push(styleContract.thicknessRules[lineThickness]);

  // 6. Main style contract
  parts.push(styleContract.contractText);

  // 7. Eye rules
  parts.push(styleContract.eyeRules);

  // 8. Fill rules
  parts.push(styleContract.fillRules);

  // 9. Forbidden items
  parts.push(styleContract.negativeText);

  // 10. Retry-specific strictness
  if (retryAttempt >= 1) {
    parts.push(`
=== STRICT RETRY (attempt ${retryAttempt + 1}) ===
Previous attempt failed quality check. This time:
- Reduce background elements to absolute minimum
- Eyes: OUTLINE ONLY with TINY dot pupils
- NO solid black areas anywhere
- Simplify the scene further if needed`);
  }

  if (retryAttempt >= 2) {
    parts.push(`
=== MAXIMUM STRICTNESS ===
- Draw ONLY the main character and 2-3 essential props
- Remove ALL background details
- Make all shapes very simple and large
- Ensure every area is large enough to color easily`);
  }

  // Final instruction
  parts.push(`
Now generate this coloring page following ALL rules above exactly.`);

  return parts.join("\n\n");
}

/**
 * Build negative prompt for models that support it
 */
export function buildNegativePrompt(characterType?: CharacterType): string {
  const speciesExclusions = characterType && characterType !== "custom"
    ? CHARACTER_TYPES
        .filter(c => c.value !== characterType && c.value !== "custom")
        .map(c => c.value)
    : [];

  return [
    "color", "colored", "colorful",
    "grayscale", "gray", "shading", "shaded",
    "gradient", "shadow", "shadows",
    "texture", "halftone", "stipple",
    "filled black", "solid black eyes", "black eyes",
    "realistic", "photo", "photograph", "3d",
    "text", "letters", "words", "watermark", "logo",
    "border", "frame",
    ...speciesExclusions,
  ].join(", ");
}

/**
 * Simplify a scene prompt for retry attempts
 */
export function simplifyScenePrompt(scenePrompt: string): string {
  // Remove excess details by keeping only essential parts
  // This is a simple heuristic - could be improved with AI
  const sentences = scenePrompt.split(/[.;]/);
  if (sentences.length <= 1) return scenePrompt;
  
  // Keep first sentence (usually the main action)
  return sentences[0].trim() + ".";
}

/**
 * Get displayable style contract summary for UI
 */
export function getStyleContractSummary(): string {
  return `Style: ${PANDACORN_STYLE_CONTRACT.styleName}

• Pure black & white line art only
• Thick clean outlines, kawaii shapes
• Eyes outlined only (tiny dot pupils max)
• No filled black areas, no shading
• Simple backgrounds with 3-8 props
• Large coloring areas for kids`;
}

