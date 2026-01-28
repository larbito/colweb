import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";

const requestSchema = z.object({
  imageBase64: z.string().min(1, "Image is required"),
});

/**
 * POST /api/prompt/from-image
 * 
 * Analyzes an image and returns a single prompt string that describes
 * how to recreate a similar image. No hidden system instructions.
 * 
 * Input: { imageBase64: string }
 * Output: { prompt: string }
 */
export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { imageBase64 } = requestSchema.parse(body);

    // Detect media type
    let mediaType = "image/png";
    if (imageBase64.startsWith("/9j/")) {
      mediaType = "image/jpeg";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image and write a single prompt that would generate a similar image.

The prompt should describe:
- The main subject(s) and what they're doing
- The setting/background
- The art style and visual characteristics you observe
- Any important composition details

Return ONLY the prompt text, nothing else. No explanations, no quotes, no formatting.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mediaType};base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 800,
      temperature: 0.3,
    });

    const prompt = response.choices[0]?.message?.content?.trim() || "";

    if (!prompt) {
      return NextResponse.json(
        { error: "Failed to analyze image" },
        { status: 500 }
      );
    }

    return NextResponse.json({ prompt });

  } catch (error) {
    console.error("[prompt/from-image] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze image" },
      { status: 500 }
    );
  }
}

