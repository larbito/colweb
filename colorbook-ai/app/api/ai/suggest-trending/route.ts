import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";

const requestSchema = z.object({
  region: z.string().default("US"),
  periodDays: z.enum(["7", "30", "90"]).transform(Number).default("30"),
  optionalKeyword: z.string().optional(),
});

const responseSchema = z.object({
  bookIdeaTitle: z.string(),
  theme: z.string(),
  mainCharacterName: z.string(),
  mainCharacterDescription: z.string(),
  tags: z.array(z.string()),
  exampleScenes: z.array(z.string()),
});

export type TrendingSuggestionResponse = z.infer<typeof responseSchema>;

export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { region, periodDays, optionalKeyword } = requestSchema.parse(body);

    // Fetch current trends
    const baseUrl = request.nextUrl.origin;
    const trendsResponse = await fetch(
      `${baseUrl}/api/trends?region=${region}&periodDays=${periodDays}`
    );
    const trendsData = await trendsResponse.json();
    
    const trendItems = trendsData.items || [];
    const topTrends = trendItems.slice(0, 20).map((t: { keyword: string; score: number }) => 
      `${t.keyword} (score: ${t.score})`
    );

    const systemPrompt = `You are a creative coloring book idea generator for KDP (Amazon Kindle Direct Publishing).
Your task is to generate a unique, marketable coloring book idea based on current trending topics.

CURRENT TRENDING TOPICS (${region}, last ${periodDays} days):
${topTrends.join("\n")}

${optionalKeyword ? `USER PREFERENCE: The user is interested in "${optionalKeyword}". Incorporate this if it fits.` : ""}

REQUIREMENTS:
1. The idea must be ORIGINAL - no copyrighted or trademarked characters
2. Must be suitable for a COLORING BOOK (black and white line art)
3. Should appeal to the target audience (kids, families, or adults depending on theme)
4. Title should be catchy and keyword-rich for Amazon search
5. Character should be visually distinctive and easy to draw consistently
6. Scenes should be varied but cohesive for a complete book

Return ONLY this JSON structure:
{
  "bookIdeaTitle": "Catchy, SEO-friendly book title (50-80 chars)",
  "theme": "The main theme/setting of the book",
  "mainCharacterName": "A memorable, original character name",
  "mainCharacterDescription": "Detailed visual description for consistent illustration (100-150 chars)",
  "tags": ["5-7 relevant tags for Amazon/marketing"],
  "exampleScenes": ["4-6 scene ideas that would make great coloring pages"]
}

AVOID:
- Any Disney, Marvel, DC, Nintendo, or other trademarked characters
- Generic ideas like "Animals" or "Nature" - be specific and creative
- Overly complex concepts that don't translate well to coloring pages`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: optionalKeyword 
            ? `Generate a trending coloring book idea incorporating "${optionalKeyword}".`
            : "Generate a trending coloring book idea based on current popular topics."
        },
      ],
      temperature: 0.8,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse JSON from response
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) jsonContent = jsonContent.slice(7);
    else if (jsonContent.startsWith("```")) jsonContent = jsonContent.slice(3);
    if (jsonContent.endsWith("```")) jsonContent = jsonContent.slice(0, -3);
    jsonContent = jsonContent.trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonContent);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: "Invalid JSON from AI" }, { status: 500 });
      }
    }

    const validationResult = responseSchema.safeParse(parsed);
    if (!validationResult.success) {
      console.error("Response validation failed:", validationResult.error);
      return NextResponse.json({ error: "AI response did not match expected format" }, { status: 500 });
    }

    return NextResponse.json({
      ...validationResult.data,
      basedOnTrends: topTrends.slice(0, 5),
      region,
      periodDays,
    });
  } catch (error) {
    console.error("Suggest trending error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to suggest trending idea" },
      { status: 500 }
    );
  }
}

