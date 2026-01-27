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
  pageIndex: z.number().int().min(1),
  scenePrompt: z.string().min(1),
  themePack: themePackSchema.nullable().optional(),
  styleContract: styleContractSchema.nullable().optional(),
  complexity: z.enum(["simple", "medium", "detailed"]),
  lineThickness: z.enum(["thin", "medium", "bold"]),
  sizePreset: z.string(),
  mode: z.enum(["series", "collection"]).optional(),
  characterName: z.string().optional(),
  characterDescription: z.string().optional(),
  anchorImageBase64: z.string().optional(),
});

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
      pageIndex,
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

    const preset = KDP_SIZE_PRESETS[sizePreset] || KDP_SIZE_PRESETS["8.5x11"];
    const pixelSize = preset.pixels;
    const dalleSize = DALLE_SIZE_MAP[pixelSize] || "1024x1792";

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
        const fullPrompt = buildFinalImagePrompt({
          scenePrompt,
          themePack: themePack as ThemePack | null,
          styleContract: styleContract as StyleContract | null,
          characterBible,
          spec,
          isAnchor: false,
          retryAttempt: retryCount,
        });

        finalPromptUsed = fullPrompt;

        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: fullPrompt,
          n: 1,
          size: dalleSize,
          quality: "hd",
          style: "natural",
        });

        imageUrl = response.data?.[0]?.url;

        if (!imageUrl) {
          lastFailureReason = "No image URL returned";
          retryCount++;
          continue;
        }

        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          lastFailureReason = "Failed to fetch generated image";
          retryCount++;
          continue;
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        // Run quality gates (this also force-converts to B&W)
        const qualityResult = await validateImageQuality(imageBuffer, complexity as Complexity);
        lastQualityMetrics = {
          ...qualityResult.metrics,
          ...qualityResult.debug,
        };

        if (qualityResult.passed && qualityResult.correctedImageBuffer) {
          // Use the corrected (pure B&W) buffer
          imageBase64 = qualityResult.correctedImageBuffer.toString("base64");
          break;
        } else {
          lastFailureReason = qualityResult.failureReason;
        }

      } catch (genError) {
        lastFailureReason = genError instanceof Error ? genError.message : "Generation failed";

        if (genError instanceof Error && genError.message.includes("content_policy")) {
          return NextResponse.json(
            { error: "Content policy violation. Please modify the prompt.", pageIndex, requestId },
            { status: 400 }
          );
        }
      }

      retryCount++;
      if (retryCount < maxRetries) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    const debugInfo = {
      requestId,
      pageIndex,
      provider: "openai",
      imageModel: "dall-e-3",
      textModel: "gpt-4.1",
      size: dalleSize,
      complexity,
      lineThickness,
      thresholds,
      qualityMetrics: lastQualityMetrics,
      retries: retryCount,
      finalPromptPreview: finalPromptUsed.substring(0, 500) + "...",
      finalPromptFull: finalPromptUsed,
      colorCorrectionApplied: lastQualityMetrics?.wasColorCorrected || false,
      failureReason: !imageBase64 ? lastFailureReason : undefined,
    };

    if (!imageBase64) {
      return NextResponse.json(
        { 
          error: `Failed print-safe check: ${lastFailureReason}`,
          failedPrintSafe: true,
          pageIndex,
          debug: debugInfo,
          requestId,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      pageIndex,
      imageUrl,
      imageBase64,
      passedGates: true,
      debug: debugInfo,
      requestId,
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes("rate_limit")) {
      return NextResponse.json(
        { error: "Rate limit exceeded.", requestId },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate page", requestId },
      { status: 500 }
    );
  }
}
