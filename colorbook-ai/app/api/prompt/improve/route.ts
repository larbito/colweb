import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
});

/**
 * POST /api/prompt/improve
 * 
 * Improves the user's prompt. No hidden style injection.
 * Only rewrites what the user provided to be clearer/better.
 * 
 * Input: { prompt: string }
 * Output: { prompt: string }
 */
export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { prompt } = requestSchema.parse(body);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `Improve this image generation prompt. Make it clearer and more detailed, but keep the same intent and subject matter. Do not add new concepts the user didn't mention.

Original prompt:
"${prompt}"

Return ONLY the improved prompt text, nothing else. No explanations, no quotes around it.`,
        },
      ],
      max_tokens: 500,
      temperature: 0.5,
    });

    const improvedPrompt = response.choices[0]?.message?.content?.trim() || prompt;

    return NextResponse.json({ prompt: improvedPrompt });

  } catch (error) {
    console.error("[prompt/improve] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to improve prompt" },
      { status: 500 }
    );
  }
}

