import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { buildFinalPrompt, simplifyScenePrompt } from "@/lib/styleContract";
import { processAndValidateImage, checkCharacterMatch, fetchImageAsBase64 } from "@/lib/imageProcessor";
import type { CharacterType, Complexity, LineThickness } from "@/lib/generationSpec";
import { themePackSchema } from "@/lib/themePack";

// Request schema - client sends scenePrompt, NOT final prompt
const requestSchema = z.object({
  // Scene content (user-editable)
  scenePrompt: z.string().min(1),
  pageNumber: z.number().int().min(1),
  
  // Project settings
  bookMode: z.enum(["series", "collection"]),
  characterType: z.enum(["cat", "dog", "bunny", "bear", "panda", "unicorn", "dragon", "custom"]).optional().nullable(),
  characterName: z.string().optional().nullable(),
  complexity: z.enum(["simple", "medium", "detailed"]),
  lineThickness: z.enum(["thin", "medium", "bold"]),
  trimSize: z.string(),
  
  // ThemePack for consistent styling
  themePack: themePackSchema.optional().nullable(),
  
  // Anchor reference
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

const TRIM_TO_PIXELS: Record<string, string> = {
  "8.5×11": "1024x1326",
  "8.5x11": "1024x1326",
  "8×10": "1024x1280",
  "8x10": "1024x1280",
  "6×9": "1024x1536",
  "6x9": "1024x1536",
  "A4": "1024x1448",
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
      scenePrompt,
      pageNumber,
      bookMode,
      characterType,
      characterName,
      complexity,
      lineThickness,
      trimSize,
      themePack,
      anchorImageUrl,
      anchorImageBase64,
      isAnchorGeneration,
    } = parseResult.data;

    // For non-anchor pages in series mode, anchor should exist
    const hasAnchor = !!(anchorImageUrl || anchorImageBase64);
    if (!isAnchorGeneration && bookMode === "series" && !hasAnchor && pageNumber > 1) {
      return NextResponse.json(
        { error: "Anchor image required for series mode. Generate and approve Page 1 first." },
        { status: 400 }
      );
    }

    // Get pixel size for image generation
    const pixelSize = TRIM_TO_PIXELS[trimSize] || "1024x1326";
    const imageSize = SIZE_MAP[pixelSize] || "1024x1792";

    // Fetch anchor as base64 if needed
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
    let lastError: string = "Unknown error";
    let currentScenePrompt = scenePrompt;
    let currentComplexity = complexity;

    console.log(`[Page ${pageNumber}] Starting image generation...`);

    while (retryCount <= MAX_RETRIES) {
      // Smart retry: simplify on attempt 2+
      if (retryCount >= 2) {
        currentScenePrompt = simplifyScenePrompt(scenePrompt);
        // Downgrade complexity for difficult pages
        if (currentComplexity === "detailed") currentComplexity = "medium";
        else if (currentComplexity === "medium") currentComplexity = "simple";
      }

      // BUILD FINAL PROMPT SERVER-SIDE (style contract + theme pack always applied)
      const finalPrompt = buildFinalPrompt({
        scenePrompt: currentScenePrompt,
        themePack: themePack || undefined,
        bookMode,
        characterType: characterType as CharacterType || undefined,
        characterName: characterName || undefined,
        complexity: currentComplexity as Complexity,
        lineThickness: lineThickness as LineThickness,
        hasAnchor,
        isAnchorGeneration,
        retryAttempt: retryCount,
      });

      console.log(`[Page ${pageNumber}] Attempt ${retryCount + 1}/${MAX_RETRIES + 1}`);

      try {
        // Generate image with DALL-E 3
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: finalPrompt,
          n: 1,
          size: imageSize,
          quality: "hd",
          style: "natural",
        });

        const rawImageUrl = response.data?.[0]?.url;
        if (!rawImageUrl) {
          lastError = "No image URL in OpenAI response";
          throw new Error(lastError);
        }

        console.log(`[Page ${pageNumber}] Got image URL, processing...`);

        // === MANDATORY POST-PROCESSING (binarization to B/W) ===
        const processResult = await processAndValidateImage(rawImageUrl);

        // If we have a binarized image, use it (even with warnings)
        if (processResult.binarizedBase64) {
          console.log(`[Page ${pageNumber}] Image processed successfully! BlackRatio: ${processResult.blackRatio}`);
          
          // Skip character match check for now - it adds latency and often fails
          // Users can manually regenerate if character doesn't match
          
          // Success!
          finalImageUrl = rawImageUrl;
          finalImageBase64 = processResult.binarizedBase64;
          break;
        }
        
        // Processing failed - retry
        lastError = processResult.details || "Image processing failed";
        console.log(`[Page ${pageNumber}] Processing failed: ${lastError}`);
        retryCount++;
        
        if (retryCount <= MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

      } catch (genError) {
        const errorMsg = genError instanceof Error ? genError.message : "Unknown generation error";
        console.error(`[Page ${pageNumber}] Generation error:`, errorMsg);
        
        if (errorMsg.includes("content_policy")) {
          return NextResponse.json(
            { error: "Content policy violation. Please modify the scene idea." },
            { status: 400 }
          );
        }
        
        if (errorMsg.includes("rate_limit")) {
          return NextResponse.json(
            { error: "Rate limit exceeded. Please wait a moment and try again." },
            { status: 429 }
          );
        }

        lastError = errorMsg;
        retryCount++;
        
        if (retryCount <= MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 2000)); // Wait longer on API errors
          continue;
        }
      }
    }

    if (!finalImageBase64) {
      console.error(`[Page ${pageNumber}] All ${MAX_RETRIES + 1} attempts failed. Last error: ${lastError}`);
      return NextResponse.json({
        error: `Failed to generate image: ${lastError}`,
        failedPrintSafe: true,
        suggestion: "Try simplifying the scene description or try again in a moment.",
        scenePrompt: currentScenePrompt,
      }, { status: 500 });
    }

    // Return binarized image
    return NextResponse.json({
      imageUrl: finalImageUrl,
      imageBase64: finalImageBase64,
      binarized: true,
      retries: retryCount,
      isAnchor: isAnchorGeneration || false,
      pageNumber,
    });

  } catch (error) {
    console.error("Generate page image error:", error);

    if (error instanceof Error && error.message.includes("rate_limit")) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate image" },
      { status: 500 }
    );
  }
}

/**
 * Get helpful suggestion for quality failures
 */
function getSuggestionForFailure(reason?: "color" | "species" | "blackfill"): string {
  switch (reason) {
    case "blackfill":
      return "The image has too much solid black. Try: remove dark objects, simplify the scene, or specify 'eyes outlined only'.";
    case "species":
      return "The character doesn't match the selected species. Try regenerating or simplifying the scene.";
    case "color":
    default:
      return "Try regenerating the image or simplifying the scene description.";
  }
}
