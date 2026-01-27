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
  type StyleCloneImage,
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

const promptSchema = z.object({
  pageIndex: z.number().int().min(1),
  title: z.string(),
  scenePrompt: z.string(),
});

const requestSchema = z.object({
  prompts: z.array(promptSchema).min(1),
  themePack: themePackSchema.nullable(),
  styleContract: styleContractSchema.nullable(),
  complexity: z.enum(["simple", "medium", "detailed"]),
  lineThickness: z.enum(["thin", "medium", "bold"]),
  sizePreset: z.string(),
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

// Rate limiting: max concurrent requests and delay between batches
const BATCH_SIZE = 2;
const DELAY_BETWEEN_BATCHES_MS = 3000;

async function generateSinglePage(params: {
  pageIndex: number;
  scenePrompt: string;
  themePack: ThemePack | null;
  styleContract: StyleContract | null;
  spec: GenerationSpec;
  dalleSize: "1024x1792" | "1024x1024" | "1792x1024";
  maxBlackRatio: number;
}): Promise<StyleCloneImage> {
  const { pageIndex, scenePrompt, themePack, styleContract, spec, dalleSize, maxBlackRatio } = params;

  const fullPrompt = buildStyleClonePrompt({
    scenePrompt,
    themePack,
    styleContract,
    spec,
    isAnchor: false,
  });

  const promptHash = crypto.createHash("md5").update(fullPrompt).digest("hex").substring(0, 8);

  let imageUrl: string | undefined;
  let imageBase64: string | undefined;
  let retryCount = 0;
  const maxRetries = 2;
  let lastFailureReason: string | undefined;
  let finalBlackRatio: number | undefined;

  while (retryCount < maxRetries) {
    try {
      const attemptPrompt = retryCount > 0 
        ? `${fullPrompt}${buildStricterStyleCloneSuffix(lastFailureReason || "Too much black")}`
        : fullPrompt;

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
        try {
          const imageResponse = await fetch(imageUrl);
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          
          const processed = await processImageWithSharp(imageBuffer, {
            binarizationThreshold: 220,
            maxBlackRatio,
            minRunLength: 50,
            maxLongRuns: 30,
          });

          finalBlackRatio = processed.blackRatio;

          if (processed.passed) {
            imageBase64 = processed.base64;
            break;
          } else {
            lastFailureReason = processed.failureReason || "Quality check failed";
          }
        } catch {
          // Use original if processing fails
          const imageResponse = await fetch(imageUrl);
          imageBase64 = Buffer.from(await imageResponse.arrayBuffer()).toString("base64");
          break;
        }
      }
    } catch (genError) {
      lastFailureReason = genError instanceof Error ? genError.message : "Generation failed";
    }

    retryCount++;
    if (retryCount < maxRetries) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  const debugInfo: StyleCloneDebugInfo = {
    provider: "openai",
    imageModel: "dall-e-3",
    textModel: "gpt-4o",
    size: dalleSize,
    promptHash,
    promptPreview: fullPrompt.substring(0, 300) + "...",
    finalPrompt: fullPrompt,
    negativePrompt: styleContract?.forbiddenList?.join(", ") || "",
    thresholds: {
      blackRatio: finalBlackRatio || 0,
      maxBlackRatio,
      blobThreshold: 0.015,
    },
    blackRatio: finalBlackRatio,
    retries: retryCount,
    failureReason: !imageBase64 ? lastFailureReason : undefined,
  };

  return {
    pageIndex,
    imageBase64,
    imageUrl,
    finalPrompt: fullPrompt,
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
      skipPageIndices = [],
    } = parseResult.data;

    const preset = KDP_SIZE_PRESETS[sizePreset] || KDP_SIZE_PRESETS["8.5x11"];
    const pixelSize = preset.pixels;

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

    const dalleSize = DALLE_SIZE_MAP[pixelSize] || "1024x1792";
    const maxBlackRatio = BLACK_RATIO_THRESHOLDS[complexity as Complexity];

    // Filter out pages that should be skipped
    const promptsToGenerate = prompts.filter(p => !skipPageIndices.includes(p.pageIndex));
    
    if (promptsToGenerate.length === 0) {
      return NextResponse.json({
        images: [],
        successCount: 0,
        failCount: 0,
        message: "No pages to generate",
      });
    }

    const results: StyleCloneImage[] = [];
    let successCount = 0;
    let failCount = 0;

    // Process in batches to avoid rate limits
    for (let i = 0; i < promptsToGenerate.length; i += BATCH_SIZE) {
      const batch = promptsToGenerate.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(prompt => 
          generateSinglePage({
            pageIndex: prompt.pageIndex,
            scenePrompt: prompt.scenePrompt,
            themePack: themePack as ThemePack | null,
            styleContract: styleContract as StyleContract | null,
            spec,
            dalleSize,
            maxBlackRatio,
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

      // Add delay between batches (except for the last batch)
      if (i + BATCH_SIZE < promptsToGenerate.length) {
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
      }
    }

    return NextResponse.json({
      images: results,
      successCount,
      failCount,
      totalRequested: promptsToGenerate.length,
    });
  } catch (error) {
    console.error("Generate remaining error:", error);

    if (error instanceof Error) {
      if (error.message.includes("rate_limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please wait and try again." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate remaining pages" },
      { status: 500 }
    );
  }
}

