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
  type StyleCloneImage,
  type StyleCloneDebugInfo,
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

const promptSchema = z.object({
  pageIndex: z.number().int().min(1),
  title: z.string(),
  scenePrompt: z.string(),
});

const requestSchema = z.object({
  prompts: z.array(promptSchema).min(1),
  themePack: themePackSchema.nullable().optional(),
  styleContract: styleContractSchema.nullable().optional(),
  complexity: z.enum(["simple", "medium", "detailed"]),
  lineThickness: z.enum(["thin", "medium", "bold"]),
  sizePreset: z.string(),
  mode: z.enum(["series", "collection"]).optional(),
  characterName: z.string().optional(),
  characterDescription: z.string().optional(),
  anchorImageBase64: z.string().optional(),
  skipPageIndices: z.array(z.number()).optional(),
});

const DALLE_SIZE_MAP: Record<string, "1024x1792" | "1024x1024" | "1792x1024"> = {
  "1024x1326": "1024x1792",
  "1024x1280": "1024x1792",
  "1024x1536": "1024x1792",
  "1024x1448": "1024x1792",
  "1024x1024": "1024x1024",
};

// Rate limiting
const BATCH_SIZE = 2;
const DELAY_BETWEEN_BATCHES_MS = 3000;
const MAX_RETRIES_PER_PAGE = 2;

async function generateSinglePage(params: {
  pageIndex: number;
  scenePrompt: string;
  themePack: ThemePack | null;
  styleContract: StyleContract | null;
  characterBible: string;
  spec: GenerationSpec;
  dalleSize: "1024x1792" | "1024x1024" | "1792x1024";
  complexity: Complexity;
}): Promise<StyleCloneImage> {
  const { pageIndex, scenePrompt, themePack, styleContract, characterBible, spec, dalleSize, complexity } = params;

  const thresholds = getQualityThresholds(complexity);
  let imageUrl: string | undefined;
  let imageBase64: string | undefined;
  let retryCount = 0;
  let lastFailureReason: string | undefined;
  let lastQualityMetrics: Record<string, unknown> | undefined;
  let finalPromptUsed = "";

  while (retryCount < MAX_RETRIES_PER_PAGE) {
    try {
      const fullPrompt = buildFinalImagePrompt({
        scenePrompt,
        themePack,
        styleContract,
        characterBible,
        spec,
        isAnchor: false,
        retryAttempt: retryCount,
      });

      finalPromptUsed = fullPrompt;
      const promptHash = crypto.createHash("md5").update(fullPrompt).digest("hex").substring(0, 8);

      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: fullPrompt,
        n: 1,
        size: dalleSize,
        quality: "hd",
        style: "natural",
      });

      imageUrl = response.data?.[0]?.url;

      if (imageUrl) {
        const imageResponse = await fetch(imageUrl);
        if (imageResponse.ok) {
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          
          const qualityResult = await validateImageQuality(imageBuffer, complexity);
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
        } else {
          lastFailureReason = "Failed to fetch image";
        }
      } else {
        lastFailureReason = "No image URL returned";
      }
    } catch (error) {
      lastFailureReason = error instanceof Error ? error.message : "Generation failed";
    }

    retryCount++;
    if (retryCount < MAX_RETRIES_PER_PAGE) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  const debugInfo: StyleCloneDebugInfo = {
    provider: "openai",
    imageModel: "dall-e-3",
    textModel: "gpt-4o",
    size: dalleSize,
    promptHash: crypto.createHash("md5").update(finalPromptUsed).digest("hex").substring(0, 8),
    promptPreview: finalPromptUsed.substring(0, 300) + "...",
    finalPrompt: finalPromptUsed,
    negativePrompt: styleContract?.forbiddenList?.join(", ") || "",
    thresholds: {
      blackRatio: (lastQualityMetrics?.blackRatio as number) || 0,
      maxBlackRatio: thresholds.maxBlackRatio,
      blobThreshold: thresholds.maxBlobRatio,
    },
    blackRatio: lastQualityMetrics?.blackRatio as number | undefined,
    colorCorrectionApplied: (lastQualityMetrics?.wasColorCorrected as boolean) || false,
    retries: retryCount,
    failureReason: !imageBase64 ? lastFailureReason : undefined,
  };

  return {
    pageIndex,
    imageBase64,
    imageUrl,
    finalPrompt: finalPromptUsed,
    passedGates: !!imageBase64,
    debug: debugInfo,
  };
}

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
      prompts, 
      themePack, 
      styleContract, 
      complexity, 
      lineThickness, 
      sizePreset,
      mode,
      characterName,
      characterDescription,
      skipPageIndices = [],
    } = parseResult.data;

    const preset = KDP_SIZE_PRESETS[sizePreset] || KDP_SIZE_PRESETS["8.5x11"];
    const pixelSize = preset.pixels;
    const dalleSize = DALLE_SIZE_MAP[pixelSize] || "1024x1792";

    const spec: GenerationSpec = {
      trimSize: sizePreset,
      pixelSize,
      complexity: complexity as Complexity,
      lineThickness: lineThickness as LineThickness,
      pageCount: prompts.length,
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

    // Filter out pages to skip
    const promptsToGenerate = prompts.filter(p => !skipPageIndices.includes(p.pageIndex));
    
    if (promptsToGenerate.length === 0) {
      return NextResponse.json({
        images: [],
        successCount: 0,
        failCount: 0,
        message: "No pages to generate",
        requestId,
      });
    }

    const results: StyleCloneImage[] = [];
    let successCount = 0;
    let failCount = 0;

    // Process in batches
    for (let i = 0; i < promptsToGenerate.length; i += BATCH_SIZE) {
      const batch = promptsToGenerate.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(prompt => 
          generateSinglePage({
            pageIndex: prompt.pageIndex,
            scenePrompt: prompt.scenePrompt,
            themePack: themePack as ThemePack | null,
            styleContract: styleContract as StyleContract | null,
            characterBible,
            spec,
            dalleSize,
            complexity: complexity as Complexity,
          })
        )
      );

      for (const result of batchResults) {
        results.push(result);
        if (result.passedGates) {
          successCount++;
        } else {
          failCount++;
        }
      }

      // Delay between batches
      if (i + BATCH_SIZE < promptsToGenerate.length) {
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
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
    if (error instanceof Error && error.message.includes("rate_limit")) {
      return NextResponse.json(
        { error: "Rate limit exceeded.", requestId },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate pages", requestId },
      { status: 500 }
    );
  }
}
