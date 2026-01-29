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
 */
export const characterProfileSchema = z.object({
  species: z.string().describe("Type of character (panda, unicorn, bunny, etc.)"),
  keyFeatures: z.array(z.string()).describe("Distinguishing visual features"),
  proportions: z.string().describe("Body proportions (chibi, realistic, etc.)"),
  faceStyle: z.string().describe("Face shape and expression style"),
  clothing: z.string().optional().describe("Outfit or accessories worn"),
  poseVibe: z.string().describe("General pose style (active, calm, playful)"),
  doNotChange: z.array(z.string()).describe("Traits that MUST stay consistent across pages"),
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
// Character Consistency Block Builder
// ============================================

/**
 * Build a character consistency block to inject into every storybook page prompt
 */
export function buildCharacterConsistencyBlock(profile: CharacterProfile): string {
  const features = profile.keyFeatures.join(", ");
  const doNotChange = profile.doNotChange.join(", ");
  
  return `
=== CHARACTER CONSISTENCY (MUST MATCH EXACTLY) ===
Character: ${profile.species}
Key features: ${features}
Proportions: ${profile.proportions}
Face style: ${profile.faceStyle}
${profile.clothing ? `Clothing/accessories: ${profile.clothing}` : ""}
Pose style: ${profile.poseVibe}

DO NOT CHANGE: ${doNotChange}
The character must look IDENTICAL across all pages - same face shape, same proportions, same features, same outfit.
Do not introduce new accessories unless explicitly specified in the scene.
`;
}

/**
 * Default must-avoid list for coloring pages (always enforced)
 */
export const DEFAULT_MUST_AVOID = [
  "solid black fills",
  "filled shapes",
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
];

