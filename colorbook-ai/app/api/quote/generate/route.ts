import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { randomUUID } from "crypto";

/**
 * Route segment config
 */
export const maxDuration = 60;

const requestSchema = z.object({
  // Topic mode: "any" for broad topics, "selected" for specific topics
  topicMode: z.enum(["any", "selected"]).default("any"),
  topics: z.array(z.string()).optional(), // When topicMode is "selected"
  
  // Tone and audience
  tone: z.enum([
    "cute", "bold", "calm", "funny", "motivational", 
    "romantic", "faith", "sports", "kids", "inspirational",
    "elegant", "minimalist"
  ]).default("motivational"),
  audience: z.enum(["kids", "teens", "adults", "all"]).default("all"),
  
  // Count
  count: z.number().int().min(1).max(50).default(10),
  
  // Topics to avoid
  avoidTopics: z.array(z.string()).optional(),
  
  // Previous quotes to exclude (anti-repetition)
  excludeQuotes: z.array(z.string()).optional(),
  
  // Legacy support
  theme: z.string().optional(),
  previousQuotes: z.array(z.string()).optional(),
  seed: z.string().optional(),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Broad topic pool for diverse quote generation
const TOPIC_POOL = [
  "self-love", "self-confidence", "inner strength",
  "friendship", "kindness", "compassion",
  "family", "parenting", "motherhood", "fatherhood",
  "love", "romance", "relationships",
  "gratitude", "thankfulness", "appreciation",
  "dreams", "goals", "ambition", "success",
  "courage", "bravery", "overcoming fear",
  "happiness", "joy", "positivity",
  "peace", "calm", "mindfulness",
  "growth", "learning", "wisdom",
  "nature", "beauty", "wonder",
  "faith", "hope", "spirituality",
  "sports", "fitness", "health", "wellness",
  "creativity", "art", "imagination",
  "adventure", "travel", "exploration",
  "work", "career", "productivity",
  "humor", "laughter", "fun",
  "resilience", "perseverance", "never giving up",
  "uniqueness", "being yourself", "authenticity",
  "teamwork", "community", "belonging",
  "animals", "pets", "wildlife",
  "music", "dance", "celebration",
];

/**
 * Get random topics from the pool, excluding specified topics
 */
function getRandomTopics(count: number, exclude: string[] = []): string[] {
  const available = TOPIC_POOL.filter(t => 
    !exclude.some(e => t.toLowerCase().includes(e.toLowerCase()))
  );
  
  // Shuffle and pick
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * POST /api/quote/generate
 * 
 * Generates fresh, diverse quotes dynamically.
 * NEVER uses hardcoded quotes - always generates new ones via AI.
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
      topics, 
      tone, 
      audience, 
      count, 
      avoidTopics,
      excludeQuotes,
      // Legacy support
      theme,
      previousQuotes,
    } = parseResult.data;

    // Generate unique seed for this request
    const requestId = randomUUID();
    const timestamp = Date.now();
    
    // Combine exclusion lists
    const allExcludedQuotes = [
      ...(excludeQuotes || []),
      ...(previousQuotes || []),
    ].slice(-50); // Keep last 50 for context window

    // Determine topics to use
    let selectedTopics: string[];
    if (topicMode === "selected" && topics && topics.length > 0) {
      selectedTopics = topics;
    } else if (theme) {
      // Legacy: use theme as a hint
      selectedTopics = getRandomTopics(Math.min(count, 8), avoidTopics || []);
      selectedTopics[0] = theme; // Include user's theme
    } else {
      // Random diverse topics
      selectedTopics = getRandomTopics(Math.min(count, 10), avoidTopics || []);
    }

    // Build exclusion text
    const exclusionText = allExcludedQuotes.length > 0
      ? `\n\n=== QUOTES TO AVOID (DO NOT REPEAT OR PARAPHRASE) ===\n${allExcludedQuotes.slice(-20).map(q => `- "${q}"`).join("\n")}`
      : "";

    // Audience-specific guidance
    const audienceGuidance: Record<string, string> = {
      kids: "Use simple words (2nd-3rd grade level), playful language, and positive messages suitable for children ages 4-10. Avoid complex concepts.",
      teens: "Use relatable, empowering language that resonates with teenagers and young adults. Can include mild slang but keep it clean.",
      adults: "Use sophisticated, meaningful language with depth and wisdom. Can include nuanced emotional concepts.",
      all: "Use universal language that appeals to all ages - simple but meaningful.",
    };

    // Tone-specific guidance
    const toneGuidance: Record<string, string> = {
      cute: "Playful, adorable, whimsical tone with gentle positivity and warmth.",
      bold: "Strong, powerful, assertive tone with confidence and determination.",
      calm: "Peaceful, serene, soothing tone that promotes relaxation and mindfulness.",
      funny: "Light-hearted, humorous, witty tone that makes people smile.",
      motivational: "Energizing, inspiring, push-forward tone that drives action.",
      romantic: "Loving, tender, heartfelt tone about love and relationships.",
      faith: "Spiritual, hopeful, uplifting tone with references to faith and belief.",
      sports: "Competitive, team-spirit, athletic tone about winning, effort, and sportsmanship.",
      kids: "Super simple, fun, encouraging tone perfect for young children.",
      inspirational: "Uplifting, thought-provoking, encouraging tone.",
      elegant: "Graceful, refined, poetic tone with timeless wisdom.",
      minimalist: "Simple, clean, direct tone with impactful brevity.",
    };

    const systemPrompt = `You are an expert quote creator specializing in short, impactful, ORIGINAL quotes for coloring books.

=== CRITICAL RULES ===
1. CREATE BRAND NEW QUOTES - Do not use famous quotes, song lyrics, or well-known sayings.
2. VARY EVERYTHING - Use different sentence structures, word choices, and phrasings.
3. KEEP IT SHORT - 3-12 words maximum (ideal: 4-8 words). Max 60 characters.
4. MAKE IT VISUAL - The quote will be displayed in large typography on a coloring page.

=== RANDOMIZATION SEED ===
Request ID: ${requestId}
Timestamp: ${timestamp}
Use these to ensure unique generation.

=== AUDIENCE ===
${audienceGuidance[audience]}

=== TONE ===
${toneGuidance[tone]}

=== DIVERSITY RULES ===
- Cover DIFFERENT topics from this list: ${selectedTopics.join(", ")}
- Each quote MUST be distinctly different from others
- Vary: sentence length, starting word, structure (question vs statement vs exclamation)
- NO two quotes should start with the same word
- NO two quotes should have the same structure
${exclusionText}

=== OUTPUT FORMAT ===
Return ONLY a JSON object with this exact structure:
{
  "quotes": [
    { "quote": "Your unique quote here", "topic": "topic-name", "keywords": ["key1", "key2"] }
  ]
}`;

    const userPrompt = `Generate exactly ${count} UNIQUE, ORIGINAL quotes.

Topics to cover (distribute evenly): ${selectedTopics.join(", ")}

Requirements:
- Each quote: 3-12 words, max 60 characters
- All quotes must be DIFFERENT from each other
- All quotes must be ORIGINAL (not famous quotes)
- Mix up sentence structures (some statements, some questions, some exclamations)
- Vary the starting words

Generate ${count} quotes NOW with maximum diversity.`;

    console.log(`[quote/generate] Generating ${count} quotes, topics: ${selectedTopics.slice(0, 5).join(", ")}...`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 1.0, // Maximum temperature for diversity
      max_tokens: 3000,
      presence_penalty: 0.6, // Discourage repetition
      frequency_penalty: 0.8, // Further discourage repetition
    });

    const content = response.choices[0]?.message?.content?.trim() || "";
    
    // Parse the JSON response
    interface QuoteItem {
      quote: string;
      topic?: string;
      keywords?: string[];
    }
    
    let parsedQuotes: QuoteItem[] = [];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.quotes)) {
          parsedQuotes = parsed.quotes;
        }
      }
      
      // Fallback: try to parse as array
      if (parsedQuotes.length === 0) {
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          const arr = JSON.parse(arrayMatch[0]);
          parsedQuotes = arr.map((q: string | QuoteItem) => 
            typeof q === "string" ? { quote: q } : q
          );
        }
      }
    } catch (parseError) {
      console.error("[quote/generate] Failed to parse quotes:", parseError);
      // Fallback: extract quotes line by line
      const lines = content
        .split("\n")
        .map(line => line.replace(/^[\d\.\-\*\s"']+/, "").replace(/["']$/, "").trim())
        .filter(line => line.length > 5 && line.length < 80);
      parsedQuotes = lines.map(q => ({ quote: q }));
    }

    // Validate, clean, and deduplicate quotes
    const seenQuotes = new Set<string>();
    const validQuotes = parsedQuotes
      .map(item => ({
        quote: item.quote?.trim() || "",
        topic: item.topic || selectedTopics[Math.floor(Math.random() * selectedTopics.length)],
        keywords: item.keywords || [],
      }))
      .filter(item => {
        const q = item.quote;
        const wordCount = q.split(/\s+/).length;
        const isValid = wordCount >= 2 && wordCount <= 15 && q.length > 3 && q.length <= 80;
        
        // Check for duplicates (case-insensitive)
        const normalized = q.toLowerCase().replace(/[^\w\s]/g, "");
        if (seenQuotes.has(normalized)) {
          return false;
        }
        seenQuotes.add(normalized);
        
        // Check against excluded quotes (fuzzy match)
        const isTooSimilar = allExcludedQuotes.some(excluded => {
          const excNorm = excluded.toLowerCase().replace(/[^\w\s]/g, "");
          return normalized === excNorm || 
                 normalized.includes(excNorm) || 
                 excNorm.includes(normalized);
        });
        
        return isValid && !isTooSimilar;
      })
      .slice(0, count);

    if (validQuotes.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate valid quotes. Please try again." },
        { status: 500 }
      );
    }

    console.log(`[quote/generate] Generated ${validQuotes.length} unique quotes`);

    return NextResponse.json({
      quotes: validQuotes.map(q => q.quote),
      quotesWithMeta: validQuotes,
      topics: selectedTopics,
      tone,
      audience,
      count: validQuotes.length,
      requestId,
    });

  } catch (error) {
    console.error("[quote/generate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate quotes" },
      { status: 500 }
    );
  }
}
