/**
 * quotePagePromptEnforcer.ts
 * 
 * Prompt builder specifically for text/quote coloring pages.
 * Enforces typography-focused rules: text prominence, outline-only, readable layout.
 * 
 * NEW: Topic-to-motif mapping for meaningful decorations.
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

export type DecorationLevel = 
  | "text_only"      // Pure text, no decorations
  | "minimal_icons"  // Text + small icons
  | "border_only"    // Text + border/corner decorations
  | "full_background"; // Text + full decorative background

export type IconSet = 
  | "stars"      // Stars & sparkles
  | "hearts"     // Hearts
  | "doodles"    // Simple doodles
  | "sports"     // Sports icons
  | "kids";      // Kid-friendly icons

// Quote topic classification
export type QuoteTopic = 
  | "ambition"
  | "self_love"
  | "confidence"
  | "family"
  | "friendship"
  | "love"
  | "gratitude"
  | "calm"
  | "sports"
  | "study"
  | "health"
  | "humor"
  | "faith"
  | "travel"
  | "creativity"
  | "nature_wonder"
  | "general";

export interface QuotePageConfig {
  quote: string;
  decorationTheme: DecorationTheme;
  typographyStyle: TypographyStyle;
  density: DecorationDensity;
  frameStyle: FrameStyle;
  decorationLevel: DecorationLevel;
  iconSet?: IconSet;
  // NEW: Topic-based motif selection
  topic?: QuoteTopic;
  keywords?: string[];
  motifPack?: string[]; // Explicit list of allowed motifs
  pageNumber?: number;
  totalPages?: number;
}

// ============================================================
// TOPIC TO MOTIF MAPPING (MEANINGFUL DECORATIONS)
// ============================================================

/**
 * Maps quote topics to relevant decoration motifs.
 * This ensures decorations match the quote meaning.
 */
export const TOPIC_MOTIF_MAP: Record<QuoteTopic, string[]> = {
  ambition: ["mountain", "summit", "ladder", "compass", "trophy", "arrow pointing up", "stars", "path", "horizon", "flag"],
  self_love: ["mirror", "heart", "butterfly", "flower blooming", "sun", "crown", "sparkles", "gentle swirls"],
  confidence: ["lion silhouette", "crown", "shield", "star", "wings", "lightning bolt", "strong tree"],
  family: ["house outline", "heart", "tree", "hands holding", "birds nest", "sun", "flowers"],
  friendship: ["linked hands", "two hearts", "birds together", "flowers", "sun", "rainbow", "stars"],
  love: ["hearts", "roses", "ribbons", "doves", "swirls", "sparkles", "intertwined rings"],
  gratitude: ["sun", "sunflower", "thank you ribbon", "hearts", "leaves", "gentle flowers", "open hands"],
  calm: ["clouds", "waves", "moon", "gentle leaves", "lotus", "ripples", "stars", "feathers"],
  sports: ["ball", "trophy", "medal", "whistle", "sneaker outline", "stars", "ribbons", "goal post"],
  study: ["books", "pencil", "lightbulb", "graduation cap", "stars", "magnifying glass", "scroll"],
  health: ["heart", "apple", "sun", "leaves", "water drops", "yoga pose silhouette", "tree"],
  humor: ["smile", "laugh lines", "stars", "exclamation marks", "swirls", "playful doodles"],
  faith: ["stars", "lantern", "dove", "sun rays", "candle", "gentle light", "clouds"],
  travel: ["compass", "map outline", "plane", "suitcase", "mountains", "sun", "birds", "hot air balloon"],
  creativity: ["paintbrush", "palette", "lightbulb", "stars", "swirls", "pencil", "musical notes", "rainbow"],
  nature_wonder: ["mountains", "trees", "sun", "moon", "stars", "flowers", "butterflies", "birds", "leaves"],
  general: ["stars", "swirls", "simple flowers", "hearts", "dots", "circles", "sparkles"],
};

/**
 * Keywords that map to specific topics (for automatic classification)
 */
export const KEYWORD_TOPIC_MAP: Record<string, QuoteTopic> = {
  // Ambition
  "dream": "ambition", "goal": "ambition", "success": "ambition", "achieve": "ambition",
  "climb": "ambition", "reach": "ambition", "grow": "ambition", "strive": "ambition",
  "future": "ambition", "potential": "ambition", "excel": "ambition",
  
  // Self-love
  "self": "self_love", "yourself": "self_love", "enough": "self_love", "worth": "self_love",
  "embrace": "self_love", "accept": "self_love", "beautiful": "self_love", "unique": "self_love",
  
  // Confidence
  "brave": "confidence", "courage": "confidence", "strong": "confidence", "fearless": "confidence",
  "bold": "confidence", "confident": "confidence", "power": "confidence", "strength": "confidence",
  
  // Family
  "family": "family", "mother": "family", "father": "family", "parent": "family",
  "child": "family", "home": "family", "together": "family", "generation": "family",
  
  // Friendship
  "friend": "friendship", "friendship": "friendship",
  "bond": "friendship", "loyal": "friendship", "trust": "friendship",
  
  // Love
  "love": "love", "heart": "love", "forever": "love", "romance": "love",
  "cherish": "love", "adore": "love", "sweetheart": "love",
  
  // Gratitude
  "thank": "gratitude", "grateful": "gratitude", "bless": "gratitude", "appreciate": "gratitude",
  "gratitude": "gratitude", "fortunate": "gratitude",
  
  // Calm
  "peace": "calm", "calm": "calm", "breathe": "calm", "relax": "calm",
  "still": "calm", "quiet": "calm", "serene": "calm", "mindful": "calm",
  
  // Sports
  "win": "sports", "team": "sports", "play": "sports", "game": "sports",
  "champion": "sports", "athlete": "sports", "sport": "sports", "victory": "sports",
  
  // Study
  "learn": "study", "study": "study", "knowledge": "study", "education": "study",
  "read": "study", "book": "study", "wisdom": "study", "teach": "study",
  
  // Health
  "health": "health", "healthy": "health", "fit": "health", "wellness": "health",
  "body": "health", "mind": "health", "energy": "health",
  
  // Humor
  "laugh": "humor", "smile": "humor", "funny": "humor", "joy": "humor",
  "happy": "humor", "giggle": "humor", "fun": "humor",
  
  // Faith
  "faith": "faith", "believe": "faith", "hope": "faith", "pray": "faith",
  "god": "faith", "spirit": "faith", "soul": "faith", "blessing": "faith",
  
  // Travel
  "travel": "travel", "journey": "travel", "adventure": "travel", "explore": "travel",
  "discover": "travel", "wander": "travel", "world": "travel",
  
  // Creativity
  "create": "creativity", "imagine": "creativity", "art": "creativity", "design": "creativity",
  "inspire": "creativity", "creative": "creativity", "artistic": "creativity",
  
  // Nature
  "nature": "nature_wonder", "sky": "nature_wonder", "ocean": "nature_wonder", "mountain": "nature_wonder",
  "forest": "nature_wonder", "flower": "nature_wonder", "star": "nature_wonder", "moon": "nature_wonder",
};

/**
 * Classify a quote into a topic based on keywords.
 */
export function classifyQuoteTopic(quote: string): { topic: QuoteTopic; keywords: string[] } {
  const lowerQuote = quote.toLowerCase();
  const words = lowerQuote.split(/\s+/);
  
  const foundKeywords: string[] = [];
  const topicCounts: Partial<Record<QuoteTopic, number>> = {};
  
  for (const word of words) {
    // Clean the word
    const cleanWord = word.replace(/[^a-z]/g, "");
    if (cleanWord.length < 3) continue;
    
    // Check direct keyword match
    const topic = KEYWORD_TOPIC_MAP[cleanWord];
    if (topic) {
      foundKeywords.push(cleanWord);
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }
    
    // Check partial matches
    for (const [keyword, mappedTopic] of Object.entries(KEYWORD_TOPIC_MAP)) {
      if (cleanWord.includes(keyword) || keyword.includes(cleanWord)) {
        if (!foundKeywords.includes(keyword)) {
          foundKeywords.push(keyword);
          topicCounts[mappedTopic] = (topicCounts[mappedTopic] || 0) + 0.5;
        }
      }
    }
  }
  
  // Find the most common topic
  let bestTopic: QuoteTopic = "general";
  let bestCount = 0;
  
  for (const [topic, count] of Object.entries(topicCounts)) {
    if (count > bestCount) {
      bestCount = count;
      bestTopic = topic as QuoteTopic;
    }
  }
  
  return { topic: bestTopic, keywords: foundKeywords };
}

/**
 * Get the motif pack for a given topic.
 */
export function getMotifPackForTopic(topic: QuoteTopic): string[] {
  return TOPIC_MOTIF_MAP[topic] || TOPIC_MOTIF_MAP.general;
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
// TEXT LEGIBILITY RULES
// ============================================================

export const TEXT_LEGIBILITY_RULES = `
=== TEXT LEGIBILITY RULES (MANDATORY) ===
- The QUOTE TEXT must be the MOST PROMINENT element on the page.
- Use LARGE, BOLD, outline-only typography.
- Letter interiors must remain EMPTY/WHITE for coloring.
- Clear spacing between letters; no overlapping flourishes.
- Centered composition; place the quote in 2-5 lines maximum.
- Text occupies approximately 40-50% of the visual area.`;

// ============================================================
// FRAMING CONSTRAINTS
// ============================================================

export const QUOTE_FRAMING_CONSTRAINTS = `
=== FRAMING (MANDATORY) ===
- Full-page composition; artwork fills 92-97% of page height.
- Minimal top/bottom margins (<= 3-5%).
- Keep central text area clear and readable.`;

// ============================================================
// DECORATION THEME DESCRIPTIONS
// ============================================================

export const DECORATION_THEMES: Record<DecorationTheme, string> = {
  floral: "flowers, roses, leaves, petals, vines, botanical elements",
  stars: "stars, sparkles, moons, celestial elements, twinkling patterns",
  mandala: "mandala patterns, zentangle designs, intricate geometric mandalas",
  hearts: "hearts, love symbols, romantic flourishes",
  nature: "leaves, vines, branches, butterflies, organic elements",
  geometric: "geometric shapes, triangles, circles, abstract patterns",
  doodles: "cute doodles, playful elements, fun shapes",
  mixed: "a harmonious mix of flowers, stars, and simple shapes",
};

// ============================================================
// TYPOGRAPHY STYLE DESCRIPTIONS
// ============================================================

export const TYPOGRAPHY_STYLES: Record<TypographyStyle, string> = {
  bubble: "bold BUBBLE LETTERS with thick outlines, rounded chunky shapes, playful and easy to color",
  script: "elegant SCRIPT OUTLINE letters, flowing cursive with thick stroke, sophisticated hand-lettering",
  block: "clean BLOCK LETTERS with strong outlines, uniform stroke width, impactful sans-serif",
  mixed: "MIXED: key words in large bubble letters, other words in simpler block outlines",
};

// ============================================================
// DENSITY DESCRIPTIONS
// ============================================================

export const DENSITY_LEVELS: Record<DecorationDensity, string> = {
  low: "very sparse decorations (3-5 small elements), mostly white space",
  medium: "moderate decorations (8-12 elements), balanced with white space",
  high: "rich decorations (15-20+ elements), but text remains clear",
};

// ============================================================
// FRAME STYLE DESCRIPTIONS
// ============================================================

export const FRAME_STYLES: Record<FrameStyle, string> = {
  none: "NO border or frame",
  thin: "thin decorative outline border around the page",
  corners: "decorative corner ornaments only",
};

// ============================================================
// ICON SET DESCRIPTIONS
// ============================================================

export const ICON_SETS: Record<IconSet, string> = {
  stars: "outline stars, sparkles, crescent moons",
  hearts: "outline hearts of various sizes",
  doodles: "swirls, dots, circles, squiggles",
  sports: "balls, trophies, medals (outlines)",
  kids: "smileys, balloons, rainbows, clouds (outlines)",
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
  "crosshatching",
  "shadows",
  "watermark",
  "signature",
  "animals",
  "characters",
  "people",
  "toys",
  "random objects",
];

// ============================================================
// TEXT-ONLY PROMPT (HARD OVERRIDE - SEPARATE TEMPLATE)
// ============================================================

/**
 * Build a strict text-only prompt. NO decorations, NO exceptions.
 * This is a completely separate template to avoid any decoration leakage.
 * 
 * CRITICAL: This prompt must be EXTREMELY explicit about what NOT to draw
 * because AI tends to add "helpful" decorations even when told not to.
 */
function buildTextOnlyPrompt(quote: string, typographyStyle: TypographyStyle): string {
  const cleanQuote = normalizeQuote(quote);
  const formattedQuote = formatQuoteForPrompt(cleanQuote);
  const typoDesc = TYPOGRAPHY_STYLES[typographyStyle];

  // Use a very direct, explicit prompt structure with maximum clarity
  return `=== CRITICAL INSTRUCTION: TEXT ONLY - ZERO DECORATIONS ===

Create a coloring page with ONLY typography. This is a TEXT-ONLY page.

PAGE SIZE: 8.5 x 11 inches (US Letter), portrait orientation.

WHAT TO DRAW (THE COMPLETE LIST):
1. The quote text as large ${typoDesc}
2. Nothing else. Literally nothing else.

QUOTE TO DISPLAY (exact text):
"${formattedQuote}"

TYPOGRAPHY REQUIREMENTS:
- Letters are HOLLOW OUTLINES with WHITE/EMPTY interiors (for coloring)
- Black outline strokes only, no fills
- Make text LARGE - fill 80-90% of page height
- Center horizontally and vertically
- Split into 2-4 lines if needed with comfortable spacing
- Thick, bold letter outlines that are easy to color

ART STYLE (MANDATORY):
- Pure WHITE background - completely empty except for text
- BLACK outline strokes ONLY
- NO filled areas, NO solid black regions
- NO grayscale, NO shading, NO gradients, NO textures
- NO shadows, NO depth effects
- Clean vector-like line work

=== ABSOLUTE ZERO-TOLERANCE PROHIBITIONS ===

DO NOT ADD ANY OF THESE (if any appear, the image is WRONG):
❌ Clouds, sky elements, sun, moon
❌ Stars, sparkles, twinkles, dots
❌ Hearts, flowers, leaves, plants
❌ Animals, characters, people, faces
❌ Icons, symbols, shapes
❌ Border, frame, corner decorations
❌ Ground line, grass, floor, horizon
❌ Cars, houses, toys, objects
❌ Swirls, flourishes, ornaments
❌ Background patterns or textures
❌ ANY element that is not a letter

THE ENTIRE IMAGE MUST CONTAIN:
✓ White/empty background
✓ Black outlined letters spelling the quote
✓ NOTHING ELSE

This is a TYPOGRAPHY-ONLY coloring page. The visual interest comes from the letter shapes alone. Do NOT add decorations "to make it prettier" - that would make it WRONG.

VALIDATION: If there is ANY mark on the page that is not part of a letter outline, the image fails and must be regenerated with stricter adherence to TEXT ONLY.`;
}

// ============================================================
// MAIN PROMPT BUILDER
// ============================================================

/**
 * Build a complete prompt for a quote coloring page.
 * Uses topic-based motif selection for meaningful decorations.
 * 
 * IMPORTANT: text_only mode uses a completely separate template
 * to prevent any decoration leakage.
 */
export function buildQuotePagePrompt(config: QuotePageConfig): string {
  const {
    quote,
    typographyStyle,
    density,
    frameStyle,
    decorationLevel,
    iconSet = "stars",
    topic,
    motifPack,
  } = config;

  // ============================================================
  // HARD EARLY RETURN FOR TEXT-ONLY MODE
  // This bypasses ALL decoration logic completely
  // ============================================================
  if (decorationLevel === "text_only") {
    return buildTextOnlyPrompt(quote, typographyStyle);
  }

  // ============================================================
  // DECORATED MODES (minimal_icons, border_only, full_background)
  // ============================================================
  
  // Normalize and format the quote
  const cleanQuote = normalizeQuote(quote);
  const formattedQuote = formatQuoteForPrompt(cleanQuote);

  // Get topic and motifs if not provided
  const classification = topic ? { topic, keywords: [] } : classifyQuoteTopic(cleanQuote);
  const actualTopic = classification.topic;
  const actualMotifs = motifPack || getMotifPackForTopic(actualTopic);

  const parts: string[] = [];

  // *** CRITICAL: Put the most important constraints FIRST ***
  parts.push(CRITICAL_COLORING_PAGE_RULES);

  // Main instruction
  parts.push(`Create a COLORING BOOK PAGE with the quote: "${formattedQuote}"`);
  parts.push("");

  // ============================================================
  // TYPOGRAPHY SETTINGS (Always Applied)
  // ============================================================
  parts.push(`=== TYPOGRAPHY (MUST FOLLOW) ===`);
  parts.push(`- Quote text is CENTERED and LARGE.`);
  parts.push(`- Typography style: ${TYPOGRAPHY_STYLES[typographyStyle]}`);
  parts.push(`- Letters are HOLLOW OUTLINES (white inside, black outline).`);
  parts.push(`- Text is the DOMINANT visual element (40-50% of page).`);
  parts.push(`- Clear spacing between letters.`);
  parts.push("");

  // ============================================================
  // DECORATION LEVEL RULES (STRICT)
  // ============================================================
  parts.push(`=== DECORATION RULES (STRICT - MUST FOLLOW EXACTLY) ===`);
  
  if (decorationLevel === "minimal_icons") {
    // MINIMAL ICONS - Small, sparse, from motif pack or icon set
    const iconsToUse = actualMotifs.slice(0, 6).join(", ");
    parts.push(`DECORATION LEVEL: MINIMAL ICONS`);
    parts.push(`- Quote text is the MAIN element.`);
    parts.push(`- Add only 6-10 SMALL, SPARSE outline icons around the text.`);
    parts.push(`- Icons MUST be from this list ONLY: ${iconsToUse}`);
    parts.push(`- Keep 80% of the background as empty white space.`);
    parts.push(`- Icons should be TINY compared to the text.`);
    parts.push(`- DO NOT add: animals, characters, toys, complex scenery.`);
    parts.push(`- Density: ${DENSITY_LEVELS[density]}`);
    parts.push("");
    parts.push(`*** Use ONLY these motifs: ${iconsToUse}. NO random objects. ***`);
    
  } else if (decorationLevel === "border_only") {
    // BORDER ONLY - Frame/border with NO interior decorations
    const borderMotifs = actualMotifs.slice(0, 4).join(", ");
    parts.push(`DECORATION LEVEL: BORDER ONLY`);
    parts.push(`- Quote text centered in a clear, empty center area.`);
    parts.push(`- Add a decorative ${FRAME_STYLES[frameStyle] || "thin outline"} border.`);
    parts.push(`- Border elements can include: ${borderMotifs}`);
    parts.push(`- The CENTER of the page is EMPTY except for text.`);
    parts.push(`- NO interior decorations, NO background patterns.`);
    parts.push(`- Border frames the page edges only.`);
    parts.push("");
    parts.push(`*** CENTER MUST BE EMPTY. Only border decorations around edges. ***`);
    
  } else if (decorationLevel === "full_background") {
    // FULL BACKGROUND - Detailed decorations, but text stays clear
    const bgMotifs = actualMotifs.join(", ");
    parts.push(`DECORATION LEVEL: FULL BACKGROUND`);
    parts.push(`- Quote text is DOMINANT and clearly readable.`);
    parts.push(`- Keep a clear "halo" / buffer zone around the text.`);
    parts.push(`- Fill background with decorations from this list: ${bgMotifs}`);
    parts.push(`- Decorations are outline-only, matching the quote's meaning.`);
    parts.push(`- Density: ${DENSITY_LEVELS[density]}`);
    parts.push(`- DO NOT add random animals, characters, or unrelated objects.`);
    parts.push("");
    parts.push(`*** Use ONLY these decorations: ${bgMotifs}. Keep text readable. ***`);
  }
  parts.push("");

  // ============================================================
  // GLOBAL ART RULES
  // ============================================================
  parts.push(`=== ART STYLE (MANDATORY) ===`);
  parts.push(`- Clean black-and-white OUTLINE line art only.`);
  parts.push(`- NO filled areas, NO solid black, NO shading, NO gradients.`);
  parts.push(`- Crisp lines on pure white background.`);
  parts.push(`- NO watermark, NO signature.`);
  if (frameStyle === "none" && decorationLevel !== "border_only") {
    parts.push(`- NO border or frame.`);
  }
  parts.push("");

  // ============================================================
  // FRAMING
  // ============================================================
  parts.push(`=== PAGE COMPOSITION ===`);
  parts.push(`- Full-page composition, fills 92-97% of page height.`);
  parts.push(`- Minimal top/bottom margins.`);
  parts.push("");

  // ============================================================
  // FINAL REINFORCEMENT
  // ============================================================
  // Note: text_only has early return above, so this only applies to decorated modes
  parts.push(`*** FINAL CHECK: Use ONLY the allowed motifs. NO random animals/toys/characters. ***`);
  parts.push(`*** WHITE background, BLACK outlines only, NO fills ***`);

  return parts.join("\n");
}

// ============================================================
// QUOTE UTILITIES
// ============================================================

export function normalizeQuote(quote: string): string {
  let normalized = quote.trim();
  
  if ((normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'")) ||
      (normalized.startsWith('\u201C') && normalized.endsWith('\u201D')) ||
      (normalized.startsWith('\u2018') && normalized.endsWith('\u2019'))) {
    normalized = normalized.slice(1, -1).trim();
  }
  
  return normalized;
}

export function formatQuoteForPrompt(quote: string): string {
  return quote.charAt(0).toUpperCase() + quote.slice(1);
}

export function validateQuote(quote: string): {
  isValid: boolean;
  wordCount: number;
  suggestedAction?: string;
} {
  const normalized = normalizeQuote(quote);
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  if (wordCount < 2) {
    return { isValid: false, wordCount, suggestedAction: "Quote is too short." };
  }
  if (wordCount > 15) {
    return { isValid: false, wordCount, suggestedAction: "Quote is too long (over 15 words)." };
  }
  if (wordCount > 12) {
    return { isValid: true, wordCount, suggestedAction: "Quote is long. Consider shortening." };
  }
  return { isValid: true, wordCount };
}

export function parseMultipleQuotes(text: string): string[] {
  return text
    .split("\n")
    .map(line => normalizeQuote(line))
    .filter(line => line.length > 0 && line.split(/\s+/).length >= 2);
}

// ============================================================
// BELONGS-TO PAGE FOR QUOTE BOOKS (NO CHARACTERS)
// ============================================================

/**
 * Build a prompt for a quote-book "Belongs To" page.
 * NO CHARACTERS - uses decorations matching the book's style.
 */
/**
 * Build a strict text-only "Belongs To" prompt for Quote Books.
 * NO characters, NO animals, NO mascots - ever.
 */
function buildTextOnlyBelongsToPrompt(typographyStyle: TypographyStyle): string {
  const typoDesc = TYPOGRAPHY_STYLES[typographyStyle];

  return `Create a print-ready 8.5x11 inch (Letter) "BELONGS TO" coloring page in clean black-and-white OUTLINE line art.

TEXT ONLY MODE (STRICT):
This is a TEXT-ONLY belongs-to page. No decorations allowed.

WHAT TO DRAW:
1. At the TOP: Large outlined text "THIS BOOK BELONGS TO:" 
   - Typography style: ${typoDesc}
   - Letters are HOLLOW OUTLINES (white inside, black outline)
   
2. In the MIDDLE: A horizontal rectangle outline OR a simple underline
   - This is where the owner writes their name
   - Make it about 60-70% of page width, centered
   - Just a simple outlined box or line - nothing fancy

3. OPTIONAL: Small text "Name:" above the line (also outlined)

WHAT NOT TO DRAW (CRITICAL - ZERO TOLERANCE):
- NO clouds, stars, hearts, flowers, or any icons
- NO animals, characters, mascots, people, faces
- NO border or frame around the page
- NO decorative corners or edges
- NO patterns, swirls, dots outside the letters
- NO scenery, ground line, or background elements
- NOTHING except the text and name line

Layout:
- Center everything on the page
- Title text fills ~30% of page height at top
- Name line/box in middle area
- Rest is pure white space

Art style:
- Black outlines on pure white background
- No fills, no grayscale, no shading
- Clean vector-like line work
- No watermark, no signature

=== ABSOLUTE PROHIBITIONS ===
- NO dogs, cats, bears, bunnies, or ANY animals
- NO cartoon characters or mascots
- NO decorative elements of any kind
- The page contains ONLY: title text + name line

If ANY decoration, animal, or character appears, the image is INVALID.`;
}

export function buildQuoteBelongsToPrompt(config: {
  decorationLevel: DecorationLevel;
  decorationTheme?: DecorationTheme;
  iconSet?: IconSet;
  typographyStyle: TypographyStyle;
  frameStyle?: FrameStyle;
}): string {
  const {
    decorationLevel,
    decorationTheme = "stars",
    iconSet = "stars",
    typographyStyle,
    frameStyle = "none",
  } = config;

  // ============================================================
  // HARD EARLY RETURN FOR TEXT-ONLY MODE
  // This bypasses ALL decoration logic completely
  // ============================================================
  if (decorationLevel === "text_only") {
    return buildTextOnlyBelongsToPrompt(typographyStyle);
  }

  // ============================================================
  // DECORATED MODES (minimal_icons, border_only, full_background)
  // ============================================================
  const parts: string[] = [];

  // Critical rules first
  parts.push(CRITICAL_COLORING_PAGE_RULES);

  parts.push(`Create a "BELONGS TO" COLORING PAGE for a quote coloring book.`);
  parts.push("");

  // Content
  parts.push(`=== CONTENT ===`);
  parts.push(`- Large outlined text: "THIS BOOK BELONGS TO:" at the top.`);
  parts.push(`- Typography: ${TYPOGRAPHY_STYLES[typographyStyle]}`);
  parts.push(`- Below the text: A horizontal outlined rectangle or decorative line for writing a name.`);
  parts.push(`- All text and elements are HOLLOW OUTLINES.`);
  parts.push("");

  // Decoration rules based on level
  parts.push(`=== DECORATIONS (MATCH BOOK STYLE) ===`);
  
  if (decorationLevel === "minimal_icons") {
    parts.push(`- Add small outline icons: ${ICON_SETS[iconSet]}`);
    parts.push(`- Keep icons sparse (5-8 small icons around the text).`);
    parts.push(`- 80% of page should be white space.`);
  } else if (decorationLevel === "border_only") {
    parts.push(`- Add a decorative border/frame: ${FRAME_STYLES[frameStyle] || FRAME_STYLES.thin}`);
    parts.push(`- Border can include elements from: ${DECORATION_THEMES[decorationTheme]}`);
    parts.push(`- Keep center area clean.`);
  } else if (decorationLevel === "full_background") {
    parts.push(`- Decorative background using: ${DECORATION_THEMES[decorationTheme]}`);
    parts.push(`- Keep a clear halo around the text.`);
    parts.push(`- Decorations should not overwhelm the text.`);
  }
  parts.push("");

  // Critical restrictions - VERY EXPLICIT
  parts.push(`=== RESTRICTIONS (CRITICAL - MUST FOLLOW) ===`);
  parts.push(`- NO animals of any kind (no dogs, cats, bears, bunnies, birds, etc.)`);
  parts.push(`- NO characters, mascots, or people`);
  parts.push(`- NO faces or creatures`);
  parts.push(`- Only typography and ABSTRACT decorations (${decorationTheme})`);
  parts.push(`- White background, black outlines only`);
  parts.push(`- NO filled areas, NO shading, NO gradients`);
  parts.push("");

  parts.push(`=== ABSOLUTE PROHIBITIONS ===`);
  parts.push(`This is a QUOTE book, NOT a character book.`);
  parts.push(`DO NOT DRAW: dogs, cats, bears, bunnies, foxes, lions, any animal`);
  parts.push(`DO NOT DRAW: cartoon characters, mascots, people, faces`);
  parts.push(`ONLY DRAW: Text + abstract decorative patterns (${DECORATION_THEMES[decorationTheme]})`);
  parts.push("");

  parts.push(`If ANY animal or character appears in the image, it is INVALID.`);

  return parts.join("\n");
}
