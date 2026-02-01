import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateImage, isOpenAIImageGenConfigured } from "@/lib/services/openaiImageGen";
import { buildFinalImagePrompt, buildCharacterBible } from "@/lib/styleClonePromptBuilder";
import { validateImageQuality, getQualityThresholds, getRetryPromptAdjustments } from "@/lib/qualityGates";
import { KDP_SIZE_PRESETS, type StyleContract, type ThemePack } from "@/lib/styleClone";
import type { Complexity, LineThickness, GenerationSpec } from "@/lib/generationSpec";
import { hasRequiredConstraints } from "@/lib/coloringPagePromptEnforcer";
import crypto from "crypto";

/**
 * Generate or regenerate a single page with comprehensive quality gates
 * 
 * Features:
 * - Multiple retry attempts with prompt adjustments
 * - Strict quality validation (black ratio, blob detection, composition)
 * - Full debug output for transparency
 * - Character consistency enforcement for storybook mode
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
  referenceImageBase64: z.string().optional(), // Reference style image
});

// GPT Image 1.5 supported sizes: 1024x1024, 1024x1536, 1536x1024, auto
const SIZE_MAP: Record<string, "1024x1536" | "1024x1024" | "1536x1024"> = {
  "1024x1326": "1024x1536",
  "1024x1280": "1024x1536",
  "1024x1536": "1024x1536",
  "1024x1448": "1024x1536",
  "1024x1024": "1024x1024",
};

// Image model configuration
const IMAGE_MODEL = "gpt-image-1.5"; // Latest model
const TEXT_MODEL = "gpt-4o";
const MAX_RETRIES = 3;

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
      anchorImageBase64,
      referenceImageBase64,
    } = parseResult.data;

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

    // Build character bible for storybook mode
    let characterBible = "";
    if (mode === "series" && characterName && styleContract) {
      characterBible = buildCharacterBible({
        characterName,
        characterDescription,
        styleContract: styleContract as StyleContract,
      });
    }

    const thresholds = getQualityThresholds(complexity as Complexity);

    // Track all attempts for debugging
    const attempts: {
      attempt: number;
      promptUsed: string;
      error?: string;
      metrics?: Record<string, unknown>;
      passed: boolean;
    }[] = [];

    let imageBase64: string | undefined;
    let lastError: string | undefined;
    let finalPromptUsed = "";
    let lastMetrics: Record<string, unknown> | undefined;
    let passedAttempt = 0;

    // Retry loop with progressive simplification
    for (let retry = 0; retry < MAX_RETRIES; retry++) {
      const attemptStart = Date.now();

      try {
        // Build prompt with retry adjustments
        let basePrompt = buildFinalImagePrompt({
          scenePrompt,
          themePack: themePack as ThemePack | null,
          styleContract: styleContract as StyleContract | null,
          characterBible,
          spec,
          isAnchor: pageIndex === 1,
          retryAttempt: retry,
        });

        // Add retry-specific adjustments if we have failure info
        if (retry > 0 && lastError) {
          const adjustments = getRetryPromptAdjustments(lastError, retry);
          if (adjustments) {
            basePrompt += `\n\n${adjustments}`;
          }
        }

        finalPromptUsed = basePrompt;

        // Runtime assertion: verify prompt has required constraints
        if (!hasRequiredConstraints(finalPromptUsed)) {
          console.warn(`[style-clone/generate-page] Prompt missing required constraints, adding manually`);
          finalPromptUsed += `\n\n=== OUTLINE-ONLY CONSTRAINTS ===
NO solid black fills anywhere. NO filled shapes.
Only black outlines on white background.
Interior areas must remain WHITE/unfilled.`;
        }

        console.log(`[generate-page] Attempt ${retry + 1}/${MAX_RETRIES} for page ${pageIndex}`);
        console.log(`[generate-page] Prompt length: ${finalPromptUsed.length} chars`);

        // Generate image using OpenAI
        const genResult = await generateImage({
          prompt: finalPromptUsed,
          n: 1,
          size: dalleSize,
        });

        if (!genResult.images || genResult.images.length === 0) {
          lastError = "No image generated";
          attempts.push({ attempt: retry + 1, promptUsed: finalPromptUsed, error: lastError, passed: false });
          continue;
        }

        const imageBuffer = Buffer.from(genResult.images[0], "base64");
        
        // Validate image quality
        const qualityResult = await validateImageQuality(imageBuffer, complexity as Complexity);

        lastMetrics = { 
          ...qualityResult.metrics, 
          ...qualityResult.debug,
          attemptDurationMs: Date.now() - attemptStart,
        };

        attempts.push({
          attempt: retry + 1,
          promptUsed: finalPromptUsed.substring(0, 500) + "...",
          metrics: lastMetrics,
          passed: qualityResult.passed,
          error: qualityResult.failureReason,
        });

        if (qualityResult.passed && qualityResult.correctedImageBuffer) {
          imageBase64 = qualityResult.correctedImageBuffer.toString("base64");
          passedAttempt = retry + 1;
          break;
        } else {
          lastError = qualityResult.failureReason;
          console.log(`[generate-page] Quality check failed: ${lastError}`);
          
          // Use the corrected image even if it failed (for debugging)
          if (qualityResult.correctedImageBuffer) {
            imageBase64 = qualityResult.correctedImageBuffer.toString("base64");
          }
        }

      } catch (err) {
        lastError = err instanceof Error ? err.message : "Unknown error";
        attempts.push({ attempt: retry + 1, promptUsed: finalPromptUsed, error: lastError, passed: false });

        if (lastError.includes("content_policy")) {
          return NextResponse.json({ 
            error: "Content policy violation", 
            pageIndex, 
            requestId,
            debug: { attempts },
          }, { status: 400 });
        }
      }

      // Short delay between retries
      if (retry < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    const totalDurationMs = Date.now() - startTime;

    // Build comprehensive debug output
    const debug = {
      requestId,
      pageIndex,
      provider: "openai",
      imageModel: IMAGE_MODEL,
      textModel: TEXT_MODEL,
      size: dalleSize,
      complexity,
      lineThickness,
      mode: mode || "collection",
      thresholds,
      
      // Prompt info
      promptLength: finalPromptUsed.length,
      finalPromptPreview: finalPromptUsed.substring(0, 800) + (finalPromptUsed.length > 800 ? "..." : ""),
      finalPromptFull: finalPromptUsed,
      promptHash: crypto.createHash("md5").update(finalPromptUsed).digest("hex").substring(0, 8),
      
      // Conditioning info
      referenceIncluded: !!referenceImageBase64,
      anchorIncluded: !!anchorImageBase64,
      characterBibleIncluded: !!characterBible,
      
      // Quality metrics
      metrics: lastMetrics,
      passedAttempt,
      totalAttempts: attempts.length,
      attempts,
      
      // Timing
      totalDurationMs,
      
      // Final status
      passed: !!imageBase64 && passedAttempt > 0,
      failureReason: imageBase64 && passedAttempt === 0 ? lastError : undefined,
    };

    // If we have an image but it didn't pass quality gates, still return it with warning
    if (imageBase64 && passedAttempt === 0) {
      return NextResponse.json({
        pageIndex,
        imageBase64,
        passedGates: false,
        warning: `Image generated but failed quality checks: ${lastError}`,
        debug,
        requestId,
      });
    }

    if (!imageBase64) {
      return NextResponse.json(
        { 
          error: `Failed after ${MAX_RETRIES} attempts: ${lastError}`, 
          pageIndex, 
          debug, 
          requestId 
        },
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
    console.error("[generate-page] Unexpected error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Error", 
        requestId,
        debug: { totalDurationMs: Date.now() - startTime },
      },
      { status: 500 }
    );
  }
}
