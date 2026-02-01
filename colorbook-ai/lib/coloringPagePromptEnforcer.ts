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

// US Letter dimensions at 300 DPI
export const US_LETTER_PRESET = {
  name: "US Letter",
  aspectRatio: 8.5 / 11, // 0.7727
  exportPixels: { width: 2550, height: 3300 }, // 300 DPI
  previewPixels: { width: 1275, height: 1650 }, // 150 DPI
  thumbPixels: { width: 255, height: 330 }, // 30 DPI
};

// Model size that's closest to US Letter ratio (0.7727)
// 1024x1536 = 0.6666 ratio (too tall)
// 1024x1024 = 1.0 ratio (square)
// Best available: 1024x1536 and compose to fill
export const BEST_LETTER_SIZE: ImageSize = "1024x1536";

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

export function getModelSizeForLetterPortrait(): ImageSize {
  // Use 1024x1536 and enforce composition that fills the page
  return BEST_LETTER_SIZE;
}

// ============================================================
// STRICT OUTLINE-ONLY CONSTRAINTS (MANDATORY FOR ALL GENERATIONS)
// ============================================================

/**
 * These constraints prevent ANY filled black areas or grayscale.
 * Critical for pandas, skunks, and any character with dark patches.
 * STRENGTHENED version with explicit grayscale prohibition.
 */
export const OUTLINE_ONLY_CONSTRAINTS = `

=== STRICT COLORING PAGE RULES (MANDATORY) ===

This is a COLORING PAGE. ONLY black outlines on pure white background. NO EXCEPTIONS.

LINE ART RULES:
1. Clean black-and-white OUTLINE line art ONLY
2. NO grayscale, NO shading, NO gradients, NO gray pixels
3. NO solid black fills ANYWHERE - not even tiny areas
4. NO filled shapes - every shape must be an OUTLINE only
5. ALL interior regions must remain WHITE/UNFILLED (for coloring)

DARK FEATURES (pandas, skunks, dark fur):
- Draw dark patches as OUTLINE SHAPES only (like a boundary line)
- Interior of patches must remain WHITE
- Do NOT fill them with black or gray

EYES/DETAILS:
- Eyes: small hollow circles with white centers, NOT filled
- Hair/fur: individual strands or outlines, NEVER solid black

The final output must be PURE LINE ART that a child can color.`;

// ============================================================
// NO BORDER / FRAME CONSTRAINTS
// ============================================================

/**
 * Prevents unwanted borders, frames, and crop lines
 */
export const NO_BORDER_CONSTRAINTS = `

=== NO BORDER RULES (MANDATORY) ===
- No border, no frame, no panel lines, no crop marks, no edge lines, no page outline
- No decorative border of any kind
- Artwork extends to edges with only small natural margin`;

// ============================================================
// FRAMING / FILL THE CANVAS CONSTRAINTS (US LETTER FULL-PAGE)
// ============================================================

/**
 * US LETTER FULL-PAGE constraint - ensures artwork fills the page
 * Target: 8.5x11 inches, 300 DPI = 2550x3300 pixels
 */
export const FILL_CANVAS_CONSTRAINTS = `

=== FRAMING (MANDATORY - US LETTER FULL-PAGE) ===
- US Letter portrait full-page composition (8.5x11 aspect ratio)
- Subject + environment fills 92-97% of canvas HEIGHT
- Minimal top/bottom margins (each <= 3-5%)
- Character positioned in lower-middle area of the frame
- Environment/scene extends toward all edges
- NO floating artwork - everything must be grounded`;

/**
 * STRICT Bottom Fill constraint - prevents empty bottom space
 * With top element requirement to prevent empty top
 */
export const FOREGROUND_BOTTOM_FILL_CONSTRAINTS = `

=== BOTTOM + TOP FILL (MANDATORY - STRICT) ===

BOTTOM (CRITICAL):
- Ground plane MUST reach the bottom edge (floorboards/grass/rug/table edge/path/dirt)
- Place 2-5 simple foreground objects near bottom margin (toys/flowers/pebbles/leaves)
- Keep bottom whitespace under 4-6% of canvas height
- NO empty bottom band

TOP (IMPORTANT):
- Add simple top element to prevent empty top (window/clouds/curtain edge/wall art/tree branch)
- Keep top whitespace under 4-6% of canvas height

OVERALL:
- Main subject fills lower 2/3 of the frame
- Scene fills 92-97% of total canvas height`;

/**
 * STRICT PAGE COVERAGE CONTRACT - ensures 100% page utilization
 * This is the strongest constraint for full-page coverage
 */
export const PAGE_COVERAGE_CONTRACT = `

=== PAGE COVERAGE CONTRACT (MANDATORY - CRITICAL) ===

This is a FULL-PAGE coloring page for US Letter (8.5x11 inches). The artwork MUST fill the ENTIRE page.

VERTICAL COVERAGE (CRITICAL):
- Main subject and scene must occupy 90-95% of canvas HEIGHT
- Subject should NOT float in the middle with empty space above/below
- Ink/lines must extend from near the TOP edge to near the BOTTOM edge

BOTTOM FILL (CRITICAL):
- Foreground elements MUST reach the bottom margin (no empty bottom strip)
- Include 2-4 LARGE foreground objects overlapping the bottom edge:
  * Indoor: rug edge, floor tiles, table edge, bed edge, countertop, carpet, toy on floor
  * Outdoor: grass, path, road, dirt, sand, water edge, rocks, flowers, leaves
- Ground/floor texture should fill the lower 15-20% of the canvas

PERSPECTIVE/FRAMING:
- Use slightly closer/zoomed-in framing
- Camera positioned to capture subject filling the frame
- Subject in lower-middle area of composition (NOT centered vertically)

BACKGROUND FILL:
- Background should include simplified environment lines extending down
- NO large blank areas - fill with relevant scene elements
- Floorboards, tiles, grass blades, carpet texture, etc.

NEGATIVE RULES:
- NO "floating" subject with big empty space below
- NO generic repeated clutter (don't add random rocks/balls/leaves unless scene-appropriate)
- Page-to-page: avoid repeating the same bottom filler props

The final image should look like a page from a professional coloring book where EVERY part of the page has something to color.`;

/**
 * Additional landscape-specific framing (when size is 1536x1024)
 */
export const LANDSCAPE_EXTRA_CONSTRAINTS = `
LANDSCAPE: Wide horizontal composition, ground extends full width, elements fill left and right sides.`;

/**
 * Additional portrait-specific framing (when size is 1024x1536)
 */
export const PORTRAIT_EXTRA_CONSTRAINTS = `
PORTRAIT: Tall vertical composition for US Letter (8.5x11). Subject fills 90% height, ground at bottom, top element at top.`;

/**
 * Additional square-specific framing (when size is 1024x1024)
 */
export const SQUARE_EXTRA_CONSTRAINTS = `
SQUARE: Balanced composition, subject centered in lower portion, ground at bottom edge, top element near top.`;

// ============================================================
// BOTTOM FILL RETRY REINFORCEMENT (used when auto-retrying)
// ============================================================

/**
 * Extra reinforcement for bottom fill, used on retries
 * STRENGTHENED version
 */
export const BOTTOM_FILL_RETRY_REINFORCEMENT = `
CRITICAL: Extend ground and foreground objects to the bottom edge. No empty bottom band. Add floor texture (tiles/grass/wood) reaching bottom margin. Place 3+ small props (pebbles/flowers/toys) touching the bottom. Keep bottom whitespace under 5%.`;

// ============================================================
// QA AUTO-RETRY REINFORCEMENT BLOCKS
// ============================================================

/**
 * Retry reinforcement for outline-only violations (grayscale or fills detected)
 * Used on retry #1
 */
export const OUTLINE_RETRY_REINFORCEMENT_1 = `
CRITICAL FIX: Convert any filled areas into outlines ONLY. Absolutely NO gray pixels, NO filled regions, NO shading. Every shape must be an UNFILLED outline.`;

/**
 * Stronger retry reinforcement for outline-only violations
 * Used on retry #2 (final attempt)
 */
export const OUTLINE_RETRY_REINFORCEMENT_2 = `
CRITICAL: CONTOUR LINES ONLY. Replace ALL fills with outline boundaries. Remove ALL shading. ZERO gray pixels allowed. Pure black lines on pure white background.`;

/**
 * Retry reinforcement for border violations
 * Used when borders are detected
 */
export const BORDER_RETRY_REINFORCEMENT = `
CRITICAL FIX: Remove ALL borders, frames, edge lines. NO rectangular outline around the image. Artwork extends naturally to edges.`;

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
  "empty bottom",
  "blank space",
  "floating subject",
  "small centered artwork",
  "empty bottom strip",
  "large white areas",
  "subject floating in space",
  "tiny subject with empty background",
  "repeated generic clutter",
  "random rocks at bottom",
  "random balls scattered",
];

/**
 * Coverage retry reinforcement - used when coverage validation fails
 */
export const COVERAGE_RETRY_REINFORCEMENT = `
CRITICAL COVERAGE FIX:
- Zoom in 20% closer to subject
- Enlarge the main subject to fill more of the frame
- Add a LARGE foreground floor/ground element that reaches the bottom edge
- Reduce sky/ceiling/empty space above the subject
- Fill the bottom 20% with ground texture and 3+ foreground props
- The bottom edge MUST have visible content (not white space)`;

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
  "90-95% of the canvas",
];

const REQUIRED_BOTTOM_FILL_PHRASES = [
  "bottom edge",
  "foreground",
];

// ============================================================
// MAIN PROMPT BUILDER
// ============================================================

/**
 * Build the final coloring page prompt with ALL mandatory constraints.
 * This function MUST be called for every generation request.
 * 
 * Includes:
 * - NO BORDER constraints
 * - FILL CANVAS constraints (stronger framing)
 * - FOREGROUND / BOTTOM FILL constraints (prevents empty bottom)
 * - Orientation-specific layout
 * - OUTLINE-ONLY constraints
 */
export function buildFinalColoringPrompt(
  userPrompt: string,
  options: {
    includeNegativeBlock?: boolean;
    maxLength?: number;
    size?: ImageSize;
    isStorybookMode?: boolean;
    characterConsistencyBlock?: string;
    extraBottomReinforcement?: boolean; // Add extra bottom-fill emphasis (for retries)
    extraCoverageReinforcement?: boolean; // Add extra coverage emphasis (for retries)
  } = {}
): string {
  const { 
    includeNegativeBlock = true, 
    maxLength = 4500, // Increased to accommodate PAGE_COVERAGE_CONTRACT
    size = "1024x1536",
    isStorybookMode = false,
    characterConsistencyBlock,
    extraBottomReinforcement = false,
    extraCoverageReinforcement = false,
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

  // Add FILL CANVAS constraints (stronger framing) (always)
  parts.push(FILL_CANVAS_CONSTRAINTS);

  // Add FOREGROUND / BOTTOM FILL constraints (prevents empty bottom)
  parts.push(FOREGROUND_BOTTOM_FILL_CONSTRAINTS);

  // Add PAGE COVERAGE CONTRACT (CRITICAL - ensures full page utilization)
  parts.push(PAGE_COVERAGE_CONTRACT);

  // Add orientation-specific framing
  const orientation = getOrientationFromSize(size);
  if (orientation === "landscape") {
    parts.push(LANDSCAPE_EXTRA_CONSTRAINTS);
  } else if (orientation === "portrait") {
    parts.push(PORTRAIT_EXTRA_CONSTRAINTS);
  } else {
    parts.push(SQUARE_EXTRA_CONSTRAINTS);
  }

  // Add extra bottom-fill reinforcement for retries
  if (extraBottomReinforcement) {
    parts.push(BOTTOM_FILL_RETRY_REINFORCEMENT);
  }

  // Add extra coverage reinforcement for retries
  if (extraCoverageReinforcement) {
    parts.push(COVERAGE_RETRY_REINFORCEMENT);
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

  // Check bottom fill constraints
  for (const phrase of REQUIRED_BOTTOM_FILL_PHRASES) {
    if (!prompt.toLowerCase().includes(phrase.toLowerCase())) {
      missingConstraints.push(`[BOTTOM_FILL] ${phrase}`);
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
  const hasBottomFillConstraints = REQUIRED_BOTTOM_FILL_PHRASES.every(phrase => 
    prompt.toLowerCase().includes(phrase.toLowerCase())
  );
  
  return hasOutlineConstraints && hasBorderConstraints && hasFramingConstraints && hasBottomFillConstraints;
}

/**
 * Get the negative prompt as a single string.
 */
export function getNegativePrompt(): string {
  return NEGATIVE_PROMPT_LIST.join(", ");
}

// ============================================================
// IMAGE VALIDATION TYPES
// ============================================================

export interface ImageValidationResult {
  valid: boolean;
  issues: {
    hasGrayscale: boolean;
    hasLargeBlackFills: boolean;
    hasBorder: boolean;
    hasEmptyBottom: boolean;
  };
  retryReinforcement?: string;
}

/**
 * Analyze image data for coloring page quality issues.
 * Returns validation result with specific issues found.
 * 
 * @param imageBase64 - Base64 encoded image data
 * @returns Validation result with issues and retry reinforcement if needed
 */
export async function validateColoringPageImage(
  imageBase64: string
): Promise<ImageValidationResult> {
  // Note: Full image analysis requires canvas/image processing libraries
  // This is a simplified check that flags potential issues
  // In production, you'd use sharp or canvas to analyze pixel data
  
  const result: ImageValidationResult = {
    valid: true,
    issues: {
      hasGrayscale: false,
      hasLargeBlackFills: false,
      hasBorder: false,
      hasEmptyBottom: false,
    },
  };

  // For now, we return valid=true and rely on strong prompt constraints
  // The retry logic will use reinforcement blocks if generation quality is poor
  // True image analysis would require server-side image processing
  
  return result;
}

/**
 * Get the appropriate retry reinforcement based on attempt number.
 * @param attemptNumber - Current attempt (1, 2, etc.)
 * @param issues - Known issues from validation
 * @returns Reinforcement string to append to prompt
 */
export function getRetryReinforcement(
  attemptNumber: number,
  issues?: ImageValidationResult["issues"] & { hasCoverageIssue?: boolean }
): string {
  const reinforcements: string[] = [];
  
  // Always add outline reinforcement on retries
  if (attemptNumber === 1) {
    reinforcements.push(OUTLINE_RETRY_REINFORCEMENT_1);
  } else {
    reinforcements.push(OUTLINE_RETRY_REINFORCEMENT_2);
  }
  
  // Add border reinforcement if needed
  if (issues?.hasBorder) {
    reinforcements.push(BORDER_RETRY_REINFORCEMENT);
  }
  
  // Add bottom fill reinforcement if needed
  if (issues?.hasEmptyBottom) {
    reinforcements.push(BOTTOM_FILL_RETRY_REINFORCEMENT);
  }
  
  // Add coverage reinforcement if coverage is low
  if (issues?.hasCoverageIssue) {
    reinforcements.push(COVERAGE_RETRY_REINFORCEMENT);
  }
  
  return reinforcements.join("\n");
}

// ============================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================

// These are kept for backward compatibility with existing code
export const NO_FILL_CONSTRAINTS = OUTLINE_ONLY_CONSTRAINTS;
export const LANDSCAPE_FRAMING_CONSTRAINTS = `${FILL_CANVAS_CONSTRAINTS}${FOREGROUND_BOTTOM_FILL_CONSTRAINTS}${LANDSCAPE_EXTRA_CONSTRAINTS}`;
export const PORTRAIT_FRAMING_CONSTRAINTS = `${FILL_CANVAS_CONSTRAINTS}${FOREGROUND_BOTTOM_FILL_CONSTRAINTS}${PORTRAIT_EXTRA_CONSTRAINTS}`;
export const SQUARE_FRAMING_CONSTRAINTS = `${FILL_CANVAS_CONSTRAINTS}${FOREGROUND_BOTTOM_FILL_CONSTRAINTS}${SQUARE_EXTRA_CONSTRAINTS}`;

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
[Describe the main subject(s) in detail: species/type, proportions, facial expression, accessories, pose, what they're holding/doing. For characters with dark features (pandas, skunks), note that dark areas should be OUTLINES ONLY, not filled. Position the main subject in the lower-middle area of the frame.]

Background:
[Describe EVERY background object: furniture, windows, items, decorations. Be exhaustive. Elements should extend toward the edges.]

Composition:
[Describe framing: how much the subject fills the frame, centered/off-center, close-up/medium/wide view. The subject should fill 90-95% of the frame. Position the main subject lower in the frame (not floating at top).]

Line style:
[Describe line characteristics: thick/thin outlines, clean/sketchy strokes. All lines should be clean outlines suitable for coloring.]

Floor/Ground:
[Describe the ground/floor in detail: tiles, carpet, grass, path, rug, etc. The floor MUST extend to the bottom edge of the canvas. Include any foreground props near the bottom (toys, flowers, pebbles, etc.) that help fill the lower area.]

Foreground:
[Describe any foreground elements near the bottom of the scene: small props, ground details, items at character's feet. Include 2-5 items that fill the bottom portion of the canvas.]

Output:
Printable coloring page, crisp black OUTLINES ONLY on pure white, NO filled black areas anywhere (even for dark patches like panda markings - use outlined shapes only), NO text, NO watermark, NO border, NO frame, NO shading. Subject fills 90-95% of the canvas with minimal margins. Ground/floor extends to the bottom edge with foreground detail. NO empty bottom space.
---

REQUIREMENTS:
1. Be EXTREMELY detailed - describe everything you see
2. Include explicit output constraints about NO filled black areas
3. Mention that dark patches (like panda markings) should be OUTLINED shapes, not filled
4. Specify that the subject should fill 90-95% of the frame
5. Include NO border, NO frame in the output constraints
6. CRITICAL: Describe the floor/ground extending to the bottom edge
7. CRITICAL: Include foreground props to prevent empty bottom space

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
