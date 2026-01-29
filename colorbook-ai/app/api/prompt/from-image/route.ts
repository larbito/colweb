import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { 
  IMAGE_ANALYSIS_SYSTEM_PROMPT,
  buildFinalColoringPrompt,
} from "@/lib/coloringPagePromptEnforcer";

const requestSchema = z.object({
  imageBase64: z.string().min(1, "Image is required"),
});

/**
 * POST /api/prompt/from-image
 * 
 * Analyzes an image and returns a DETAILED, STRUCTURED prompt that describes
 * EXACTLY what's visible in the uploaded image.
 * 
 * The returned prompt follows this exact format:
 * - Title line: "Create a kids coloring book page in clean black-and-white line art (no grayscale)."
 * - Sections: Scene, Background, Composition, Line style, Floor, Output
 * 
 * The prompt is very detailed and includes:
 * 1. All major objects and their relative positions
 * 2. Character attributes: species, proportions, facial expression, accessories, pose
 * 3. Every background object: furniture, windows, decorations, etc.
 * 4. Framing: portrait, centered, medium-wide view, white space
 * 5. Explicit output constraints: printable, crisp, no text, no watermark, no fills
 * 
 * Input: { imageBase64: string }
 * Output: { prompt: string }
 * 
 * NO extra commentary. NO markdown. ONLY JSON with the prompt string.
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
    } else if (imageBase64.startsWith("R0lGOD")) {
      mediaType = "image/gif";
    } else if (imageBase64.startsWith("UklGR")) {
      mediaType = "image/webp";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: IMAGE_ANALYSIS_SYSTEM_PROMPT,
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
      max_tokens: 2000, // Increased for detailed output
      temperature: 0.3,
    });

    let rawPrompt = response.choices[0]?.message?.content?.trim() || "";

    if (!rawPrompt) {
      return NextResponse.json(
        { error: "Failed to analyze image" },
        { status: 500 }
      );
    }

    // Clean up the prompt - remove any markdown formatting or extra quotes
    rawPrompt = rawPrompt
      .replace(/^```[\s\S]*?\n/gm, "") // Remove opening code blocks
      .replace(/```$/gm, "") // Remove closing code blocks
      .replace(/^["']|["']$/g, "") // Remove surrounding quotes
      .trim();

    // Apply the no-fill constraints to the analyzed prompt
    const finalPrompt = buildFinalColoringPrompt(rawPrompt, {
      includeNegativeBlock: true,
      maxLength: 4000,
    });

    console.log(`[prompt/from-image] Generated structured prompt (${finalPrompt.length} chars)`);
    console.log(`[prompt/from-image] Prompt preview: "${finalPrompt.substring(0, 200)}..."`);

    return NextResponse.json({ prompt: finalPrompt });

  } catch (error) {
    console.error("[prompt/from-image] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze image" },
      { status: 500 }
    );
  }
}
