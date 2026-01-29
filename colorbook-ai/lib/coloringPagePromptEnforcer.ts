/**
 * coloringPagePromptEnforcer.ts
 * 
 * Shared prompt builder that enforces STRICT coloring page rules:
 * 1. OUTLINE-ONLY - No solid black fills anywhere (including panda patches, dark fur, etc.)
 * 2. NO BORDER/FRAME - No borders, frames, or edge lines
 * 3. FILL THE CANVAS - Artwork must fill 85-95% of the canvas
 * 4. CHARACTER CONSISTENCY - Same character design across storybook pages
 * 
 * ALL coloring page generation must go through this module.
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
// STRICT OUTLINE-ONLY CONSTRAINTS (MANDATORY FOR ALL GENERATIONS)
// ============================================================

/**
 * These constraints prevent ANY filled black areas.
 * Critical for pandas, skunks, and any character with dark patches.
 */
export const OUTLINE_ONLY_CONSTRAINTS = `

=== STRICT OUTLINE-ONLY RULES (MANDATORY - READ CAREFULLY) ===

This is a COLORING PAGE. ONLY black outlines on white background. NO EXCEPTIONS.

CRITICAL RULES:
1. NO solid black fills ANYWHERE - not even small areas
2. NO filled shapes - every shape must be an OUTLINE only
3. ALL interior regions must remain WHITE/UNFILLED (ready for coloring)
4. If the character has dark patches (panda ears, panda eye patches, dark fur):
   - Draw them as DOUBLE-LINE OUTLINES or OUTLINE SHAPES ONLY
   - Interior must remain WHITE
   - Do NOT fill them with black
5. Eyes/pupils: Use small HOLLOW circles or dots with white centers, NOT filled black circles
6. Hair/fur: Draw as individual strands or outline shapes, NEVER solid black
7. No shading, no grayscale, no gradients, no hatching, no crosshatching, no stippling

WHAT "OUTLINE-ONLY" MEANS FOR DARK FEATURES:
- Panda eye patches: Draw as outlined shapes (like goggles outline), leave interior WHITE
- Panda ears: Draw ear outline with inner ear detail, leave interior WHITE
- Black fur/hair: Draw the outline/silhouette, leave interior WHITE
- Dark clothing: Draw the shape outline, leave interior WHITE
- Shadows: DO NOT draw any shadows - leave area WHITE

The final output must be PURE LINE ART that a child can color with crayons.`;

// ============================================================
// NO BORDER / FRAME CONSTRAINTS
// ============================================================

/**
 * Prevents unwanted borders, frames, and crop lines
 */
export const NO_BORDER_CONSTRAINTS = `

=== NO BORDER / NO FRAME (MANDATORY) ===
- NO border around the image
- NO frame or panel lines
- NO crop marks or registration marks
- NO edge lines or page outlines
- NO decorative border
- The artwork should extend to the edges with only a small natural margin`;

// ============================================================
// FRAMING / FILL THE CANVAS CONSTRAINTS
// ============================================================

/**
 * Universal framing constraint - applies to ALL sizes
 */
export const FILL_CANVAS_CONSTRAINTS = `

=== FRAMING / FILL THE CANVAS (MANDATORY) ===
- Center the main subject and SCALE IT LARGE
- The drawing must fill 85-95% of the canvas
- Minimal margins (3-5% on each side)
- NO large blank white bands at top or bottom
- NO small floating artwork in the center with excessive white space
- Subject should be prominent and fill the frame
- Background elements should extend toward edges (but stay simple)`;

/**
 * Additional landscape-specific framing (when size is 1536x1024)
 */
export const LANDSCAPE_EXTRA_CONSTRAINTS = `
- LANDSCAPE orientation (1536x1024): Wide composition
- Spread the scene HORIZONTALLY to use the full width
- Zoom in so the main subject fills significant vertical space
- Wide-angle or panoramic composition that fills the frame`;

/**
 * Additional portrait-specific framing (when size is 1024x1536)
 */
export const PORTRAIT_EXTRA_CONSTRAINTS = `
- PORTRAIT orientation (1024x1536): Tall composition
- Use the vertical space well - stack elements or show full character
- Subject fills 80-90% of the frame height`;

/**
 * Additional square-specific framing (when size is 1024x1024)
 */
export const SQUARE_EXTRA_CONSTRAINTS = `
- SQUARE orientation (1024x1024): Balanced composition
- Centered subject that fills the square frame`;

// ============================================================
// NEGATIVE PROMPT LIST (for models that support it)
// ============================================================

export const NEGATIVE_PROMPT_LIST = [
  "solid black fill",
  "filled areas", 
  "large black patches",
  "heavy ink fill",
  "black silhouettes",
  "filled black shapes",
  "shading",
  "grayscale",
  "gradients",
  "hatching",
  "crosshatching",
  "stippling",
  "textures",
  "filled circles",
  "dark shadows",
  "color",
  "gray tones",
  "border",
  "frame",
  "crop marks",
  "edge lines",
];

// ============================================================
// REQUIRED VALIDATION PHRASES
// ============================================================

/**
 * These phrases MUST appear in the final prompt.
 * Checked by assertPromptHasConstraints()
 */
const REQUIRED_OUTLINE_PHRASES = [
  "NO solid black fills ANYWHERE",
  "interior regions must remain WHITE",
  "OUTLINE-ONLY",
];

const REQUIRED_BORDER_PHRASES = [
  "NO border",
];

const REQUIRED_FRAMING_PHRASES = [
  "fill 85-95% of the canvas",
];

// ============================================================
// MAIN PROMPT BUILDER
// ============================================================

/**
 * Build the final coloring page prompt with ALL mandatory constraints.
 * This function MUST be called for every generation request.
 */
export function buildFinalColoringPrompt(
  userPrompt: string,
  options: {
    includeNegativeBlock?: boolean;
    maxLength?: number;
    size?: ImageSize;
    isStorybookMode?: boolean;
    characterConsistencyBlock?: string;
  } = {}
): string {
  const { 
    includeNegativeBlock = true, 
    maxLength = 4000, 
    size = "1024x1536",
    isStorybookMode = false,
    characterConsistencyBlock,
  } = options;

  const parts: string[] = [];

  // Start with the user's prompt
  parts.push(userPrompt.trim());

  // Add character consistency block for storybook mode
  if (isStorybookMode && characterConsistencyBlock) {
    parts.push(characterConsistencyBlock);
  }

  // Add NO BORDER constraints (always)
  parts.push(NO_BORDER_CONSTRAINTS);

  // Add FILL CANVAS constraints (always)
  parts.push(FILL_CANVAS_CONSTRAINTS);

  // Add orientation-specific framing
  const orientation = getOrientationFromSize(size);
  if (orientation === "landscape") {
    parts.push(LANDSCAPE_EXTRA_CONSTRAINTS);
  } else if (orientation === "portrait") {
    parts.push(PORTRAIT_EXTRA_CONSTRAINTS);
  } else {
    parts.push(SQUARE_EXTRA_CONSTRAINTS);
  }

  // Add STRICT OUTLINE-ONLY constraints (always - most important)
  parts.push(OUTLINE_ONLY_CONSTRAINTS);

  // Add negative block
  if (includeNegativeBlock) {
    parts.push(`\nAVOID: ${NEGATIVE_PROMPT_LIST.join(", ")}.`);
  }

  let finalPrompt = parts.join("\n");

  // Truncate if over limit while preserving constraints
  if (finalPrompt.length > maxLength) {
    const constraintsStart = finalPrompt.indexOf("=== NO BORDER");
    if (constraintsStart > 0) {
      const allConstraints = finalPrompt.substring(constraintsStart);
      const availableLength = maxLength - allConstraints.length - 100;
      if (availableLength > 200) {
        finalPrompt = userPrompt.substring(0, availableLength) + "\n\n" + allConstraints;
      }
    } else {
      finalPrompt = finalPrompt.substring(0, maxLength);
    }
  }

  return finalPrompt;
}

// ============================================================
// VALIDATION FUNCTIONS
// ============================================================

/**
 * Assert that a prompt contains ALL required constraints.
 * Throws an error if any constraint is missing.
 * Call this before sending to the image generation API.
 */
export function assertPromptHasConstraints(prompt: string, size?: ImageSize): void {
  const missingConstraints: string[] = [];

  // Check outline-only constraints
  for (const phrase of REQUIRED_OUTLINE_PHRASES) {
    if (!prompt.includes(phrase)) {
      missingConstraints.push(`[OUTLINE] ${phrase}`);
    }
  }

  // Check border constraints
  for (const phrase of REQUIRED_BORDER_PHRASES) {
    if (!prompt.includes(phrase)) {
      missingConstraints.push(`[BORDER] ${phrase}`);
    }
  }

  // Check framing constraints
  for (const phrase of REQUIRED_FRAMING_PHRASES) {
    if (!prompt.includes(phrase)) {
      missingConstraints.push(`[FRAMING] ${phrase}`);
    }
  }

  if (missingConstraints.length > 0) {
    throw new Error(
      `[PROMPT SAFETY] Missing required constraints: ${missingConstraints.join(", ")}. ` +
      `Use buildFinalColoringPrompt() to ensure all constraints are included.`
    );
  }
}

/**
 * Check if a prompt has all required constraints (non-throwing version).
 */
export function hasRequiredConstraints(prompt: string, size?: ImageSize): boolean {
  const hasOutlineConstraints = REQUIRED_OUTLINE_PHRASES.every(phrase => prompt.includes(phrase));
  const hasBorderConstraints = REQUIRED_BORDER_PHRASES.every(phrase => prompt.includes(phrase));
  const hasFramingConstraints = REQUIRED_FRAMING_PHRASES.every(phrase => prompt.includes(phrase));
  
  return hasOutlineConstraints && hasBorderConstraints && hasFramingConstraints;
}

/**
 * Get the negative prompt as a single string.
 */
export function getNegativePrompt(): string {
  return NEGATIVE_PROMPT_LIST.join(", ");
}

// ============================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================

// These are kept for backward compatibility with existing code
export const NO_FILL_CONSTRAINTS = OUTLINE_ONLY_CONSTRAINTS;
export const LANDSCAPE_FRAMING_CONSTRAINTS = `${FILL_CANVAS_CONSTRAINTS}${LANDSCAPE_EXTRA_CONSTRAINTS}`;
export const PORTRAIT_FRAMING_CONSTRAINTS = `${FILL_CANVAS_CONSTRAINTS}${PORTRAIT_EXTRA_CONSTRAINTS}`;
export const SQUARE_FRAMING_CONSTRAINTS = `${FILL_CANVAS_CONSTRAINTS}${SQUARE_EXTRA_CONSTRAINTS}`;

// ============================================================
// STRUCTURED PROMPT BUILDING
// ============================================================

export interface StructuredColoringPrompt {
  scene: string;
  background: string;
  composition: string;
  lineStyle: string;
  floor: string;
  output: string;
}

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

// ============================================================
// IMAGE ANALYSIS SYSTEM PROMPT
// ============================================================

export const IMAGE_ANALYSIS_SYSTEM_PROMPT = `You are an expert at analyzing coloring book pages and describing them in extreme detail.

Your task is to analyze the uploaded image and produce a LONG, DETAILED, STRUCTURED prompt that describes EXACTLY what is visible.

You MUST follow this EXACT format with headings and line breaks:

---
Create a kids coloring book page in clean black-and-white line art (no grayscale).

Scene:
[Describe the main subject(s) in detail: species/type, proportions, facial expression, accessories, pose, what they're holding/doing. For characters with dark features (pandas, skunks), note that dark areas should be OUTLINES ONLY, not filled.]

Background:
[Describe EVERY background object: furniture, windows, items, decorations. Be exhaustive.]

Composition:
[Describe framing: how much the subject fills the frame, centered/off-center, close-up/medium/wide view. The subject should fill most of the frame.]

Line style:
[Describe line characteristics: thick/thin outlines, clean/sketchy strokes. All lines should be clean outlines suitable for coloring.]

Floor:
[Describe the ground/floor: tiles, carpet, grass, etc.]

Output:
Printable coloring page, crisp black OUTLINES ONLY on pure white, NO filled black areas anywhere (even for dark patches like panda markings - use outlined shapes only), NO text, NO watermark, NO border, NO frame, NO shading. Subject fills 85-95% of the canvas.
---

REQUIREMENTS:
1. Be EXTREMELY detailed - describe everything you see
2. Include explicit output constraints about NO filled black areas
3. Mention that dark patches (like panda markings) should be OUTLINED shapes, not filled
4. Specify that the subject should fill most of the frame
5. Include NO border, NO frame in the output constraints

Return ONLY the prompt text following the format above.`;

// ============================================================
// CHARACTER CONSISTENCY BLOCK BUILDER
// ============================================================

/**
 * Build an extremely detailed character consistency block for storybook mode.
 * This ensures the character looks IDENTICAL across all pages.
 */
export function buildStrongCharacterConsistencyBlock(profile: {
  species: string;
  keyFeatures: string[];
  proportions: string;
  faceStyle: string;
  clothing?: string;
  doNotChange?: string[];
}): string {
  const features = profile.keyFeatures.slice(0, 8).join(", ");
  const locked = profile.doNotChange?.join(", ") || "all visual features";
  
  return `

=== CHARACTER CONSISTENCY LOCK (CRITICAL - MUST MATCH EXACTLY) ===

The SAME character must appear on EVERY page with IDENTICAL visual design.

CHARACTER IDENTITY:
- Species/Type: ${profile.species}
- Key Visual Features: ${features}
- Body Proportions: ${profile.proportions}
- Face Design: ${profile.faceStyle}
${profile.clothing ? `- Outfit/Accessories: ${profile.clothing}` : ""}

LOCKED TRAITS (DO NOT MODIFY):
${locked}

CONSISTENCY RULES:
1. Same face shape and size on every page
2. Same eye style (shape, size, placement)
3. Same ear shape and placement
4. Same body-to-head ratio
5. Same distinctive features (horn, wings, spots, etc.)
6. Same outfit/accessories unless scene specifies a change
7. Same line style and level of detail
8. Only change: POSE and ACTIVITY (not the character design itself)

WARNING: Do NOT redesign the character. Do NOT alter proportions. Do NOT change facial features.
The character must be instantly recognizable as the SAME individual across all pages.`;
}
