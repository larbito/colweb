import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { type BookType, type BookSettings } from "@/lib/bulkBookTypes";
import { buildQuotePagePrompt, type DecorationLevel, type TypographyStyle, type DecorationDensity, type FrameStyle } from "@/lib/quotePagePromptEnforcer";
import { buildFinalColoringPrompt, buildStrongCharacterConsistencyBlock } from "@/lib/coloringPagePromptEnforcer";

export const maxDuration = 30;

const requestSchema = z.object({
  bookId: z.string(),
  pageId: z.string(),
  pageIndex: z.number(),
  ideaText: z.string().min(1),
  bookType: z.enum(["coloring_scenes", "quote_text"]),
  bookConcept: z.string(),
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

/**
 * Build a scene description for coloring pages
 */
function buildSceneDescription(
  ideaText: string,
  bookConcept: string,
  pageIndex: number,
  settings: any,
  targetAge?: string
): string {
  const artStyle = settings.artStyle || "clean cute cartoon style";
  const ageText = {
    kids: "young children (ages 3-8)",
    teens: "tweens and teens",
    adults: "adults",
    all: "all ages",
  }[targetAge || "kids"];

  let prompt = `Create a black-and-white coloring page illustration.

SCENE: ${ideaText}

CONTEXT: This is page ${pageIndex} from a coloring book about "${bookConcept}".

ART STYLE:
- ${artStyle}
- Clean, simple outlines perfect for coloring
- Appropriate for ${ageText}
- Engaging and fun composition
`;

  // Add character consistency for storybooks
  if (settings.sameCharacter && settings.characterDescription) {
    prompt += `
MAIN CHARACTER (must appear in every page):
${settings.characterDescription}
- Keep the character EXACTLY the same across all pages
- Same species, size, features, accessories
`;
  }

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, pageId, pageIndex, ideaText, bookType, bookConcept, settings, targetAge } = requestSchema.parse(body);

    console.log(`[bulk/improve-prompt] Building prompt for ${bookType} page ${pageIndex} in book ${bookId}`);

    let finalPrompt: string;

    if (bookType === "quote_text") {
      // Use the quote page prompt builder
      finalPrompt = buildQuotePagePrompt({
        quote: ideaText,
        decorationTheme: (settings.decorationTheme || "stars") as any,
        typographyStyle: (settings.typographyStyle || "bubble") as TypographyStyle,
        density: "medium" as DecorationDensity,
        frameStyle: "none" as FrameStyle,
        decorationLevel: (settings.decorationLevel || "minimal_icons") as DecorationLevel,
        iconSet: settings.iconSet as any,
      });
    } else {
      // Build scene prompt for coloring pages
      const sceneDescription = buildSceneDescription(
        ideaText,
        bookConcept,
        pageIndex,
        settings,
        targetAge
      );

      // Build character consistency block if needed
      let characterBlock: string | undefined;
      if (settings.sameCharacter && settings.characterDescription) {
        // Extract character info from description
        const desc = settings.characterDescription;
        const words = desc.split(" ");
        characterBlock = buildStrongCharacterConsistencyBlock({
          species: words[0] || "character",
          keyFeatures: desc.split(",").map(s => s.trim()).filter(s => s),
          proportions: "cute, child-friendly proportions",
          faceStyle: "friendly, expressive face",
          clothing: words.find(w => ["wearing", "with", "dressed"].some(k => w.includes(k))) ? desc : undefined,
        });
      }

      // Apply the coloring page constraints
      finalPrompt = buildFinalColoringPrompt(sceneDescription, {
        size: "1024x1536", // Portrait for coloring pages
        isStorybookMode: settings.sameCharacter || false,
        characterConsistencyBlock: characterBlock,
      });
    }

    console.log(`[bulk/improve-prompt] Generated prompt (${finalPrompt.length} chars)`);

    return NextResponse.json({
      bookId,
      pageId,
      finalPrompt,
      generatedAt: Date.now(),
    });
  } catch (error) {
    console.error("[bulk/improve-prompt] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to improve prompt" },
      { status: 500 }
    );
  }
}

