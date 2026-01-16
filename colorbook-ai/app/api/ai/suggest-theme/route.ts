import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import {
  themeSuggestionRequestSchema,
  themeSuggestionResponseSchema,
  type ThemeSuggestionResponse,
} from "@/lib/schemas";

export async function POST(request: NextRequest) {
  // Check if OpenAI is configured
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    // Validate request
    const parseResult = themeSuggestionRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { complexity, optionalKeywords, pageGoal } = parseResult.data;

    const systemPrompt = `You are a creative assistant for a coloring book generator app.
Your task is to suggest a unique, original theme and main character for a coloring book.

RULES:
- Return ONLY valid JSON matching this schema: { theme, mainCharacter, supportingDetails?, tone?, settings? }
- Suggest themes suitable for ${complexity === "kids" ? "young children (ages 3-8)" : complexity === "medium" ? "older children and families" : "detailed adult coloring"}
- Avoid ANY copyrighted or trademarked characters, franchises, or brand names
- Keep themes friendly, safe, and positive
- Be creative and unique - avoid clichés like "princess in a castle"
- Main character should have a clear visual description suitable for line art
- Include optional supporting details (3-5 bullet points) with scene ideas
- Include 2-3 setting suggestions for variety

Return JSON only, no markdown, no explanation.`;

    const userPrompt = optionalKeywords
      ? `Suggest a coloring ${pageGoal === "book" ? "book" : "page"} theme. User hint: "${optionalKeywords}"`
      : `Suggest a unique coloring ${pageGoal === "book" ? "book" : "page"} theme. Be creative and original.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse and validate the response
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "Invalid JSON from AI" }, { status: 500 });
    }

    const validationResult = themeSuggestionResponseSchema.safeParse(parsed);
    if (!validationResult.success) {
      console.error("AI response validation failed:", validationResult.error);
      return NextResponse.json({ error: "AI response did not match expected format" }, { status: 500 });
    }

    return NextResponse.json(validationResult.data satisfies ThemeSuggestionResponse);
  } catch (error) {
    console.error("Theme suggestion error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to suggest theme" },
      { status: 500 }
    );
  }
}

