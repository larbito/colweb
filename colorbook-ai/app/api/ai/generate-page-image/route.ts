import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { characterLockSchema } from "@/lib/schemas";
import { buildPrompt, buildStricterSuffix, ANCHOR_REFERENCE_SUFFIX } from "@/lib/promptBuilder";
import type { GenerationSpec } from "@/lib/generationSpec";

// Accept GenerationSpec with anchor support
const generationSpecSchema = z.object({
  bookMode: z.enum(["series", "collection"]),
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
  pageNumber: z.number().int().min(1).optional(),
  characterLock: characterLockSchema.optional().nullable(),
  characterSheetImageUrl: z.string().optional().nullable(),
  spec: generationSpecSchema,
  // Anchor-first workflow
  anchorImageUrl: z.string().optional().nullable(),
  isAnchorGeneration: z.boolean().optional(),
});

export type GeneratePageImageRequest = z.infer<typeof requestSchema>;

// Image size mapping - all portrait
const SIZE_MAP: Record<string, "1024x1792" | "1024x1024" | "1792x1024"> = {
  "1024x1326": "1024x1792",
  "1024x1280": "1024x1792",
  "1024x1536": "1024x1792",
  "1024x1448": "1024x1792",
};

// Strict eye and style rules to append
const STRICT_STYLE_RULES = `

CRITICAL DRAWING RULES:
1. EYES: Draw as outlines only. Pupils must be TINY dots (2-3px max) or empty. NEVER solid black filled eyes.
2. HAIR/FUR: Outline individual strands. NEVER fill with solid black.
3. SHADOWS: Do NOT draw any shadows.
4. DARK OBJECTS: Outline only, interior must be WHITE for coloring.
5. LINE CONSISTENCY: All outlines must have consistent thickness throughout.
6. CLOSED SHAPES: Every shape must be fully closed for coloring.`;

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
      console.error("Validation error:", JSON.stringify(parseResult.error.flatten(), null, 2));
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { 
      prompt, 
      pageNumber,
      characterLock, 
      spec, 
      anchorImageUrl,
      isAnchorGeneration,
    } = parseResult.data;

    // Build the full prompt with all rules injected
    let fullPrompt = buildPrompt({
      sceneDescription: prompt,
      characterLock,
      spec: spec as GenerationSpec,
    });

    // Add strict style rules
    fullPrompt += STRICT_STYLE_RULES;

    // If we have an anchor and this is NOT the anchor generation, add reference requirement
    if (anchorImageUrl && !isAnchorGeneration) {
      fullPrompt += ANCHOR_REFERENCE_SUFFIX;
      fullPrompt += `\nThis is page ${pageNumber || "N"}. Match the anchor/reference image style EXACTLY.`;
    }

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
          ? `${fullPrompt}${buildStricterSuffix()}\n\nSTRICT: Eyes must be OUTLINED only with TINY dot pupils. No solid black eyes!`
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
      isAnchor: isAnchorGeneration || false,
      pageNumber: pageNumber || 1,
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
