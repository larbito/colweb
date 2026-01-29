import { NextRequest, NextResponse } from "next/server";
import { generateImage, isOpenAIImageGenConfigured } from "@/lib/services/openaiImageGen";
import { z } from "zod";
import {
  buildFinalColoringPrompt,
  type ImageSize,
} from "@/lib/coloringPagePromptEnforcer";

/**
 * Route segment config - single image generation
 */
export const maxDuration = 120; // 2 minutes max for single image

const requestSchema = z.object({
  page: z.number().int().min(1),
  prompt: z.string().min(1),
  size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).default("1024x1536"),
});

/**
 * POST /api/batch/generate-one
 * 
 * Generates a SINGLE image for one page.
 * Called multiple times from the frontend for batch generation.
 * This avoids timeout issues by processing one image at a time.
 */
export async function POST(request: NextRequest) {
  if (!isOpenAIImageGenConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
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

    const { page, prompt, size } = parseResult.data;

    console.log(`[generate-one] Page ${page}: Starting generation`);

    // Apply constraints
    const finalPrompt = buildFinalColoringPrompt(prompt, {
      includeNegativeBlock: true,
      maxLength: 3500,
      size: size as ImageSize,
    });

    // Generate single image
    const result = await generateImage({
      prompt: finalPrompt,
      n: 1,
      size: size as ImageSize,
    });

    if (result.images && result.images.length > 0) {
      console.log(`[generate-one] Page ${page}: Success`);
      return NextResponse.json({
        page,
        status: "done",
        imageBase64: result.images[0],
      });
    }

    console.log(`[generate-one] Page ${page}: No image generated`);
    return NextResponse.json({
      page,
      status: "failed",
      error: "No image generated",
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Generation failed";
    console.error("[generate-one] Error:", errorMsg);
    return NextResponse.json({
      page: 0,
      status: "failed",
      error: errorMsg,
    });
  }
}

