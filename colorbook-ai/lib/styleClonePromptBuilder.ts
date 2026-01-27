/**
 * styleClonePromptBuilder.ts - Prompt builder for Style Clone generation
 * IMPORTANT: DALL-E 3 has a 4000 character limit! Keep prompts SHORT.
 */

import type { GenerationSpec, Complexity, LineThickness } from "./generationSpec";
import type { StyleContract, ThemePack } from "./styleClone";

/** Short complexity hints */
const COMPLEXITY_HINTS: Record<Complexity, string> = {
  simple: "SIMPLE: 1 subject, 2-4 props, empty background, big shapes",
  medium: "MEDIUM: 1-2 subjects, 4-6 props, light background",
  detailed: "DETAILED: 1-2 subjects, 6-8 props, richer background",
};

/** Short line hints */
const LINE_HINTS: Record<LineThickness, string> = {
  thin: "THIN lines (2-3pt)",
  medium: "MEDIUM lines (4-5pt)", 
  bold: "BOLD thick lines (6-8pt)",
};

/**
 * COMPACT mandatory suffix - fits in ~500 chars
 */
const MANDATORY_SUFFIX = `

OUTPUT: Black-and-white COLORING BOOK PAGE.
- BLACK LINES on WHITE background ONLY
- NO colors, NO gray, NO shading, NO gradients
- NO solid black fills anywhere
- Eyes = outline only, tiny dot pupils
- Hair = line strokes, NOT solid black
- All shapes CLOSED for coloring
- Centered, 10% margins`;

/**
 * Build CHARACTER BIBLE for Series mode (compact)
 */
export function buildCharacterBible(params: {
  characterName?: string;
  characterDescription?: string;
  styleContract: StyleContract;
}): string {
  const { characterName, characterDescription } = params;
  if (!characterName) return "";
  return `CHARACTER: ${characterName}${characterDescription ? ` - ${characterDescription.substring(0, 100)}` : ""}. Same character every page.`;
}

/**
 * Build COMPACT final prompt for DALL-E 3 (must be under 4000 chars!)
 */
export function buildFinalImagePrompt(params: {
  scenePrompt: string;
  themePack: ThemePack | null;
  styleContract: StyleContract | null;
  characterBible?: string;
  spec: GenerationSpec;
  isAnchor?: boolean;
  retryAttempt?: number;
}): string {
  const { scenePrompt, themePack, styleContract, characterBible, spec, retryAttempt = 0 } = params;
  
  const parts: string[] = [];
  
  // 1. Core instruction (SHORT)
  parts.push("Create a children's COLORING BOOK PAGE (black line art on white).");
  
  // 2. Theme context (SHORT - max 200 chars)
  if (themePack) {
    parts.push(`THEME: ${themePack.setting.substring(0, 150)}`);
  } else if (styleContract?.extractedThemeGuess) {
    parts.push(`THEME: ${styleContract.extractedThemeGuess.substring(0, 150)}`);
  }
  
  // 3. Character (if series mode)
  if (characterBible) {
    parts.push(characterBible);
  }
  
  // 4. Scene (the main content - limit to 500 chars)
  parts.push(`SCENE: ${scenePrompt.substring(0, 500)}`);
  
  // 5. Style rules (SHORT - only key rules)
  if (styleContract) {
    parts.push(`STYLE: ${styleContract.styleSummary.substring(0, 100)}. ${styleContract.outlineRules.substring(0, 100)}`);
  }
  
  // 6. Complexity + Lines
  parts.push(COMPLEXITY_HINTS[spec.complexity]);
  parts.push(LINE_HINTS[spec.lineThickness]);
  
  // 7. Retry simplification
  if (retryAttempt === 1) {
    parts.push("SIMPLER: fewer props, thinner lines, more white space");
  } else if (retryAttempt >= 2) {
    parts.push("EXTREMELY SIMPLE: minimal props, thinnest lines, maximum white space, no patterns");
  }
  
  // 8. Mandatory B&W suffix
  parts.push(MANDATORY_SUFFIX);
  
  const finalPrompt = parts.join("\n\n");
  
  // Safety check - truncate if still too long
  if (finalPrompt.length > 3800) {
    return finalPrompt.substring(0, 3800) + "\n\nBLACK LINES ON WHITE. NO COLOR. COLORING BOOK.";
  }
  
  return finalPrompt;
}

/**
 * Build prompt for generating scene prompts
 */
export function buildScenePromptsGenerationPrompt(params: {
  extractedThemeGuess: string;
  userTheme?: string;
  mode: "series" | "collection";
  pagesCount: number;
  complexity: Complexity;
  characterName?: string;
  characterDescription?: string;
}): string {
  const { extractedThemeGuess, userTheme, mode, pagesCount, complexity, characterName, characterDescription } = params;
  
  const modeInstructions = mode === "series"
    ? `SERIES: "${characterName || 'main character'}" appears in EVERY scene. ${characterDescription || ''}`
    : `COLLECTION: Same theme, different subjects allowed.`;

  return `Generate ${pagesCount} coloring book scene prompts.

THEME: ${extractedThemeGuess.substring(0, 300)}
${userTheme ? `Extra: ${userTheme}` : ""}

MODE: ${modeInstructions}
COMPLEXITY: ${complexity} (${COMPLEXITY_HINTS[complexity]})

Each prompt needs: SUBJECT + ACTION + SETTING + 3-6 PROPS

OUTPUT JSON:
{
  "prompts": [
    {"pageIndex": 1, "title": "Short title", "scenePrompt": "Description with subject, action, setting, props"},
    {"pageIndex": 2, "title": "Title", "scenePrompt": "Another scene..."}
  ]
}

Rules:
- ${pagesCount} prompts total
- Same world/theme
- No color references
- Each scene unique`;
}

/**
 * Build prompt for improving a scene prompt
 */
export function buildImprovePromptPrompt(params: {
  currentPrompt: string;
  currentTitle: string;
  extractedThemeGuess: string;
  complexity: Complexity;
}): string {
  const { currentPrompt, currentTitle, extractedThemeGuess, complexity } = params;
  
  return `Improve this coloring book scene prompt.

CURRENT: ${currentTitle}
${currentPrompt.substring(0, 300)}

THEME: ${extractedThemeGuess.substring(0, 200)}
COMPLEXITY: ${complexity}

Make it better: more specific props, clearer composition, fits theme.

OUTPUT JSON:
{"title": "Improved title", "scenePrompt": "Improved description"}`;
}

/**
 * Build prompt for generating a ThemePack
 */
export function buildThemePackPrompt(params: {
  userTheme?: string;
  mode: "series" | "collection";
}): string {
  const { userTheme, mode } = params;

  return `Generate a coloring book theme.

${userTheme ? `THEME: ${userTheme}` : "Create a fun, kid-friendly theme."}
MODE: ${mode}

OUTPUT JSON:
{
  "setting": "World description",
  "recurringProps": ["prop1", "prop2", "..."],
  "motifs": ["motif1", "motif2"],
  "allowedSubjects": ["subject1", "subject2"],
  "forbiddenElements": ["avoid1", "avoid2"]${mode === "series" ? `,
  "characterName": "Name",
  "characterDescription": "Physical description"` : ""}
}`;
}

/**
 * Build prompt for style extraction
 */
export function buildStyleExtractionPrompt(): string {
  return `Analyze this coloring page image. Extract style rules.

OUTPUT JSON:
{
  "styleSummary": "1-2 sentence style description",
  "styleContractText": "Key rules to recreate this style (3-5 lines)",
  "forbiddenList": ["things", "to", "avoid"],
  "recommendedLineThickness": "thin" | "medium" | "bold",
  "recommendedComplexity": "simple" | "medium" | "detailed",
  "outlineRules": "Line thickness rules",
  "backgroundRules": "Background density",
  "compositionRules": "How subjects are composed",
  "eyeRules": "How eyes are drawn (avoid solid black)",
  "extractedThemeGuess": "Theme/world depicted"
}`;
}
