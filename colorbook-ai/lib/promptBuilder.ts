/**
 * promptBuilder.ts - Canonical prompt builder for coloring book generation
 * Always appends strict KDP-style suffix to ensure print-safe output
 * 
 * All prompts include mandatory no-fill constraints from coloringPagePromptEnforcer.
 */

import type { GenerationSpec, Complexity, LineThickness } from "./generationSpec";
import type { CharacterLock } from "./schemas";
import { NEGATIVE_PROMPT_LIST } from "./coloringPagePromptEnforcer";

/**
 * Complexity descriptions for prompt injection
 */
const COMPLEXITY_RULES: Record<Complexity, string> = {
  simple: `
COMPLEXITY (SIMPLE):
- ONE main subject only (the character)
- 2-4 simple props maximum (e.g., a flower, a ball, a star)
- Very simple or NO background elements
- Large open areas for easy coloring
- Suitable for ages 3-6`,
  
  medium: `
COMPLEXITY (MEDIUM):
- 1-2 subjects (main character + optional companion)
- 4-8 props and background elements
- Light background with simple shapes
- Moderate detail level
- Suitable for ages 6-12`,
  
  detailed: `
COMPLEXITY (DETAILED):
- 1-2 main subjects with more detail
- 8-12 props and background elements
- More intricate patterns in clothing/accessories
- Still NO shading or gradients - only outlines
- Suitable for older children and adults`,
};

/**
 * Line thickness descriptions for prompt injection
 */
const LINE_THICKNESS_RULES: Record<LineThickness, string> = {
  thin: `
LINE THICKNESS (THIN):
- Outer contour lines: MEDIUM weight (2-3pt equivalent)
- Inner detail lines: THIN delicate weight (1pt equivalent)
- Fine details visible but still printable`,
  
  medium: `
LINE THICKNESS (MEDIUM):
- Outer contour lines: THICK weight (4-5pt equivalent)  
- Inner detail lines: MEDIUM weight (2-3pt equivalent)
- Balanced for most age groups`,
  
  bold: `
LINE THICKNESS (BOLD):
- Outer contour lines: VERY THICK weight (6-8pt equivalent)
- Inner detail lines: THICK weight (4-5pt equivalent)
- Forgiving for younger children, easy to color inside`,
};

/**
 * Mandatory KDP print-safe suffix - ALWAYS appended
 * Includes explicit no-fill constraints to prevent solid black areas
 */
const KDP_PRINT_SAFE_SUFFIX = `

=== MANDATORY PRINT-SAFE REQUIREMENTS ===
OUTPUT STYLE: Kids coloring book page, black line art on pure white background

REQUIRED:
✓ Pure BLACK lines (#000000) on pure WHITE background (#FFFFFF) ONLY
✓ All shapes must be CLOSED with continuous outlines
✓ Thick, clean outlines suitable for crayons/markers
✓ Character centered with safe margins from edges
✓ Portrait orientation

=== OUTLINE-ONLY CONSTRAINTS (MANDATORY) ===
NO solid black fills anywhere.
NO filled shapes.
Only black outlines on white background.
Interior areas must remain white/unfilled.
If the character has black patches (like a panda), represent them using outlines only (no filled black).

STRICTLY FORBIDDEN (will cause rejection):
✗ ANY color - not even gray, beige, or off-white
✗ ANY shading, gradients, or halftones
✗ ANY crosshatching or stippling
✗ ANY large solid black filled areas (shadows, silhouettes, dark backgrounds)
✗ ANY solid black fills - everything must be OUTLINES ONLY
✗ ANY text, letters, numbers, logos, or watermarks
✗ Sideways or landscape orientation
✗ Complex overlapping elements that create dark masses

SPECIAL RULES FOR BLACK AREAS:
- Pupils/eyes: small hollow circles or tiny dots only, NOT fully filled circles
- Hair: outline only with individual strands, NEVER solid black
- Dark fur (pandas, skunks): use double-line outlines, keep interiors WHITE
- Shadows: DO NOT draw any shadows at all - leave the area white
- Dark objects (shoes, hats): outline only, leave interior white
- Black clothing: outline the shape only, interior stays white

The final image must pass a print-safe check where:
1. Converting to grayscale and thresholding produces ONLY pure black and white
2. Black pixel ratio is less than 12% of total image
3. No large contiguous black regions exist`;

/**
 * Build a complete prompt with all rules injected
 */
export function buildPrompt(params: {
  sceneDescription: string;
  characterLock?: CharacterLock | null;
  spec: GenerationSpec;
}): string {
  const { sceneDescription, characterLock, spec } = params;
  
  const parts: string[] = [];
  
  // Scene description
  parts.push(`SCENE: ${sceneDescription}`);
  
  // Character lock rules
  if (characterLock) {
    parts.push(`
CHARACTER REFERENCE (MUST MATCH EXACTLY):
- Name: ${characterLock.canonicalName}
- Body proportions: ${characterLock.visualRules.proportions}
- Face: ${characterLock.visualRules.face}
- Distinguishing features: ${characterLock.visualRules.uniqueFeatures.join(", ")}
- Outfit/appearance: ${characterLock.visualRules.outfit}

The character MUST look IDENTICAL to the reference sheet - same face shape, same proportions, same features, same outfit. Do not alter ANY visual aspect of the character.`);
  }
  
  // Complexity rules
  parts.push(COMPLEXITY_RULES[spec.complexity]);
  
  // Line thickness rules  
  parts.push(LINE_THICKNESS_RULES[spec.lineThickness]);
  
  // Always append KDP print-safe suffix
  parts.push(KDP_PRINT_SAFE_SUFFIX);
  
  return parts.join("\n");
}

/**
 * Build prompt for character sheet generation
 */
export function buildCharacterSheetPrompt(params: {
  characterLock: CharacterLock;
  spec: GenerationSpec;
}): string {
  const { characterLock, spec } = params;
  
  return `CHARACTER REFERENCE SHEET for coloring book series

Create a character model sheet showing the character in a simple front-facing pose:

CHARACTER DETAILS:
- Name: ${characterLock.canonicalName}
- Body: ${characterLock.visualRules.proportions}
- Face: ${characterLock.visualRules.face}
- Features: ${characterLock.visualRules.uniqueFeatures.join(", ")}
- Outfit: ${characterLock.visualRules.outfit}

${LINE_THICKNESS_RULES[spec.lineThickness]}

${KDP_PRINT_SAFE_SUFFIX}

This reference sheet will be used to maintain character consistency across all pages in the coloring book.`;
}

/**
 * Build stricter prompt suffix for retry after failed print-safe check
 */
export function buildStricterSuffix(): string {
  return `

=== STRICT RETRY - PREVIOUS ATTEMPT HAD TOO MUCH BLACK ===
The previous generation FAILED the print-safe check because it contained large black filled regions.

ADDITIONAL STRICT REQUIREMENTS:
- ABSOLUTELY NO solid black areas anywhere
- Eyes/pupils must be TINY dots, not filled circles
- Hair must be OUTLINE ONLY with individual strands, never solid
- All dark objects (shoes, hats, etc.) must be WHITE inside with black outline only
- Remove ALL shadow shapes completely
- Simplify the background even more
- When in doubt, leave it WHITE

Target: less than 10% of pixels should be black after binarization.`;
}

