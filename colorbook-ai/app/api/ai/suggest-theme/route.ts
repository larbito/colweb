import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured, TEXT_MODEL, logModelUsage } from "@/lib/openai";
import {
  themeSuggestionRequestSchema,
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

You MUST return a JSON object with EXACTLY these fields:
{
  "theme": "string - the theme/setting of the coloring book",
  "mainCharacter": "string - name and brief visual description of the main character",
  "supportingDetails": ["array of 3-5 scene ideas"],
  "tone": "one of: kids, wholesome, funny, adventure",
  "settings": ["array of 2-3 location/setting ideas"]
}

RULES:
- Theme should be suitable for ${complexity === "simple" ? "young children (ages 3-8)" : complexity === "medium" ? "older children and families" : "detailed adult coloring"}
- AVOID any copyrighted or trademarked characters, franchises, or brand names
- Keep themes friendly, safe, and positive
- Be creative and unique - avoid clichés
- Main character should have a clear visual description suitable for line art
- Return ONLY the JSON object, nothing else`;

    const userPrompt = optionalKeywords
      ? `Suggest a coloring ${pageGoal === "book" ? "book" : "page"} theme. User hint: "${optionalKeywords}"`
      : `Suggest a unique coloring ${pageGoal === "book" ? "book" : "page"} theme. Be creative and original.`;

    logModelUsage("Suggest theme", "text", TEXT_MODEL);

    const response = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse the response - handle potential markdown code blocks
    let jsonContent = content.trim();
    
    // Remove markdown code blocks if present
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.slice(7);
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith("```")) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json({ error: "Invalid JSON from AI", raw: content }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: "Could not extract JSON from AI response" }, { status: 500 });
      }
    }

    // Ensure the response has required fields, with defaults for optional ones
    const result: ThemeSuggestionResponse = {
      theme: (parsed as Record<string, unknown>).theme as string || "Magical Forest Adventure",
      mainCharacter: (parsed as Record<string, unknown>).mainCharacter as string || "A friendly woodland creature",
      supportingDetails: Array.isArray((parsed as Record<string, unknown>).supportingDetails) 
        ? (parsed as Record<string, unknown>).supportingDetails as string[]
        : [],
      tone: ["kids", "wholesome", "funny", "adventure"].includes((parsed as Record<string, unknown>).tone as string)
        ? (parsed as Record<string, unknown>).tone as "kids" | "wholesome" | "funny" | "adventure"
        : "wholesome",
      settings: Array.isArray((parsed as Record<string, unknown>).settings)
        ? (parsed as Record<string, unknown>).settings as string[]
        : [],
    };

    // Validate we have the essential fields
    if (!result.theme || !result.mainCharacter) {
      return NextResponse.json({ error: "AI response missing required fields" }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Theme suggestion error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to suggest theme" },
      { status: 500 }
    );
  }
}
