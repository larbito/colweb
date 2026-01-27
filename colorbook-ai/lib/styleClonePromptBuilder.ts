/**
 * styleClonePromptBuilder.ts - Prompt builder for Style Clone generation
 * Builds FINAL prompts with strict style contract injection
 */

import type { GenerationSpec, Complexity, LineThickness } from "./generationSpec";
import type { StyleContract, ThemePack } from "./styleClone";

/**
 * Complexity rules for prompt injection
 */
const COMPLEXITY_RULES: Record<Complexity, string> = {
  simple: `
COMPLEXITY LEVEL: SIMPLE (Ages 3-6)
- ONE main subject only, large and clear
- 2-4 simple props maximum
- Very simple or EMPTY background
- Large open areas for easy coloring
- Big, chunky shapes - no tiny details`,
  
  medium: `
COMPLEXITY LEVEL: MEDIUM (Ages 6-12)
- 1-2 subjects maximum
- 4-6 props and simple background elements
- Moderate detail level
- Clear separation between elements
- Some small details but still easy to color`,
  
  detailed: `
COMPLEXITY LEVEL: DETAILED (Older kids/Adults)
- 1-2 main subjects with more detail
- 6-10 props and background elements
- More intricate patterns allowed
- Still NO shading or gradients - only outlines
- Complex but clean compositions`,
};

/**
 * Line thickness rules for prompt injection
 */
const LINE_THICKNESS_RULES: Record<LineThickness, string> = {
  thin: `
LINE WEIGHT: THIN
- Outer contours: 2-3pt weight
- Inner details: 1-2pt weight  
- Delicate, fine lines throughout
- Good for detailed work`,
  
  medium: `
LINE WEIGHT: MEDIUM
- Outer contours: 4-5pt weight
- Inner details: 2-3pt weight
- Balanced line weights
- Standard coloring book style`,
  
  bold: `
LINE WEIGHT: BOLD
- Outer contours: 6-8pt weight
- Inner details: 4-5pt weight
- Thick, forgiving lines
- Easy for young children to color inside`,
};

/**
 * MANDATORY KDP print-safe suffix - ALWAYS appended to EVERY prompt
 * ULTRA-AGGRESSIVE about black and white because DALL-E tends to ignore these instructions
 */
const MANDATORY_KDP_SUFFIX = `

=== CRITICAL: THIS MUST BE A COLORING BOOK PAGE ===

***** BLACK AND WHITE LINE ART ONLY *****
***** NO COLORS WHATSOEVER *****
***** NO SHADING WHATSOEVER *****

This is a COLORING BOOK PAGE for children to color in with crayons.
The image MUST be BLACK LINES on WHITE PAPER - nothing else.

VISUAL STYLE - EXACTLY LIKE A PRINTED COLORING BOOK:
- Draw ONLY black outlines/lines on white background
- Lines should be like pen drawings - clean, crisp, black
- Leave ALL interior areas EMPTY WHITE for coloring
- Think of it as a line drawing that will be photocopied

ABSOLUTELY REQUIRED:
✓ ONLY black lines (#000000) on pure white (#FFFFFF)
✓ Outline-only style - like a rubber stamp or line drawing
✓ ALL shapes are closed outlines with WHITE interiors
✓ Medium-thick lines that print clearly
✓ Centered composition with margins

***** FORBIDDEN - DO NOT INCLUDE *****:
✗ ANY COLOR AT ALL - no blue, red, yellow, green, pink, orange, purple, etc.
✗ ANY GRAY - no light gray, dark gray, silver, or any gray tones
✗ ANY SHADING - no soft shadows, gradients, or tonal variations
✗ ANY FILLS - no solid black areas, no filled shapes
✗ ANY TEXTURES - no crosshatching, stippling, dots, patterns
✗ ANY BACKGROUNDS - no colored backgrounds, no gray backgrounds

EYES - VERY IMPORTANT:
- Draw eyes as SIMPLE CIRCLES or OVALS - outline only
- Pupil = TINY DOT (almost invisible), NOT a filled circle
- NO solid black in eyes
- NO detailed irises
- Think: cartoon eyes, just outlines

HAIR:
- Draw hair as individual LINE STROKES - not solid shapes
- Hair interior must be WHITE
- NO filled/solid black hair

The output MUST look like a page from a Dollar Store coloring book - 
simple black outlines on white paper that a child will color in.`;

/**
 * Build CHARACTER BIBLE for Series mode
 */
export function buildCharacterBible(params: {
  characterName?: string;
  characterDescription?: string;
  styleContract: StyleContract;
}): string {
  const { characterName, characterDescription, styleContract } = params;
  
  if (!characterName) return "";
  
  return `
=== CHARACTER BIBLE (MUST MATCH EXACTLY ON EVERY PAGE) ===
Character Name: ${characterName}
${characterDescription ? `Description: ${characterDescription}` : ""}

Visual Rules from Reference:
- Line style: ${styleContract.outlineRules}
- Eye treatment: ${styleContract.eyeRules}
- Proportions and features must remain IDENTICAL across all pages
- The character must be IMMEDIATELY recognizable as the same individual

This character appears in EVERY scene. Do not alter their appearance.`;
}

/**
 * Build the COMPLETE FINAL prompt for image generation
 * This is what actually gets sent to the image model
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
  
  // 1. WORLD/THEME CONSISTENCY (from themePack or styleContract)
  if (themePack) {
    parts.push(`=== WORLD & THEME CONSISTENCY ===
Setting: ${themePack.setting}
Visual motifs: ${themePack.motifs.join(", ")}
Recurring elements: ${themePack.recurringProps.join(", ")}
Stay within this world - all elements must fit the established theme.`);
  } else if (styleContract?.extractedThemeGuess) {
    parts.push(`=== THEME FROM REFERENCE ===
${styleContract.extractedThemeGuess}
Generate a scene that fits within this same world/theme.`);
  }
  
  // 2. CHARACTER BIBLE (for Series mode)
  if (characterBible) {
    parts.push(characterBible);
  }
  
  // 3. SCENE DESCRIPTION (user/AI generated)
  parts.push(`=== SCENE TO DRAW ===
${scenePrompt}`);
  
  // 4. MATCH REFERENCE STYLE
  if (styleContract) {
    parts.push(`=== MATCH REFERENCE STYLE PRECISELY ===
Style Summary: ${styleContract.styleSummary}

STYLE RULES TO FOLLOW:
${styleContract.styleContractText}

Composition: ${styleContract.compositionRules}
Background: ${styleContract.backgroundRules}
Lines: ${styleContract.outlineRules}
Eyes/Face: ${styleContract.eyeRules}`);
  }
  
  // 5. COMPLEXITY RULES
  parts.push(COMPLEXITY_RULES[spec.complexity]);
  
  // 6. LINE THICKNESS RULES
  parts.push(LINE_THICKNESS_RULES[spec.lineThickness]);
  
  // 7. ANCHOR-SPECIFIC (first page)
  if (isAnchor) {
    parts.push(`
=== ANCHOR IMAGE (PAGE 1) ===
This is the ANCHOR/SAMPLE image that defines the style for all subsequent pages.
It must be EXEMPLARY - perfect line work, perfect composition, zero fills.
This will be used as a visual reference for style consistency.`);
  }
  
  // 8. RETRY-SPECIFIC (stricter rules on retries)
  if (retryAttempt > 0) {
    parts.push(buildRetryStricterRules(retryAttempt));
  }
  
  // 9. FORBIDDEN ELEMENTS
  if (styleContract?.forbiddenList?.length) {
    parts.push(`=== FORBIDDEN ELEMENTS (from reference analysis) ===
DO NOT include any of these:
${styleContract.forbiddenList.map(f => `- ${f}`).join("\n")}`);
  }
  
  // 10. ALWAYS APPEND MANDATORY KDP SUFFIX
  parts.push(MANDATORY_KDP_SUFFIX);
  
  return parts.join("\n\n");
}

/**
 * Build stricter rules for retry attempts
 */
function buildRetryStricterRules(attempt: number): string {
  if (attempt === 1) {
    return `
=== RETRY #1 - PREVIOUS IMAGE HAD TOO MUCH BLACK ===
The previous attempt was REJECTED due to excessive black areas.
ADDITIONAL STRICT REQUIREMENTS:
- Make ALL lines thinner than before
- Eyes: ONLY tiny outline, pupils must be barely visible dots
- Reduce props to 3-4 maximum
- Leave more white space
- NO decorative patterns
- Simplify everything`;
  }
  
  if (attempt >= 2) {
    return `
=== RETRY #${attempt} - STILL TOO MUCH BLACK ===
Multiple attempts have failed print-safe checks.
EXTREME SIMPLIFICATION REQUIRED:
- Use the THINNEST possible lines
- Eyes: simple circles, NO pupils at all
- Only 2-3 props maximum
- EMPTY background - no ground, no sky details
- Remove ALL decorative elements
- Maximum white space
- The simplest possible version of this scene
Target: UNDER 15% black pixels`;
  }
  
  return "";
}

/**
 * Build prompt for generating scene prompts (Step 3)
 * Uses extracted theme to ensure consistency
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
    simple: "2-4 props per scene, minimal/empty background, single clear subject, large shapes",
    medium: "4-6 props, simple background elements, 1-2 subjects, moderate detail",
    detailed: "6-10 props, richer backgrounds, more intricate compositions",
  };
  
  const modeInstructions = mode === "series"
    ? `SERIES MODE: The character "${characterName || 'main character'}" MUST appear in EVERY scene as the primary subject. 
       Character description: ${characterDescription || 'As shown in reference'}
       Each scene shows this SAME character doing different activities in the same world.`
    : `COLLECTION MODE: Pages share the same STYLE and THEME/WORLD but can feature different subjects.
       All subjects should fit within the established world/setting.`;

  return `Generate ${pagesCount} unique scene prompts for a coloring book that MATCHES the reference image's theme.

=== THEME EXTRACTED FROM REFERENCE IMAGE ===
${extractedThemeGuess}
${userTheme ? `\nUser's additional theme input: ${userTheme}` : ""}

=== MODE ===
${modeInstructions}

=== COMPLEXITY ===
${complexity.toUpperCase()}: ${complexityGuide[complexity]}

=== WHAT EACH PROMPT MUST INCLUDE ===
Every scene prompt must be 5-10 lines and include:
1. SUBJECT: Who/what is the main focus (${mode === "series" ? `always ${characterName || "the main character"}` : "varies within theme"})
2. ACTION: What they are doing (active, engaging pose)
3. SETTING: Where specifically in this world (fits extracted theme)
4. PROPS: 3-8 specific props that fit the theme (list them)
5. COMPOSITION: "Centered subject with 15% margins, [foreground/background notes]"

=== OUTPUT FORMAT ===
Return a JSON object with this EXACT structure:
{
  "prompts": [
    {
      "pageIndex": 1,
      "title": "Short 3-5 word title",
      "scenePrompt": "Detailed 5-10 line scene description following the structure above"
    },
    {
      "pageIndex": 2,
      "title": "Another title",
      "scenePrompt": "Another detailed scene..."
    }
  ]
}

=== RULES ===
- Generate EXACTLY ${pagesCount} prompts
- ALL scenes must feel like they belong in the SAME WORLD as the reference
- NO references to color (this is a coloring book)
- NO shading or lighting descriptions
- Each scene must be UNIQUE and interesting
- Progress through varied activities and settings within the theme
- Keep descriptions specific but focused on WHAT to draw, not style`;
}

/**
 * Build prompt for improving an existing scene prompt
 */
export function buildImprovePromptPrompt(params: {
  currentPrompt: string;
  currentTitle: string;
  extractedThemeGuess: string;
  complexity: Complexity;
}): string {
  const { currentPrompt, currentTitle, extractedThemeGuess, complexity } = params;
  
  return `Improve this coloring book scene prompt while keeping its core idea and ensuring it matches the reference theme.

CURRENT TITLE: ${currentTitle}
CURRENT PROMPT:
${currentPrompt}

REFERENCE THEME TO MATCH:
${extractedThemeGuess}

COMPLEXITY: ${complexity}

IMPROVE BY:
1. Adding more specific, vivid details
2. Ensuring clear SUBJECT + ACTION + SETTING + PROPS + COMPOSITION structure
3. Including 3-8 specific props that fit the theme
4. Adding explicit composition notes (centered, margins, etc.)
5. Making it more visually engaging while keeping it colorable
6. Ensuring it fits the reference theme/world

OUTPUT FORMAT (JSON):
{
  "title": "Improved title (3-5 words)",
  "scenePrompt": "Improved detailed prompt (5-10 lines)"
}

Keep the same general scene concept, just enhance it to be more detailed and theme-consistent.`;
}

/**
 * Build prompt for generating a ThemePack
 */
export function buildThemePackPrompt(params: {
  userTheme?: string;
  mode: "series" | "collection";
}): string {
  const { userTheme, mode } = params;

  const modeInstructions = mode === "series"
    ? "Create a recurring main CHARACTER that will appear in every scene."
    : "Create a collection of related subjects that share a common theme/world.";

  return `Generate a detailed theme pack for a coloring book.

${userTheme ? `USER'S THEME REQUEST: ${userTheme}` : "GENERATE A CREATIVE THEME based on the reference image or suggest something fun."}

MODE: ${mode.toUpperCase()}
${modeInstructions}

OUTPUT a JSON object with this structure:
{
  "setting": "Detailed description of the world/setting (e.g., 'A whimsical underwater kingdom with coral castles')",
  "recurringProps": ["list", "of", "8-12", "props", "that", "appear", "throughout"],
  "motifs": ["list", "of", "5-8", "visual", "motifs", "or", "patterns"],
  "allowedSubjects": ["list", "of", "subjects", "that", "fit", "this", "theme"],
  "forbiddenElements": ["things", "that", "dont", "fit", "this", "theme"]${mode === "series" ? `,
  "characterName": "Name of the main character",
  "characterDescription": "Detailed physical description of the main character that must remain consistent"` : ""}
}

Make the theme cohesive, imaginative, and suitable for a children's coloring book.`;
}

/**
 * Build prompt for style extraction (vision analysis)
 */
export function buildStyleExtractionPrompt(): string {
  return `Analyze this reference coloring page image and extract a detailed style contract.

You must output a JSON object with the following structure:

{
  "styleSummary": "A brief 1-2 sentence human-readable description of the style",
  "styleContractText": "Detailed rules (5-10 lines) that describe exactly how to recreate this style",
  "forbiddenList": ["list", "of", "elements", "to", "avoid"],
  "recommendedLineThickness": "thin" | "medium" | "bold",
  "recommendedComplexity": "simple" | "medium" | "detailed",
  "outlineRules": "Description of outline thickness and style",
  "backgroundRules": "Description of background density and treatment",
  "compositionRules": "Description of how subjects are framed and composed",
  "eyeRules": "Description of how eyes and facial features are drawn to avoid fills",
  "extractedThemeGuess": "Detailed paragraph about the theme/world/setting depicted"
}

Focus on:
1. Line weight and thickness patterns
2. Level of detail and complexity
3. How eyes, faces, and dark areas are handled (avoiding solid fills)
4. Background treatment (empty vs. detailed)
5. Overall composition style
6. Theme/world/setting depicted
7. Any distinctive artistic choices

Be specific and actionable - these rules will be used to generate matching pages.`;
}
