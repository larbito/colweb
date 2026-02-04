/**
 * ideaPlanner.ts
 * 
 * SMART PROMPT ENGINE - No Templates, Theme-Faithful Generation
 * 
 * Two-stage planning process:
 * 1. Parse user input into IdeaSpec (understanding what user wants)
 * 2. Create PageOutline with unique scenes (no repetition, no generic templates)
 * 
 * Anti-repetition memory tracks used settings, props, motifs, and actions.
 */

import { z } from "zod";

// ============================================================
// IDEA SPEC - Understanding the User's Vision
// ============================================================

export const ideaSpecSchema = z.object({
  // Core concept
  subjects: z.array(z.string()).describe("Main characters/subjects (e.g., 'baby unicorn', 'playful dragon')"),
  world: z.string().describe("The setting world (e.g., 'enchanted garden', 'underwater kingdom')"),
  theme: z.string().describe("Core theme (e.g., 'Valentine's Day love', 'space adventure')"),
  
  // Audience and style
  targetAudience: z.enum(["toddlers", "kids", "tweens", "teens", "adults"]).default("kids"),
  complexity: z.enum(["simple", "medium", "detailed", "ultra"]).default("medium"),
  mood: z.string().describe("Overall mood (cheerful, adventurous, cozy, magical)"),
  
  // Content rules
  mustInclude: z.array(z.string()).describe("Elements that MUST appear in scenes"),
  forbidden: z.array(z.string()).describe("Elements to NEVER include"),
  userConstraints: z.array(z.string()).describe("Explicit constraints from user input"),
  
  // Theme-specific
  isHolidayTheme: z.boolean().default(false),
  holidayName: z.string().optional(),
  holidayMotifs: z.array(z.string()).optional(),
  
  // Derived settings
  suggestedSettings: z.array(z.string()).describe("World-appropriate locations"),
  suggestedActions: z.array(z.string()).describe("Theme-appropriate activities"),
  suggestedProps: z.array(z.string()).describe("Theme-appropriate items"),
});

export type IdeaSpec = z.infer<typeof ideaSpecSchema>;

// ============================================================
// PAGE OUTLINE - Structured Scene Planning
// ============================================================

export const pageOutlineSchema = z.object({
  pageIndex: z.number(),
  title: z.string(),
  setting: z.string().describe("Specific location for this scene"),
  action: z.string().describe("What's happening in the scene"),
  props: z.array(z.string()).min(3).max(8).describe("Scene-specific props"),
  compositionNotes: z.string().describe("Framing guidance"),
  noveltyTag: z.string().describe("What makes this scene unique"),
  // For storybook mode
  characterPose: z.string().optional(),
  characterExpression: z.string().optional(),
});

export type PageOutline = z.infer<typeof pageOutlineSchema>;

export const scenePlaySchema = z.object({
  pages: z.array(pageOutlineSchema),
  diversityScore: z.number().min(0).max(100),
  usedSettings: z.array(z.string()),
  usedProps: z.array(z.string()),
  usedActions: z.array(z.string()),
});

export type ScenePlan = z.infer<typeof scenePlaySchema>;

// ============================================================
// CHARACTER SHEET - For Storybook Consistency
// ============================================================

export const characterSheetSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  species: z.string().describe("Specific type (e.g., 'baby panda with round cheeks')"),
  
  // Physical features - LOCKED
  proportions: z.string().describe("Body ratio (e.g., 'chibi with large head, 1:2 head-to-body')"),
  faceShape: z.string().describe("Face structure (e.g., 'round with soft cheeks')"),
  eyeStyle: z.string().describe("Eye design (e.g., 'large round eyes with small pupils')"),
  noseStyle: z.string().describe("Nose design"),
  mouthStyle: z.string().describe("Mouth style"),
  earStyle: z.string().describe("Ear shape and position"),
  
  // Optional features
  hornStyle: z.string().optional(),
  tailStyle: z.string().optional(),
  wingStyle: z.string().optional(),
  hairTuft: z.string().optional(),
  
  // Outfit and accessories - CAN vary slightly
  defaultOutfit: z.string().optional(),
  signatureAccessories: z.array(z.string()).optional(),
  
  // STRICT rules
  handsRule: z.string().default("MUST always show both hands/paws clearly"),
  doNotChange: z.array(z.string()).describe("Features that MUST stay identical"),
  
  // For validation
  anchorImageBase64: z.string().optional(),
});

export type CharacterSheet = z.infer<typeof characterSheetSchema>;

// ============================================================
// ANTI-REPETITION MEMORY
// ============================================================

export interface UsedElementsMemory {
  settings: Set<string>;
  props: Set<string>;
  actions: Set<string>;
  motifs: Set<string>;
  compositions: Set<string>;
}

export function createEmptyMemory(): UsedElementsMemory {
  return {
    settings: new Set(),
    props: new Set(),
    actions: new Set(),
    motifs: new Set(),
    compositions: new Set(),
  };
}

export function penalizeRepeats(
  candidate: PageOutline,
  memory: UsedElementsMemory,
  recentPages: PageOutline[]
): number {
  let penalty = 0;
  
  // Check setting repetition
  if (memory.settings.has(candidate.setting.toLowerCase())) {
    penalty += 20;
  }
  
  // Check action repetition
  if (memory.actions.has(candidate.action.toLowerCase())) {
    penalty += 15;
  }
  
  // Check prop overlap with recent pages
  const recentProps = recentPages.slice(-3).flatMap(p => p.props.map(pr => pr.toLowerCase()));
  const candidateProps = candidate.props.map(p => p.toLowerCase());
  const propOverlap = candidateProps.filter(p => recentProps.includes(p)).length;
  penalty += propOverlap * 5;
  
  // Check composition repetition
  if (memory.compositions.has(candidate.compositionNotes.toLowerCase())) {
    penalty += 10;
  }
  
  return penalty;
}

// ============================================================
// FORBIDDEN GENERIC FILLERS
// ============================================================

export const GENERIC_FILLERS = [
  "random rocks",
  "scattered rocks",
  "toy car",
  "random ball",
  "random balls",
  "scattered leaves",
  "random flowers",
  "generic toys",
  "random objects",
  "miscellaneous items",
  "basic shapes",
  "simple decorations",
];

export const TEMPLATE_SETTINGS = [
  "bedroom",
  "kitchen",
  "bathroom",
  "classroom",
  "school",
  "living room",
  "dining room",
  "hallway",
  "office",
];

export function isGenericFiller(prop: string): boolean {
  const lower = prop.toLowerCase();
  return GENERIC_FILLERS.some(f => lower.includes(f));
}

export function isTemplateUnlessRequested(setting: string, userInput: string): boolean {
  const lower = setting.toLowerCase();
  const userLower = userInput.toLowerCase();
  
  // Only block if it's a template setting AND user didn't mention it
  return TEMPLATE_SETTINGS.some(t => 
    lower.includes(t) && !userLower.includes(t)
  );
}

// ============================================================
// SYSTEM PROMPTS FOR LLM CALLS
// ============================================================

export const IDEA_SPEC_SYSTEM_PROMPT = `You are an expert creative director for a professional coloring book company.

Your task is to deeply understand a user's coloring book idea and create a detailed IdeaSpec.

CRITICAL RULES:
1. NEVER add generic settings (bedroom, kitchen, school, bathroom) unless user explicitly asked
2. Every element must connect to the user's actual idea/theme
3. Derive settings and activities FROM the user's world, not from templates
4. If user says "Valentine's Day", every element must relate to love/hearts/romance
5. If user says "underwater adventure", all settings must be underwater
6. Forbidden: generic filler (random rocks, toy car, balls, scattered leaves)
7. Must include: theme-appropriate props only

Analyze the user's input and extract:
- Main subjects/characters
- The world/setting they exist in
- Core theme and mood
- What MUST be included (theme motifs)
- What MUST be avoided (off-theme elements)`;

export const PAGE_OUTLINE_SYSTEM_PROMPT = `You are a scene planner for professional coloring books.

Your task is to create UNIQUE, theme-faithful scenes based on an IdeaSpec.

CRITICAL RULES:
1. Every scene must clearly connect to the theme
2. NO generic template scenes (bedroom/kitchen/school) unless theme requires it
3. NO repeated settings across consecutive pages
4. Each scene must have 2+ unique props not used in previous 3 pages
5. Vary compositions: alternate close-up, medium shot, wide scene
6. Props must be SPECIFIC and POSITIONED (not just "toys" but "red ball on left")
7. NO generic filler props (rocks, random balls, scattered leaves)

ANTI-REPETITION:
- Track all used settings, props, actions
- Each page must have a unique "noveltyTag"
- Penalize any repetition heavily

OUTPUT FORMAT:
Return a structured plan with diverse, theme-appropriate scenes.`;

export const CHARACTER_SHEET_SYSTEM_PROMPT = `You are a character designer ensuring ABSOLUTE CONSISTENCY.

Create a detailed CharacterSheet that locks every visual aspect of the character.

RULES:
1. Species must be SPECIFIC (not "panda" but "baby panda with round face")
2. Proportions must be EXACT (e.g., "head is 40% of body height")
3. Every facial feature must be described precisely
4. List EVERYTHING that must NOT change across pages
5. HANDS RULE: Character must ALWAYS have both hands/paws visible and correctly drawn
6. Include signature elements that make the character recognizable

The CharacterSheet will be appended to EVERY page prompt to ensure consistency.`;

// ============================================================
// PROMPT BUILDERS
// ============================================================

/**
 * Build the scene prompt from PageOutline (without style rules)
 */
export function buildScenePrompt(
  outline: PageOutline,
  ideaSpec: IdeaSpec,
  characterSheet?: CharacterSheet
): string {
  const parts: string[] = [];
  
  // Scene description
  parts.push(`SCENE: ${outline.title}`);
  parts.push(`${outline.action} in ${outline.setting}.`);
  
  // Props with positioning
  if (outline.props.length > 0) {
    parts.push(`PROPS: ${outline.props.join(", ")}.`);
  }
  
  // Composition
  parts.push(`COMPOSITION: ${outline.compositionNotes}`);
  
  // Theme motifs
  if (ideaSpec.holidayMotifs && ideaSpec.holidayMotifs.length > 0) {
    parts.push(`THEME MOTIFS: Include ${ideaSpec.holidayMotifs.slice(0, 3).join(", ")}.`);
  }
  
  // Character consistency (for storybook)
  if (characterSheet) {
    parts.push(buildCharacterLockBlock(characterSheet, outline));
  }
  
  // Mood
  parts.push(`MOOD: ${ideaSpec.mood}`);
  
  return parts.join("\n");
}

/**
 * Build character lock block for consistent character rendering
 */
export function buildCharacterLockBlock(
  sheet: CharacterSheet,
  outline?: PageOutline
): string {
  return `
=== CHARACTER LOCK (MUST MATCH EXACTLY) ===
${sheet.name ? `Name: ${sheet.name}` : ""}
Species: ${sheet.species}
Proportions: ${sheet.proportions}
Face: ${sheet.faceShape}, ${sheet.eyeStyle}, ${sheet.noseStyle}, ${sheet.mouthStyle}
Ears: ${sheet.earStyle}
${sheet.hornStyle ? `Horn: ${sheet.hornStyle}` : ""}
${sheet.tailStyle ? `Tail: ${sheet.tailStyle}` : ""}
${sheet.wingStyle ? `Wings: ${sheet.wingStyle}` : ""}
${sheet.defaultOutfit ? `Outfit: ${sheet.defaultOutfit}` : ""}

HANDS RULE: ${sheet.handsRule}
${outline?.characterPose ? `POSE: ${outline.characterPose}` : ""}
${outline?.characterExpression ? `EXPRESSION: ${outline.characterExpression}` : ""}

DO NOT CHANGE: ${sheet.doNotChange.join(", ")}
ONLY change: pose, action, location - NOT the character design itself.`;
}

// ============================================================
// COMPLEXITY SETTINGS
// ============================================================

export interface ComplexityConfig {
  propsRange: [number, number];
  backgroundDetail: "minimal" | "simple" | "moderate" | "detailed" | "intricate";
  lineThickness: "bold" | "medium" | "thin";
  maxBlackRatio: number;
  promptAddition: string;
}

export const COMPLEXITY_CONFIGS: Record<string, ComplexityConfig> = {
  simple: {
    propsRange: [2, 4],
    backgroundDetail: "minimal",
    lineThickness: "bold",
    maxBlackRatio: 0.15,
    promptAddition: "Very simple scene with few elements. Large shapes, thick bold outlines. Easy to color.",
  },
  medium: {
    propsRange: [4, 6],
    backgroundDetail: "simple",
    lineThickness: "medium",
    maxBlackRatio: 0.22,
    promptAddition: "Moderate detail level. Clear shapes with some background elements.",
  },
  detailed: {
    propsRange: [6, 10],
    backgroundDetail: "detailed",
    lineThickness: "medium",
    maxBlackRatio: 0.28,
    promptAddition: "Detailed scene with many elements. Intricate patterns in clothing/accessories.",
  },
  ultra: {
    propsRange: [10, 15],
    backgroundDetail: "intricate",
    lineThickness: "thin",
    maxBlackRatio: 0.35,
    promptAddition: "Highly detailed, mandala-like complexity. Fine line work. Adult stress-relief style.",
  },
};

export function getComplexityConfig(level: string): ComplexityConfig {
  return COMPLEXITY_CONFIGS[level] || COMPLEXITY_CONFIGS.medium;
}

