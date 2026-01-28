import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateImage, isOpenAIImageGenConfigured } from "@/lib/services/openaiImageGen";
import { buildFinalImagePrompt, buildCharacterBible } from "@/lib/styleClonePromptBuilder";
import { validateImageQuality, getQualityThresholds } from "@/lib/qualityGates";
import { KDP_SIZE_PRESETS, type StyleContract, type ThemePack } from "@/lib/styleClone";
import type { Complexity, LineThickness, GenerationSpec } from "@/lib/generationSpec";
import crypto from "crypto";

/**
 * Generate or regenerate a single page
 */

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
}).nullable().optional();

const themePackSchema = z.object({
  setting: z.string(),
  recurringProps: z.array(z.string()),
  motifs: z.array(z.string()),
  allowedSubjects: z.array(z.string()),
  forbiddenElements: z.array(z.string()),
  characterName: z.string().optional(),
  characterDescription: z.string().optional(),
}).nullable().optional();

const requestSchema = z.object({
  pageIndex: z.number().int().min(1),
  scenePrompt: z.string().min(1),
  themePack: themePackSchema,
  styleContract: styleContractSchema,
  complexity: z.enum(["simple", "medium", "detailed"]),
  lineThickness: z.enum(["thin", "medium", "bold"]),
  sizePreset: z.string(),
  mode: z.enum(["series", "collection"]).optional(),
  characterName: z.string().optional(),
  characterDescription: z.string().optional(),
  anchorImageBase64: z.string().optional(), // For future conditioning support
});

const DALLE_SIZE_MAP: Record<string, "1024x1792" | "1024x1024" | "1792x1024"> = {
  "1024x1326": "1024x1792",
  "1024x1280": "1024x1792",
  "1024x1536": "1024x1792",
  "1024x1448": "1024x1792",
  "1024x1024": "1024x1024",
};

export async function POST(request: NextRequest) {
  if (!isOpenAIImageGenConfigured()) {
    return NextResponse.json({ error: "OpenAI not configured" }, { status: 503 });
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

    const { pageIndex, scenePrompt, themePack, styleContract, complexity, lineThickness, sizePreset, mode, characterName, characterDescription } = parseResult.data;

    const preset = KDP_SIZE_PRESETS[sizePreset] || KDP_SIZE_PRESETS["8.5x11"];
    const dalleSize = DALLE_SIZE_MAP[preset.pixels] || "1024x1792";

    const spec: GenerationSpec = {
      trimSize: sizePreset,
      pixelSize: preset.pixels,
      complexity: complexity as Complexity,
      lineThickness: lineThickness as LineThickness,
      pageCount: 1,
      includeBlankBetween: false,
      includeBelongsTo: false,
      includePageNumbers: false,
      includeCopyrightPage: false,
      stylePreset: "kids-kdp",
    };

    let characterBible = "";
    if (mode === "series" && characterName && styleContract) {
      characterBible = buildCharacterBible({
        characterName,
        characterDescription,
        styleContract: styleContract as StyleContract,
      });
    }

    const thresholds = getQualityThresholds(complexity as Complexity);
    const maxRetries = 3;
    
    let imageBase64: string | undefined;
    let lastError: string | undefined;
    let finalPromptUsed = "";
    let lastMetrics: Record<string, unknown> | undefined;

    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        finalPromptUsed = buildFinalImagePrompt({
          scenePrompt,
          themePack: themePack as ThemePack | null,
          styleContract: styleContract as StyleContract | null,
          characterBible,
          spec,
          isAnchor: false,
          retryAttempt: retry,
        });

        // Use centralized OpenAI service
        const genResult = await generateImage({
          prompt: finalPromptUsed,
          n: 1,
          size: dalleSize,
        });

        if (!genResult.images || genResult.images.length === 0) {
          lastError = "No image generated";
          continue;
        }

        const imageBuffer = Buffer.from(genResult.images[0], "base64");
        const qualityResult = await validateImageQuality(imageBuffer, complexity as Complexity);
        
        lastMetrics = { ...qualityResult.metrics, ...qualityResult.debug };

        if (qualityResult.passed && qualityResult.correctedImageBuffer) {
          imageBase64 = qualityResult.correctedImageBuffer.toString("base64");
          break;
        } else {
          lastError = qualityResult.failureReason;
        }

      } catch (err) {
        lastError = err instanceof Error ? err.message : "Error";
        if (lastError.includes("content_policy")) {
          return NextResponse.json({ error: "Content policy", pageIndex, requestId }, { status: 400 });
        }
      }

      if (retry < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    const debug = {
      requestId,
      pageIndex,
      provider: "openai",
      imageModel: "dall-e-3",
      textModel: "gpt-4o",
      size: dalleSize,
      complexity,
      lineThickness,
      thresholds,
      promptLength: finalPromptUsed.length,
      finalPromptFull: finalPromptUsed,
      referenceIncluded: false,
      anchorIncluded: false,
      metrics: lastMetrics,
      failureReason: imageBase64 ? undefined : lastError,
    };

    if (!imageBase64) {
      return NextResponse.json(
        { error: `Failed: ${lastError}`, pageIndex, debug, requestId },
        { status: 422 }
      );
    }

    return NextResponse.json({
      pageIndex,
      imageBase64,
      passedGates: true,
      debug,
      requestId,
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error", requestId },
      { status: 500 }
    );
  }
}
