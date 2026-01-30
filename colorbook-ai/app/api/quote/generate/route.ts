import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

/**
 * Route segment config
 */
export const maxDuration = 60;

const requestSchema = z.object({
  theme: z.string().min(1, "Theme is required"),
  tone: z.enum(["cute", "elegant", "bold", "minimalist", "inspirational"]).default("inspirational"),
  audience: z.enum(["kids", "teens", "adults", "all"]).default("all"),
  count: z.number().int().min(1).max(50).default(10),
  // Anti-repetition
  previousQuotes: z.array(z.string()).optional(),
  seed: z.string().optional(),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/quote/generate
 * 
 * Generates quotes/affirmations based on theme and tone.
 * Returns short, impactful quotes suitable for coloring pages.
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

    const { theme, tone, audience, count, previousQuotes, seed } = parseResult.data;

    // Build exclusion list for diversity
    const exclusions = previousQuotes?.slice(-20) || [];
    const exclusionText = exclusions.length > 0
      ? `\n\nDO NOT repeat or closely paraphrase these previous quotes:\n${exclusions.map(q => `- "${q}"`).join("\n")}`
      : "";

    // Audience-specific guidance
    const audienceGuidance: Record<string, string> = {
      kids: "Use simple words, playful language, and positive messages suitable for children ages 4-10.",
      teens: "Use relatable, empowering language that resonates with teenagers and young adults.",
      adults: "Use sophisticated, meaningful language with depth and wisdom.",
      all: "Use universal language that appeals to all ages.",
    };

    // Tone-specific guidance
    const toneGuidance: Record<string, string> = {
      cute: "Playful, adorable, whimsical tone with gentle positivity.",
      elegant: "Graceful, refined, poetic tone with timeless wisdom.",
      bold: "Strong, powerful, assertive tone with confidence.",
      minimalist: "Simple, clean, direct tone with impactful brevity.",
      inspirational: "Uplifting, motivating, encouraging tone.",
    };

    const systemPrompt = `You are an expert quote writer specializing in short, impactful quotes for coloring books.

Your quotes must be:
- SHORT: 3-12 words maximum (ideal: 4-8 words)
- IMPACTFUL: Meaningful and memorable
- VISUAL-FRIENDLY: Easy to display in large typography
- ORIGINAL: Fresh and unique (not common clichés)
- POSITIVE: Uplifting and appropriate for all

${audienceGuidance[audience]}
${toneGuidance[tone]}

Rules:
- Avoid complex punctuation (minimal commas, no semicolons)
- Avoid very long words when possible
- Each quote should stand alone as a complete thought
- Vary sentence structures across quotes
- Make each quote distinctly different from others${exclusionText}`;

    const userPrompt = `Generate exactly ${count} unique quotes about "${theme}".

Return ONLY a JSON array of strings, like this:
["Quote one here", "Quote two here", "Quote three here"]

Each quote should be 3-12 words. Make them diverse - vary the style, structure, and specific angle on the theme.${seed ? `\n\nUse this seed for randomization: ${seed}` : ""}`;

    console.log(`[quote/generate] Generating ${count} quotes for theme: "${theme}"`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9, // High temperature for diversity
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content?.trim() || "";
    
    // Parse the JSON array
    let quotes: string[] = [];
    try {
      // Try to extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        quotes = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON array found");
      }
    } catch (parseError) {
      console.error("[quote/generate] Failed to parse quotes:", parseError);
      // Fallback: try to extract quotes line by line
      quotes = content
        .split("\n")
        .map(line => line.replace(/^[\d\.\-\*\s"']+/, "").replace(/["']$/, "").trim())
        .filter(line => line.length > 5 && line.length < 100);
    }

    // Validate and clean quotes
    quotes = quotes
      .map(q => q.trim())
      .filter(q => {
        const wordCount = q.split(/\s+/).length;
        return wordCount >= 2 && wordCount <= 15 && q.length > 3;
      })
      .slice(0, count);

    if (quotes.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate valid quotes. Please try again." },
        { status: 500 }
      );
    }

    console.log(`[quote/generate] Generated ${quotes.length} quotes`);

    return NextResponse.json({
      quotes,
      theme,
      tone,
      audience,
      count: quotes.length,
    });

  } catch (error) {
    console.error("[quote/generate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate quotes" },
      { status: 500 }
    );
  }
}

