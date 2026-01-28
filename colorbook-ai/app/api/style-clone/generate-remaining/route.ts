import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateImage, isOpenAIImageGenConfigured } from "@/lib/services/openaiImageGen";
import { buildFinalImagePrompt, buildCharacterBible } from "@/lib/styleClonePromptBuilder";
import { validateImageQuality, getQualityThresholds } from "@/lib/qualityGates";
import { KDP_SIZE_PRESETS, type StyleContract, type ThemePack, type StyleCloneImage } from "@/lib/styleClone";
import type { Complexity, LineThickness, GenerationSpec } from "@/lib/generationSpec";
import crypto from "crypto";

/**
 * Generate remaining pages after sample approval
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

const promptSchema = z.object({
  pageIndex: z.number().int().min(1),
  title: z.string(),
  scenePrompt: z.string(),
});

const requestSchema = z.object({
  prompts: z.array(promptSchema).min(1),
  themePack: themePackSchema,
  styleContract: styleContractSchema,
  complexity: z.enum(["simple", "medium", "detailed"]),
  lineThickness: z.enum(["thin", "medium", "bold"]),
  sizePreset: z.string(),
  mode: z.enum(["series", "collection"]).optional(),
  characterName: z.string().optional(),
  characterDescription: z.string().optional(),
  anchorImageBase64: z.string().optional(),
  skipPageIndices: z.array(z.number()).optional(),
});

// GPT Image 1.5 supported sizes: 1024x1024, 1024x1536, 1536x1024, auto
const SIZE_MAP: Record<string, "1024x1536" | "1024x1024" | "1536x1024"> = {
  "1024x1326": "1024x1536",
  "1024x1280": "1024x1536",
  "1024x1536": "1024x1536",
  "1024x1448": "1024x1536",
  "1024x1024": "1024x1024",
};

const BATCH_SIZE = 2;
const DELAY_BETWEEN_BATCHES = 2000;

async function generateSinglePage(params: {
  pageIndex: number;
  scenePrompt: string;
  themePack: ThemePack | null;
  styleContract: StyleContract | null;
  characterBible: string;
  spec: GenerationSpec;
  dalleSize: "1024x1536" | "1024x1024" | "1536x1024";
  complexity: Complexity;
}): Promise<StyleCloneImage> {
  const { pageIndex, scenePrompt, themePack, styleContract, characterBible, spec, dalleSize, complexity } = params;

  const thresholds = getQualityThresholds(complexity);
  let imageBase64: string | undefined;
  let lastError: string | undefined;
  let finalPromptUsed = "";
  let lastMetrics: Record<string, unknown> | undefined;

  for (let retry = 0; retry < 2; retry++) {
    try {
      finalPromptUsed = buildFinalImagePrompt({
        scenePrompt,
        themePack,
        styleContract,
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
      const qualityResult = await validateImageQuality(imageBuffer, complexity);
      
      lastMetrics = { ...qualityResult.metrics, ...qualityResult.debug };

      if (qualityResult.passed && qualityResult.correctedImageBuffer) {
        imageBase64 = qualityResult.correctedImageBuffer.toString("base64");
        break;
      } else {
        lastError = qualityResult.failureReason;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Error";
    }

    if (retry < 1) await new Promise(r => setTimeout(r, 1000));
  }

  return {
    pageIndex,
    imageBase64,
    finalPrompt: finalPromptUsed,
    passedGates: !!imageBase64,
    debug: {
      provider: "openai",
      imageModel: "dall-e-3",
      textModel: "gpt-4o",
      size: dalleSize,
      promptHash: crypto.createHash("md5").update(finalPromptUsed).digest("hex").substring(0, 8),
      promptPreview: finalPromptUsed.substring(0, 200),
      finalPrompt: finalPromptUsed,
      negativePrompt: styleContract?.forbiddenList?.join(", ") || "",
      thresholds: { blackRatio: (lastMetrics?.blackRatio as number) || 0, maxBlackRatio: thresholds.maxBlackRatio, blobThreshold: 0 },
      retries: 2,
      failureReason: imageBase64 ? undefined : lastError,
    },
  };
}

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

    const { prompts, themePack, styleContract, complexity, lineThickness, sizePreset, mode, characterName, characterDescription, skipPageIndices = [] } = parseResult.data;

    const preset = KDP_SIZE_PRESETS[sizePreset] || KDP_SIZE_PRESETS["8.5x11"];
    const dalleSize = SIZE_MAP[preset.pixels] || "1024x1536";

    const spec: GenerationSpec = {
      trimSize: sizePreset,
      pixelSize: preset.pixels,
      complexity: complexity as Complexity,
      lineThickness: lineThickness as LineThickness,
      pageCount: prompts.length,
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

    const promptsToGenerate = prompts.filter(p => !skipPageIndices.includes(p.pageIndex));
    
    if (promptsToGenerate.length === 0) {
      return NextResponse.json({ images: [], successCount: 0, failCount: 0, requestId });
    }

    const results: StyleCloneImage[] = [];
    let successCount = 0;
    let failCount = 0;

    // Process in batches
    for (let i = 0; i < promptsToGenerate.length; i += BATCH_SIZE) {
      const batch = promptsToGenerate.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(prompt => generateSinglePage({
          pageIndex: prompt.pageIndex,
          scenePrompt: prompt.scenePrompt,
          themePack: themePack as ThemePack | null,
          styleContract: styleContract as StyleContract | null,
          characterBible,
          spec,
          dalleSize,
          complexity: complexity as Complexity,
        }))
      );

      for (const result of batchResults) {
        results.push(result);
        if (result.passedGates) successCount++;
        else failCount++;
      }

      if (i + BATCH_SIZE < promptsToGenerate.length) {
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
      }
    }

    return NextResponse.json({
      images: results,
      successCount,
      failCount,
      totalRequested: promptsToGenerate.length,
      requestId,
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error", requestId },
      { status: 500 }
    );
  }
}
