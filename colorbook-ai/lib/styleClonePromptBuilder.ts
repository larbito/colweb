/**
 * styleClonePromptBuilder.ts - ENHANCED Prompt builder for Style Clone generation
 * 
 * FEATURES:
 * - Novelty memory: prevents repetition of props/settings/actions
 * - Theme adherence: enforces user's theme in every scene
 * - Structure variety: alternates composition types
 * - Character bible: consistent character across storybook pages
 * 
 * 2-STAGE PIPELINE:
 * Stage 1: Vision analysis (extract-style, theme-pack) 
 * Stage 2: Generation (prompts, generate-sample, generate-remaining)
 */

import type { GenerationSpec, Complexity, LineThickness } from "./generationSpec";
import type { StyleContract, ThemePack } from "./styleClone";
import { NO_FILL_CONSTRAINTS, NEGATIVE_PROMPT_LIST } from "./coloringPagePromptEnforcer";

// ============================================================
// CHARACTER BIBLE (Enhanced for consistency)
// ============================================================

export interface CharacterBible {
  name: string;
  species: string;
  proportions: string;
  faceStyle: string;
  eyeStyle: string;
  hands: string;
  signatureAccessories: string[];
  colorPatches: string; // How to handle dark patches (outline only!)
  lineJoin: string;
}

/**
 * Build a comprehensive character bible for storybook mode
 */
export function buildCharacterBible(params: {
  characterName?: string;
  characterDescription?: string;
  styleContract: StyleContract;
}): string {
  const { characterName, characterDescription, styleContract } = params;
  if (!characterName) return "";

  // Extract character details from description
  const desc = characterDescription || "";
  
  return `=== CHARACTER BIBLE (MUST MATCH ON EVERY PAGE) ===
CHARACTER: "${characterName}"
${desc ? `DESCRIPTION: ${desc.substring(0, 150)}` : ""}

CONSISTENCY RULES (CRITICAL):
1. SAME face shape, eye style, and proportions on EVERY page
2. SAME body-to-head ratio throughout
3. Hands: ALWAYS visible, mittens/paws style, NOT detailed fingers
4. Eyes: ${styleContract.eyeRules || "hollow circles with tiny dot pupils, NEVER solid black"}
5. If character has dark patches: draw as OUTLINES ONLY (like panda markings)
6. SAME line thickness for character across all pages

DO NOT redesign the character. Only change POSE and ACTIVITY.`;
}

// ============================================================
// NOVELTY MEMORY SYSTEM
// ============================================================

/**
 * Generates diverse scene prompts avoiding repetition
 * Uses a "novelty memory" to track what's been used
 */
function generateNoveltyAwarePrompts(params: {
  extractedThemeGuess: string;
  userTheme?: string;
  mode: "series" | "collection";
  pagesCount: number;
  complexity: Complexity;
  characterName?: string;
  characterDescription?: string;
}): string {
  const { extractedThemeGuess, userTheme, mode, pagesCount, complexity, characterName, characterDescription } = params;

  // Composition types for variety
  const compositionTypes = [
    "close-up portrait framing (head and shoulders fill 70% of frame)",
    "medium shot (full body with some environment)",
    "wide establishing shot (character in full environment)",
    "action shot (character mid-movement)",
    "group scene (main character with 2-3 others)",
    "silhouette-style outline (bold simple shapes)",
    "over-the-shoulder POV",
    "bird's eye view looking down",
  ];

  // Generate instruction to avoid repetition
  const noveltyInstructions = `
NOVELTY RULES (CRITICAL - PREVENT REPETITION):
1. DO NOT repeat the same setting more than once (no two kitchen scenes, no two bedroom scenes)
2. DO NOT reuse the same props across multiple pages (if you used "ball" on page 1, don't use it again)
3. DO NOT use generic "daily routine" scenes (bed, breakfast, school) unless user specifically requested
4. Each page MUST have a UNIQUE action/activity
5. Vary compositions: use ${compositionTypes.slice(0, 4).join(", ")} across pages
6. Track what you've used and EXPLICITLY avoid it

PROP BLACKLIST (NEVER USE - too generic):
- random rocks/pebbles as filler
- generic balls/toys unless scene-specific
- cars/vehicles unless transportation scene
- leaves/nature debris unless nature scene
- food items unless eating scene

THEME ADHERENCE (CRITICAL):
The user's theme is: "${userTheme || extractedThemeGuess}"
EVERY scene MUST include elements from this theme.
${userTheme?.includes("planet") || userTheme?.includes("alien") ? 
  "EVERY scene must have alien-world elements: unusual sky, alien creatures, strange plants, floating objects, etc." : ""}
${userTheme?.includes("Valentine") || userTheme?.includes("love") ? 
  "EVERY scene must have romantic elements: hearts, flowers, gifts, couples, cupid, love letters, etc." : ""}`;

  const complexityGuide = {
    simple: "2-3 props only, empty/minimal background, single large subject filling frame",
    medium: "4-5 props, light background elements, 1-2 subjects",
    detailed: "6-8 props, more background detail allowed (still line-art only)"
  };

  const characterBlock = mode === "series" && characterName
    ? `\nMAIN CHARACTER: "${characterName}" ${characterDescription || ""}\nThis character appears in EVERY scene - same design, different activities.`
    : "";

  return `Generate ${pagesCount} UNIQUE coloring book scene prompts.

THEME/WORLD: ${extractedThemeGuess.substring(0, 300)}
${userTheme ? `USER REQUESTED: "${userTheme}" - EVERY scene must reflect this!` : ""}
${characterBlock}

MODE: ${mode === "series" ? "STORYBOOK SERIES - same character in every scene" : "COLLECTION - same world, different subjects allowed"}
COMPLEXITY: ${complexity} (${complexityGuide[complexity]})

${noveltyInstructions}

SCENE STRUCTURE (for each prompt):
1. SUBJECT: Who/what is the main focus (for series: the main character)
2. ACTION: What are they DOING (must be unique per page)
3. SETTING: WHERE (must be themed, varied, not repeated)
4. PROPS: 3-${complexity === "simple" ? "3" : complexity === "medium" ? "5" : "8"} themed items (from the theme world, not generic)
5. COMPOSITION: One of: ${compositionTypes.slice(0, 4).join(", ")}

OUTPUT FORMAT - JSON with this EXACT structure:
{
  "prompts": [
    {
      "pageIndex": 1,
      "title": "Short descriptive title",
      "scenePrompt": "Detailed description: [SUBJECT] [ACTION] in [SETTING]. Props: [themed items]. [COMPOSITION type]. Coloring book style.",
      "doNotRepeat": ["list", "props/settings", "used", "here"]
    }
  ]
}

Generate EXACTLY ${pagesCount} unique prompts. Each one must feel fresh and on-theme.`;
}

// ============================================================
// MAIN PROMPT BUILDERS
// ============================================================

/**
 * Build the FINAL prompt for image generation
 * Combines: ThemePack + ScenePrompt + StyleContract + Character + Constraints
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
  parts.push(`OUTPUT: Professional KDP-ready COLORING BOOK PAGE for children.
Pure black OUTLINES ONLY on pure white background.
NO colors, NO shading, NO gray, NO solid fills, NO textures.
Vector-like clean line art with smooth strokes.`);

  // 2. THEME/WORLD (keeps pages cohesive)
  if (themePack) {
    parts.push(`WORLD: ${themePack.setting.substring(0, 150)}
Motifs: ${themePack.motifs?.slice(0, 4).join(", ") || "themed elements"}
Props: ${themePack.recurringProps.slice(0, 5).join(", ")}`);
  }

  // 3. CHARACTER BIBLE (Series mode - critical for consistency)
  if (characterBible) {
    parts.push(characterBible);
  }

  // 4. SCENE (the actual content)
  parts.push(`SCENE: ${scenePrompt.substring(0, 500)}`);

  // 5. STYLE RULES (from vision analysis)
  if (styleContract) {
    parts.push(`STYLE RULES:
- Lines: ${styleContract.outlineRules || "medium outer contours, thinner inner details"}
- Eyes: ${styleContract.eyeRules || "outline only with tiny dot pupils, NO solid black"}
- Background: ${styleContract.backgroundRules || "minimal, 3-5 simple props"}
- Composition: ${styleContract.compositionRules || "centered subject, 10-15% margins"}`);
  }

  // 6. COMPLEXITY + COMPOSITION
  const complexityRules = {
    simple: "SIMPLE: 1 large subject fills 70% of frame, 2-3 props only, minimal/empty background",
    medium: "MEDIUM: 1-2 subjects, 4-5 props, light background elements",
    detailed: "DETAILED: 1-2 subjects, 6-8 props, more detail (still clean line-art)"
  };

  const lineRules = {
    thin: "Thin crisp lines (2-3pt equivalent)",
    medium: "Medium-weight lines (4-5pt equivalent)",
    bold: "Bold thick lines (6-8pt equivalent)"
  };

  parts.push(`${complexityRules[spec.complexity]}
${lineRules[spec.lineThickness]}

COMPOSITION:
- Main subject occupies 60-75% of page HEIGHT
- Foreground elements near bottom edge
- 10% safe margins on all sides
- Subject centered in lower-middle area
- All shapes CLOSED for coloring`);

  // 7. RETRY ADJUSTMENTS
  if (retryAttempt === 1) {
    parts.push(`RETRY FIX #1: 
- THINNER lines throughout
- FEWER props (reduce by half)
- MORE white space
- SIMPLER shapes
- ABSOLUTELY no solid black areas`);
  } else if (retryAttempt >= 2) {
    parts.push(`RETRY FIX #2 (CRITICAL):
- MINIMAL detail only
- THIN lines throughout
- MAXIMUM white space
- Only 2-3 essential props
- Empty/white background
- NO fills, NO patches, NO solid black anywhere`);
  }

  // 8. MANDATORY OUTLINE-ONLY CONSTRAINTS
  parts.push(`=== OUTLINE-ONLY RULES (MANDATORY) ===
NO solid black fills ANYWHERE - not even tiny areas.
Every shape must be an OUTLINE only.
Interior areas must remain WHITE/unfilled for coloring.

DARK FEATURES (pandas, skunks, dark fur):
- Draw dark patches as boundary LINES only
- Interior of patches must remain WHITE
- Do NOT fill with black or gray

EYES:
- Small hollow circles with white centers
- Tiny dot pupils allowed (1-2px max)
- NEVER solid black filled eyes

HAIR/FUR:
- Individual strands or outline shapes
- NEVER solid black masses`);

  // 9. FORBIDDEN LIST
  const forbidden = [
    ...NEGATIVE_PROMPT_LIST.slice(0, 10),
    ...(styleContract?.forbiddenList?.slice(0, 3) || [])
  ];
  parts.push(`AVOID: ${forbidden.join(", ")}`);

  // 10. ANCHOR note
  if (isAnchor) {
    parts.push("This is the SAMPLE/ANCHOR page - make it exemplary. This sets the quality bar for all pages.");
  }

  const finalPrompt = parts.join("\n\n");

  // Truncate if over limit while preserving critical constraints
  if (finalPrompt.length > 3900) {
    const constraintIndex = finalPrompt.indexOf("=== OUTLINE-ONLY RULES");
    if (constraintIndex > 0) {
      const constraints = finalPrompt.substring(constraintIndex);
      const availableLength = 3900 - constraints.length - 50;
      if (availableLength > 300) {
        return finalPrompt.substring(0, availableLength) + "\n\n" + constraints;
      }
    }
    return finalPrompt.substring(0, 3900);
  }

  return finalPrompt;
}

/**
 * STAGE 1A: Build prompt for style extraction (vision analysis)
 */
export function buildStyleExtractionPrompt(): string {
  return `Analyze this coloring book page image carefully.

Extract a STYLE CONTRACT that will recreate this exact style.

Analyze:
1. LINE WORK: thickness, consistency, stroke ends
2. COMPOSITION: subject position, margins, fill ratio
3. COMPLEXITY: prop count, detail level
4. EYES/FACE: how drawn (critical for avoiding solid fills)
5. BACKGROUND: density, element types
6. THEME: setting, motifs, visual vocabulary

Return JSON:
{
  "styleSummary": "One sentence style description",
  "styleContractText": "5-8 specific rules to recreate this style",
  "forbiddenList": ["things", "that", "break", "this", "style"],
  "recommendedLineThickness": "thin" | "medium" | "bold",
  "recommendedComplexity": "simple" | "medium" | "detailed",
  "outlineRules": "How outlines are drawn",
  "backgroundRules": "Background treatment",
  "compositionRules": "Subject placement and margins",
  "eyeRules": "How eyes are drawn (MUST be outline-only)",
  "extractedThemeGuess": "Detailed theme/world/setting description with recurring motifs"
}

Be EXTREMELY specific - these rules generate matching pages.`;
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

${userTheme ? `Theme request: "${userTheme}"` : "Create a kid-friendly theme based on what you see."}
Mode: ${mode === "series" ? "STORYBOOK - same main character every page" : "COLLECTION - same world, different subjects"}

Return JSON:
{
  "setting": "Describe the world/setting (2-3 sentences with specific visual details)",
  "recurringProps": ["10-12", "themed", "props", "that", "appear", "throughout"],
  "motifs": ["visual", "motifs", "patterns", "design", "elements"],
  "allowedSubjects": ["types", "of", "subjects", "that", "fit", "the", "theme"],
  "forbiddenElements": ["things", "that", "don't", "belong"]${mode === "series" ? `,
  "characterName": "Main character name",
  "characterDescription": "Detailed physical description for consistency"` : ""}
}

All pages must feel like they're in the SAME cohesive world.`;
}

/**
 * STAGE 2A: Build prompt for generating scene prompts (with novelty memory)
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
  return generateNoveltyAwarePrompts(params);
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

  const propCount = complexity === "simple" ? "2-3" : complexity === "medium" ? "4-5" : "6-8";

  return `Improve this coloring book scene prompt.

Current: "${currentTitle}"
${currentPrompt.substring(0, 300)}

Theme: ${extractedThemeGuess.substring(0, 200)}
Complexity: ${complexity}

Make it more specific with:
1. Clear SUBJECT (who/what)
2. Specific ACTION (what they're doing)
3. Themed SETTING (where - must match theme)
4. ${propCount} PROPS from the theme world (not generic items)
5. COMPOSITION note (close-up, wide shot, etc.)

Return JSON:
{"title": "Better Title", "scenePrompt": "Detailed description with all 5 elements above"}`;
}

/**
 * Build prompt evaluation prompt (checks theme match + repetition)
 */
export function buildPromptEvaluationPrompt(params: {
  prompts: { title: string; scenePrompt: string }[];
  userTheme: string;
}): string {
  const { prompts, userTheme } = params;

  return `Evaluate these coloring book prompts for quality.

USER THEME: "${userTheme}"

PROMPTS TO EVALUATE:
${prompts.map((p, i) => `${i + 1}. ${p.title}: ${p.scenePrompt.substring(0, 150)}...`).join("\n")}

SCORING CRITERIA:
1. THEME MATCH (0-10): Does each scene reflect the user's theme?
2. REPETITION (0-10): Are scenes diverse? (10 = all unique, 0 = many repeats)
3. PROP VARIETY (0-10): Are props themed and varied? (not generic rocks/balls/leaves)
4. COMPOSITION VARIETY (0-10): Different framings used?

Return JSON:
{
  "overallScore": 0-10,
  "themeMatch": 0-10,
  "repetitionScore": 0-10,
  "propVariety": 0-10,
  "compositionVariety": 0-10,
  "issues": ["list", "of", "specific", "problems"],
  "passesQuality": true/false (true if overallScore >= 7)
}`;
}
