/**
 * quotePagePromptEnforcer.ts
 * 
 * Prompt builder specifically for text/quote coloring pages.
 * Enforces typography-focused rules: text prominence, outline-only, readable layout.
 */

// ============================================================
// TYPES
// ============================================================

export type DecorationTheme = 
  | "floral" 
  | "stars" 
  | "mandala" 
  | "hearts" 
  | "nature" 
  | "geometric" 
  | "doodles"
  | "mixed";

export type TypographyStyle = 
  | "bubble" 
  | "script" 
  | "block" 
  | "mixed";

export type DecorationDensity = "low" | "medium" | "high";

export type FrameStyle = "none" | "thin" | "corners";

// NEW: Decoration Level - controls how much decoration appears
export type DecorationLevel = 
  | "text_only"      // Pure text, no decorations
  | "minimal_icons"  // Text + small icons (stars/hearts/sparkles)
  | "border_only"    // Text + border/corner decorations
  | "full_background"; // Text + full decorative background

// NEW: Icon set for minimal_icons mode
export type IconSet = 
  | "stars"      // Stars & sparkles
  | "hearts"     // Hearts
  | "doodles"    // Simple doodles
  | "sports"     // Sports icons
  | "kids";      // Kid-friendly icons

export interface QuotePageConfig {
  quote: string;
  decorationTheme: DecorationTheme;
  typographyStyle: TypographyStyle;
  density: DecorationDensity;
  frameStyle: FrameStyle;
  // NEW fields
  decorationLevel: DecorationLevel;
  iconSet?: IconSet; // Only used when decorationLevel is "minimal_icons"
  pageNumber?: number;
  totalPages?: number;
}

// ============================================================
// CRITICAL CONSTRAINTS (MUST BE AT START OF EVERY PROMPT)
// ============================================================

export const CRITICAL_COLORING_PAGE_RULES = `
*** CRITICAL: PRINTABLE COLORING BOOK PAGE ***
- PURE WHITE BACKGROUND ONLY - no black background, no colored background, no gray background.
- LINE ART ONLY - every shape and letter is just an outline with empty white interior.
- NO FILLS - nothing should be filled with black or any color. All shapes are hollow outlines.
- The page will be PRINTED on white paper and colored in with crayons/markers by children.
`;

// ============================================================
// STYLE SPEC (MANDATORY FOR ALL QUOTE PAGES)
// ============================================================

export const QUOTE_STYLE_SPEC = `
=== COLORING PAGE REQUIREMENTS (MANDATORY) ===
- WHITE background - the entire background must be white/empty.
- Black OUTLINES only - all shapes, letters, and decorations are outlined, not filled.
- NO solid black areas - if you see any solid black, that's wrong.
- NO grayscale, NO shading, NO gradients, NO textures, NO crosshatching.
- Clean vector-like line work, consistent stroke thickness.
- NO watermark, NO signature.
- Think "coloring book for kids" - simple outlines ready to be colored in.`;

// ============================================================
// TEXT LEGIBILITY RULES (CRITICAL FOR QUOTE PAGES)
// ============================================================

export const TEXT_LEGIBILITY_RULES = `
=== TEXT LEGIBILITY RULES (MANDATORY - CRITICAL) ===
- The QUOTE TEXT must be the MOST PROMINENT element on the page.
- Use LARGE, BOLD, outline-only typography (bubble letters or hand-lettered style).
- Letter interiors must remain EMPTY/WHITE for coloring.
- Ensure clear spacing between letters; no overlapping flourishes that reduce readability.
- Centered composition; place the quote in 2-5 lines maximum.
- Add a "clear halo" / negative-space buffer around the text (keep decorative elements away from letters).
- Text should occupy approximately 40-50% of the visual area.
- Background decorations are SECONDARY and must not compete with the text.`;

// ============================================================
// FRAMING CONSTRAINTS
// ============================================================

export const QUOTE_FRAMING_CONSTRAINTS = `
=== FRAMING (MANDATORY) ===
- Full-page composition; artwork fills 92-97% of page height.
- Minimal top/bottom margins (<= 3-5%).
- Decorative elements should reach near edges to avoid empty bands.
- Keep central text area clear and readable.
- Ground plane or decorative elements should extend to bottom edge.`;

// ============================================================
// DECORATION THEME DESCRIPTIONS
// ============================================================

export const DECORATION_THEMES: Record<DecorationTheme, string> = {
  floral: "flowers, roses, leaves, petals, vines, botanical elements arranged around the text",
  stars: "stars, sparkles, moons, celestial elements, twinkling patterns around the text",
  mandala: "mandala patterns, zentangle designs, intricate geometric mandalas framing the text",
  hearts: "hearts, love symbols, romantic flourishes, heart borders around the text",
  nature: "leaves, vines, branches, butterflies, natural organic elements surrounding the text",
  geometric: "geometric shapes, triangles, circles, abstract patterns framing the text",
  doodles: "cute doodles, playful elements, kawaii-style decorations, fun shapes around the text",
  mixed: "a harmonious mix of flowers, stars, and simple shapes surrounding the text",
};

// ============================================================
// TYPOGRAPHY STYLE DESCRIPTIONS
// ============================================================

export const TYPOGRAPHY_STYLES: Record<TypographyStyle, string> = {
  bubble: "large BUBBLE LETTERS with thick outlines, rounded shapes, chunky playful typography",
  script: "elegant SCRIPT OUTLINE letters, flowing cursive with decorative swashes, sophisticated hand-lettering",
  block: "bold BLOCK LETTERS, strong angular outlines, impactful sans-serif typography",
  mixed: "MIXED typography: main/key words in large bold bubble letters, remaining words in simpler outline letters",
};

// ============================================================
// DENSITY DESCRIPTIONS
// ============================================================

export const DENSITY_LEVELS: Record<DecorationDensity, string> = {
  low: "sparse, minimal decorations; mostly white space with a few elegant accent elements",
  medium: "balanced decorations; moderate coverage with good breathing room around text",
  high: "rich, detailed decorations; dense patterns filling background while keeping text clear",
};

// ============================================================
// FRAME STYLE DESCRIPTIONS
// ============================================================

export const FRAME_STYLES: Record<FrameStyle, string> = {
  none: "NO border or frame; decorations flow naturally to edges",
  thin: "thin decorative inner border/frame surrounding the design",
  corners: "decorative corner ornaments only; no full border",
};

// ============================================================
// DECORATION LEVEL DESCRIPTIONS (NEW)
// ============================================================

export const DECORATION_LEVELS: Record<DecorationLevel, string> = {
  text_only: `TEXT ONLY - NO decorations whatsoever:
- ONLY the quote text on a clean white background
- NO flowers, NO trees, NO patterns, NO icons, NO shapes
- NO border, NO frame, NO corner decorations
- Leave generous whitespace around the centered text
- The typography IS the art - make the letters beautiful and detailed`,
  
  minimal_icons: `TEXT + MINIMAL ICONS only:
- Quote text is the MAIN element
- Add only a FEW small, simple outline icons around the text (max 5-8 icons)
- Icons should be SPARSE and SMALL (not dominating)
- Keep 80% of the background empty white space
- DO NOT add flowers, trees, landscapes, or complex scenery
- Icons should float around the text, not crowd it`,
  
  border_only: `TEXT + BORDER ELEMENTS only:
- Quote text centered with a decorative border or corner ornaments
- Border should be simple outline work (not filled)
- Keep the CENTER area clean - no decorations near the text
- The border frames the page edges, text floats in clear center space
- NO interior decorations, NO background patterns`,
  
  full_background: `TEXT + FULL DECORATIVE BACKGROUND:
- Quote text is DOMINANT and READABLE (kept clear with negative space halo)
- Decorative elements fill the background around the text
- IMPORTANT: Keep a clear "halo" / buffer zone around the text
- Background decorations should be intricate but not compete with text readability`,
};

// ============================================================
// ICON SET DESCRIPTIONS (NEW)
// ============================================================

export const ICON_SETS: Record<IconSet, string> = {
  stars: "small outline stars, sparkles, twinkles, crescent moons (simple celestial icons)",
  hearts: "small outline hearts of various sizes, love symbols",
  doodles: "simple doodles: swirls, dots, small circles, squiggles, asterisks",
  sports: "small sports icons: balls, trophies, medals, sneakers (outline only)",
  kids: "kid-friendly icons: smileys, balloons, rainbows, clouds, butterflies (simple outlines)",
};

// ============================================================
// NEGATIVE PROMPT LIST
// ============================================================

export const QUOTE_NEGATIVE_PROMPTS = [
  "solid black fill",
  "filled letters",
  "filled shapes",
  "grayscale",
  "shading",
  "gradients",
  "textures",
  "halftone",
  "crosshatching",
  "shadows",
  "3D effects",
  "color",
  "watermark",
  "signature",
  "blurry text",
  "illegible text",
  "overlapping letters",
  "cluttered text area",
  "small text",
  "thin text",
  "serif body text",
];

// ============================================================
// MAIN PROMPT BUILDER
// ============================================================

/**
 * Build a complete prompt for a quote coloring page.
 * Now supports decoration levels for fine-grained control.
 */
export function buildQuotePagePrompt(config: QuotePageConfig): string {
  const {
    quote,
    decorationTheme,
    typographyStyle,
    density,
    frameStyle,
    decorationLevel = "minimal_icons", // Default to minimal for speed
    iconSet = "stars",
  } = config;

  // Normalize and format the quote
  const cleanQuote = normalizeQuote(quote);
  const formattedQuote = formatQuoteForPrompt(cleanQuote);

  const parts: string[] = [];

  // *** CRITICAL: Put the most important constraints FIRST ***
  parts.push(CRITICAL_COLORING_PAGE_RULES);

  // Main instruction
  parts.push(`Create a COLORING BOOK PAGE with the quote: "${formattedQuote}"`);
  parts.push("");

  // Emphasize white background
  parts.push(`=== PAGE SETUP ===`);
  parts.push(`- BLANK WHITE page background.`);
  parts.push(`- BLACK OUTLINES only - no fills, no shading.`);
  parts.push(`- Every element is a HOLLOW OUTLINE ready to be colored.`);
  parts.push("");

  // Typography description
  parts.push(`=== TYPOGRAPHY ===`);
  parts.push(`- Quote text is CENTERED and LARGE.`);
  parts.push(`- Style: ${TYPOGRAPHY_STYLES[typographyStyle]}`);
  parts.push(`- Letters are HOLLOW OUTLINES (white inside, black outline).`);
  parts.push(`- Text should be the DOMINANT visual element.`);
  parts.push("");

  // DECORATION LEVEL - This is the key section that varies based on user choice
  parts.push(`=== DECORATION INSTRUCTIONS (FOLLOW EXACTLY) ===`);
  parts.push(DECORATION_LEVELS[decorationLevel]);
  
  // Add icon-specific instructions for minimal_icons mode
  if (decorationLevel === "minimal_icons" && iconSet) {
    parts.push("");
    parts.push(`Icons to use: ${ICON_SETS[iconSet]}`);
    parts.push(`IMPORTANT: Only use these specific icons, keep them small and sparse.`);
  }
  
  // Add theme-specific instructions for full_background mode
  if (decorationLevel === "full_background") {
    parts.push("");
    parts.push(`Background theme: ${DECORATION_THEMES[decorationTheme]}`);
    parts.push(`Density: ${DENSITY_LEVELS[density]}`);
  }
  
  // Add frame instructions for border_only mode
  if (decorationLevel === "border_only") {
    parts.push("");
    parts.push(`Border style: ${FRAME_STYLES[frameStyle] || FRAME_STYLES.thin}`);
  }
  parts.push("");

  // Add mandatory style spec
  parts.push(QUOTE_STYLE_SPEC);

  // Text legibility rules
  parts.push("");
  parts.push(`TEXT RULES: Large readable letters, outline-only, empty interiors, clear spacing.`);

  // Strong negative prompt at the end
  parts.push("");
  
  // Different negative prompts based on decoration level
  if (decorationLevel === "text_only") {
    parts.push(`*** ABSOLUTELY NO: flowers, trees, patterns, icons, shapes, borders, frames, decorations ***`);
    parts.push(`*** ONLY: The quote text on white background. Nothing else. ***`);
  } else if (decorationLevel === "minimal_icons") {
    parts.push(`*** DO NOT: add flowers, trees, landscapes, complex patterns, dense backgrounds ***`);
    parts.push(`*** ONLY: text + a few small simple icons. Keep it sparse. ***`);
  } else {
    parts.push(`*** DO NOT: ${QUOTE_NEGATIVE_PROMPTS.slice(0, 8).join(", ")} ***`);
  }
  
  parts.push(`*** REMEMBER: WHITE background, BLACK outlines only, NO fills ***`);

  return parts.join("\n");
}

// ============================================================
// QUOTE UTILITIES
// ============================================================

/**
 * Normalize a quote: trim whitespace, remove surrounding quotes.
 */
export function normalizeQuote(quote: string): string {
  let normalized = quote.trim();
  
  // Remove surrounding quotes (straight and curly)
  if ((normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'")) ||
      (normalized.startsWith('\u201C') && normalized.endsWith('\u201D')) ||
      (normalized.startsWith('\u2018') && normalized.endsWith('\u2019'))) {
    normalized = normalized.slice(1, -1).trim();
  }
  
  return normalized;
}

/**
 * Format quote for prompt: ensure it's in optimal format for generation.
 */
export function formatQuoteForPrompt(quote: string): string {
  // Capitalize first letter of each sentence
  let formatted = quote.charAt(0).toUpperCase() + quote.slice(1);
  
  // Ensure it ends with appropriate punctuation if missing
  if (!/[.!?]$/.test(formatted)) {
    // Don't add punctuation - let the quote be as is
  }
  
  return formatted;
}

/**
 * Validate quote length and suggest improvements.
 */
export function validateQuote(quote: string): {
  isValid: boolean;
  wordCount: number;
  suggestedAction?: string;
} {
  const normalized = normalizeQuote(quote);
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  if (wordCount < 2) {
    return {
      isValid: false,
      wordCount,
      suggestedAction: "Quote is too short. Add more words for better visual impact.",
    };
  }
  
  if (wordCount > 15) {
    return {
      isValid: false,
      wordCount,
      suggestedAction: "Quote is too long (over 15 words). Consider shortening for better readability.",
    };
  }
  
  if (wordCount > 12) {
    return {
      isValid: true,
      wordCount,
      suggestedAction: "Quote is on the longer side. Consider shortening if text appears too small.",
    };
  }
  
  return {
    isValid: true,
    wordCount,
  };
}

/**
 * Parse multiple quotes from text (one per line).
 */
export function parseMultipleQuotes(text: string): string[] {
  return text
    .split("\n")
    .map(line => normalizeQuote(line))
    .filter(line => line.length > 0 && line.split(/\s+/).length >= 2);
}

// ============================================================
// BELONGS-TO PAGE FOR QUOTE BOOKS
// ============================================================

/**
 * Build a prompt for a quote-book "Belongs To" page.
 */
export function buildQuoteBelongsToPrompt(
  decorationTheme: DecorationTheme,
  typographyStyle: TypographyStyle
): string {
  const parts: string[] = [];

  // *** CRITICAL: Put the most important constraints FIRST ***
  parts.push(CRITICAL_COLORING_PAGE_RULES);

  parts.push(`Create a "BELONGS TO" COLORING PAGE for a coloring book.`);
  parts.push("");

  parts.push(`=== PAGE SETUP ===`);
  parts.push(`- BLANK WHITE background.`);
  parts.push(`- BLACK OUTLINES only - no fills, no shading.`);
  parts.push("");

  parts.push(`=== CONTENT ===`);
  parts.push(`- Large outlined text: "THIS BOOK BELONGS TO:" at top (${TYPOGRAPHY_STYLES[typographyStyle]})`);
  parts.push(`- Below: A horizontal outlined rectangle or decorative line for writing a name.`);
  parts.push(`- Decorations: ${DECORATION_THEMES[decorationTheme]}`);
  parts.push(`- ALL elements are HOLLOW OUTLINES on WHITE background.`);
  parts.push("");

  parts.push(QUOTE_STYLE_SPEC);
  parts.push("");
  parts.push(`FRAMING: Full page (92-97% height), decorations reach edges.`);
  parts.push("");
  parts.push(`*** DO NOT: black background, filled shapes, grayscale, shading ***`);
  parts.push(`*** MUST HAVE: white background, outline-only artwork ***`);

  return parts.join("\n");
}

