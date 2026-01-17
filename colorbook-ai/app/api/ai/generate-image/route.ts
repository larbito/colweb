import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { generateImageRequestSchema, type GenerateImageResponse } from "@/lib/schemas";

// Coloring book style suffix
const COLORING_BOOK_SUFFIX = `
Pure black and white line art. Clean bold outlines. No shading. No grayscale. No gradients. No text. No watermark.
Closed shapes with white fill areas for coloring. Kid-friendly coloring book page. White background.
Centered composition suitable for print.`;

export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    const parseResult = generateImageRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { prompt, complexity, lineThickness, characterLock } = parseResult.data;

    // Build the full prompt
    const lineStyle = {
      thin: "delicate thin outlines (2px)",
      medium: "medium-weight outlines (3-4px)",
      bold: "thick bold outlines (5-6px)",
    };

    const complexityStyle = {
      simple: "very simple shapes, minimal details, large coloring areas, ages 3-6",
      medium: "moderate detail level, balanced complexity",
      detailed: "intricate detailed patterns for older children and adults",
    };

    // Include character lock rules if available
    let characterSection = "";
    if (characterLock) {
      characterSection = `
Character "${characterLock.canonicalName}" MUST have:
- Proportions: ${characterLock.visualRules.proportions}
- Face: ${characterLock.visualRules.face}
- Features: ${characterLock.visualRules.uniqueFeatures.join(", ")}
- Outfit: ${characterLock.visualRules.outfit}
`;
    }

    const fullPrompt = `${prompt}
${characterSection}
Style: ${complexityStyle[complexity]}, ${lineStyle[lineThickness]}.
${COLORING_BOOK_SUFFIX}`;

    // Use DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "natural",
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    const result: GenerateImageResponse = { imageUrl };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Image generation error:", error);

    if (error instanceof Error) {
      if (error.message.includes("content_policy")) {
        return NextResponse.json(
          { error: "Content policy violation. Please modify the prompt and try again." },
          { status: 400 }
        );
      }
      if (error.message.includes("rate_limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please wait a moment and try again." },
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
