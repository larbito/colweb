import OpenAI from "openai";

// Server-only OpenAI client
// This file should ONLY be imported in server-side code (API routes, server components)

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "⚠️ OPENAI_API_KEY is not set. AI features will not work. Add it to your .env.local file."
  );
}

// Lazy initialization to avoid errors during build when API key is not set
let _openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "placeholder-for-build",
    });
  }
  return _openai;
}

// For backwards compatibility
export const openai = new Proxy({} as OpenAI, {
  get(target, prop) {
    return (getOpenAI() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "placeholder-for-build";
}

