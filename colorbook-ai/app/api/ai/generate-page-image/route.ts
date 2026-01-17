import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured, IMAGE_MODEL, TEXT_MODEL, logModelUsage } from "@/lib/openai";
import { z } from "zod";
import { buildFinalPrompt, simplifyScenePrompt } from "@/lib/styleContract";
import { processAndValidateImage, fetchImageAsBase64 } from "@/lib/imageProcessor";
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

// Image sizes - all portrait for coloring books
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
  const startTime = Date.now();
  
  // Debug info to return
  const debugInfo: Record<string, unknown> = {
    provider: "openai",
    imageModel: IMAGE_MODEL,
    textModel: TEXT_MODEL,
    endpoint: "/api/ai/generate-page-image",
  };

  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured.", debug: debugInfo },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      console.error("Validation error:", JSON.stringify(parseResult.error.flatten(), null, 2));
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten(), debug: debugInfo },
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

    // Update debug info
    debugInfo.scenePrompt = scenePrompt;
    debugInfo.pageNumber = pageNumber;
    debugInfo.bookMode = bookMode;
    debugInfo.complexity = complexity;
    debugInfo.lineThickness = lineThickness;

    // For non-anchor pages in series mode, anchor should exist
    const hasAnchor = !!(anchorImageUrl || anchorImageBase64);
    if (!isAnchorGeneration && bookMode === "series" && !hasAnchor && pageNumber > 1) {
      return NextResponse.json(
        { error: "Anchor image required for series mode. Generate and approve Page 1 first.", debug: debugInfo },
        { status: 400 }
      );
    }

    // Get pixel size for image generation
    const pixelSize = TRIM_TO_PIXELS[trimSize] || "1024x1326";
    const imageSize = SIZE_MAP[pixelSize] || "1024x1792";
    debugInfo.size = imageSize;
    debugInfo.quality = "hd";
    debugInfo.style = "natural";

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
    let lastFailureReason: string | undefined;
    let currentScenePrompt = scenePrompt;
    let currentComplexity = complexity;
    let finalPrompt = "";
    let blackRatio: number | undefined;
    let largestBlobPercent: number | undefined;

    console.log(`[Page ${pageNumber}] Starting image generation...`);
    console.log(`[Page ${pageNumber}] imageModel=${IMAGE_MODEL}, textModel=${TEXT_MODEL}`);
    logModelUsage(`Page ${pageNumber} image`, "image", IMAGE_MODEL);

    while (retryCount <= MAX_RETRIES) {
      // Smart retry: simplify on attempt 2+
      if (retryCount >= 1) {
        currentScenePrompt = simplifyScenePrompt(scenePrompt);
        console.log(`[Page ${pageNumber}] Retry ${retryCount}: simplified scene`);
      }
      if (retryCount >= 2) {
        // Downgrade complexity for difficult pages
        if (currentComplexity === "detailed") currentComplexity = "medium";
        else if (currentComplexity === "medium") currentComplexity = "simple";
        console.log(`[Page ${pageNumber}] Retry ${retryCount}: reduced complexity to ${currentComplexity}`);
      }

      // BUILD FINAL PROMPT SERVER-SIDE (style contract + theme pack always applied)
      finalPrompt = buildFinalPrompt({
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

      // Update debug info with prompt
      debugInfo.finalPromptLength = finalPrompt.length;
      debugInfo.finalPromptPreview = finalPrompt.slice(0, 500);

      console.log(`[Page ${pageNumber}] Attempt ${retryCount + 1}/${MAX_RETRIES + 1}, prompt length: ${finalPrompt.length}`);

      try {
        // Generate image with DALL-E 3 (the IMAGE model, not text model)
        const response = await openai.images.generate({
          model: IMAGE_MODEL,
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

        console.log(`[Page ${pageNumber}] Got image URL, processing with quality gates...`);

        // === MANDATORY POST-PROCESSING + QUALITY GATES ===
        const processResult = await processAndValidateImage(rawImageUrl);
        
        // Store metrics for debug
        blackRatio = processResult.blackRatio;
        largestBlobPercent = processResult.largestBlobPercent;
        debugInfo.binarized = true;
        debugInfo.blackRatio = blackRatio;
        debugInfo.largestBlobPercent = largestBlobPercent;

        // If we have a binarized image and it passed all gates
        if (processResult.passed && processResult.binarizedBase64) {
          console.log(`[Page ${pageNumber}] PASSED all quality gates!`);
          console.log(`[Page ${pageNumber}] - Black ratio: ${((processResult.blackRatio || 0) * 100).toFixed(1)}%`);
          console.log(`[Page ${pageNumber}] - Largest blob: ${((processResult.largestBlobPercent || 0) * 100).toFixed(2)}%`);
          
          finalImageUrl = rawImageUrl;
          finalImageBase64 = processResult.binarizedBase64;
          break;
        }
        
        // Quality gate failed
        lastError = processResult.details || "Quality check failed";
        lastFailureReason = processResult.failureReason;
        debugInfo.failureReason = lastFailureReason;
        console.log(`[Page ${pageNumber}] FAILED quality gate: ${lastError}`);
        
        retryCount++;
        if (retryCount <= MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }

      } catch (genError) {
        const errorMsg = genError instanceof Error ? genError.message : "Unknown generation error";
        console.error(`[Page ${pageNumber}] Generation error:`, errorMsg);
        
        if (errorMsg.includes("content_policy")) {
          debugInfo.failureReason = "content_policy";
          return NextResponse.json(
            { error: "Content policy violation. Please modify the scene idea.", debug: debugInfo },
            { status: 400 }
          );
        }
        
        if (errorMsg.includes("rate_limit")) {
          debugInfo.failureReason = "rate_limit";
          return NextResponse.json(
            { error: "Rate limit exceeded. Please wait a moment and try again.", debug: debugInfo },
            { status: 429 }
          );
        }

        lastError = errorMsg;
        retryCount++;
        
        if (retryCount <= MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
      }
    }

    // Calculate duration
    const durationMs = Date.now() - startTime;
    debugInfo.durationMs = durationMs;
    debugInfo.retryCount = retryCount;

    if (!finalImageBase64) {
      console.error(`[Page ${pageNumber}] All ${MAX_RETRIES + 1} attempts failed. Last error: ${lastError}`);
      
      // Provide helpful error message based on failure reason
      let suggestion = "Try simplifying the scene description.";
      if (lastFailureReason === "blackfill") {
        suggestion = "The image had too much solid black. Try removing dark objects or simplifying the scene.";
      } else if (lastFailureReason === "silhouette") {
        suggestion = "A silhouette/large filled area was detected. Try removing filled objects like solid hats or clothing.";
      }
      
      return NextResponse.json({
        error: `Failed to generate valid image: ${lastError}`,
        failedPrintSafe: true,
        failureReason: lastFailureReason,
        suggestion,
        scenePrompt: currentScenePrompt,
        debug: debugInfo,
      }, { status: 500 });
    }

    // Return binarized image with debug info
    return NextResponse.json({
      imageUrl: finalImageUrl,
      imageBase64: finalImageBase64,
      binarized: true,
      retries: retryCount,
      isAnchor: isAnchorGeneration || false,
      pageNumber,
      debug: {
        ...debugInfo,
        blackRatio,
        largestBlobPercent,
        durationMs,
        retryCount,
      },
    });

  } catch (error) {
    console.error("Generate page image error:", error);
    debugInfo.failureReason = error instanceof Error ? error.message : "Unknown error";

    if (error instanceof Error && error.message.includes("rate_limit")) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait and try again.", debug: debugInfo },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate image", debug: debugInfo },
      { status: 500 }
    );
  }
}
