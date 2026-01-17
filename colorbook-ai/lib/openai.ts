import OpenAI from "openai";

// Server-only OpenAI client
// This file should ONLY be imported in server-side code (API routes, server components)

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "⚠️ OPENAI_API_KEY is not set. AI features will not work. Add it to your .env.local file."
  );
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// ========================================
// MODEL SELECTION
// ========================================
// TEXT MODELS - Use for: ThemePack, scene prompts, prompt improvement, decisions
// These are reasoning/text models, NOT image models
export const TEXT_MODEL = "gpt-4o"; // Best available text model for structured output
export const TEXT_MODEL_MINI = "gpt-4o-mini"; // Faster/cheaper for simpler tasks

// IMAGE MODELS - Use ONLY for image generation
// These are dedicated image generation models
export const IMAGE_MODEL = "dall-e-3"; // Best available image model

// ========================================
// LOGGING HELPERS
// ========================================
export function logModelUsage(task: string, modelType: "text" | "image", model: string) {
  console.log(`[Model] ${task} | type=${modelType} | model=${model}`);
}
