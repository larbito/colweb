import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { characterLockSchema } from "@/lib/schemas";
import { buildPrompt, buildStricterSuffix } from "@/lib/promptBuilder";
import type { GenerationSpec } from "@/lib/generationSpec";

// Accept GenerationSpec
const generationSpecSchema = z.object({
  trimSize: z.string(),
  pixelSize: z.string(),
  complexity: z.enum(["simple", "medium", "detailed"]),
  lineThickness: z.enum(["thin", "medium", "bold"]),
  pageCount: z.number().int().min(1).max(80),
  includeBlankBetween: z.boolean(),
  includeBelongsTo: z.boolean(),
  includePageNumbers: z.boolean(),
  includeCopyrightPage: z.boolean(),
  stylePreset: z.literal("kids-kdp"),
});

const requestSchema = z.object({
  prompt: z.string().min(1),
  characterLock: characterLockSchema.optional().nullable(),
  characterSheetImageUrl: z.string().optional().nullable(),
  spec: generationSpecSchema,
});

export type GeneratePageImageRequest = z.infer<typeof requestSchema>;

// Image size mapping - all portrait
const SIZE_MAP: Record<string, "1024x1792" | "1024x1024" | "1792x1024"> = {
  "1024x1326": "1024x1792",
  "1024x1280": "1024x1792",
  "1024x1536": "1024x1792",
  "1024x1448": "1024x1792",
};

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

    const { prompt, characterLock, spec } = parseResult.data;

    // Build the full prompt with all rules injected
    const fullPrompt = buildPrompt({
      sceneDescription: prompt,
      characterLock,
      spec: spec as GenerationSpec,
    });

    // Get the appropriate image size (always portrait)
    const imageSize = SIZE_MAP[spec.pixelSize] || "1024x1792";

    let imageUrl: string | undefined;
    let retryCount = 0;
    const maxRetries = 2;
    let lastError: string | undefined;

    while (retryCount <= maxRetries) {
      try {
        // Add stricter suffix on retries
        const attemptPrompt = retryCount > 0 
          ? `${fullPrompt}${buildStricterSuffix()}`
          : fullPrompt;

        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: attemptPrompt,
          n: 1,
          size: imageSize,
          quality: "hd",
          style: "natural",
        });

        imageUrl = response.data?.[0]?.url;

        if (imageUrl) {
          // In production, we would:
          // 1. Fetch the image
          // 2. Process with sharp (grayscale + binarize)
          // 3. Check black pixel ratio
          // 4. If fails, retry with stricter prompt
          
          // For now, we trust DALL-E 3 output with our strict prompts
          // The prompt builder already includes very strict rules
          
          break;
        }
      } catch (genError) {
        console.error(`Image generation attempt ${retryCount + 1} failed:`, genError);
        lastError = genError instanceof Error ? genError.message : "Generation failed";

        if (genError instanceof Error && genError.message.includes("content_policy")) {
          return NextResponse.json(
            { error: "Content policy violation. Please modify the prompt." },
            { status: 400 }
          );
        }
      }

      retryCount++;
      if (retryCount <= maxRetries) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    if (!imageUrl) {
      return NextResponse.json(
        { 
          error: lastError || "Failed to generate image after multiple attempts",
          failedPrintSafe: true,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageUrl,
      retries: retryCount,
      spec: {
        complexity: spec.complexity,
        lineThickness: spec.lineThickness,
        pixelSize: spec.pixelSize,
      },
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
