import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import {
  generateCharacterSheetRequestSchema,
  type GenerateCharacterSheetResponse,
} from "@/lib/schemas";

export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    const parseResult = generateCharacterSheetRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { characterLock } = parseResult.data;
    const { canonicalName, visualRules, negativeRules } = characterLock;

    // Build the character sheet prompt
    const prompt = `Character reference sheet for "${canonicalName}":

CHARACTER DESIGN:
- Proportions: ${visualRules.proportions}
- Face: ${visualRules.face}
- Unique features: ${visualRules.uniqueFeatures.join(", ")}
- Outfit: ${visualRules.outfit}

SHEET LAYOUT:
Draw a character reference sheet with:
- 4 poses: front view, 3/4 view, side view, back view (arranged in a row)
- 3 facial expressions below: happy, surprised, sleepy

STYLE REQUIREMENTS:
- Pure BLACK AND WHITE line art only
- Line thickness: ${visualRules.lineRules.outerStroke} for outlines
- Inner details: ${visualRules.lineRules.innerStroke}
- Clean white background
- NO shading, NO grayscale, NO gradients
- NO text labels on the sheet
- NO watermarks
- Kids coloring book style with closed shapes
- Thick clean outlines suitable for coloring with crayons

${negativeRules.map(rule => `- AVOID: ${rule}`).join("\n")}`;

    // Use DALL-E 3 for the character sheet
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1792", // Portrait for character sheet
      quality: "hd",
      style: "natural",
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    // For MVP, return the URL directly (not base64)
    // In production, you'd want to fetch and convert to base64 for storage
    const result: GenerateCharacterSheetResponse = { imageUrl };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Character sheet generation error:", error);

    if (error instanceof Error) {
      if (error.message.includes("content_policy")) {
        return NextResponse.json(
          { error: "Content policy violation. Please modify the character description." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate character sheet" },
      { status: 500 }
    );
  }
}

