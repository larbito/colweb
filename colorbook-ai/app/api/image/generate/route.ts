import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { 
  generateImage, 
  isOpenAIImageGenConfigured,
  assertOpenAIOnlyProvider,
  type ImageSize 
} from "@/lib/services/openaiImageGen";

/**
 * ============================================================
 * POST /api/image/generate
 * ============================================================
 * 
 * ⚠️  STRICT RULES:
 * 
 * 1. Uses ONLY OpenAI DALL-E for image generation
 * 2. Sends the prompt EXACTLY as provided - NO MODIFICATIONS
 * 3. No hidden system prompts or style injection
 * 4. The prompt parameter is the single source of truth
 * 
 * Input:  { prompt: string, n?: number, size?: string }
 * Output: { images: string[] } (base64 encoded)
 * 
 * ============================================================
 */

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(4000, "Prompt too long"),
  n: z.number().int().min(1).max(4).default(1),
  size: z.enum(["1024x1024", "1024x1536", "1536x1024", "auto"]).default("1024x1536"),
});

export async function POST(request: NextRequest) {
  // Run provider guard (logs warnings if other providers are configured)
  assertOpenAIOnlyProvider();

  // Check OpenAI is configured
  if (!isOpenAIImageGenConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Set OPENAI_API_KEY in environment." },
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

    const { prompt, n, size } = parseResult.data;

    // Log the exact prompt being used (for transparency)
    console.log(`[/api/image/generate] Request received`);
    console.log(`[/api/image/generate] n=${n}, size=${size}`);
    console.log(`[/api/image/generate] EXACT PROMPT SENT TO OPENAI:`);
    console.log(`"${prompt}"`);
    console.log(`[/api/image/generate] --- END PROMPT ---`);

    // Generate using OpenAI ONLY
    const result = await generateImage({
      prompt, // EXACT prompt, no modifications
      n,
      size: size as ImageSize,
    });

    // Log success
    console.log(`[/api/image/generate] Success: ${result.images.length} image(s) generated`);
    
    // Log if DALL-E revised the prompt (for transparency)
    if (result.revisedPrompts && result.revisedPrompts.length > 0) {
      console.log(`[/api/image/generate] Note: DALL-E revised the prompt internally:`);
      result.revisedPrompts.forEach((rp, i) => {
        console.log(`[/api/image/generate] Revised prompt ${i + 1}: "${rp.substring(0, 100)}..."`);
      });
    }

    return NextResponse.json({
      images: result.images,
      // Optionally include revised prompts for transparency
      revisedPrompts: result.revisedPrompts,
    });

  } catch (error) {
    console.error("[/api/image/generate] Error:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("content_policy")) {
        return NextResponse.json(
          { error: "Content policy violation. Please modify your prompt." },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
