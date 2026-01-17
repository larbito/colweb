/**
 * themePack.ts - Theme Pack for consistent styling across all pages
 * Used by both Series and Collection modes to ensure visual coherence
 */

import { z } from "zod";

/**
 * ThemePack defines the visual "world" for the entire book
 * All pages must use this same setting, props, and rules
 */
export const themePackSchema = z.object({
  themeTitle: z.string(),
  setting: z.string(), // The ONE consistent world (e.g., "Sunny Meadow Park")
  artMood: z.string(), // e.g., "cheerful, simple, kawaii, kid-friendly"
  allowedSubjects: z.array(z.string()), // e.g., ["cats", "dogs", "bunnies"]
  recurringProps: z.array(z.string()).min(8).max(20), // 12-20 props reused across pages
  backgroundMotifs: z.array(z.string()), // e.g., ["fluffy clouds", "grass line", "simple flowers"]
  forbidden: z.array(z.string()), // e.g., ["scary", "complex patterns", "realistic"]
  compositionRules: z.array(z.string()), // e.g., ["centered subject", "wide margins", "3-8 props max"]
});

export type ThemePack = z.infer<typeof themePackSchema>;

/**
 * Default recurring props for kids coloring books
 */
export const DEFAULT_RECURRING_PROPS = [
  "fluffy cloud",
  "small flower",
  "grass tuft",
  "butterfly",
  "small bird",
  "sun with rays",
  "rainbow",
  "star",
  "heart shape",
  "balloon",
  "tree",
  "bush",
  "rock",
  "mushroom",
  "leaf",
];

/**
 * Default background motifs
 */
export const DEFAULT_BACKGROUND_MOTIFS = [
  "simple rolling hills",
  "fluffy clouds in sky",
  "grass line at bottom",
  "simple flowers scattered",
  "sun in corner",
];

/**
 * Default forbidden elements for kids coloring books
 */
export const DEFAULT_FORBIDDEN = [
  "scary elements",
  "complex intricate patterns",
  "realistic style",
  "text or letters",
  "numbers",
  "logos or brands",
  "violence",
  "weapons",
  "dark themes",
  "borders or frames",
  "watermarks",
];

/**
 * Default composition rules
 */
export const DEFAULT_COMPOSITION_RULES = [
  "centered main subject",
  "wide safe margins (0.5 inch from edges)",
  "3-8 props maximum per page",
  "large open areas for coloring",
  "simple uncluttered background",
  "portrait orientation",
];

/**
 * Build a ThemePack summary line for prompts
 */
export function getThemePackSummary(themePack: ThemePack): string {
  return `WORLD CONSISTENCY:
Setting: ${themePack.setting}
Mood: ${themePack.artMood}
Available subjects: ${themePack.allowedSubjects.join(", ")}
Reuse these props: ${themePack.recurringProps.slice(0, 10).join(", ")}
Background elements: ${themePack.backgroundMotifs.join(", ")}
FORBIDDEN: ${themePack.forbidden.join(", ")}`;
}

/**
 * Create a default ThemePack from basic inputs
 */
export function createDefaultThemePack(params: {
  theme: string;
  subjects?: string[];
  setting?: string;
}): ThemePack {
  return {
    themeTitle: params.theme,
    setting: params.setting || `A cheerful ${params.theme} world`,
    artMood: "cheerful, simple, kawaii, kid-friendly",
    allowedSubjects: params.subjects || ["cute animals"],
    recurringProps: DEFAULT_RECURRING_PROPS,
    backgroundMotifs: DEFAULT_BACKGROUND_MOTIFS,
    forbidden: DEFAULT_FORBIDDEN,
    compositionRules: DEFAULT_COMPOSITION_RULES,
  };
}

