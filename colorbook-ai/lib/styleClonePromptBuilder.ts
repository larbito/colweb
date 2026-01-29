/**
 * styleClonePromptBuilder.ts - Prompt builder for Style Clone generation
 * 
 * 2-STAGE PIPELINE:
 * Stage 1: Vision analysis (extract-style, theme-pack) 
 * Stage 2: Generation (prompts, generate-sample, generate-remaining)
 * 
 * IMPORTANT: DALL-E 3 has 4000 char limit - keep prompts compact!
 * 
 * All prompts now include mandatory no-fill constraints from coloringPagePromptEnforcer.
 */

import type { GenerationSpec, Complexity, LineThickness } from "./generationSpec";
import type { StyleContract, ThemePack } from "./styleClone";
import { NO_FILL_CONSTRAINTS, NEGATIVE_PROMPT_LIST } from "./coloringPagePromptEnforcer";

/**
 * Build the FINAL prompt for DALL-E 3 image generation
 * Combines: ThemePack + ScenePrompt + StyleContract + Negatives
 * Must stay under 4000 characters!
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
  const { scenePrompt, themePack, styleContract, characterBible, spec, isAnchor, retryAttempt = 0 } = params;
  
  const parts: string[] = [];
  
  // 1. OUTPUT FORMAT (most important - put first)
  parts.push(`OUTPUT: Black and white COLORING BOOK PAGE for children.
Pure black outlines on white background. NO colors, NO shading, NO gray.`);
  
  // 2. THEME/WORLD (from ThemePack - keeps pages in same universe)
  if (themePack) {
    parts.push(`WORLD: ${themePack.setting.substring(0, 120)}
Props: ${themePack.recurringProps.slice(0, 5).join(", ")}`);
  }
  
  // 3. CHARACTER (Series mode)
  if (characterBible) {
    parts.push(characterBible);
  }
  
  // 4. SCENE (the actual content)
  parts.push(`SCENE: ${scenePrompt.substring(0, 400)}`);
  
  // 5. STYLE RULES (from vision analysis of reference)
  if (styleContract) {
    parts.push(`STYLE: ${styleContract.styleContractText.substring(0, 300)}`);
  }
  
  // 6. COMPOSITION + COMPLEXITY
  const complexityRules = {
    simple: "Simple: 1 large subject, 2-3 props, empty background",
    medium: "Medium: 1-2 subjects, 4-5 props, light background",
    detailed: "Detailed: 1-2 subjects, 6-8 props, more detail allowed"
  };
  
  const lineRules = {
    thin: "Thin lines (2-3pt)",
    medium: "Medium lines (4-5pt)",
    bold: "Bold thick lines (6-8pt)"
  };
  
  parts.push(`${complexityRules[spec.complexity]}. ${lineRules[spec.lineThickness]}.
Centered composition, 10% margins, all shapes closed for coloring.`);
  
  // 7. RETRY SIMPLIFICATION
  if (retryAttempt === 1) {
    parts.push("SIMPLER: Reduce detail, thinner lines, more white space, fewer props.");
  } else if (retryAttempt >= 2) {
    parts.push("VERY SIMPLE: Minimal detail, thin lines, maximum white space, only 2-3 props, empty background.");
  }
  
  // 8. MANDATORY NO-FILL CONSTRAINTS (from shared enforcer)
  // These are critical to prevent solid black fills in output
  parts.push(`=== OUTLINE-ONLY RULES ===
NO solid black fills anywhere. NO filled shapes.
Only black outlines on white background.
Interior areas must remain white/unfilled.
If the character has black patches (like a panda), represent them using outlines only (no filled black).
Eyes: small hollow circles or tiny dots, NOT filled.
Hair/fur: outline only, NEVER solid black.
Shadows: DO NOT draw any - leave white.`);

  // 9. FORBIDDEN (negatives - combine shared + style-specific)
  const forbidden = [
    ...NEGATIVE_PROMPT_LIST.slice(0, 8), // Core negatives from shared enforcer
  ];
  if (styleContract?.forbiddenList?.length) {
    forbidden.push(...styleContract.forbiddenList.slice(0, 3));
  }
  parts.push(`AVOID: ${forbidden.join(", ")}`);
  
  // 10. ANCHOR note
  if (isAnchor) {
    parts.push("This is the SAMPLE page - make it exemplary.");
  }
  
  const finalPrompt = parts.join("\n\n");
  
  // Safety: truncate if over limit (preserve the constraints at the end)
  if (finalPrompt.length > 3900) {
    // Find where constraints start and preserve them
    const constraintIndex = finalPrompt.indexOf("=== OUTLINE-ONLY RULES ===");
    if (constraintIndex > 0) {
      const constraints = finalPrompt.substring(constraintIndex);
      const availableLength = 3900 - constraints.length - 20;
      if (availableLength > 200) {
        return finalPrompt.substring(0, availableLength) + "\n\n" + constraints;
      }
    }
    return finalPrompt.substring(0, 3900);
  }
  
  return finalPrompt;
}

/**
 * Build character bible for Series mode
 */
export function buildCharacterBible(params: {
  characterName?: string;
  characterDescription?: string;
  styleContract: StyleContract;
}): string {
  const { characterName, characterDescription } = params;
  if (!characterName) return "";
  
  const desc = characterDescription ? characterDescription.substring(0, 80) : "";
  return `CHARACTER: "${characterName}" ${desc} - same character on every page.`;
}

/**
 * STAGE 1A: Build prompt for style extraction (vision analysis)
 */
export function buildStyleExtractionPrompt(): string {
  return `Analyze this coloring book page image carefully.

Extract a STYLE CONTRACT that can recreate this exact style.

Return JSON:
{
  "styleSummary": "One sentence describing the style",
  "styleContractText": "3-5 specific rules: line thickness, how eyes are drawn, background density, composition style",
  "forbiddenList": ["things", "that", "break", "this", "style"],
  "recommendedLineThickness": "thin" | "medium" | "bold",
  "recommendedComplexity": "simple" | "medium" | "detailed",
  "outlineRules": "How outlines are drawn",
  "backgroundRules": "Background treatment",
  "compositionRules": "Subject placement",
  "eyeRules": "How eyes/faces are drawn (important for avoiding solid fills)",
  "extractedThemeGuess": "What theme/world/setting this depicts"
}

Be SPECIFIC - these rules will generate matching pages.`;
}

/**
 * STAGE 1B: Build prompt for theme pack generation
 */
export function buildThemePackPrompt(params: {
  userTheme?: string;
  mode: "series" | "collection";
}): string {
  const { userTheme, mode } = params;

  return `Create a ThemePack for a coloring book.

${userTheme ? `Theme request: ${userTheme}` : "Create a fun kid-friendly theme based on what you see."}
Mode: ${mode === "series" ? "SERIES - same main character every page" : "COLLECTION - same world, different subjects"}

Return JSON:
{
  "setting": "Describe the world/setting (1-2 sentences)",
  "recurringProps": ["8-10", "props", "that", "appear", "throughout"],
  "motifs": ["visual", "motifs"],
  "allowedSubjects": ["subjects", "that", "fit"],
  "forbiddenElements": ["things", "to", "avoid"]${mode === "series" ? `,
  "characterName": "Main character name",
  "characterDescription": "Physical description for consistency"` : ""}
}

All pages must feel like they're in the SAME WORLD.`;
}

/**
 * STAGE 2A: Build prompt for generating scene prompts
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
  
  const complexityGuide = {
    simple: "2-3 props, empty background, single subject",
    medium: "4-5 props, light background, 1-2 subjects",
    detailed: "6-8 props, detailed background"
  };

  return `Generate ${pagesCount} SCENE PROMPTS for coloring book pages.

THEME: ${extractedThemeGuess.substring(0, 200)}
${userTheme ? `User theme: ${userTheme}` : ""}

MODE: ${mode === "series" 
  ? `SERIES - "${characterName || 'main character'}" appears in EVERY scene. ${characterDescription || ""}`
  : "COLLECTION - Same world, different subjects allowed."}

COMPLEXITY: ${complexity} (${complexityGuide[complexity]})

Each prompt needs:
- SUBJECT doing an ACTION
- SETTING within the theme world  
- 3-8 PROPS from the theme
- COMPOSITION: centered, wide margins, open areas for coloring

Return JSON:
{
  "prompts": [
    {"pageIndex": 1, "title": "Short Title", "scenePrompt": "Subject doing action in setting. Props: list them. Centered composition with margins."},
    {"pageIndex": 2, "title": "Title", "scenePrompt": "..."}
  ]
}

Rules:
- Exactly ${pagesCount} prompts
- Same world/theme throughout
- NO color words (it's a coloring book)
- Each scene unique but cohesive`;
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

Current: "${currentTitle}"
${currentPrompt.substring(0, 200)}

Theme: ${extractedThemeGuess.substring(0, 150)}
Complexity: ${complexity}

Make it more specific: clear subject + action + setting + 3-6 props + composition notes.

Return JSON:
{"title": "Improved Title", "scenePrompt": "Improved description with subject, action, setting, props, composition"}`;
}
