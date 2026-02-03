import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateImage, isOpenAIImageGenConfigured } from "@/lib/services/openaiImageGen";
import { characterLockSchema } from "@/lib/schemas";
import { buildPrompt, buildStricterSuffix } from "@/lib/promptBuilder";
import { hasRequiredConstraints } from "@/lib/coloringPagePromptEnforcer";
import type { GenerationSpec } from "@/lib/generationSpec";

// Accept GenerationSpec with extended complexity
const generationSpecSchema = z.object({
  trimSize: z.string(),
  pixelSize: z.string(),
  // Support all 5 complexity levels from UI
  complexity: z.enum(["kids", "simple", "medium", "detailed", "ultra"]),
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

// GPT Image 1.5 supported sizes: 1024x1024, 1024x1536, 1536x1024, auto
const SIZE_MAP: Record<string, "1024x1536" | "1024x1024" | "1536x1024"> = {
  "1024x1326": "1024x1536",
  "1024x1280": "1024x1536",
  "1024x1536": "1024x1536",
  "1024x1448": "1024x1536",
};

export async function POST(request: NextRequest) {
  if (!isOpenAIImageGenConfigured()) {
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
    // Pass complexity directly to support extended complexity levels (kids, ultra)
    let fullPrompt = buildPrompt({
      sceneDescription: prompt,
      characterLock,
      spec: spec as GenerationSpec,
      complexity: spec.complexity as "kids" | "simple" | "medium" | "detailed" | "ultra",
    });

    // Runtime assertion: verify prompt has required no-fill constraints
    if (!hasRequiredConstraints(fullPrompt)) {
      console.warn(`[generate-page-image] Prompt missing required constraints, adding manually`);
      fullPrompt += `\n\n=== OUTLINE-ONLY CONSTRAINTS ===
NO solid black fills anywhere. NO filled shapes.
Only black outlines on white background.
Interior areas must remain white/unfilled.`;
    }

    // Get the appropriate image size (always portrait)
    const imageSize = SIZE_MAP[spec.pixelSize] || "1024x1536";

    let imageBase64: string | undefined;
    let retryCount = 0;
    const maxRetries = 2;
    let lastError: string | undefined;

    while (retryCount <= maxRetries) {
      try {
        // Add stricter suffix on retries
        const attemptPrompt = retryCount > 0 
          ? `${fullPrompt}${buildStricterSuffix()}`
          : fullPrompt;

        // Use centralized OpenAI service
        const result = await generateImage({
          prompt: attemptPrompt,
          n: 1,
          size: imageSize,
        });

        if (result.images && result.images.length > 0) {
          imageBase64 = result.images[0];
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

    if (!imageBase64) {
      return NextResponse.json(
        { 
          error: lastError || "Failed to generate image after multiple attempts",
          failedPrintSafe: true,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${imageBase64}`,
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
