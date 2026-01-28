import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  n: z.number().int().min(1).max(4).default(1),
  size: z.enum(["1024x1024", "1024x1792", "1792x1024"]).default("1024x1792"),
});

/**
 * POST /api/image/generate
 * 
 * Generates images using EXACTLY the prompt provided.
 * 
 * ⚠️ HARD RULE: NO HIDDEN PROMPTS
 * - Does NOT append any style instructions
 * - Does NOT prepend any system context
 * - Does NOT modify the prompt in any way
 * - Uses the prompt EXACTLY as the user provided it
 * 
 * Input: { prompt: string, n?: number, size?: string }
 * Output: { images: string[] }
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
    const { prompt, n, size } = requestSchema.parse(body);

    console.log(`[image/generate] Generating ${n} image(s), prompt length: ${prompt.length}`);
    console.log(`[image/generate] EXACT PROMPT USED: "${prompt.substring(0, 200)}..."`);

    // Generate images - using prompt EXACTLY as provided
    const images: string[] = [];

    for (let i = 0; i < n; i++) {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt, // EXACT prompt, no modifications
        n: 1,
        size: size,
        quality: "hd",
        style: "natural",
      });

      const imageUrl = response.data?.[0]?.url;
      if (imageUrl) {
        // Fetch and convert to base64
        const imageResponse = await fetch(imageUrl);
        if (imageResponse.ok) {
          const buffer = Buffer.from(await imageResponse.arrayBuffer());
          images.push(buffer.toString("base64"));
        }
      }
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate images" },
        { status: 500 }
      );
    }

    console.log(`[image/generate] Generated ${images.length} image(s)`);

    return NextResponse.json({ images });

  } catch (error) {
    console.error("[image/generate] Error:", error);
    
    // Handle content policy errors
    if (error instanceof Error && error.message.includes("content_policy")) {
      return NextResponse.json(
        { error: "Content policy violation. Please modify your prompt." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate image" },
      { status: 500 }
    );
  }
}

