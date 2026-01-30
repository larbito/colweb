import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { type BookType, type BookSettings } from "@/lib/bulkBookTypes";

export const maxDuration = 60;

const requestSchema = z.object({
  bookId: z.string(),
  bookType: z.enum(["coloring_scenes", "quote_text"]),
  concept: z.string().min(1),
  pageCount: z.number().min(1).max(40),
  settings: z.object({
    pageSize: z.enum(["letter"]).default("letter"),
    fillPage: z.boolean().default(true),
    sameCharacter: z.boolean().optional(),
    characterDescription: z.string().optional(),
    artStyle: z.string().optional(),
    decorationLevel: z.enum(["text_only", "minimal_icons", "border_only", "full_background"]).optional(),
    typographyStyle: z.enum(["bubble", "script", "block", "mixed"]).optional(),
    iconSet: z.enum(["stars", "hearts", "doodles", "sports", "kids"]).optional(),
    decorationTheme: z.enum(["floral", "stars", "mandala", "hearts", "nature", "geometric", "doodles", "mixed"]).optional(),
    quoteMode: z.enum(["different_quotes", "quote_variations"]).optional(),
    tone: z.enum(["cute", "bold", "calm", "funny", "motivational", "romantic", "faith", "sports", "kids", "inspirational"]).optional(),
  }),
  targetAge: z.enum(["kids", "teens", "adults", "all"]).optional(),
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
    const { bookId, bookType, concept, pageCount, settings, targetAge } = requestSchema.parse(body);

    console.log(`[bulk/generate-page-ideas] Generating ${pageCount} page ideas for ${bookType} book: ${bookId}`);

    let prompt: string;

    if (bookType === "coloring_scenes") {
      // Generate scene descriptions for coloring pages
      const characterContext = settings.sameCharacter && settings.characterDescription
        ? `IMPORTANT: This is a storybook with the SAME main character throughout. Character: ${settings.characterDescription}. Every scene must feature this character.`
        : "Each page can have different characters and scenes.";

      prompt = `Generate ${pageCount} unique scene descriptions for a coloring book.

Book Concept: ${concept}
Target Audience: ${targetAge || "kids"}
${characterContext}

For EACH page, write a clear, concise scene description (1-2 sentences) that:
- Describes what the character(s) are doing
- Sets the location/environment
- Is visually interesting for coloring
- Is appropriate for the target audience
- ${settings.sameCharacter ? "Features the main character in different situations" : "Can have different characters/scenes"}

Return ONLY a JSON array of objects:
[
  { "index": 1, "ideaText": "Scene description..." },
  { "index": 2, "ideaText": "Scene description..." },
  ...
]`;
    } else {
      // Generate quotes for text coloring pages
      const toneText = settings.tone || "motivational";
      const modeText = settings.quoteMode === "quote_variations" 
        ? "Generate ONE main quote, then create variations/different presentations of the same core message."
        : "Generate DIFFERENT quotes, each with a unique message.";

      prompt = `Generate ${pageCount} quotes for a quote/text coloring book.

Book Concept: ${concept}
Target Audience: ${targetAge || "kids"}
Tone/Style: ${toneText}
${modeText}

Rules for quotes:
- Keep quotes SHORT (3-12 words ideal, max 15 words)
- Make them impactful and memorable
- Appropriate for ${targetAge || "kids"}
- ${toneText} tone
- Easy to read and understand
- No overly complex vocabulary

Return ONLY a JSON array of objects:
[
  { "index": 1, "ideaText": "Your quote here" },
  { "index": 2, "ideaText": "Another quote here" },
  ...
]`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: bookType === "coloring_scenes" 
            ? "You are a creative children's book author. Generate engaging, age-appropriate scene descriptions for coloring books. Return ONLY valid JSON."
            : "You are a quote writer specializing in short, impactful quotes for coloring books. Return ONLY valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "[]";
    
    // Parse the JSON response
    let pages;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      pages = JSON.parse(cleanContent);
    } catch {
      console.error("[bulk/generate-page-ideas] Failed to parse response:", content);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    if (!Array.isArray(pages)) {
      return NextResponse.json(
        { error: "Invalid response format" },
        { status: 500 }
      );
    }

    // Validate and normalize pages
    const validatedPages = pages.slice(0, pageCount).map((page: any, idx: number) => ({
      index: page.index || idx + 1,
      ideaText: page.ideaText || "",
    }));

    // Ensure we have the right number of pages
    while (validatedPages.length < pageCount) {
      validatedPages.push({
        index: validatedPages.length + 1,
        ideaText: "",
      });
    }

    console.log(`[bulk/generate-page-ideas] Successfully generated ${validatedPages.length} page ideas`);

    return NextResponse.json({ 
      bookId,
      pages: validatedPages,
    });
  } catch (error) {
    console.error("[bulk/generate-page-ideas] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate page ideas" },
      { status: 500 }
    );
  }
}

