/**
 * styleContract.ts - Locked style rules for consistent KDP coloring book output
 * IMPORTANT: Keep prompts UNDER 4000 characters (DALL-E 3 limit)
 */

import type { Complexity, LineThickness, CharacterType } from "./generationSpec";
import { CHARACTER_TYPES } from "./generationSpec";
import type { ThemePack } from "./themePack";

// Maximum prompt length for DALL-E 3
const MAX_PROMPT_LENGTH = 3800; // Leave buffer

/**
 * COMPACT style contract - optimized for DALL-E 3's 4000 char limit
 */
export const COMPACT_STYLE_RULES = `STYLE: KDP kids coloring book (ages 3-8), pure B/W line art only.
LINES: Thick clean outlines, closed shapes, no textures/halftone.
FILL RULE: ALL interiors WHITE (for coloring). NO solid black fills anywhere.
EYES: Outlined circles only, tiny dot pupils max, NO filled black eyes.
COMPOSITION: Centered subject, wide margins, max 6-8 props, simple background.
FORBIDDEN: color, shading, gradients, silhouettes, filled areas, text, borders, busy backgrounds.`;

/**
 * Get compact species lock text
 */
export function getSpeciesLockText(characterType: CharacterType, characterName?: string): string {
  if (characterType === "custom") return "";
  const typeInfo = CHARACTER_TYPES.find(c => c.value === characterType);
  if (!typeInfo) return "";
  return `CHARACTER: ${characterType.toUpperCase()}${characterName ? ` "${characterName}"` : ""} with ${typeInfo.traits}. Must be clearly this species.`;
}

/**
 * Get compact ThemePack summary
 */
function getCompactThemeSummary(themePack: ThemePack): string {
  return `WORLD: ${themePack.setting}. Props: ${themePack.recurringProps.slice(0, 6).join(", ")}.`;
}

/**
 * Build final prompt - OPTIMIZED to stay under 4000 chars
 */
export function buildFinalPrompt(params: {
  scenePrompt: string;
  themePack?: ThemePack | null;
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

  // 1. Scene (user content) - keep it short
  const shortScene = scenePrompt.length > 500 ? scenePrompt.slice(0, 500) + "..." : scenePrompt;
  parts.push(`SCENE: ${shortScene}`);

  // 2. ThemePack (if exists) - compact
  if (themePack) {
    parts.push(getCompactThemeSummary(themePack));
  }

  // 3. Character lock (series mode) - compact
  if (bookMode === "series" && characterType) {
    parts.push(getSpeciesLockText(characterType, characterName));
  }

  // 4. Anchor instruction (brief)
  if (hasAnchor && !isAnchorGeneration) {
    parts.push("ANCHOR: Match the exact line style and character design from anchor image.");
  }

  // 5. Complexity + thickness (one line)
  const complexityMap = {
    simple: "1 subject + 2-4 props, minimal background",
    medium: "1 subject + 4-6 props, simple background",
    detailed: "1 subject + 6-8 props, light background",
  };
  const thicknessMap = {
    thin: "medium lines",
    medium: "thick lines", 
    bold: "very thick lines",
  };
  parts.push(`COMPLEXITY: ${complexityMap[complexity]}. LINES: ${thicknessMap[lineThickness]}.`);

  // 6. Core style rules (compact)
  parts.push(COMPACT_STYLE_RULES);

  // 7. Retry strictness (only if needed)
  if (retryAttempt >= 1) {
    parts.push("STRICT: Outlines only, all interiors WHITE, reduce props, simplify everything.");
  }
  if (retryAttempt >= 2) {
    parts.push("ULTRA-SIMPLE: Main subject + 2 props only. Remove any filled/dark areas completely.");
  }

  // Join and enforce length limit
  let result = parts.join("\n\n");
  
  if (result.length > MAX_PROMPT_LENGTH) {
    console.warn(`[StyleContract] Prompt too long (${result.length}), truncating...`);
    // Remove theme pack if needed
    const withoutTheme = parts.filter(p => !p.startsWith("WORLD:")).join("\n\n");
    if (withoutTheme.length <= MAX_PROMPT_LENGTH) {
      result = withoutTheme;
    } else {
      // Last resort: truncate
      result = result.slice(0, MAX_PROMPT_LENGTH);
    }
  }

  console.log(`[StyleContract] Final prompt length: ${result.length} chars`);
  return result;
}

/**
 * Simplify scene prompt for retries
 */
export function simplifyScenePrompt(scenePrompt: string): string {
  // Remove clutter phrases
  let simplified = scenePrompt
    .replace(/many |lots of |field of |surrounded by |covered in |rows of /gi, "")
    .replace(/FOREGROUND:.*?\n/gi, "FOREGROUND: grass\n")
    .replace(/BACKGROUND:.*?\n/gi, "BACKGROUND: 1 cloud\n");
  
  // Keep only first 200 chars
  if (simplified.length > 200) {
    simplified = simplified.slice(0, 200);
  }
  
  return simplified.trim();
}

/**
 * Get style summary for UI display
 */
export function getStyleContractSummary(): string {
  return `Style: Pandacorn Busy Day (KDP Kids)

• Pure black & white line art only
• Thick clean outlines, kawaii shapes
• ALL interiors WHITE (for coloring)
• Eyes: outlined only, tiny pupils max
• NO filled black areas or silhouettes
• Max 8 props, simple backgrounds`;
}

// Legacy exports for compatibility
export interface StyleContract {
  styleName: string;
  contractText: string;
  negativeText: string;
  eyeRules: string;
  fillRules: string;
  antiFillRules: string;
  compositionLimits: string;
  complexityRules: Record<Complexity, string>;
  thicknessRules: Record<LineThickness, string>;
}

export const PANDACORN_STYLE_CONTRACT: StyleContract = {
  styleName: "Pandacorn Busy Day (KDP Kids)",
  contractText: COMPACT_STYLE_RULES,
  negativeText: "color, shading, gradients, silhouettes, filled areas, text, borders",
  eyeRules: "Outlined eyes only, tiny dot pupils max",
  fillRules: "All interiors WHITE, no solid black fills",
  antiFillRules: "No silhouettes, no solid shapes",
  compositionLimits: "Max 8 props, simple background",
  complexityRules: {
    simple: "1 subject + 2-4 props",
    medium: "1 subject + 4-6 props",
    detailed: "1 subject + 6-8 props",
  },
  thicknessRules: {
    thin: "Medium lines",
    medium: "Thick lines",
    bold: "Very thick lines",
  },
};

export function buildNegativePrompt(characterType?: CharacterType): string {
  const base = ["color", "shading", "gradient", "silhouette", "filled black", "realistic", "text", "border"];
  if (characterType && characterType !== "custom") {
    const others = CHARACTER_TYPES.filter(c => c.value !== characterType && c.value !== "custom").map(c => c.value);
    return [...base, ...others.slice(0, 5)].join(", ");
  }
  return base.join(", ");
}

export function getAnchorReferenceText(): string {
  return "Match anchor image style exactly.";
}
