import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { 
  generateImage, 
  isOpenAIImageGenConfigured,
  assertOpenAIOnlyProvider,
  type ImageSize 
} from "@/lib/services/openaiImageGen";
import {
  buildFinalColoringPrompt,
  assertPromptHasConstraints,
  hasRequiredConstraints,
  type ImageSize as EnforcerImageSize,
} from "@/lib/coloringPagePromptEnforcer";

/**
 * ============================================================
 * POST /api/image/generate
 * ============================================================
 * 
 * ⚠️  STRICT RULES:
 * 
 * 1. Uses ONLY OpenAI DALL-E for image generation
 * 2. ALL prompts go through buildFinalColoringPrompt() to enforce no-fill constraints
 * 3. Validates that constraints are present before sending to OpenAI
 * 4. The prompt parameter is enhanced with mandatory outline-only constraints
 * 
 * Input:  { prompt: string, n?: number, size?: string, skipConstraints?: boolean }
 * Output: { images: string[] } (base64 encoded)
 * 
 * ============================================================
 */

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(4000, "Prompt too long"),
  n: z.number().int().min(1).max(4).default(1),
  size: z.enum(["1024x1024", "1024x1792", "1792x1024", "auto"]).default("1024x1792"),
  // If true, skip adding constraints (useful if caller already applied them)
  skipConstraints: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  // Run provider guard (logs warnings if other providers are configured)
  assertOpenAIOnlyProvider();

  // Check OpenAI is configured
  if (!isOpenAIImageGenConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Set OPENAI_API_KEY in environment." },
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

    const { prompt, n, size, skipConstraints } = parseResult.data;
    
    // Normalize size for constraint checking (auto defaults to portrait)
    const normalizedSize = (size === "auto" ? "1024x1792" : size) as EnforcerImageSize;

    // Build the final prompt with no-fill constraints and framing constraints
    let finalPrompt: string;
    
    if (skipConstraints && hasRequiredConstraints(prompt, normalizedSize)) {
      // Prompt already has constraints, use as-is
      finalPrompt = prompt;
      console.log(`[/api/image/generate] Using pre-constrained prompt`);
    } else {
      // Apply constraints including framing for landscape
      finalPrompt = buildFinalColoringPrompt(prompt, {
        includeNegativeBlock: true,
        maxLength: 4000,
        size: normalizedSize,
      });
      console.log(`[/api/image/generate] Applied constraints to prompt (size: ${normalizedSize})`);
    }

    // Safety check: validate constraints are present (including landscape framing if applicable)
    try {
      assertPromptHasConstraints(finalPrompt, normalizedSize);
    } catch (constraintError) {
      console.error("[/api/image/generate] Constraint validation failed:", constraintError);
      return NextResponse.json(
        { error: "Internal error: prompt constraints validation failed" },
        { status: 500 }
      );
    }

    // Log the exact prompt being used (for transparency)
    console.log(`[/api/image/generate] Request received`);
    console.log(`[/api/image/generate] n=${n}, size=${size}`);
    console.log(`[/api/image/generate] FINAL PROMPT LENGTH: ${finalPrompt.length} chars`);
    console.log(`[/api/image/generate] PROMPT PREVIEW: "${finalPrompt.substring(0, 300)}..."`);

    // Generate using OpenAI ONLY
    const result = await generateImage({
      prompt: finalPrompt,
      n,
      size: size as ImageSize,
    });

    // Log success
    console.log(`[/api/image/generate] Success: ${result.images.length} image(s) generated`);
    
    // Log if DALL-E revised the prompt (for transparency)
    if (result.revisedPrompts && result.revisedPrompts.length > 0) {
      console.log(`[/api/image/generate] Note: DALL-E revised the prompt internally:`);
      result.revisedPrompts.forEach((rp, i) => {
        console.log(`[/api/image/generate] Revised prompt ${i + 1}: "${rp.substring(0, 100)}..."`);
      });
    }

    return NextResponse.json({
      images: result.images,
      // Optionally include revised prompts for transparency
      revisedPrompts: result.revisedPrompts,
    });

  } catch (error) {
    console.error("[/api/image/generate] Error:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("content_policy")) {
        return NextResponse.json(
          { error: "Content policy violation. Please modify your prompt." },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
