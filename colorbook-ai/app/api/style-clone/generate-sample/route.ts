import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { 
  buildFinalImagePrompt,
  buildCharacterBible,
} from "@/lib/styleClonePromptBuilder";
import { validateImageQuality, getQualityThresholds } from "@/lib/qualityGates";
import { 
  KDP_SIZE_PRESETS,
  type StyleContract, 
  type ThemePack,
} from "@/lib/styleClone";
import type { Complexity, LineThickness, GenerationSpec } from "@/lib/generationSpec";
import crypto from "crypto";

const styleContractSchema = z.object({
  styleSummary: z.string(),
  styleContractText: z.string(),
  forbiddenList: z.array(z.string()),
  recommendedLineThickness: z.enum(["thin", "medium", "bold"]),
  recommendedComplexity: z.enum(["simple", "medium", "detailed"]),
  outlineRules: z.string(),
  backgroundRules: z.string(),
  compositionRules: z.string(),
  eyeRules: z.string(),
  extractedThemeGuess: z.string().optional(),
});

const themePackSchema = z.object({
  setting: z.string(),
  recurringProps: z.array(z.string()),
  motifs: z.array(z.string()),
  allowedSubjects: z.array(z.string()),
  forbiddenElements: z.array(z.string()),
  characterName: z.string().optional(),
  characterDescription: z.string().optional(),
});

const requestSchema = z.object({
  scenePrompt: z.string().min(1),
  themePack: themePackSchema.nullable().optional(),
  styleContract: styleContractSchema.nullable().optional(),
  complexity: z.enum(["simple", "medium", "detailed"]),
  lineThickness: z.enum(["thin", "medium", "bold"]),
  sizePreset: z.string(),
  mode: z.enum(["series", "collection"]).optional(),
  characterName: z.string().optional(),
  characterDescription: z.string().optional(),
  referenceImageBase64: z.string().optional(),
});

// DALL-E 3 size mapping
const DALLE_SIZE_MAP: Record<string, "1024x1792" | "1024x1024" | "1792x1024"> = {
  "1024x1326": "1024x1792",
  "1024x1280": "1024x1792",
  "1024x1536": "1024x1792",
  "1024x1448": "1024x1792",
  "1024x1024": "1024x1024",
};

export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured." },
      { status: 503 }
    );
  }

  const requestId = crypto.randomUUID();
  console.log(`[StyleClone:GenerateSample] Request ${requestId} started`);

  try {
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { 
      scenePrompt, 
      themePack, 
      styleContract, 
      complexity, 
      lineThickness, 
      sizePreset,
      mode,
      characterName,
      characterDescription,
    } = parseResult.data;

    // Get pixel size from preset
    const preset = KDP_SIZE_PRESETS[sizePreset] || KDP_SIZE_PRESETS["8.5x11"];
    const pixelSize = preset.pixels;
    const dalleSize = DALLE_SIZE_MAP[pixelSize] || "1024x1792";

    // Build GenerationSpec
    const spec: GenerationSpec = {
      trimSize: sizePreset,
      pixelSize,
      complexity: complexity as Complexity,
      lineThickness: lineThickness as LineThickness,
      pageCount: 1,
      includeBlankBetween: false,
      includeBelongsTo: false,
      includePageNumbers: false,
      includeCopyrightPage: false,
      stylePreset: "kids-kdp",
    };

    // Build character bible for Series mode
    let characterBible = "";
    if (mode === "series" && characterName && styleContract) {
      characterBible = buildCharacterBible({
        characterName,
        characterDescription,
        styleContract: styleContract as StyleContract,
      });
    }

    // Quality thresholds
    const thresholds = getQualityThresholds(complexity as Complexity);

    let imageUrl: string | undefined;
    let imageBase64: string | undefined;
    let retryCount = 0;
    const maxRetries = 3;
    let lastFailureReason: string | undefined;
    let lastQualityMetrics: Record<string, unknown> | undefined;
    let finalPromptUsed = "";

    while (retryCount < maxRetries) {
      try {
        // Build the COMPLETE final prompt
        const fullPrompt = buildFinalImagePrompt({
          scenePrompt,
          themePack: themePack as ThemePack | null,
          styleContract: styleContract as StyleContract | null,
          characterBible,
          spec,
          isAnchor: true,
          retryAttempt: retryCount,
        });

        finalPromptUsed = fullPrompt;
        const promptHash = crypto.createHash("md5").update(fullPrompt).digest("hex").substring(0, 8);

        console.log(`[StyleClone:GenerateSample] Attempt ${retryCount + 1}/${maxRetries}, prompt hash: ${promptHash}`);

        // Generate with DALL-E 3
        // Note: Using DALL-E 3 as it's the current best option for line art
        // The strict prompt should enforce black/white output
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: fullPrompt,
          n: 1,
          size: dalleSize,
          quality: "hd",
          style: "natural", // Natural style tends to follow instructions better
        });

        imageUrl = response.data?.[0]?.url;

        if (!imageUrl) {
          lastFailureReason = "No image URL returned from API";
          retryCount++;
          continue;
        }

        // Fetch the generated image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          lastFailureReason = "Failed to fetch generated image";
          retryCount++;
          continue;
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        // Run strict quality gates
        const qualityResult = await validateImageQuality(imageBuffer, complexity as Complexity);
        lastQualityMetrics = {
          ...qualityResult.metrics,
          ...qualityResult.debug,
        };

        // Log if color correction was needed
        if (qualityResult.metrics.wasColorCorrected) {
          console.log(`[StyleClone:GenerateSample] DALL-E returned colored image - force-converted to B&W`);
        }

        if (qualityResult.passed && qualityResult.correctedImageBuffer) {
          // Image passed all quality gates AFTER B&W conversion
          // Use the corrected (pure B&W) buffer
          imageBase64 = qualityResult.correctedImageBuffer.toString("base64");
          
          console.log(`[StyleClone:GenerateSample] Quality gates PASSED on attempt ${retryCount + 1} (black ratio: ${(qualityResult.metrics.blackRatio * 100).toFixed(1)}%)`);
          break;
        } else {
          // Image failed quality gates even after conversion
          lastFailureReason = qualityResult.failureReason;
          console.log(`[StyleClone:GenerateSample] Quality gates FAILED: ${lastFailureReason}`);
        }

      } catch (genError) {
        console.error(`[StyleClone:GenerateSample] Generation error on attempt ${retryCount + 1}:`, genError);
        lastFailureReason = genError instanceof Error ? genError.message : "Generation failed";

        if (genError instanceof Error && genError.message.includes("content_policy")) {
          return NextResponse.json(
            { 
              error: "Content policy violation. Please modify the scene prompt.",
              requestId,
            },
            { status: 400 }
          );
        }
      }

      retryCount++;
      if (retryCount < maxRetries) {
        // Wait before retry
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // Build comprehensive debug info
    const debugInfo = {
      requestId,
      provider: "openai",
      imageModel: "dall-e-3",
      textModel: "gpt-4o", // Latest stable text model for prompt generation
      size: dalleSize,
      complexity,
      lineThickness,
      thresholds,
      qualityMetrics: lastQualityMetrics,
      retries: retryCount,
      finalPromptPreview: finalPromptUsed.substring(0, 1000) + "...",
      finalPromptFull: finalPromptUsed,
      promptLength: finalPromptUsed.length,
      conditioningImages: {
        referenceIncluded: false, // DALL-E 3 doesn't support reference images directly
        anchorIncluded: false,
      },
      colorCorrectionApplied: lastQualityMetrics?.wasColorCorrected || false,
      failureReason: !imageBase64 ? lastFailureReason : undefined,
    };

    // If we never got a valid image, return failure
    if (!imageBase64) {
      console.log(`[StyleClone:GenerateSample] All attempts failed. Last reason: ${lastFailureReason}`);
      return NextResponse.json(
        { 
          error: `Failed print-safe check after ${maxRetries} attempts: ${lastFailureReason}`,
          failedPrintSafe: true,
          debug: debugInfo,
          requestId,
        },
        { status: 422 } // Unprocessable Entity - the request was valid but we couldn't produce valid output
      );
    }

    console.log(`[StyleClone:GenerateSample] Success after ${retryCount + 1} attempts`);

    return NextResponse.json({
      imageUrl,
      imageBase64,
      passedGates: true,
      debug: debugInfo,
      requestId,
    });

  } catch (error) {
    console.error(`[StyleClone:GenerateSample] Unexpected error:`, error);

    if (error instanceof Error) {
      if (error.message.includes("rate_limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please wait and try again.", requestId },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate sample", requestId },
      { status: 500 }
    );
  }
}
