import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { generateImageRequestSchema, type GenerateImageResponse } from "@/lib/schemas";

// Image generation suffix for coloring book style
const IMAGE_STYLE_SUFFIX = `
Kids coloring book page, pure black and white line art, clean bold outlines, no shading, no grayscale, no gradients, no text, no watermark, white background, closed shapes, print-ready, suitable for coloring with crayons or markers.`;

export async function POST(request: NextRequest) {
  // Check if OpenAI is configured
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    // Validate request
    const parseResult = generateImageRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { prompt, complexity, lineThickness } = parseResult.data;

    // Build the full prompt with style suffix
    const lineStyle = {
      thin: "delicate thin outlines",
      medium: "medium-weight outlines",
      bold: "thick bold outlines",
    };

    const complexityStyle = {
      kids: "very simple shapes, minimal details",
      medium: "moderate detail level",
      detailed: "intricate detailed patterns",
    };

    const fullPrompt = `${prompt}. Style: ${complexityStyle[complexity]}, ${lineStyle[lineThickness]}. ${IMAGE_STYLE_SUFFIX}`;

    // Use DALL-E 3 for best quality line art
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1024", // Square, can be cropped to desired aspect ratio
      quality: "standard",
      style: "natural", // More literal interpretation
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    const result: GenerateImageResponse = { imageUrl };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Image generation error:", error);

    // Handle specific OpenAI errors
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

