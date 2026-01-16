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

