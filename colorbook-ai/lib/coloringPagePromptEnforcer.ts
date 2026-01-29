/**
 * coloringPagePromptEnforcer.ts
 * 
 * Shared prompt builder that enforces "no filled black areas" constraints
 * and proper framing for different orientations (portrait/landscape/square).
 * 
 * ALL coloring page generation must go through this module to ensure
 * consistent, outline-only output with no solid black fills.
 * 
 * Usage:
 *   import { buildFinalColoringPrompt, assertPromptHasConstraints } from "@/lib/coloringPagePromptEnforcer";
 *   const finalPrompt = buildFinalColoringPrompt(userPrompt, { size: "1536x1024" });
 *   assertPromptHasConstraints(finalPrompt, "1536x1024"); // throws if missing required constraints
 */

// ============================================================
// ORIENTATION / SIZE TYPES
// ============================================================

export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024";
export type Orientation = "portrait" | "landscape" | "square";

export function getOrientationFromSize(size: ImageSize): Orientation {
  if (size === "1536x1024") return "landscape";
  if (size === "1024x1536") return "portrait";
  return "square";
}

export function getSizeFromOrientation(orientation: Orientation): ImageSize {
  if (orientation === "landscape") return "1536x1024";
  if (orientation === "portrait") return "1024x1536";
  return "1024x1024";
}

// ============================================================
// LANDSCAPE FRAMING CONSTRAINTS
// ============================================================

/**
 * Landscape framing constraints - appended when size is 1536x1024
 * Prevents small artwork with large white bands at top/bottom
 */
export const LANDSCAPE_FRAMING_CONSTRAINTS = `

=== FRAMING / LAYOUT (MANDATORY FOR LANDSCAPE) ===
- Landscape canvas (1536x1024 / wide format).
- Zoom in and scale the main subject + important background so the drawing fills 90–95% of the canvas.
- Keep only a small clean margin (3–5%) around edges.
- NO large blank white bands at top or bottom.
- Foreground subject should be LARGE and fill significant vertical space.
- Background elements scaled up to reach near edges while staying simple.
- Spread the composition horizontally - use the full width.
- The artwork must FILL THE FRAME, not float small in the center.`;

/**
 * Portrait framing constraints - appended when size is 1024x1536
 */
export const PORTRAIT_FRAMING_CONSTRAINTS = `

=== FRAMING / LAYOUT (PORTRAIT) ===
- Portrait canvas (1024x1536 / tall format).
- Center the main subject vertically with small margins (5-10%) at top and bottom.
- Subject should fill 80-90% of the frame height.
- Use the vertical space well - don't leave large empty areas.`;

/**
 * Square framing constraints - appended when size is 1024x1024
 */
export const SQUARE_FRAMING_CONSTRAINTS = `

=== FRAMING / LAYOUT (SQUARE) ===
- Square canvas (1024x1024).
- Center the composition with balanced margins.
- Subject should fill 85-90% of the frame.`;

// ============================================================
// NO-FILL CONSTRAINTS - MUST be appended to EVERY generation prompt
// ============================================================

/**
 * These constraints prevent the AI from generating filled black areas.
 * They are added as plain text in the final prompt (not hidden config).
 */
export const NO_FILL_CONSTRAINTS = `

=== OUTLINE-ONLY CONSTRAINTS (MANDATORY) ===
NO solid black fills anywhere.
NO filled shapes.
Only black outlines on white background.
Interior areas must remain white/unfilled.
If the character has black patches (like a panda), represent them using outlines only (no filled black).

DO NOT include:
- Solid black fill
- Filled areas
- Large black patches
- Heavy ink fill
- Black silhouettes
- Shading
- Grayscale
- Gradients
- Hatching
- Textures
- Solid black hair, fur, or clothing

CRITICAL FILL RULES:
- Eyes/pupils: Use small hollow circles or tiny dots, NOT filled circles
- Hair: Draw individual strands or outline shape only, NEVER solid black
- Dark fur/clothing: Outline the shape and leave interior WHITE
- Shadows: DO NOT draw any shadows - leave the area white
- Black animals (pandas, skunks, etc.): Use double-line outlines to indicate dark areas, keep interiors white

The final output must be PURE OUTLINE ART suitable for children to color in with crayons or markers.`;

/**
 * Negative prompt for models that support it (appended as "DO NOT" block if not)
 */
export const NEGATIVE_PROMPT_LIST = [
  "solid black fill",
  "filled areas", 
  "large black patches",
  "heavy ink fill",
  "black silhouettes",
  "shading",
  "grayscale",
  "gradients",
  "hatching",
  "crosshatching",
  "stippling",
  "textures",
  "solid black shapes",
  "filled circles",
  "dark shadows",
  "color",
  "gray tones",
];

/**
 * Required constraint phrases that MUST appear in the final prompt.
 * Used by assertPromptHasConstraints() for validation.
 */
const REQUIRED_CONSTRAINT_PHRASES = [
  "NO solid black fill",
  "outlines on white background",
  "Interior areas must remain white",
];

/**
 * Build the final coloring page prompt by appending no-fill constraints
 * and appropriate framing constraints based on the target size.
 * 
 * This function MUST be called for every generation request to ensure
 * consistent outline-only output and proper framing.
 * 
 * @param userPrompt - The user's prompt (can be from text input or image analysis)
 * @param options - Configuration including size for framing constraints
 * @returns The final prompt with all constraints appended
 */
export function buildFinalColoringPrompt(
  userPrompt: string,
  options: {
    includeNegativeBlock?: boolean;
    maxLength?: number;
    size?: ImageSize;
  } = {}
): string {
  const { includeNegativeBlock = true, maxLength = 4000, size = "1024x1536" } = options;

  // Start with the user's prompt
  let finalPrompt = userPrompt.trim();

  // Add framing constraints based on size/orientation
  const orientation = getOrientationFromSize(size);
  if (orientation === "landscape") {
    finalPrompt += LANDSCAPE_FRAMING_CONSTRAINTS;
  } else if (orientation === "portrait") {
    finalPrompt += PORTRAIT_FRAMING_CONSTRAINTS;
  } else {
    finalPrompt += SQUARE_FRAMING_CONSTRAINTS;
  }

  // Add the mandatory no-fill constraints
  finalPrompt += NO_FILL_CONSTRAINTS;

  // Optionally add explicit negative block
  if (includeNegativeBlock) {
    finalPrompt += `\n\nAVOID: ${NEGATIVE_PROMPT_LIST.join(", ")}.`;
  }

  // Truncate if over limit while preserving constraints
  if (finalPrompt.length > maxLength) {
    // Find where framing constraints start (they come first)
    const framingStart = finalPrompt.indexOf("=== FRAMING / LAYOUT");
    if (framingStart > 0) {
      const allConstraints = finalPrompt.substring(framingStart);
      const availableLength = maxLength - allConstraints.length - 50; // 50 char buffer
      if (availableLength > 100) {
        finalPrompt = userPrompt.substring(0, availableLength) + "\n\n" + allConstraints;
      }
    } else {
      finalPrompt = finalPrompt.substring(0, maxLength);
    }
  }

  return finalPrompt;
}

/**
 * Required phrases for landscape framing validation
 */
const REQUIRED_LANDSCAPE_PHRASES = [
  "fills 90–95%",
  "NO large blank white bands",
];

/**
 * Assert that a prompt contains the required no-fill constraints
 * and (if landscape) the required framing constraints.
 * Throws an error if constraints are missing.
 * 
 * Call this before sending to the image generation API as a safety check.
 * 
 * @param prompt - The final prompt to validate
 * @param size - Optional size to check for landscape framing requirements
 * @throws Error if required constraints are missing
 */
export function assertPromptHasConstraints(prompt: string, size?: ImageSize): void {
  const missingConstraints: string[] = [];

  // Check no-fill constraints (always required)
  for (const phrase of REQUIRED_CONSTRAINT_PHRASES) {
    if (!prompt.includes(phrase)) {
      missingConstraints.push(phrase);
    }
  }

  // Check landscape framing constraints (only for landscape size)
  if (size === "1536x1024") {
    for (const phrase of REQUIRED_LANDSCAPE_PHRASES) {
      if (!prompt.includes(phrase)) {
        missingConstraints.push(`[LANDSCAPE] ${phrase}`);
      }
    }
  }

  if (missingConstraints.length > 0) {
    throw new Error(
      `[PROMPT SAFETY] Missing required constraints: ${missingConstraints.join(", ")}. ` +
      `Use buildFinalColoringPrompt() with size parameter to ensure constraints are included.`
    );
  }
}

/**
 * Check if a prompt has constraints (non-throwing version).
 * 
 * @param prompt - The prompt to check
 * @param size - Optional size to check for landscape framing requirements
 * @returns true if all required constraints are present
 */
export function hasRequiredConstraints(prompt: string, size?: ImageSize): boolean {
  const hasNoFillConstraints = REQUIRED_CONSTRAINT_PHRASES.every(phrase => prompt.includes(phrase));
  
  if (size === "1536x1024") {
    const hasLandscapeConstraints = REQUIRED_LANDSCAPE_PHRASES.every(phrase => prompt.includes(phrase));
    return hasNoFillConstraints && hasLandscapeConstraints;
  }
  
  return hasNoFillConstraints;
}

/**
 * Get the negative prompt as a single string.
 * Use this if the image model supports a separate negative prompt parameter.
 */
export function getNegativePrompt(): string {
  return NEGATIVE_PROMPT_LIST.join(", ");
}

/**
 * Structured prompt format for image analysis output.
 * This is the exact format that /api/prompt/from-image should return.
 */
export interface StructuredColoringPrompt {
  scene: string;
  background: string;
  composition: string;
  lineStyle: string;
  floor: string;
  output: string;
}

/**
 * Build a structured prompt from analysis sections.
 * 
 * @param sections - The analysis sections
 * @returns A single prompt string in the required format
 */
export function buildStructuredPrompt(sections: StructuredColoringPrompt): string {
  return `Create a kids coloring book page in clean black-and-white line art (no grayscale).

Scene:
${sections.scene}

Background:
${sections.background}

Composition:
${sections.composition}

Line style:
${sections.lineStyle}

Floor:
${sections.floor}

Output:
${sections.output}`;
}

/**
 * Vision analysis system prompt for extracting detailed structured prompts from images.
 * Used by /api/prompt/from-image to generate verbose, explicit prompts.
 */
export const IMAGE_ANALYSIS_SYSTEM_PROMPT = `You are an expert at analyzing coloring book pages and describing them in extreme detail.

Your task is to analyze the uploaded image and produce a LONG, DETAILED, STRUCTURED prompt that describes EXACTLY what is visible.

You MUST follow this EXACT format with headings and line breaks:

---
Create a kids coloring book page in clean black-and-white line art (no grayscale).

Scene:
[Describe the main subject(s) in detail: species/type, proportions, facial expression, accessories, pose, what they're holding/doing. Include every visible object and its position.]

Background:
[Describe EVERY background object: furniture, windows, curtains, shelves, items on shelves, clocks, toys, plants, decorations, patterns, etc. Be exhaustive.]

Composition:
[Describe framing: portrait/landscape, centered/off-center, close-up/medium/wide view, how much white space, margins, where the subject is positioned relative to the frame.]

Line style:
[Describe line characteristics: thick/thin outlines, clean/sketchy strokes, bold contours, delicate inner details, consistent line weight, etc.]

Floor:
[Describe the ground/floor: tiles, carpet, grass, wooden planks, plain, or if not visible. Include any floor decorations or objects on the floor.]

Output:
Printable coloring page, crisp black outlines on pure white, NO text, NO watermark, NO signature, NO border, NO filled black areas, NO shading, NO gradients. All shapes closed and ready for coloring.
---

REQUIREMENTS:
1. Be EXTREMELY detailed - describe everything you see
2. Include all major objects and their relative positions
3. Mention character attributes: species, proportions, expression, accessories, pose
4. Mention every background object: furniture, decorations, items
5. Describe framing: portrait, centered subject, medium-wide view, white space
6. Include explicit output constraints about no fills and print-safe quality

Return ONLY the prompt text following the format above. No JSON wrapping, no markdown formatting, no extra commentary.`;

