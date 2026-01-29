/**
 * batchGenerationTypes.ts
 * 
 * Shared types and schemas for multi-image batch generation from a reference image.
 * Supports two modes:
 * - Storybook: Same character consistent across all pages
 * - Theme: Same style/theme, different scenes and characters allowed
 */

import { z } from "zod";

// ============================================
// Generation Modes
// ============================================

export type GenerationMode = "storybook" | "theme";

// ============================================
// Profile Schemas (extracted from reference image)
// ============================================

/**
 * Style profile - visual style rules extracted from reference
 */
export const styleProfileSchema = z.object({
  lineStyle: z.string().describe("Description of line art style (thickness, smoothness, etc.)"),
  compositionRules: z.string().describe("How elements are arranged in the frame"),
  environmentStyle: z.string().describe("Indoor/outdoor, minimal/detailed background style"),
  colorScheme: z.string().default("black and white line art").describe("Always B&W for coloring pages"),
  mustAvoid: z.array(z.string()).describe("Things to avoid (always includes no-fill constraints)"),
});

export type StyleProfile = z.infer<typeof styleProfileSchema>;

/**
 * Character profile - for maintaining character consistency in storybook mode
 * CRITICAL: Must be extremely detailed to ensure same character across pages
 */
export const characterProfileSchema = z.object({
  species: z.string().describe("Type of character (panda, unicorn, bunny, pandacorn, etc.)"),
  keyFeatures: z.array(z.string()).describe("Distinguishing visual features - be VERY specific"),
  proportions: z.string().describe("Body proportions (chibi with big head, realistic, etc.)"),
  faceStyle: z.string().describe("Face shape, eye style, nose, mouth - DETAILED"),
  headDetails: z.string().optional().describe("Horn, ears, hair/tuft, crown - SPECIFIC shapes"),
  bodyDetails: z.string().optional().describe("Wings, tail, paws, spots - SPECIFIC"),
  clothing: z.string().optional().describe("Outfit or accessories worn"),
  poseVibe: z.string().describe("General pose style (active, calm, playful)"),
  doNotChange: z.array(z.string()).describe("Critical traits that MUST stay identical across pages"),
});

export type CharacterProfile = z.infer<typeof characterProfileSchema>;

/**
 * Scene inventory - objects/elements that can appear across pages
 */
export const sceneInventorySchema = z.array(z.string()).describe("List of props and background elements");

export type SceneInventory = z.infer<typeof sceneInventorySchema>;

/**
 * Complete reference profile (extracted from image)
 */
export const referenceProfileSchema = z.object({
  styleProfile: styleProfileSchema,
  characterProfile: characterProfileSchema.optional(),
  sceneInventory: sceneInventorySchema,
  extractedTheme: z.string().optional().describe("Detected theme/setting from the image"),
});

export type ReferenceProfile = z.infer<typeof referenceProfileSchema>;

// ============================================
// Story/Theme Configuration
// ============================================

export const storyConfigSchema = z.object({
  title: z.string().optional(),
  outline: z.string().optional().describe("Brief story outline or arc description"),
  targetAge: z.enum(["3-6", "6-9", "9-12", "all-ages"]).default("all-ages"),
  sceneVariety: z.enum(["low", "medium", "high"]).default("medium"),
  settingConstraint: z.enum(["indoors", "outdoors", "mixed"]).default("mixed"),
});

export type StoryConfig = z.infer<typeof storyConfigSchema>;

// ============================================
// Batch Prompts Request/Response
// ============================================

export const batchPromptsRequestSchema = z.object({
  mode: z.enum(["storybook", "theme"]),
  count: z.number().int().min(1).max(30),
  story: storyConfigSchema.optional(),
  styleProfile: styleProfileSchema,
  characterProfile: characterProfileSchema.optional(),
  sceneInventory: sceneInventorySchema.optional(),
  basePrompt: z.string().optional().describe("Original prompt from reference image analysis"),
  size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).default("1024x1536").describe("Image size/orientation"),
});

export type BatchPromptsRequest = z.infer<typeof batchPromptsRequestSchema>;

export const pagePromptItemSchema = z.object({
  page: z.number().int().min(1),
  title: z.string(),
  prompt: z.string(),
  sceneDescription: z.string().optional(),
});

export type PagePromptItem = z.infer<typeof pagePromptItemSchema>;

export const batchPromptsResponseSchema = z.object({
  pages: z.array(pagePromptItemSchema),
  mode: z.enum(["storybook", "theme"]),
  characterConsistencyBlock: z.string().optional().describe("Block to ensure character stays same"),
});

export type BatchPromptsResponse = z.infer<typeof batchPromptsResponseSchema>;

// ============================================
// Batch Generation Request/Response
// ============================================

export type PageStatus = "pending" | "generating" | "done" | "failed";

export const batchGenerateRequestSchema = z.object({
  pages: z.array(z.object({
    page: z.number().int().min(1),
    prompt: z.string(),
  })),
  size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).default("1024x1536"),
  concurrency: z.number().int().min(1).max(3).default(1),
});

export type BatchGenerateRequest = z.infer<typeof batchGenerateRequestSchema>;

export const pageResultSchema = z.object({
  page: z.number().int().min(1),
  status: z.enum(["pending", "generating", "done", "failed"]),
  imageBase64: z.string().optional(),
  error: z.string().optional(),
});

export type PageResult = z.infer<typeof pageResultSchema>;

export const batchGenerateResponseSchema = z.object({
  results: z.array(pageResultSchema),
  successCount: z.number().int(),
  failCount: z.number().int(),
});

export type BatchGenerateResponse = z.infer<typeof batchGenerateResponseSchema>;

// ============================================
// Profile Extraction Request
// ============================================

export const profileFromImageRequestSchema = z.object({
  imageBase64: z.string().min(1, "Image is required"),
});

export type ProfileFromImageRequest = z.infer<typeof profileFromImageRequestSchema>;

export const profileFromImageResponseSchema = z.object({
  styleProfile: styleProfileSchema,
  characterProfile: characterProfileSchema.optional(),
  sceneInventory: sceneInventorySchema,
  extractedTheme: z.string().optional(),
  basePrompt: z.string().describe("Original detailed prompt for the reference image"),
});

export type ProfileFromImageResponse = z.infer<typeof profileFromImageResponseSchema>;

// ============================================
// CHARACTER CONSISTENCY BLOCK BUILDER
// ============================================

/**
 * Build an EXTREMELY DETAILED character consistency block for storybook mode.
 * This ensures the character looks IDENTICAL across all pages.
 * 
 * CRITICAL: This block must be injected into EVERY page prompt in storybook mode.
 */
export function buildCharacterConsistencyBlock(profile: CharacterProfile): string {
  // Build a very detailed feature list
  const allFeatures: string[] = [
    ...profile.keyFeatures,
  ];
  
  if (profile.headDetails) allFeatures.push(profile.headDetails);
  if (profile.bodyDetails) allFeatures.push(profile.bodyDetails);
  
  const featuresText = allFeatures.slice(0, 10).join("; ");
  const lockedTraits = profile.doNotChange.length > 0 
    ? profile.doNotChange.join(", ") 
    : "face shape, eye style, ear shape, body proportions, all distinctive features";
  
  return `

=== CHARACTER CONSISTENCY LOCK (CRITICAL - MUST MATCH REFERENCE EXACTLY) ===

The EXACT SAME character must appear on EVERY page with IDENTICAL visual design.
Do NOT redesign. Do NOT alter. Only change pose and activity.

CHARACTER VISUAL IDENTITY:
- Species: ${profile.species}
- Distinguishing Features: ${featuresText}
- Body Proportions: ${profile.proportions}
- Face: ${profile.faceStyle}
${profile.headDetails ? `- Head Details: ${profile.headDetails}` : ""}
${profile.bodyDetails ? `- Body Details: ${profile.bodyDetails}` : ""}
${profile.clothing ? `- Outfit: ${profile.clothing}` : ""}

=== LOCKED TRAITS (DO NOT MODIFY UNDER ANY CIRCUMSTANCES) ===
${lockedTraits}

=== CONSISTENCY REQUIREMENTS ===
1. SAME face shape and proportions every page
2. SAME eye style (exact shape, size, placement, expression type)
3. SAME ear shape, size, and placement
4. SAME head-to-body ratio (if chibi, stay chibi; if realistic, stay realistic)
5. SAME distinctive features (horn shape, wing shape, tail style, etc.)
6. SAME line thickness and drawing style
7. Character must be INSTANTLY recognizable as the same individual
8. ONLY change: pose, position, activity, and scene location

=== WHAT TO AVOID ===
- Do NOT make the character look older or younger
- Do NOT change facial features or expressions dramatically
- Do NOT add new accessories unless scene requires it
- Do NOT alter the character's proportions
- Do NOT change the character's design style (chibi stays chibi, etc.)

The character should look like they stepped from the reference into a new scene.`;
}

/**
 * Default must-avoid list for coloring pages (always enforced)
 */
export const DEFAULT_MUST_AVOID = [
  "solid black fills",
  "filled shapes",
  "filled black areas",
  "shading",
  "grayscale",
  "gradients",
  "hatching",
  "crosshatching",
  "textures",
  "solid black hair or fur",
  "filled circles for eyes",
  "shadows",
  "color",
  "border",
  "frame",
  "crop marks",
];
