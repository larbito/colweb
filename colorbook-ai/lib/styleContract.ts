/**
 * styleContract.ts - Locked style rules for consistent KDP coloring book output
 * The StyleContract is ALWAYS applied to every image generation
 */

import type { Complexity, LineThickness, CharacterType } from "./generationSpec";
import { CHARACTER_TYPES } from "./generationSpec";
import type { ThemePack } from "./themePack";
import { getThemePackSummary } from "./themePack";

/**
 * The StyleContract contains all locked rules for image generation
 */
export interface StyleContract {
  styleName: string;
  contractText: string;
  negativeText: string;
  eyeRules: string;
  fillRules: string;
  antiFillRules: string; // NEW: Explicit anti-silhouette rules
  compositionLimits: string; // NEW: Composition constraints
  complexityRules: Record<Complexity, string>;
  thicknessRules: Record<LineThickness, string>;
}

/**
 * The default Pandacorn Busy Day KDP Kids style contract
 * This is the LOCKED style applied to every generation
 * 
 * STRENGTHENED to prevent silhouettes and black fills
 */
export const PANDACORN_STYLE_CONTRACT: StyleContract = {
  styleName: "Pandacorn Busy Day (KDP Kids)",
  
  contractText: `Create a KDP-ready kids coloring book interior page (ages 3-8).

STYLE REQUIREMENTS:
- PURE black-and-white line art ONLY (no color, no grayscale)
- Very thick clean outlines with smooth continuous strokes
- Simple rounded kawaii shapes with big heads and cute proportions
- Big open WHITE areas for easy coloring
- Centered main subject with wide safe margins (at least 0.5 inch from edges)
- Portrait orientation

LINE QUALITY:
- Thick outer contour lines (5-6pt equivalent)
- Slightly thinner inner detail lines (3-4pt equivalent)
- Smooth vector-like linework
- All shapes must be CLOSED (no open paths)
- No textures, no crosshatching, no halftone dots, no stippling`,

  eyeRules: `EYE RULES (CRITICAL - violations cause automatic rejection):
- Eyes must be drawn as OUTLINED CIRCLES/OVALS only
- Tiny dot pupils allowed (max 2-3 pixels) OR leave empty for coloring
- Eye whites must be COMPLETELY WHITE/empty inside
- NEVER fill eyes with solid black
- NEVER draw large black circles for eyes
- NO heavy black areas around eyes`,

  fillRules: `FILL RULES (CRITICAL - violations cause automatic rejection):
- EVERY area inside outlines must be WHITE (empty for coloring)
- NO solid black filled regions anywhere in the image
- Hair/fur: draw individual strand OUTLINES only, interior WHITE
- Clothing: draw seams and edges as OUTLINES only, interior WHITE
- NO shadows at all - this is a coloring page`,

  antiFillRules: `ANTI-SILHOUETTE RULES (MANDATORY):
- NO silhouettes of any kind
- NO solid black shapes (even small ones)
- NO filled black clothing, hats, shoes, or accessories
- NO sticker-like solid shapes
- If something looks like a dark silhouette, draw it as OUTLINE ONLY
- Dark objects (black cat, dark hat): draw as WHITE interior with BLACK outline
- Test: if you removed the white background, would any shape be a solid blob? If yes, FIX IT.`,

  compositionLimits: `COMPOSITION LIMITS (MANDATORY):
- Maximum 8 props/objects total (including background items)
- NO repeating patterns (no fields of flowers, no rows of butterflies)
- NO tiny repeated decorations scattered everywhere
- Background: 1-2 clouds maximum, simple horizon line, maybe 1 sun
- Keep 70%+ of the page as large open WHITE coloring areas
- NO borders or frames around the page`,

  negativeText: `FORBIDDEN (automatic rejection):
- Any color or grayscale shading
- Gradients, shadows, or shading of any kind
- Realistic rendering style
- Intricate tiny patterns or textures
- Dense/busy/cluttered backgrounds
- Text, letters, numbers, logos, watermarks
- Borders or frames
- Solid black eyes or large black pupils
- Large filled black areas or silhouettes
- Halftone, stipple, or crosshatch patterns
- Repeating small elements (many flowers, many butterflies)
- More than 8 objects in the scene`,

  complexityRules: {
    simple: "SIMPLE (ages 3-5): 1 main subject + 2-4 large props only. Almost no background. Very large coloring areas. Maximum simplicity.",
    medium: "MEDIUM (ages 5-8): 1 main subject + 4-6 props. Simple background with 1-2 elements. Large coloring areas.",
    detailed: "DETAILED (ages 8+): 1 main subject + 6-8 props. Background with 2-3 elements. Still uncluttered.",
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
- Same eye style (outlined with tiny pupils or empty)
- Same level of simplicity
- Same background emptiness
Do NOT add more detail than the anchor has.`;
}

/**
 * Build the complete final prompt from scene idea + style contract + theme pack
 * This is the ONLY way to build prompts for image generation
 * 
 * PROMPT ORDER:
 * 1. ThemePack summary (world consistency)
 * 2. ScenePrompt (structured scene)
 * 3. Character lock (series mode)
 * 4. Anchor match instruction
 * 5. Style contract (Pandacorn rules)
 * 6. Anti-fill rules (CRITICAL)
 * 7. Composition limits
 * 8. Negative rules
 */
export function buildFinalPrompt(params: {
  scenePrompt: string;
  themePack?: ThemePack | null;
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
    themePack,
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

  // 1. ThemePack summary (world consistency) - FIRST for context
  if (themePack) {
    parts.push(getThemePackSummary(themePack));
  }

  // 2. Scene description (structured user content)
  parts.push(`SCENE TO DRAW:\n${scenePrompt}`);

  // 3. Character species lock (series mode)
  if (bookMode === "series" && characterType) {
    parts.push(getSpeciesLockText(characterType, characterName));
  }

  // 4. Anchor match instruction (for non-anchor pages when anchor exists)
  if (hasAnchor && !isAnchorGeneration) {
    parts.push(getAnchorReferenceText());
  }

  // 5. Complexity rules
  parts.push(styleContract.complexityRules[complexity]);

  // 6. Thickness rules
  parts.push(styleContract.thicknessRules[lineThickness]);

  // 7. Main style contract
  parts.push(styleContract.contractText);

  // 8. Eye rules (CRITICAL)
  parts.push(styleContract.eyeRules);

  // 9. Fill rules (CRITICAL)
  parts.push(styleContract.fillRules);

  // 10. Anti-fill/anti-silhouette rules (NEW - CRITICAL)
  parts.push(styleContract.antiFillRules);

  // 11. Composition limits (NEW)
  parts.push(styleContract.compositionLimits);

  // 12. Forbidden items (merge with ThemePack forbidden)
  let forbiddenText = styleContract.negativeText;
  if (themePack && themePack.forbidden.length > 0) {
    forbiddenText += `\nALSO FORBIDDEN: ${themePack.forbidden.join(", ")}`;
  }
  parts.push(forbiddenText);

  // 13. Retry-specific strictness
  if (retryAttempt >= 1) {
    parts.push(`
=== STRICT RETRY (attempt ${retryAttempt + 1}) ===
Previous attempt had too much black/silhouettes. This time:
- OUTLINES ONLY - every interior must be WHITE
- Remove any solid black shapes completely
- Reduce props to maximum 5
- Simplify background to almost nothing
- If any area looks filled, make it an outline instead`);
  }

  if (retryAttempt >= 2) {
    parts.push(`
=== MAXIMUM STRICTNESS ===
- Draw ONLY the main character and 2-3 essential props
- ZERO background elements
- Every single shape must be OUTLINE with WHITE interior
- If previous attempt had silhouettes, REMOVE those objects entirely
- Ultra-simple like a basic coloring page for 3-year-olds`);
  }

  // Final instruction
  parts.push(`
Generate this coloring page now. Remember: OUTLINES ONLY, all interiors WHITE.`);

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
    "filled black", "solid black", "silhouette",
    "solid black eyes", "black eyes", "filled eyes",
    "realistic", "photo", "photograph", "3d",
    "text", "letters", "words", "watermark", "logo",
    "border", "frame",
    "many flowers", "many butterflies", "repeating pattern",
    "cluttered", "busy", "dense",
    ...speciesExclusions,
  ].join(", ");
}

/**
 * Simplify a scene prompt for retry attempts
 * Removes complex elements that might cause silhouettes
 */
export function simplifyScenePrompt(scenePrompt: string): string {
  let simplified = scenePrompt;
  
  // Remove phrases that often cause cluttered output
  const clutterPhrases = [
    /many flowers?/gi,
    /lots of flowers?/gi,
    /flowers? everywhere/gi,
    /many butterfl(y|ies)/gi,
    /surrounded by/gi,
    /filled with/gi,
    /covered in/gi,
    /rows of/gi,
    /fields? of/gi,
  ];
  
  for (const phrase of clutterPhrases) {
    simplified = simplified.replace(phrase, "");
  }
  
  // Keep only first sentence if multiple
  const sentences = simplified.split(/[.;]/);
  if (sentences.length > 2) {
    simplified = sentences.slice(0, 2).join(". ").trim();
  }
  
  // Add simplification instruction
  simplified += " [SIMPLIFIED: minimal props, simple background]";
  
  return simplified.trim();
}

/**
 * Get displayable style contract summary for UI
 */
export function getStyleContractSummary(): string {
  return `Style: ${PANDACORN_STYLE_CONTRACT.styleName}

• Pure black & white LINE ART only
• Thick clean outlines, kawaii shapes
• ALL interiors must be WHITE (for coloring)
• Eyes: outlined only, tiny dot pupils max
• NO silhouettes, NO filled black areas
• Maximum 8 props, simple backgrounds
• Large open coloring areas for kids`;
}
