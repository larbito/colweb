import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";

/**
 * Route segment config - increased for safety
 */
export const maxDuration = 30;

const requestSchema = z.object({
  topicMode: z.enum(["any", "selected"]).default("any"),
  topics: z.array(z.string()).optional(),
  tone: z.enum([
    "cute", "bold", "calm", "funny", "motivational", 
    "romantic", "faith", "sports", "kids", "inspirational",
    "elegant", "minimalist"
  ]).default("motivational"),
  audience: z.enum(["kids", "teens", "adults", "all"]).default("all"),
  count: z.number().int().min(1).max(50).default(10),
  avoidTopics: z.array(z.string()).optional(),
  excludeQuotes: z.array(z.string()).optional(),
  theme: z.string().optional(),
  previousQuotes: z.array(z.string()).optional(),
  seed: z.string().optional(),
});

// Condensed topic pool
const TOPIC_POOL = [
  "self-love", "confidence", "strength", "friendship", "kindness",
  "family", "love", "gratitude", "dreams", "success",
  "courage", "happiness", "peace", "growth", "wisdom",
  "nature", "faith", "hope", "health", "creativity",
  "adventure", "humor", "resilience", "authenticity", "teamwork",
];

function getRandomTopics(count: number): string[] {
  const shuffled = [...TOPIC_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, 8));
}

/**
 * POST /api/quote/generate
 * 
 * Fast quote generation using gpt-4o-mini
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

    const { tone, audience, count, excludeQuotes, theme, previousQuotes } = parseResult.data;

    // Simple exclusion - just last 10 quotes
    const excludeList = [...(excludeQuotes || []), ...(previousQuotes || [])].slice(-10);
    const excludeText = excludeList.length > 0 
      ? `\nAVOID similar to: ${excludeList.slice(0, 5).join("; ")}` 
      : "";

    // Get topics
    const topics = theme ? [theme, ...getRandomTopics(4)] : getRandomTopics(6);

    // Simplified prompt for speed
    const prompt = `Generate ${count} SHORT inspirational quotes for a coloring book.

RULES:
- 4-10 words each, max 50 characters
- Original, not famous quotes
- ${tone} tone, for ${audience}
- Topics: ${topics.join(", ")}
- Each quote different structure
- No quotes starting with same word${excludeText}

Return JSON array only: ["quote1", "quote2", ...]`;

    console.log(`[quote/generate] Generating ${count} ${tone} quotes...`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Much faster than gpt-4o
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      max_tokens: 1000, // Reduced - we only need short quotes
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
        .filter(line => line.length > 5 && line.length < 60);
    }

    // Validate and clean
    const validQuotes = quotes
      .map(q => (typeof q === "string" ? q : "").trim())
      .filter(q => {
        const words = q.split(/\s+/).length;
        return words >= 2 && words <= 12 && q.length > 3 && q.length <= 60;
      })
      .slice(0, count);

    if (validQuotes.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate quotes. Please try again." },
        { status: 500 }
      );
    }

    console.log(`[quote/generate] Generated ${validQuotes.length} quotes`);

    return NextResponse.json({
      quotes: validQuotes,
      tone,
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
