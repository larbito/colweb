import { z } from "zod";

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
  supportingDetails: z.array(z.string()).optional(),
  tone: z.enum(["kids", "wholesome", "funny", "adventure"]).optional(),
  settings: z.array(z.string()).optional(),
});

export type ThemeSuggestionResponse = z.infer<typeof themeSuggestionResponseSchema>;

// ============================================
// AI Prompt Generation
// ============================================

export const MAX_PAGES = 80;

export const generatePromptsRequestSchema = z.object({
  theme: z.string().min(1, "Theme is required"),
  mainCharacter: z.string().min(1, "Main character is required"),
  pageCount: z.number().int().min(1).max(MAX_PAGES, `Maximum ${MAX_PAGES} pages allowed`),
  complexity: z.enum(["kids", "medium", "detailed"]),
  lineThickness: z.enum(["thin", "medium", "bold"]),
  trimSize: z.string().min(1),
  extraNotes: z.string().optional(),
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
});

export type GenerateImageRequest = z.infer<typeof generateImageRequestSchema>;

export const generateImageResponseSchema = z.object({
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional(),
  error: z.string().optional(),
});

export type GenerateImageResponse = z.infer<typeof generateImageResponseSchema>;

