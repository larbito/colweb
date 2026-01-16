import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { characterLockSchema } from "@/lib/schemas";

const requestSchema = z.object({
  prompt: z.string().min(1),
  characterLock: characterLockSchema.optional(),
  characterSheetImageUrl: z.string().optional(),
  stylePreset: z.enum(["kids", "medium", "detailed"]),
  lineThickness: z.enum(["thin", "medium", "bold"]),
  trimSize: z.string(),
});

// Line thickness mapping for prompts
const LINE_THICKNESS_MAP = {
  thin: { outer: "medium weight", inner: "thin delicate" },
  medium: { outer: "thick", inner: "medium weight" },
  bold: { outer: "very thick bold", inner: "thick" },
};

// Strict coloring book suffix - ALWAYS appended
const COLORING_BOOK_SUFFIX = `
CRITICAL STYLE REQUIREMENTS:
- Pure BLACK ink lines on WHITE background ONLY
- NO color whatsoever - not even gray
- NO shading, NO gradients, NO halftones, NO crosshatching
- NO grayscale - only pure black (#000000) and pure white (#FFFFFF)
- Clean closed outlines suitable for coloring with crayons
- NO text, letters, numbers, logos, or watermarks anywhere in the image
- Simple kid-friendly coloring book page style
- Centered composition with clear subject
- White empty background or simple outlined background elements`;

export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured." },
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

    const { prompt, characterLock, stylePreset, lineThickness, trimSize } = parseResult.data;

    // Build comprehensive prompt
    const lineConfig = LINE_THICKNESS_MAP[lineThickness];
    
    const complexityDescription = {
      kids: "Very simple shapes with large coloring areas, minimal details, suitable for ages 3-6",
      medium: "Moderate detail level with balanced complexity, suitable for ages 6-12", 
      detailed: "More intricate details but still clear outlines, suitable for older children",
    };

    // Character consistency section
    let characterSection = "";
    if (characterLock) {
      characterSection = `
MAIN CHARACTER (MUST BE DRAWN EXACTLY AS SPECIFIED):
- Name: ${characterLock.canonicalName}
- Body Proportions: ${characterLock.visualRules.proportions}
- Face: ${characterLock.visualRules.face}
- Distinguishing Features: ${characterLock.visualRules.uniqueFeatures.join(", ")}
- Outfit/Appearance: ${characterLock.visualRules.outfit}

The character MUST look IDENTICAL in every image - same proportions, same face shape, same features.`;
    }

    const fullPrompt = `Create a BLACK AND WHITE coloring book page:

SCENE: ${prompt}
${characterSection}

LINE STYLE:
- Outer contour lines: ${lineConfig.outer}
- Inner detail lines: ${lineConfig.inner}
- All lines must be clean, smooth, and closed

COMPLEXITY: ${complexityDescription[stylePreset]}

${COLORING_BOOK_SUFFIX}`;

    // Generate image with DALL-E 3
    let imageUrl: string | undefined;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        const finalPrompt = retryCount > 0 
          ? `${fullPrompt}\n\nSTRICT REQUIREMENT: Output ONLY pure black lines (#000000) on pure white background (#FFFFFF). Absolutely NO gray, NO color, NO shading.`
          : fullPrompt;

        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: finalPrompt,
          n: 1,
          size: "1024x1792", // Portrait for coloring pages
          quality: "hd",
          style: "natural",
        });

        imageUrl = response.data?.[0]?.url;
        
        if (imageUrl) {
          // For now, we trust DALL-E 3 output
          // In production, you'd add color detection here
          break;
        }
      } catch (genError) {
        console.error(`Image generation attempt ${retryCount + 1} failed:`, genError);
        
        if (genError instanceof Error && genError.message.includes("content_policy")) {
          return NextResponse.json(
            { error: "Content policy violation. Please modify the prompt." },
            { status: 400 }
          );
        }
      }
      
      retryCount++;
      if (retryCount <= maxRetries) {
        await new Promise(r => setTimeout(r, 1000)); // Wait 1s between retries
      }
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Failed to generate image after multiple attempts" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      imageUrl,
      retries: retryCount,
    });
  } catch (error) {
    console.error("Generate page image error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("rate_limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please wait and try again." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate image" },
      { status: 500 }
    );
  }
}

