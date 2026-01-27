/**
 * styleClonePromptBuilder.ts - Prompt builder for Style Clone generation
 * Extends the base prompt builder with style contract injection
 */

import type { GenerationSpec, Complexity, LineThickness } from "./generationSpec";
import type { StyleContract, ThemePack } from "./styleClone";

/**
 * Complexity rules for prompt injection
 */
const COMPLEXITY_RULES: Record<Complexity, string> = {
  simple: `
COMPLEXITY (SIMPLE):
- ONE main subject only
- 2-4 simple props maximum
- Very simple or NO background elements
- Large open areas for easy coloring
- Suitable for ages 3-6`,
  
  medium: `
COMPLEXITY (MEDIUM):
- 1-2 subjects
- 4-8 props and background elements
- Light background with simple shapes
- Moderate detail level
- Suitable for ages 6-12`,
  
  detailed: `
COMPLEXITY (DETAILED):
- 1-2 main subjects with more detail
- 8-12 props and background elements
- More intricate patterns
- Still NO shading or gradients - only outlines
- Suitable for older children and adults`,
};

/**
 * Line thickness rules for prompt injection
 */
const LINE_THICKNESS_RULES: Record<LineThickness, string> = {
  thin: `
LINE THICKNESS (THIN):
- Outer contour lines: MEDIUM weight (2-3pt)
- Inner detail lines: THIN delicate weight (1pt)
- Fine details visible but printable`,
  
  medium: `
LINE THICKNESS (MEDIUM):
- Outer contour lines: THICK weight (4-5pt)  
- Inner detail lines: MEDIUM weight (2-3pt)
- Balanced for most age groups`,
  
  bold: `
LINE THICKNESS (BOLD):
- Outer contour lines: VERY THICK weight (6-8pt)
- Inner detail lines: THICK weight (4-5pt)
- Forgiving for younger children`,
};

/**
 * Mandatory print-safe suffix - ALWAYS appended
 */
const KDP_PRINT_SAFE_SUFFIX = `

=== MANDATORY PRINT-SAFE REQUIREMENTS ===
OUTPUT STYLE: Kids coloring book page, black line art on pure white background

REQUIRED:
✓ Pure BLACK lines (#000000) on pure WHITE background (#FFFFFF) ONLY
✓ All shapes must be CLOSED with continuous outlines
✓ Thick, clean outlines suitable for crayons/markers
✓ Subject centered with safe margins from edges
✓ Portrait orientation

STRICTLY FORBIDDEN (will cause rejection):
✗ ANY color - not even gray, beige, or off-white
✗ ANY shading, gradients, or halftones
✗ ANY crosshatching or stippling
✗ ANY large solid black filled areas
✗ ANY text, letters, numbers, logos, or watermarks
✗ Sideways or landscape orientation

SPECIAL RULES FOR BLACK AREAS:
- Pupils/eyes: small dots only, NOT fully filled circles
- Hair: outline only, NOT solid black
- Shadows: DO NOT draw any shadows at all
- Dark objects: outline only, leave interior white

The final image must pass a print-safe check where:
1. Converting to grayscale produces ONLY pure black and white
2. Black pixel ratio is under the complexity threshold
3. No large contiguous black regions exist`;

/**
 * Build the complete prompt for style clone generation
 */
export function buildStyleClonePrompt(params: {
  scenePrompt: string;
  themePack: ThemePack | null;
  styleContract: StyleContract | null;
  spec: GenerationSpec;
  isAnchor?: boolean;
}): string {
  const { scenePrompt, themePack, styleContract, spec, isAnchor } = params;
  
  const parts: string[] = [];
  
  // Theme pack consistency paragraph
  if (themePack) {
    parts.push(`
THEME & WORLD CONSISTENCY:
Setting: ${themePack.setting}
Recurring props: ${themePack.recurringProps.join(", ")}
Visual motifs: ${themePack.motifs.join(", ")}
${themePack.characterName ? `Main character: ${themePack.characterName}` : ""}
${themePack.characterDescription ? `Character description: ${themePack.characterDescription}` : ""}
Stay within this world - all elements must fit the theme.`);
  }
  
  // Scene prompt (user/AI generated)
  parts.push(`
SCENE DESCRIPTION:
${scenePrompt}`);
  
  // Style contract (extracted from reference)
  if (styleContract) {
    parts.push(`
=== MATCH THE REFERENCE STYLE PRECISELY ===
${styleContract.styleSummary}

STYLE RULES TO FOLLOW:
${styleContract.styleContractText}

Outline rules: ${styleContract.outlineRules}
Background: ${styleContract.backgroundRules}
Composition: ${styleContract.compositionRules}
Eyes/Face: ${styleContract.eyeRules}

FORBIDDEN ELEMENTS:
${styleContract.forbiddenList.map(f => `- ${f}`).join("\n")}`);
  }
  
  // Complexity rules
  parts.push(COMPLEXITY_RULES[spec.complexity]);
  
  // Line thickness rules
  parts.push(LINE_THICKNESS_RULES[spec.lineThickness]);
  
  // Anchor-specific instructions
  if (isAnchor) {
    parts.push(`
=== ANCHOR IMAGE (FIRST PAGE) ===
This is the ANCHOR image that will define the style for all subsequent pages.
Make it exemplary - it will be used as a reference for style consistency.`);
  }
  
  // Always append KDP print-safe suffix
  parts.push(KDP_PRINT_SAFE_SUFFIX);
  
  return parts.join("\n");
}

/**
 * Build stricter prompt suffix for retry after failed print-safe check
 */
export function buildStricterStyleCloneSuffix(failureReason: string): string {
  return `

=== STRICT RETRY - PREVIOUS ATTEMPT FAILED ===
Failure reason: ${failureReason}

ADDITIONAL STRICT REQUIREMENTS:
- ABSOLUTELY NO solid black areas anywhere
- Eyes/pupils must be TINY dots, not filled circles
- Hair must be OUTLINE ONLY with individual strands
- All dark objects must be WHITE inside with black outline only
- Remove ALL shadow shapes completely
- Simplify the background even more
- Reduce props to 3-5 maximum
- When in doubt, leave it WHITE

Target: less than 10% of pixels should be black after binarization.`;
}

/**
 * Build a prompt for style extraction from reference image
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
  "eyeRules": "Description of how eyes and facial features are drawn to avoid fills"
}

Focus on:
1. Line weight and thickness patterns
2. Level of detail and complexity
3. How eyes, faces, and dark areas are handled (avoiding solid fills)
4. Background treatment (empty vs. detailed)
5. Overall composition style
6. Any distinctive artistic choices

Be specific and actionable - these rules will be used to generate matching pages.`;
}

/**
 * Build a prompt for theme pack generation
 */
export function buildThemePackPrompt(params: {
  userTheme?: string;
  mode: "series" | "collection";
}): string {
  const { userTheme, mode } = params;
  
  const modeInstructions = mode === "series"
    ? `This is SERIES mode - all pages feature the SAME main character in different scenes.
       You must define a specific character that will appear consistently on every page.`
    : `This is COLLECTION mode - pages share the same STYLE and THEME but can have different subjects.
       Define the world/setting, but subjects can vary within that world.`;
  
  return `Generate a theme pack for a coloring book.
${userTheme ? `User-provided theme: "${userTheme}"` : "No theme provided - suggest a creative, appealing theme."}

${modeInstructions}

Output a JSON object with this structure:

{
  "setting": "Description of the world/setting (1-2 sentences)",
  "recurringProps": ["5-10 props that appear throughout the book"],
  "motifs": ["3-5 visual motifs or patterns"],
  "allowedSubjects": ["5-10 types of subjects appropriate for this theme"],
  "forbiddenElements": ["elements that don't fit this theme"],
  ${mode === "series" ? `"characterName": "Name of the main character",
  "characterDescription": "Detailed visual description of the character"` : ""}
}

Make it:
- Child-friendly and appealing
- Cohesive and consistent
- Rich enough for 40-80 unique scenes
- Focused on the provided theme (or a creative original if none given)`;
}

/**
 * Build a prompt for generating scene prompts
 */
export function buildScenePromptsPrompt(params: {
  themePack: ThemePack;
  mode: "series" | "collection";
  pagesCount: number;
  complexity: Complexity;
}): string {
  const { themePack, mode, pagesCount, complexity } = params;
  
  const complexityGuide = {
    simple: "2-4 props per scene, minimal background, single clear subject",
    medium: "4-8 props, light background elements, 1-2 subjects",
    detailed: "8-12 props, rich backgrounds, intricate but clear compositions",
  };
  
  return `Generate ${pagesCount} unique scene prompts for a coloring book.

THEME PACK:
- Setting: ${themePack.setting}
- Recurring props: ${themePack.recurringProps.join(", ")}
- Motifs: ${themePack.motifs.join(", ")}
- Allowed subjects: ${themePack.allowedSubjects.join(", ")}
${mode === "series" && themePack.characterName ? `- Main character: ${themePack.characterName} - ${themePack.characterDescription}` : ""}

MODE: ${mode === "series" ? "SERIES - Same character appears in every scene" : "COLLECTION - Same style, different subjects allowed"}

COMPLEXITY: ${complexity.toUpperCase()} - ${complexityGuide[complexity]}

OUTPUT FORMAT - Return a JSON object with a "prompts" array:
{
  "prompts": [
    {
      "pageIndex": 1,
      "title": "Short scene title (3-5 words)",
      "scenePrompt": "Detailed scene description (5-10 lines) including: SUBJECT, ACTION, SETTING, PROPS (3-8 items), COMPOSITION"
    },
    {
      "pageIndex": 2,
      "title": "Another scene title",
      "scenePrompt": "Another detailed scene description..."
    }
  ]
}

IMPORTANT: You MUST return exactly ${pagesCount} prompts in the "prompts" array.

RULES:
- Each scene must be UNIQUE and interesting
- Stay within the theme world
- ${mode === "series" ? `${themePack.characterName} must be the main subject in EVERY scene` : "Subjects can vary within the allowed list"}
- Progress through varied activities and settings
- Keep descriptions specific but not overly long
- NO references to color (this is a coloring book)
- NO shading or lighting descriptions`;
}

/**
 * Build a prompt for improving an existing scene prompt
 */
export function buildImprovePromptPrompt(params: {
  currentPrompt: string;
  currentTitle: string;
  themePack: ThemePack;
  complexity: Complexity;
}): string {
  const { currentPrompt, currentTitle, themePack, complexity } = params;
  
  return `Improve this coloring book scene prompt while keeping its core idea.

CURRENT TITLE: ${currentTitle}
CURRENT PROMPT:
${currentPrompt}

THEME CONTEXT:
- Setting: ${themePack.setting}
- Recurring props: ${themePack.recurringProps.join(", ")}
- Complexity level: ${complexity}

IMPROVE BY:
1. Adding more specific, interesting details
2. Ensuring clear subject/action/setting structure
3. Including 3-8 props from the theme
4. Clarifying the composition
5. Making it more visually engaging for coloring

OUTPUT FORMAT (JSON):
{
  "title": "Improved title",
  "scenePrompt": "Improved detailed prompt"
}

Keep the same general scene concept, just enhance it.`;
}

