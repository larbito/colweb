import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateImage, isOpenAIImageGenConfigured, type ImageSize as DalleImageSize } from "@/lib/services/openaiImageGen";
import { buildColoringPrompt, buildDalle3Prompt } from "@/lib/coloringPromptBuilder";
import { validateColoringPage } from "@/lib/coloringPageValidator";
import { hasRequiredConstraints } from "@/lib/coloringPagePromptEnforcer";
import type { ImageAnalysis, GeneratedPrompt, GenerationResult, ValidationResult } from "@/lib/coloringPageTypes";

// Map sizes to DALL-E 3 compatible sizes (auto defaults to portrait)
const SIZE_TO_DALLE: Record<string, DalleImageSize> = {
  "1024x1024": "1024x1024",
  "1024x1792": "1024x1792",
  "1792x1024": "1792x1024",
  "auto": "1024x1792",
};

const analysisSchema = z.object({
  character: z.object({
    species: z.string(),
    special_features: z.array(z.string()),
    eye_style: z.string(),
    body_proportions: z.string(),
    pose: z.string(),
    clothing_accessories: z.array(z.string()),
  }),
  line_art: z.object({
    outer_line_weight: z.enum(["thin", "medium", "thick"]),
    inner_line_weight: z.enum(["thin", "medium", "thick"]),
    style: z.string(),
    shading: z.enum(["none", "minimal", "heavy"]),
  }),
  scene: z.object({
    location: z.string(),
    props: z.array(z.string()),
    background: z.array(z.string()),
    composition: z.string(),
  }),
  constraints: z.array(z.string()),
  character_signature: z.string(),
  style_lock: z.string(),
});

const requestSchema = z.object({
  analysis: analysisSchema,
  count: z.number().int().min(1).max(20).default(1),
  scenes: z.array(z.string()).optional(),
  size: z.enum(["1024x1024", "1024x1792", "1792x1024", "auto"]).default("1024x1792"),
});

/**
 * POST /api/generate-coloring-pages
 * 
 * Generates N coloring pages based on image analysis.
 * Uses strict B&W enforcement and automatic retry on failure.
 */
export async function POST(request: NextRequest) {
  if (!isOpenAIImageGenConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
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

    const { analysis, count, scenes, size } = parseResult.data;

    console.log(`[generate-coloring-pages] Generating ${count} pages for ${analysis.character.species}`);

    // Generate prompts for all pages
    const prompts: GeneratedPrompt[] = [];
    for (let i = 1; i <= count; i++) {
      const sceneOverride = scenes?.[i - 1];
      const prompt = buildColoringPrompt(analysis as ImageAnalysis, i, sceneOverride);
      prompts.push(prompt);
    }

    // Generate images with validation and retry
    const results: GenerationResult[] = [];
    
    for (const prompt of prompts) {
      const result = await generateSinglePage(prompt, analysis as ImageAnalysis, size);
      results.push(result);
      
      console.log(`[generate-coloring-pages] Page ${prompt.pageIndex}: valid=${result.validation.isValid}, retries=${result.retryCount}`);
    }

    // Count successes and failures
    const successCount = results.filter(r => r.validation.isValid || r.retryCount >= 3).length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      results,
      prompts,
      summary: {
        total: count,
        success: successCount,
        failed: failCount,
        characterSignature: analysis.character_signature,
        styleLock: analysis.style_lock,
      },
      debug: {
        model: "dall-e-3",
        size,
        analysis: {
          character: analysis.character.species,
          location: analysis.scene.location,
        },
      },
    });

  } catch (error) {
    console.error("[generate-coloring-pages] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}

async function generateSinglePage(
  prompt: GeneratedPrompt,
  analysis: ImageAnalysis,
  size: "1024x1024" | "1024x1792" | "1792x1024" | "auto"
): Promise<GenerationResult> {
  const maxRetries = 3;
  let lastValidation: ValidationResult | undefined;
  let lastImageBase64 = "";
  let retryCount = 0;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    retryCount = attempt;
    const startTime = Date.now();
    
    try {
      // Build the prompt - add stricter constraints on retry
      let finalPrompt = buildDalle3Prompt(prompt);
      
      // Runtime assertion: verify prompt has required no-fill constraints
      if (!hasRequiredConstraints(finalPrompt)) {
        console.warn(`[generate-coloring-pages] Prompt missing required constraints, adding manually`);
        finalPrompt += `\n\n=== OUTLINE-ONLY CONSTRAINTS ===
NO solid black fills anywhere. NO filled shapes.
Only black outlines on white background.
Interior areas must remain white/unfilled.`;
      }
      
      if (attempt > 0) {
        // Add stronger constraints on retry
        const retryAdditions = [
          "\n\nRETRY ATTEMPT - STRICTER REQUIREMENTS:",
          "This MUST be PURE BLACK AND WHITE with ZERO color.",
          "Use ONLY #000000 black lines on #FFFFFF white.",
          "NO gray tones, NO shading, NO gradients whatsoever.",
          "Simplify the design - use fewer elements and bolder lines.",
        ];
        
        if (lastValidation?.hasColor) {
          retryAdditions.push("CRITICAL: Previous output had COLOR. This must be MONOCHROME only.");
        }
        if (lastValidation?.hasShading) {
          retryAdditions.push("CRITICAL: Previous output had SHADING. Use FLAT LINE ART only.");
        }
        if (lastValidation && lastValidation.blackRatio > 0.5) {
          retryAdditions.push("CRITICAL: Previous output was too dark. Use THINNER lines and LESS detail.");
        }
        
        finalPrompt += retryAdditions.join("\n");
      }
      
      // Ensure prompt is under limit
      if (finalPrompt.length > 4000) {
        finalPrompt = finalPrompt.substring(0, 3900) + "\n\nPURE BLACK AND WHITE LINE ART ONLY.";
      }
      
      console.log(`[generate-coloring-pages] Page ${prompt.pageIndex} attempt ${attempt + 1}, prompt length: ${finalPrompt.length}`);

      // Generate with centralized OpenAI service using DALL-E 3 compatible size
      const dalleSize = SIZE_TO_DALLE[size] || "1024x1792";
      const result = await generateImage({
        prompt: finalPrompt,
        n: 1,
        size: dalleSize,
      });

      if (!result.images || result.images.length === 0) {
        throw new Error("No image generated");
      }

      const imageBuffer = Buffer.from(result.images[0], "base64");
      
      // Validate the image (validates AFTER B&W conversion)
      const { validation, correctedBuffer } = await validateColoringPage(imageBuffer);
      lastValidation = validation;
      
      // Always use the B&W corrected version
      lastImageBase64 = correctedBuffer.toString("base64");
      
      const generationTime = Date.now() - startTime;
      
      console.log(`[generate-coloring-pages] Page ${prompt.pageIndex} attempt ${attempt + 1}: blackRatio=${(validation.blackRatio * 100).toFixed(1)}%, valid=${validation.isValid}`);
      
      // If valid, return immediately
      if (validation.isValid) {
        return {
          pageIndex: prompt.pageIndex,
          imageBase64: lastImageBase64,
          prompt,
          validation,
          retryCount: attempt,
          debug: {
            model: "dall-e-3",
            size,
            generationTime,
          },
        };
      }
      
      // On last retry, return anyway (we've done our best)
      if (attempt >= maxRetries - 1) {
        console.log(`[generate-coloring-pages] Page ${prompt.pageIndex} max retries reached, returning with warnings`);
        return {
          pageIndex: prompt.pageIndex,
          imageBase64: lastImageBase64,
          prompt,
          validation,
          retryCount: attempt,
          debug: {
            model: "dall-e-3",
            size,
            generationTime,
          },
        };
      }
      
      console.log(`[generate-coloring-pages] Page ${prompt.pageIndex} failed validation: ${validation.failureReasons.join(", ")}`);
      
    } catch (error) {
      console.error(`[generate-coloring-pages] Page ${prompt.pageIndex} attempt ${attempt + 1} error:`, error);
      
      if (attempt >= maxRetries - 1) {
        // Return with error status
        return {
          pageIndex: prompt.pageIndex,
          imageBase64: lastImageBase64,
          prompt,
          validation: lastValidation || {
            isValid: false,
            hasColor: false,
            hasShading: false,
            blackRatio: 0,
            grayLevelCount: 0,
            failureReasons: [error instanceof Error ? error.message : "Unknown error"],
          },
          retryCount: attempt,
          debug: {
            model: "dall-e-3",
            size,
            generationTime: 0,
          },
        };
      }
    }
    
    // Brief delay before retry
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Should not reach here, but TypeScript needs it
  return {
    pageIndex: prompt.pageIndex,
    imageBase64: lastImageBase64,
    prompt,
    validation: lastValidation || {
      isValid: false,
      hasColor: false,
      hasShading: false,
      blackRatio: 0,
      grayLevelCount: 0,
      failureReasons: ["Max retries exceeded"],
    },
    retryCount,
    debug: {
      model: "dall-e-3",
      size,
      generationTime: 0,
    },
  };
}

