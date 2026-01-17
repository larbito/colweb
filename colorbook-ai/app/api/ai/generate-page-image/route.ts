import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { characterLockSchema } from "@/lib/schemas";
import { buildImagePrompt, buildStricterSuffix, buildNegativePrompt } from "@/lib/promptBuilder";
import { processAndValidateImage, checkCharacterMatch, fetchImageAsBase64 } from "@/lib/imageProcessor";
import type { GenerationSpec, CharacterType } from "@/lib/generationSpec";

// GenerationSpec schema
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
  characterType: z.enum(["cat", "dog", "bunny", "bear", "panda", "unicorn", "dragon", "custom"]).optional().nullable(),
  characterName: z.string().optional().nullable(),
  spec: generationSpecSchema,
  // Anchor-first workflow - REQUIRED for non-anchor pages
  anchorImageUrl: z.string().optional().nullable(),
  anchorImageBase64: z.string().optional().nullable(),
  isAnchorGeneration: z.boolean().optional(),
});

export type GeneratePageImageRequest = z.infer<typeof requestSchema>;

// Image sizes - all portrait
const SIZE_MAP: Record<string, "1024x1792" | "1024x1024" | "1792x1024"> = {
  "1024x1326": "1024x1792",
  "1024x1280": "1024x1792",
  "1024x1536": "1024x1792",
  "1024x1448": "1024x1792",
};

const MAX_RETRIES = 2;

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
      pageNumber = 1,
      characterLock, 
      characterType,
      characterName,
      spec, 
      anchorImageUrl,
      anchorImageBase64,
      isAnchorGeneration,
    } = parseResult.data;

    // For non-anchor pages in series mode, require anchor
    const hasAnchor = !!(anchorImageUrl || anchorImageBase64);
    if (!isAnchorGeneration && spec.bookMode === "series" && !hasAnchor) {
      return NextResponse.json(
        { error: "Anchor image required for series mode. Generate and approve Page 1 first." },
        { status: 400 }
      );
    }

    // Build the prompt using the canonical builder
    let fullPrompt = buildImagePrompt({
      sceneDescription: prompt,
      characterType: characterType as CharacterType || undefined,
      characterName: characterName || undefined,
      characterLock,
      spec: spec as GenerationSpec,
      hasAnchor,
      isAnchorGeneration,
    });

    // Get image size (always portrait)
    const imageSize = SIZE_MAP[spec.pixelSize] || "1024x1792";

    // Fetch anchor as base64 if needed for character matching later
    let anchorBase64 = anchorImageBase64;
    if (anchorImageUrl && !anchorBase64) {
      try {
        anchorBase64 = await fetchImageAsBase64(anchorImageUrl);
      } catch (e) {
        console.warn("Could not fetch anchor image:", e);
      }
    }

    let finalImageUrl: string | undefined;
    let finalImageBase64: string | undefined;
    let retryCount = 0;
    let lastFailureReason: "color" | "species" | "blackfill" | undefined;

    while (retryCount <= MAX_RETRIES) {
      try {
        // Add stricter suffix on retries
        const attemptPrompt = retryCount > 0 && lastFailureReason
          ? `${fullPrompt}${buildStricterSuffix(lastFailureReason)}`
          : fullPrompt;

        // Generate image with DALL-E 3
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: attemptPrompt,
          n: 1,
          size: imageSize,
          quality: "hd",
          style: "natural",
        });

        const rawImageUrl = response.data?.[0]?.url;
        if (!rawImageUrl) {
          throw new Error("No image URL in response");
        }

        // === MANDATORY POST-PROCESSING ===
        // Step 1: Binarize and validate
        const processResult = await processAndValidateImage(rawImageUrl);

        if (!processResult.passed) {
          console.log(`Image failed quality check (attempt ${retryCount + 1}):`, processResult.details);
          lastFailureReason = processResult.failureReason;
          retryCount++;
          
          if (retryCount <= MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }
          
          // Max retries exceeded
          return NextResponse.json({
            error: "Image failed quality check after multiple attempts",
            failedPrintSafe: true,
            failureReason: processResult.failureReason,
            details: processResult.details,
          }, { status: 422 });
        }

        // Step 2: Character match check (for series mode, non-anchor pages)
        if (spec.bookMode === "series" && !isAnchorGeneration && anchorBase64 && characterType) {
          const matchResult = await checkCharacterMatch(
            anchorBase64,
            processResult.binarizedBase64!,
            characterType,
            process.env.OPENAI_API_KEY || ""
          );

          if (!matchResult.sameSpecies) {
            console.log(`Character species mismatch (attempt ${retryCount + 1}):`, matchResult.notes);
            lastFailureReason = "species";
            retryCount++;
            
            if (retryCount <= MAX_RETRIES) {
              await new Promise(r => setTimeout(r, 1500));
              continue;
            }
            
            // Max retries exceeded
            return NextResponse.json({
              error: "Character species mismatch after multiple attempts",
              failedPrintSafe: true,
              failureReason: "species",
              details: matchResult.notes,
            }, { status: 422 });
          }
        }

        // All checks passed!
        finalImageUrl = rawImageUrl;
        finalImageBase64 = processResult.binarizedBase64;
        break;

      } catch (genError) {
        console.error(`Image generation attempt ${retryCount + 1} failed:`, genError);
        
        if (genError instanceof Error && genError.message.includes("content_policy")) {
          return NextResponse.json(
            { error: "Content policy violation. Please modify the prompt." },
            { status: 400 }
          );
        }

        retryCount++;
        if (retryCount <= MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    }

    if (!finalImageBase64) {
      return NextResponse.json({
        error: "Failed to generate valid image after multiple attempts",
        failedPrintSafe: true,
      }, { status: 500 });
    }

    // Return the BINARIZED image (guaranteed B/W)
    return NextResponse.json({
      // Return both URL (for display) and base64 (for storage/processing)
      imageUrl: finalImageUrl,
      imageBase64: finalImageBase64,
      binarized: true,
      retries: retryCount,
      isAnchor: isAnchorGeneration || false,
      pageNumber,
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
