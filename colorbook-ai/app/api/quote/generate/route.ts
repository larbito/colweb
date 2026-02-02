import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { z } from "zod";

/**
 * Route segment config - increased for safety
 */
export const maxDuration = 30;

const requestSchema = z.object({
  // NEW: topicMode is either "custom" (user provided prompt) or "any" (general quotes)
  topicMode: z.enum(["any", "selected", "custom"]).default("any"),
  
  // Legacy: specific topics
  topics: z.array(z.string()).optional(),
  
  // Legacy: tone (still used as modifier)
  tone: z.enum([
    "cute", "bold", "calm", "funny", "motivational", 
    "romantic", "faith", "sports", "kids", "inspirational",
    "elegant", "minimalist"
  ]).optional(),
  
  audience: z.enum(["kids", "teens", "adults", "all"]).default("all"),
  count: z.number().int().min(1).max(50).default(10),
  avoidTopics: z.array(z.string()).optional(),
  excludeQuotes: z.array(z.string()).optional(),
  
  // Legacy: theme (single word)
  theme: z.string().optional(),
  
  // NEW: customPrompt - the user's full description of what quotes they want
  customPrompt: z.string().optional(),
  
  previousQuotes: z.array(z.string()).optional(),
  seed: z.string().optional(),
});

/**
 * POST /api/quote/generate
 * 
 * Quote generation using gpt-4o-mini.
 * 
 * NEW: Supports "custom" mode where user describes exactly what quotes they want.
 * No preset themes - quotes are generated from user's description only.
 */
export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { 
      topicMode, 
      audience, 
      count, 
      excludeQuotes, 
      theme, 
      customPrompt,
      previousQuotes 
    } = parseResult.data;

    // Simple exclusion - just last 10 quotes
    const excludeList = [...(excludeQuotes || []), ...(previousQuotes || [])].slice(-10);
    const excludeText = excludeList.length > 0 
      ? `\n\nAVOID quotes similar to these (different structure, different words):\n${excludeList.slice(0, 5).map(q => `- "${q}"`).join("\n")}` 
      : "";

    // Build the prompt based on mode
    let prompt: string;

    if (topicMode === "custom" && customPrompt?.trim()) {
      // NEW: User-defined prompt mode - generate quotes based on their description
      const userDescription = customPrompt.trim();
      
      prompt = `You are a quote writer for coloring books. Generate ${count} unique, SHORT inspirational quotes.

USER'S REQUEST:
"${userDescription}"

CRITICAL RULES:
1. Generate quotes that MATCH the user's description exactly
2. Each quote: 4-12 words, max 60 characters
3. Original quotes only (NOT famous quotes, NOT from books/movies/songs)
4. Every quote must be DIFFERENT in structure and phrasing
5. Vary the sentence patterns (statements, imperatives, questions, etc.)
6. Audience: ${audience === "all" ? "appropriate for all ages" : audience}
7. Make quotes meaningful and colorable for a coloring book

WHAT THE USER WANTS: ${userDescription}

Generate quotes that directly address this theme. Do not add unrelated topics.${excludeText}

Return a JSON array only: ["quote1", "quote2", ...]`;

    } else if (theme?.trim()) {
      // Legacy: Single theme keyword mode
      prompt = `Generate ${count} SHORT inspirational quotes for a coloring book about: ${theme}

RULES:
- 4-12 words each, max 60 characters
- Original, not famous quotes
- For ${audience === "all" ? "all ages" : audience}
- Each quote different structure
- No quotes starting with same word${excludeText}

Return JSON array only: ["quote1", "quote2", ...]`;

    } else {
      // General mode - variety of topics
      const generalTopics = [
        "self-belief", "courage", "kindness", "dreams", "happiness",
        "strength", "gratitude", "growth", "peace", "love"
      ];
      const selectedTopics = generalTopics.sort(() => Math.random() - 0.5).slice(0, 6);

      prompt = `Generate ${count} SHORT inspirational quotes for a coloring book.

RULES:
- 4-12 words each, max 60 characters
- Original, not famous quotes
- For ${audience === "all" ? "all ages" : audience}
- Topics: ${selectedTopics.join(", ")}
- Each quote different structure
- No quotes starting with same word${excludeText}

Return JSON array only: ["quote1", "quote2", ...]`;
    }

    console.log(`[quote/generate] Generating ${count} quotes, mode: ${topicMode}${customPrompt ? `, prompt: "${customPrompt.slice(0, 50)}..."` : ""}`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Fast model for quick generation
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      max_tokens: 2000, // Enough for 50 quotes
    });

    const content = response.choices[0]?.message?.content?.trim() || "";
    
    // Parse quotes
    let quotes: string[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        quotes = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback: extract lines
      quotes = content
        .split("\n")
        .map(line => line.replace(/^[\d\.\-\*\s"']+/, "").replace(/["',]$/g, "").trim())
        .filter(line => line.length > 5 && line.length < 80);
    }

    // Validate and clean
    const validQuotes = quotes
      .map(q => (typeof q === "string" ? q : "").trim())
      .filter(q => {
        const words = q.split(/\s+/).length;
        return words >= 2 && words <= 15 && q.length > 3 && q.length <= 80;
      })
      .slice(0, count);

    if (validQuotes.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate quotes. Please try again with a different description." },
        { status: 500 }
      );
    }

    console.log(`[quote/generate] Generated ${validQuotes.length} quotes successfully`);

    return NextResponse.json({
      quotes: validQuotes,
      mode: topicMode,
      audience,
      count: validQuotes.length,
    });

  } catch (error) {
    console.error("[quote/generate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate quotes" },
      { status: 500 }
    );
  }
}
