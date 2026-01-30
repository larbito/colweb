import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { 
  type BookType, 
  type AudienceType,
  type BookMode,
  DEFAULT_PAGES_PER_BOOK,
} from "@/lib/bulkBookTypes";

export const maxDuration = 30;

const requestSchema = z.object({
  count: z.number().min(1).max(10).default(5),
  themes: z.array(z.string()).optional(),
  targetAge: z.enum(["kids", "teens", "adults", "all"]).default("kids"),
  bookType: z.enum(["coloring_scenes", "quote_text"]).optional(),
});

export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { count, themes, targetAge, bookType } = requestSchema.parse(body);

    const themesText = themes && themes.length > 0 
      ? `Focus on these themes: ${themes.join(", ")}.` 
      : "Use diverse and creative themes (animals, fantasy, nature, vehicles, space, sports, seasons, professions, food, travel, etc.).";
    
    const bookTypeText = bookType 
      ? (bookType === "coloring_scenes" 
          ? "Generate ONLY scene-based coloring book ideas (characters, stories, activities)."
          : "Generate ONLY quote/text coloring book ideas (motivational quotes, affirmations, typography).")
      : "Mix of both types: some scene-based coloring books AND some quote/text coloring books.";

    const audienceText = {
      kids: "for young children (ages 3-8) - simple, cute, friendly themes",
      teens: "for tweens/teens (ages 9-16) - cool, trendy, age-appropriate themes",
      adults: "for adults - sophisticated, detailed, relaxing themes",
      all: "for all ages - universally appealing themes",
    }[targetAge];

    const prompt = `Generate ${count} unique and creative coloring book ideas ${audienceText}.

${themesText}

${bookTypeText}

For EACH idea, provide:
1. A catchy, marketable title
2. The book type: "coloring_scenes" OR "quote_text"
3. A 1-2 sentence concept/description
4. Recommended book mode: "storybook" (same character throughout) OR "theme_book" (varied scenes/topics)
5. Suggested page count (between 10-30)

IMPORTANT:
- Make each idea UNIQUE and DIFFERENT from the others
- Titles should be catchy and marketable
- For coloring_scenes: describe the main character or theme
- For quote_text: describe the quote topic/style (motivational, funny, inspirational, etc.)
- Be creative! Don't use generic ideas.

Return ONLY valid JSON array:
[
  {
    "title": "...",
    "bookType": "coloring_scenes" | "quote_text",
    "concept": "...",
    "bookMode": "storybook" | "theme_book",
    "pageCount": number
  }
]`;

    console.log(`[bulk/generate-ideas] Generating ${count} book ideas for ${targetAge} audience`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a creative children's book author and coloring book designer. Generate unique, marketable coloring book ideas. Return ONLY valid JSON, no markdown or explanation.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.9, // High creativity
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "[]";
    
    // Parse the JSON response
    let ideas;
    try {
      // Clean up the response (remove markdown code blocks if present)
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      ideas = JSON.parse(cleanContent);
    } catch {
      console.error("[bulk/generate-ideas] Failed to parse response:", content);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    if (!Array.isArray(ideas)) {
      return NextResponse.json(
        { error: "Invalid response format" },
        { status: 500 }
      );
    }

    // Validate and normalize ideas
    const validatedIdeas = ideas.map((idea: any, idx: number) => ({
      title: idea.title || `Coloring Book ${idx + 1}`,
      bookType: (idea.bookType === "quote_text" ? "quote_text" : "coloring_scenes") as BookType,
      concept: idea.concept || "",
      bookMode: (idea.bookMode === "storybook" ? "storybook" : "theme_book") as BookMode,
      pageCount: Math.min(40, Math.max(10, idea.pageCount || DEFAULT_PAGES_PER_BOOK)),
      targetAge: targetAge as AudienceType,
    }));

    console.log(`[bulk/generate-ideas] Successfully generated ${validatedIdeas.length} ideas`);

    return NextResponse.json({ ideas: validatedIdeas });
  } catch (error) {
    console.error("[bulk/generate-ideas] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate ideas" },
      { status: 500 }
    );
  }
}

