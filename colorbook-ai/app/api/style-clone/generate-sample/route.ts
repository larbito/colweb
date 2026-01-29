import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateImage, isOpenAIImageGenConfigured } from "@/lib/services/openaiImageGen";
import { buildFinalImagePrompt, buildCharacterBible } from "@/lib/styleClonePromptBuilder";
import { validateImageQuality, getQualityThresholds } from "@/lib/qualityGates";
import { KDP_SIZE_PRESETS, type StyleContract, type ThemePack } from "@/lib/styleClone";
import type { Complexity, LineThickness, GenerationSpec } from "@/lib/generationSpec";
import { hasRequiredConstraints } from "@/lib/coloringPagePromptEnforcer";
import crypto from "crypto";

/**
 * STAGE 2: Generate Sample (Anchor) Image
 * 
 * NOTE: DALL-E 3 does NOT support image conditioning.
 * We achieve style consistency through:
 * 1. Detailed styleContractText from vision analysis
 * 2. ThemePack to keep pages in same world
 * 3. Consistent prompts structure
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
  scenePrompt: z.string().min(1),
  themePack: themePackSchema,
  styleContract: styleContractSchema,
  complexity: z.enum(["simple", "medium", "detailed"]),
  lineThickness: z.enum(["thin", "medium", "bold"]),
  sizePreset: z.string(),
  mode: z.enum(["series", "collection"]).optional(),
  characterName: z.string().optional(),
  characterDescription: z.string().optional(),
  referenceImageBase64: z.string().optional(), // For future use when conditioning is supported
});

// GPT Image 1.5 supported sizes: 1024x1024, 1024x1536, 1536x1024, auto
const SIZE_MAP: Record<string, "1024x1536" | "1024x1024" | "1536x1024"> = {
  "1024x1326": "1024x1536",
  "1024x1280": "1024x1536",
  "1024x1536": "1024x1536",
  "1024x1448": "1024x1536",
  "1024x1024": "1024x1024",
};

export async function POST(request: NextRequest) {
  if (!isOpenAIImageGenConfigured()) {
    return NextResponse.json({ error: "OpenAI not configured" }, { status: 503 });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { scenePrompt, themePack, styleContract, complexity, lineThickness, sizePreset, mode, characterName, characterDescription } = parseResult.data;

    const preset = KDP_SIZE_PRESETS[sizePreset] || KDP_SIZE_PRESETS["8.5x11"];
    const dalleSize = SIZE_MAP[preset.pixels] || "1024x1536";

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
    const maxRetries = 3;
    
    let imageBase64: string | undefined;
    let lastError: string | undefined;
    let finalPromptUsed = "";
    let allMetrics: Record<string, unknown>[] = [];

    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        // Build prompt with retry attempt for simplification
        finalPromptUsed = buildFinalImagePrompt({
          scenePrompt,
          themePack: themePack as ThemePack | null,
          styleContract: styleContract as StyleContract | null,
          characterBible,
          spec,
          isAnchor: true,
          retryAttempt: retry,
        });

        // Runtime assertion: verify prompt has required no-fill constraints
        if (!hasRequiredConstraints(finalPromptUsed)) {
          console.warn(`[generate-sample] Prompt missing required constraints, adding manually`);
          finalPromptUsed += `\n\n=== OUTLINE-ONLY CONSTRAINTS ===
NO solid black fills anywhere. NO filled shapes.
Only black outlines on white background.
Interior areas must remain white/unfilled.`;
        }

        console.log(`[generate-sample] Attempt ${retry + 1}/${maxRetries}, prompt length: ${finalPromptUsed.length}`);

        // Generate with centralized OpenAI service
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

        // Quality check (includes B&W conversion)
        const qualityResult = await validateImageQuality(imageBuffer, complexity as Complexity);
        
        allMetrics.push({
          attempt: retry + 1,
          ...qualityResult.metrics,
          ...qualityResult.debug,
        });

        if (qualityResult.passed && qualityResult.correctedImageBuffer) {
          imageBase64 = qualityResult.correctedImageBuffer.toString("base64");
          console.log(`[generate-sample] PASSED on attempt ${retry + 1}`);
          break;
        } else {
          lastError = qualityResult.failureReason || "Quality check failed";
          console.log(`[generate-sample] FAILED attempt ${retry + 1}: ${lastError}`);
        }

      } catch (err) {
        lastError = err instanceof Error ? err.message : "Generation error";
        console.error(`[generate-sample] Error attempt ${retry + 1}:`, lastError);
        
        if (lastError.includes("content_policy")) {
          return NextResponse.json(
            { error: "Content policy violation", requestId },
            { status: 400 }
          );
        }
      }

      // Wait before retry
      if (retry < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    // Build comprehensive debug info
    const debug = {
      requestId,
      provider: "openai",
      imageModel: "dall-e-3",
      textModel: "gpt-4o", // Used for style extraction
      size: dalleSize,
      complexity,
      lineThickness,
      thresholds,
      promptLength: finalPromptUsed.length,
      promptHash: crypto.createHash("md5").update(finalPromptUsed).digest("hex").substring(0, 8),
      finalPromptFull: finalPromptUsed,
      negativePrompt: styleContract?.forbiddenList?.join(", ") || "",
      referenceIncluded: false, // DALL-E 3 doesn't support this
      anchorIncluded: false,
      retries: allMetrics.length,
      metrics: allMetrics,
      totalTimeMs: Date.now() - startTime,
      failureReason: imageBase64 ? undefined : lastError,
    };

    if (!imageBase64) {
      return NextResponse.json(
        { error: `Failed after ${maxRetries} attempts: ${lastError}`, debug, requestId },
        { status: 422 }
      );
    }

    return NextResponse.json({
      imageBase64,
      passedGates: true,
      debug,
      requestId,
    });

  } catch (error) {
    console.error("[generate-sample] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error", requestId },
      { status: 500 }
    );
  }
}
