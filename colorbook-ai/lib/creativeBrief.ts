/**
 * creativeBrief.ts
 * 
 * CREATIVE BRIEF PIPELINE
 * =======================
 * This module implements a proper idea→scene pipeline that:
 * 1. Understands the user's idea deeply (CreativeBrief)
 * 2. Plans unique scenes that match the idea (ScenePlan)
 * 3. Avoids generic templates unless explicitly requested
 * 4. Maintains character consistency for storybook mode
 * 5. Enforces anti-repetition rules
 * 
 * NO GENERIC TEMPLATES:
 * - We do NOT use bedroom/kitchen/school unless user specifically asked
 * - Scenes must derive from the user's actual idea
 * - Valentine's Day = hearts, love, etc. NOT random fairies
 */

import { z } from "zod";

// ============================================================
// CREATIVE BRIEF SCHEMA
// ============================================================

export const characterSpecSchema = z.object({
  name: z.string().optional(),
  species: z.string(),
  visualTraits: z.array(z.string()),
  outfit: z.string().optional(),
  accessories: z.array(z.string()).optional(),
  proportions: z.string(),
  alwaysInclude: z.array(z.string()), // e.g., "both arms/hands visible", "horn on head"
  neverChange: z.array(z.string()), // traits that must stay identical
});

export type CharacterSpec = z.infer<typeof characterSpecSchema>;

export const creativeBriefSchema = z.object({
  // Core theme understanding
  themeTitle: z.string(),
  themeDescription: z.string(),
  targetAudience: z.enum(["3-6", "6-9", "9-12", "all-ages"]).default("all-ages"),
  mood: z.string(),
  
  // Visual style
  visualStyleHints: z.array(z.string()),
  lineThickness: z.enum(["thin", "medium", "thick"]).default("medium"),
  complexity: z.enum(["simple", "medium", "detailed"]).default("medium"),
  
  // World building
  settingWorld: z.string(), // e.g., "enchanted garden", "alien planet", "valentine village"
  primaryLocations: z.array(z.string()), // Specific to the theme
  timeOfDayOptions: z.array(z.string()).optional(),
  
  // Characters (Storybook mode)
  mainCharacter: characterSpecSchema.optional(),
  supportingCast: z.array(z.object({
    type: z.string(),
    role: z.string(),
  })).optional(),
  
  // Content rules
  mustInclude: z.array(z.string()), // Theme-specific motifs that MUST appear
  mustAvoid: z.array(z.string()), // Generic filler, off-theme content
  forbiddenFillers: z.array(z.string()), // "random rocks", "toy car", etc.
  
  // Variety planning
  varietyPlan: z.object({
    sceneTypes: z.array(z.string()), // e.g., "action scene", "quiet moment", "celebration"
    actionsPool: z.array(z.string()), // e.g., "picking flowers", "having tea party"
    propsPool: z.array(z.string()), // Theme-appropriate props
    compositionStyles: z.array(z.string()), // "close-up", "medium shot", "wide scene"
  }),
  
  // Theme-specific flags
  isHolidayTheme: z.boolean().default(false),
  holidayName: z.string().optional(),
  holidayMotifs: z.array(z.string()).optional(),
});

export type CreativeBrief = z.infer<typeof creativeBriefSchema>;

// ============================================================
// SCENE PLAN SCHEMA  
// ============================================================

export const plannedSceneSchema = z.object({
  pageNumber: z.number(),
  title: z.string(),
  location: z.string(),
  action: z.string(),
  props: z.array(z.string()), // 4-8 specific props
  composition: z.string(), // "close-up", "medium", "wide"
  timeOfDay: z.string().optional(),
  mood: z.string(),
  themeMotifs: z.array(z.string()), // Which theme motifs appear in this scene
  // For storybook - what is the character doing
  characterAction: z.string().optional(),
  characterExpression: z.string().optional(),
});

export type PlannedScene = z.infer<typeof plannedSceneSchema>;

export const scenePlanSchema = z.object({
  scenes: z.array(plannedSceneSchema),
  usedLocations: z.array(z.string()),
  usedProps: z.array(z.string()),
  diversityScore: z.number(), // 0-100, how varied are the scenes
});

export type ScenePlan = z.infer<typeof scenePlanSchema>;

// ============================================================
// THEME DETECTION AND REQUIREMENTS
// ============================================================

interface ThemeRequirements {
  isSpecialTheme: boolean;
  themeName: string;
  requiredMotifs: string[];
  forbiddenContent: string[];
  suggestedLocations: string[];
  suggestedActions: string[];
  exampleScenes: string[];
}

/**
 * Detect special themes and return required motifs
 * This ensures Valentine's Day → hearts, not random fairies
 */
export function detectThemeRequirements(ideaText: string): ThemeRequirements {
  const lower = ideaText.toLowerCase();
  
  // Valentine's Day / Love
  if (lower.includes("valentine") || lower.includes("love") && !lower.includes("i love")) {
    return {
      isSpecialTheme: true,
      themeName: "Valentine's Day",
      requiredMotifs: [
        "hearts", "roses", "love birds", "cupid", "chocolates", "love letters",
        "heart balloons", "ribbons", "valentine cards", "flower bouquets",
        "romantic picnic", "friendship hearts"
      ],
      forbiddenContent: [
        "random fairy", "witch", "monster", "scary", "spooky", "halloween",
        "christmas tree", "santa", "unrelated fantasy creatures"
      ],
      suggestedLocations: [
        "valentine garden with heart flowers",
        "cozy living room with valentine decorations",
        "romantic picnic spot with heart blanket",
        "valentine craft table",
        "flower shop with roses",
        "bakery with heart-shaped treats",
        "park with valentine decorations"
      ],
      suggestedActions: [
        "exchanging valentine cards",
        "decorating heart cookies",
        "making valentine crafts",
        "giving flowers to friends",
        "having a valentine tea party",
        "opening valentine presents",
        "writing love notes",
        "decorating for valentine's day"
      ],
      exampleScenes: [
        "Cute animals exchanging valentine cards surrounded by hearts",
        "Friends decorating heart-shaped cookies in a kitchen",
        "Characters having a valentine picnic with roses and heart treats",
        "Cupid flying over a village spreading hearts",
        "Kids making valentine crafts with glitter and ribbon"
      ]
    };
  }
  
  // Halloween
  if (lower.includes("halloween") || lower.includes("spooky") || lower.includes("trick or treat")) {
    return {
      isSpecialTheme: true,
      themeName: "Halloween",
      requiredMotifs: [
        "pumpkins", "jack-o-lanterns", "ghosts", "bats", "spiders", "webs",
        "witches hat", "candy", "costumes", "haunted house", "black cats", "full moon"
      ],
      forbiddenContent: [
        "hearts", "love", "valentine", "christmas", "santa", "easter"
      ],
      suggestedLocations: [
        "pumpkin patch", "haunted house entrance", "spooky forest path",
        "trick-or-treat street", "costume party", "witch's kitchen",
        "graveyard with friendly ghosts"
      ],
      suggestedActions: [
        "trick-or-treating", "carving pumpkins", "putting on costumes",
        "decorating for halloween", "bobbing for apples", "telling spooky stories"
      ],
      exampleScenes: [
        "Kids in costumes trick-or-treating at a decorated house",
        "Friendly ghosts having a halloween party",
        "Cute witch brewing a magical potion with bats flying",
        "Pumpkin patch with jack-o-lanterns and black cats"
      ]
    };
  }
  
  // Christmas / Winter Holiday
  if (lower.includes("christmas") || lower.includes("santa") || lower.includes("holiday") || lower.includes("winter wonderland")) {
    return {
      isSpecialTheme: true,
      themeName: "Christmas",
      requiredMotifs: [
        "christmas tree", "presents", "stockings", "snowflakes", "santa",
        "reindeer", "ornaments", "candy canes", "snowmen", "bells", "wreaths", "stars"
      ],
      forbiddenContent: [
        "valentine", "hearts", "halloween", "pumpkins", "easter", "bunny"
      ],
      suggestedLocations: [
        "living room with christmas tree", "santa's workshop",
        "snowy village", "north pole", "cozy fireplace",
        "christmas market", "gingerbread house"
      ],
      suggestedActions: [
        "decorating the tree", "opening presents", "making cookies for santa",
        "building snowmen", "caroling", "wrapping gifts", "sledding"
      ],
      exampleScenes: [
        "Family decorating a christmas tree with ornaments and stars",
        "Santa in his workshop with elves making toys",
        "Reindeer pulling a sleigh through snowy sky",
        "Children opening presents by the fireplace"
      ]
    };
  }
  
  // Easter
  if (lower.includes("easter") || (lower.includes("bunny") && lower.includes("egg"))) {
    return {
      isSpecialTheme: true,
      themeName: "Easter",
      requiredMotifs: [
        "easter eggs", "bunnies", "baskets", "chicks", "spring flowers",
        "tulips", "carrots", "ribbons", "butterflies", "grass"
      ],
      forbiddenContent: [
        "halloween", "christmas", "santa", "spooky", "winter"
      ],
      suggestedLocations: [
        "spring garden", "meadow", "easter egg hunt field",
        "bunny's home", "flower patch", "farm with chicks"
      ],
      suggestedActions: [
        "hunting for easter eggs", "decorating eggs", "carrying baskets",
        "hopping through flowers", "hatching from eggs", "spring gardening"
      ],
      exampleScenes: [
        "Bunnies decorating colorful easter eggs",
        "Easter egg hunt in a spring garden with tulips",
        "Cute chicks hatching from decorated eggs",
        "Bunny with a basket full of easter eggs"
      ]
    };
  }
  
  // Default - analyze the idea for theme-appropriate content
  return {
    isSpecialTheme: false,
    themeName: "Custom Theme",
    requiredMotifs: [],
    forbiddenContent: [
      "random rocks scattered", "generic toy car", "random balls",
      "unexplained leaves", "generic clutter", "bedroom", "kitchen",
      "bathroom", "school", "daily routine"
    ],
    suggestedLocations: [],
    suggestedActions: [],
    exampleScenes: []
  };
}

// ============================================================
// FORBIDDEN FILLER LIST (ALWAYS AVOID)
// ============================================================

export const FORBIDDEN_FILLERS = [
  // Generic clutter that AI tends to add
  "random rocks",
  "scattered rocks",
  "small toy car",
  "random toy car",
  "generic balls",
  "random balls",
  "scattered leaves",
  "random leaves",
  "generic clutter",
  "random objects",
  "unexplained items",
  // Repeated bottom fillers
  "random flowers at bottom",
  "scattered pebbles",
  "generic grass patches",
  "repeated small props",
  // Off-theme content
  "bedroom scene (unless requested)",
  "kitchen scene (unless requested)",
  "bathroom scene",
  "school/classroom (unless requested)",
  "daily routine template",
  "wake up scene",
  "eating breakfast",
  "getting dressed",
];

// ============================================================
// FULL PAGE COMPOSITION CONTRACT
// ============================================================

export const FULL_PAGE_COMPOSITION_CONTRACT = `
=== FULL PAGE COMPOSITION (MANDATORY - US LETTER 8.5x11) ===

This is a FULL-PAGE coloring page. The artwork MUST fill the ENTIRE page.

CANVAS COVERAGE:
- Main subject + scene occupies 90-95% of canvas HEIGHT
- No large empty areas anywhere
- Ink/lines extend from near top edge to near bottom edge

BOTTOM FILL (CRITICAL):
- Foreground elements MUST reach the bottom margin (no empty bottom strip)
- Include a visible ground plane: floor tiles, grass, path, rug, carpet, etc.
- Add 2-4 foreground props near bottom edge: flowers, pebbles, toys, etc.
- Ground texture fills the lower 15-20% of canvas

FRAMING:
- Subject in lower-middle portion of frame (not floating at top)
- Slightly zoomed-in / closer perspective
- Background has simplified environment lines extending down

FORBIDDEN:
- No floating subject with empty space below
- No large blank backgrounds
- No tiny centered subject with margins all around
- No repeated generic filler (rocks, balls, leaves) unless scene-appropriate
`;

// ============================================================
// CHARACTER BIBLE BUILDER (for Storybook consistency)
// ============================================================

export function buildCharacterBible(character: CharacterSpec): string {
  const traits = character.visualTraits.join(", ");
  const always = character.alwaysInclude.join(", ");
  const never = character.neverChange.join(", ");
  
  return `
=== CHARACTER BIBLE (LOCKED - IDENTICAL ON EVERY PAGE) ===

IDENTITY:
- ${character.name ? `Name: ${character.name}` : ""}
- Species/Type: ${character.species}
- Visual Traits: ${traits}
- Proportions: ${character.proportions}
${character.outfit ? `- Outfit: ${character.outfit}` : ""}
${character.accessories?.length ? `- Accessories: ${character.accessories.join(", ")}` : ""}

ALWAYS INCLUDE (every page):
${always}

NEVER CHANGE (must be identical):
${never}

CONSISTENCY RULES:
1. Same face shape, eye style, ear shape on EVERY page
2. Same body-to-head ratio on EVERY page
3. Same distinctive features (horn, wings, tail, spots, etc.)
4. Both arms/hands visible unless action logically hides one
5. Same line thickness and detail level
6. ONLY change: pose, action, expression - NOT the design

WARNING: Do NOT redesign between pages. Do NOT alter proportions.
The character must be INSTANTLY RECOGNIZABLE as the SAME individual.
`;
}

// ============================================================
// SCENE UNIQUENESS CHECKER
// ============================================================

/**
 * Check if a planned scene is too similar to previous scenes
 */
export function isSceneTooSimilar(
  newScene: PlannedScene,
  previousScenes: PlannedScene[],
  maxSimilarProps: number = 3
): { isSimilar: boolean; reason?: string } {
  for (const prev of previousScenes.slice(-3)) { // Check last 3 scenes
    // Same location check
    if (prev.location.toLowerCase() === newScene.location.toLowerCase()) {
      return { isSimilar: true, reason: `Same location as page ${prev.pageNumber}` };
    }
    
    // Same action check
    if (prev.action.toLowerCase() === newScene.action.toLowerCase()) {
      return { isSimilar: true, reason: `Same action as page ${prev.pageNumber}` };
    }
    
    // Props overlap check
    const commonProps = newScene.props.filter(p => 
      prev.props.some(pp => pp.toLowerCase() === p.toLowerCase())
    );
    if (commonProps.length >= maxSimilarProps) {
      return { isSimilar: true, reason: `Too many shared props with page ${prev.pageNumber}` };
    }
  }
  
  return { isSimilar: false };
}

// ============================================================
// PROMPT SYSTEM PROMPT FOR IDEA UNDERSTANDING
// ============================================================

export const IDEA_UNDERSTANDING_SYSTEM_PROMPT = `You are a creative director for a professional coloring book company.

Your job is to deeply understand a user's coloring book idea and create a detailed creative brief that will guide scene generation.

CRITICAL RULES:
1. NEVER add generic templates (bedroom, kitchen, school, bathroom) unless the user explicitly asked for daily routine scenes
2. Every element must connect to the user's actual idea
3. If user says "Valentine's Day", every scene must have valentine motifs (hearts, love, etc.)
4. If user says "turtle in a garden", all scenes must be garden/outdoor related
5. Avoid generic filler (random rocks, toy cars, balls, scattered leaves)
6. Create theme-appropriate locations, not generic ones

For Storybook mode:
- Create ONE detailed main character spec with strict consistency rules
- Character must have "always include" traits (e.g., "both arms visible", "horn on head")
- Character design must be recognizable on every page

For Theme Collection mode:
- No forced main character
- Define varied subjects that fit the theme
- Create a diverse props pool appropriate to the theme`;

export const SCENE_PLANNING_SYSTEM_PROMPT = `You are a scene planner for a professional coloring book.

Your job is to create ${"{pageCount}"} unique, theme-appropriate scenes based on a creative brief.

CRITICAL RULES:
1. Every scene must clearly connect to the theme (no generic scenes)
2. No two consecutive scenes can have the same location
3. Each scene must have at least 2 unique props not used in the previous 2 pages
4. Vary composition: alternate between close-up, medium shot, and wide scene
5. Include theme motifs in EVERY scene (hearts for Valentine's, pumpkins for Halloween, etc.)
6. Props must be specific and positioned (not just "toys" but "red ball on the left, teddy bear in background")
7. For storybook: vary the character's action and expression, NOT their design

ANTI-REPETITION:
- Track used locations - use each location at most twice across all pages
- Track used props - avoid repeating the same prop combination
- Vary scene types: action scenes, quiet moments, celebrations, discoveries

COMPOSITION CONTRACT:
- Every scene fills the full page (no empty bottom)
- Ground plane reaches bottom edge
- Subject in lower-middle portion of frame
- Include foreground props at bottom`;

