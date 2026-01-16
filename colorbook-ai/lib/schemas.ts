import { z } from "zod";

// ============================================
// Constants
// ============================================

export const MAX_PAGES = 80;

// ============================================
// AI Theme Suggestion
// ============================================

export const themeSuggestionRequestSchema = z.object({
  pageGoal: z.enum(["coloring-pages", "book"]).optional(),
  complexity: z.enum(["kids", "medium", "detailed"]),
  optionalKeywords: z.string().optional(),
});

export type ThemeSuggestionRequest = z.infer<typeof themeSuggestionRequestSchema>;

export const themeSuggestionResponseSchema = z.object({
  theme: z.string().min(1),
  mainCharacter: z.string().min(1),
  supportingDetails: z.array(z.string()).optional().default([]),
  tone: z.enum(["kids", "wholesome", "funny", "adventure"]).optional(),
  settings: z.array(z.string()).optional().default([]),
});

export type ThemeSuggestionResponse = z.infer<typeof themeSuggestionResponseSchema>;

// ============================================
// Character Lock (Series Consistency)
// ============================================

export const lineRulesSchema = z.object({
  outerStroke: z.string(),
  innerStroke: z.string(),
  strokeEnds: z.string(),
  noShading: z.boolean(),
});

export const visualRulesSchema = z.object({
  proportions: z.string(),
  face: z.string(),
  uniqueFeatures: z.array(z.string()),
  outfit: z.string(),
  lineRules: lineRulesSchema,
  backgroundRules: z.string(),
  compositionRules: z.string(),
});

export const characterLockSchema = z.object({
  canonicalName: z.string(),
  visualRules: visualRulesSchema,
  negativeRules: z.array(z.string()),
});

export type CharacterLock = z.infer<typeof characterLockSchema>;

export const lockCharacterRequestSchema = z.object({
  theme: z.string().min(1),
  mainCharacterName: z.string().min(1),
  mainCharacterDescription: z.string().min(1),
  stylePreset: z.enum(["kids", "medium", "detailed"]),
  lineThickness: z.enum(["thin", "medium", "bold"]),
});

export type LockCharacterRequest = z.infer<typeof lockCharacterRequestSchema>;

export const lockCharacterResponseSchema = z.object({
  characterLock: characterLockSchema,
});

export type LockCharacterResponse = z.infer<typeof lockCharacterResponseSchema>;

// ============================================
// Character Sheet Generation
// ============================================

export const generateCharacterSheetRequestSchema = z.object({
  characterLock: characterLockSchema,
  sizePreset: z.enum(["portrait", "landscape", "square"]).default("portrait"),
});

export type GenerateCharacterSheetRequest = z.infer<typeof generateCharacterSheetRequestSchema>;

export const generateCharacterSheetResponseSchema = z.object({
  imageBase64: z.string().optional(),
  imageUrl: z.string().optional(),
  error: z.string().optional(),
});

export type GenerateCharacterSheetResponse = z.infer<typeof generateCharacterSheetResponseSchema>;

// ============================================
// AI Prompt Generation
// ============================================

export const generatePromptsRequestSchema = z.object({
  theme: z.string().min(1, "Theme is required"),
  mainCharacter: z.string().min(1, "Main character is required"),
  pageCount: z.number().int().min(1).max(MAX_PAGES, `Maximum ${MAX_PAGES} pages allowed`),
  complexity: z.enum(["kids", "medium", "detailed"]),
  lineThickness: z.enum(["thin", "medium", "bold"]),
  trimSize: z.string().min(1),
  extraNotes: z.string().optional(),
  characterLock: characterLockSchema.optional(),
});

export type GeneratePromptsRequest = z.infer<typeof generatePromptsRequestSchema>;

export const pagePromptSchema = z.object({
  pageNumber: z.number().int().min(1),
  sceneTitle: z.string().min(1),
  prompt: z.string().min(1),
});

export type PagePrompt = z.infer<typeof pagePromptSchema>;

export const promptListResponseSchema = z.object({
  pages: z.array(pagePromptSchema),
});

export type PromptListResponse = z.infer<typeof promptListResponseSchema>;

// ============================================
// AI Image Generation
// ============================================

export const generateImageRequestSchema = z.object({
  prompt: z.string().min(1),
  complexity: z.enum(["kids", "medium", "detailed"]),
  lineThickness: z.enum(["thin", "medium", "bold"]),
  aspect: z.enum(["portrait", "landscape", "square"]).default("portrait"),
  sizePreset: z.string(),
  characterLock: characterLockSchema.optional(),
  characterSheetImageBase64: z.string().optional(),
});

export type GenerateImageRequest = z.infer<typeof generateImageRequestSchema>;

export const generateImageResponseSchema = z.object({
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional(),
  error: z.string().optional(),
});

export type GenerateImageResponse = z.infer<typeof generateImageResponseSchema>;
