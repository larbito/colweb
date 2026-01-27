import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { 
  buildStyleClonePrompt, 
  buildStricterStyleCloneSuffix 
} from "@/lib/styleClonePromptBuilder";
import { 
  BLACK_RATIO_THRESHOLDS, 
  KDP_SIZE_PRESETS,
  type StyleContract, 
  type ThemePack,
  type StyleCloneDebugInfo,
} from "@/lib/styleClone";
import type { Complexity, LineThickness, GenerationSpec } from "@/lib/generationSpec";
import { processImageWithSharp } from "@/lib/imageProcessor";
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
  themePack: themePackSchema.nullable(),
  styleContract: styleContractSchema.nullable(),
  complexity: z.enum(["simple", "medium", "detailed"]),
  lineThickness: z.enum(["thin", "medium", "bold"]),
  sizePreset: z.string(),
  referenceImageBase64: z.string().optional(),
});

// Image size mapping for DALL-E 3
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
    } = parseResult.data;

    // Get pixel size from preset
    const preset = KDP_SIZE_PRESETS[sizePreset] || KDP_SIZE_PRESETS["8.5x11"];
    const pixelSize = preset.pixels;

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

    // Build the complete prompt
    const fullPrompt = buildStyleClonePrompt({
      scenePrompt,
      themePack: themePack as ThemePack | null,
      styleContract: styleContract as StyleContract | null,
      spec,
      isAnchor: true,
    });

    const promptHash = crypto.createHash("md5").update(fullPrompt).digest("hex").substring(0, 8);
    const dalleSize = DALLE_SIZE_MAP[pixelSize] || "1024x1792";

    // Quality thresholds
    const maxBlackRatio = BLACK_RATIO_THRESHOLDS[complexity as Complexity];

    let imageUrl: string | undefined;
    let imageBase64: string | undefined;
    let retryCount = 0;
    const maxRetries = 3;
    let lastFailureReason: string | undefined;
    let finalBlackRatio: number | undefined;

    while (retryCount < maxRetries) {
      try {
        // Add stricter suffix on retries
        const attemptPrompt = retryCount > 0 
          ? `${fullPrompt}${buildStricterStyleCloneSuffix(lastFailureReason || "Too much black")}`
          : fullPrompt;

        // Generate with DALL-E 3 (newest available OpenAI image model)
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: attemptPrompt,
          n: 1,
          size: dalleSize,
          quality: "hd",
          style: "natural",
        });

        imageUrl = response.data?.[0]?.url;

        if (imageUrl) {
          // Fetch and process the image for quality checks
          try {
            const imageResponse = await fetch(imageUrl);
            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
            
            // Process with sharp for quality checks
            const processed = await processImageWithSharp(imageBuffer, {
              binarizationThreshold: 220,
              maxBlackRatio,
              minRunLength: 50,
              maxLongRuns: 30,
            });

            finalBlackRatio = processed.blackRatio;

            if (processed.passed) {
              // Image passed quality checks
              imageBase64 = processed.base64;
              break;
            } else {
              // Image failed quality checks
              lastFailureReason = processed.failureReason || "Quality check failed";
              console.log(`[StyleClone] Sample attempt ${retryCount + 1} failed: ${lastFailureReason}`);
            }
          } catch (processError) {
            // Processing failed, but we have the image - use it anyway
            console.warn("Image processing failed, using original:", processError);
            const imageResponse = await fetch(imageUrl);
            imageBase64 = Buffer.from(await imageResponse.arrayBuffer()).toString("base64");
            break;
          }
        }
      } catch (genError) {
        console.error(`Sample generation attempt ${retryCount + 1} failed:`, genError);
        lastFailureReason = genError instanceof Error ? genError.message : "Generation failed";

        if (genError instanceof Error && genError.message.includes("content_policy")) {
          return NextResponse.json(
            { error: "Content policy violation. Please modify the prompt." },
            { status: 400 }
          );
        }
      }

      retryCount++;
      if (retryCount < maxRetries) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    // Build debug info
    const debugInfo: StyleCloneDebugInfo = {
      provider: "openai",
      imageModel: "dall-e-3",
      textModel: "gpt-4o",
      size: dalleSize,
      promptHash,
      promptPreview: fullPrompt.substring(0, 500) + "...",
      finalPrompt: fullPrompt,
      negativePrompt: styleContract?.forbiddenList?.join(", ") || "",
      thresholds: {
        blackRatio: finalBlackRatio || 0,
        maxBlackRatio,
        blobThreshold: 0.015,
      },
      blackRatio: finalBlackRatio,
      retries: retryCount,
      failureReason: !imageBase64 && !imageUrl ? lastFailureReason : undefined,
    };

    if (!imageUrl && !imageBase64) {
      return NextResponse.json(
        { 
          error: lastFailureReason || "Failed to generate sample after multiple attempts",
          failedPrintSafe: true,
          debug: debugInfo,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageUrl,
      imageBase64,
      passedGates: !!imageBase64,
      debug: debugInfo,
    });
  } catch (error) {
    console.error("Generate sample error:", error);

    if (error instanceof Error) {
      if (error.message.includes("rate_limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please wait and try again." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate sample" },
      { status: 500 }
    );
  }
}

