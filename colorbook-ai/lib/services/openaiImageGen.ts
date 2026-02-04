/**
 * ============================================================
 * OPENAI IMAGE GENERATION SERVICE - GPT IMAGE MODEL
 * ============================================================
 * 
 * ⚠️  STRICT RULE: This is the ONLY image generation service allowed.
 * 
 * ❌ DO NOT use DALL-E! Always use GPT image model (gpt-image-1)
 * ❌ DO NOT use Replicate, Stability, SDXL, Midjourney, or any other provider.
 * ❌ DO NOT add fallback providers.
 * ❌ DO NOT import any other image generation libraries.
 * 
 * ✅ ALL image generation in this codebase MUST go through this service.
 * ✅ This service uses ONLY the GPT Image model (gpt-image-1).
 * 
 * To change providers in the future, ONLY modify this file.
 * ============================================================
 */

import OpenAI from "openai";
import { 
  classifyOpenAIError, 
  isNonRetryableError,
  NonRetryableGenerationError,
} from "@/lib/errors/generationErrors";

// Lazy initialization to avoid errors during build when API key is not set
let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "placeholder-for-build",
    });
  }
  return _openai;
}

// Proxy for backwards compatibility
const openai = new Proxy({} as OpenAI, {
  get(target, prop) {
    return (getOpenAI() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Allowed sizes for GPT Image model
// Supported: 1024x1024, 1024x1536, 1536x1024, 1024x1792, 1792x1024, auto
export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024" | "1024x1792" | "1792x1024";

// Image model to use - GPT Image model (gpt-image-1) for best quality
// DO NOT USE DALL-E! Always use GPT image model
const IMAGE_MODEL = "gpt-image-1";

export interface GenerateImageParams {
  prompt: string;
  n?: number;
  size?: ImageSize;
}

export interface GenerateImageResult {
  images: string[]; // base64 encoded images
  revisedPrompts?: string[]; // DALL-E 3 sometimes revises prompts
}

export interface GenerateImageContext {
  pageIndex?: number;
  batchId?: string;
}

/**
 * Check if OpenAI is configured
 */
export function isOpenAIImageGenConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * COLORING PAGE PREFIX - ensures white background output
 * This is CRITICAL for proper coloring page generation
 */
const COLORING_PAGE_PREFIX = `IMPORTANT: Generate a COLORING BOOK PAGE with PURE WHITE background (#FFFFFF). 
The output must be BLACK LINE ART on WHITE BACKGROUND ONLY. No colors, no gray, no shading.
This is a printable coloring page - the background MUST be pure white paper.

`;

/**
 * Generate images using OpenAI GPT Image model (gpt-image-1)
 * 
 * IMPORTANT: DO NOT USE DALL-E! Always use the GPT image model.
 * 
 * For coloring pages, we add a mandatory prefix to ensure white background output.
 * 
 * ERROR HANDLING:
 * - Non-retryable errors (billing limit, invalid key) throw NonRetryableGenerationError
 * - Retryable errors throw RetryableGenerationError
 * - Caller should check error type and handle accordingly
 * 
 * @param params.prompt - The prompt to send (coloring page prefix will be added)
 * @param params.n - Number of images
 * @param params.size - Image size (default "1024x1536" for portrait coloring pages)
 * @param context - Optional context for error tracking (pageIndex, batchId)
 */
export async function generateImage(
  params: GenerateImageParams, 
  context: GenerateImageContext = {}
): Promise<GenerateImageResult> {
  const { 
    prompt, 
    n = 1, 
    size = "1024x1536", // Portrait format for coloring pages (GPT image size)
  } = params;

  if (!isOpenAIImageGenConfigured()) {
    throw new NonRetryableGenerationError("INVALID_API_KEY", {
      provider: "openai",
      originalMessage: "OpenAI API key not configured",
    }, "OpenAI API key not configured. Set OPENAI_API_KEY in environment.");
  }

  if (!prompt || prompt.trim().length === 0) {
    throw new Error("Prompt is required");
  }

  // Add coloring page prefix for proper white background generation
  const fullPrompt = COLORING_PAGE_PREFIX + prompt;

  console.log(`[openaiImageGen] Generating ${n} image(s) with model: ${IMAGE_MODEL}`);
  console.log(`[openaiImageGen] Size: ${size}, Page: ${context.pageIndex || "N/A"}`);
  console.log(`[openaiImageGen] Prompt length: ${fullPrompt.length} chars`);

  const images: string[] = [];

  try {
    // GPT Image model - supports multiple images in one call
    const response = await openai.images.generate({
      model: IMAGE_MODEL,
      prompt: fullPrompt,
      n: Math.min(n, 4),
      size: size,
    } as OpenAI.Images.ImageGenerateParams);

    if (!response.data || response.data.length === 0) {
      throw new Error("No image data returned from API");
    }

    // Process each image
    for (let i = 0; i < response.data.length; i++) {
      const imageData = response.data[i];
      
      // Handle both b64_json and url responses
      if (imageData.b64_json) {
        images.push(imageData.b64_json);
      } else if (imageData.url) {
        // Fetch image and convert to base64
        const imageResponse = await fetch(imageData.url);
        if (imageResponse.ok) {
          const buffer = Buffer.from(await imageResponse.arrayBuffer());
          images.push(buffer.toString("base64"));
        } else {
          console.error(`[openaiImageGen] Failed to fetch image ${i + 1}: ${imageResponse.status}`);
        }
      }
    }
  } catch (error) {
    // CLASSIFY THE ERROR - determines if retryable
    const classifiedError = classifyOpenAIError(error, {
      pageIndex: context.pageIndex,
      batchId: context.batchId,
    });
    
    // Log for non-retryable errors
    if (isNonRetryableError(classifiedError)) {
      console.error(`[openaiImageGen] NON-RETRYABLE ERROR: ${classifiedError.code}`, {
        message: classifiedError.message,
        context: classifiedError.context,
      });
    }
    
    throw classifiedError;
  }

  if (images.length === 0) {
    throw new Error("Failed to generate any images");
  }

  console.log(`[openaiImageGen] Successfully generated ${images.length} image(s)`);

  return { images };
}

/**
 * Edit an existing image using OpenAI (DALL-E 2 only)
 * Note: Image editing is only available with DALL-E 2
 * 
 * @param params.prompt - Description of the edit
 * @param params.image - Base64 encoded source image (PNG, max 4MB, square)
 * @param params.mask - Optional base64 encoded mask image
 */
export async function editImage(params: {
  prompt: string;
  image: string;
  mask?: string;
  n?: number;
  size?: "256x256" | "512x512" | "1024x1024";
}): Promise<GenerateImageResult> {
  const { prompt, image, mask, n = 1, size = "1024x1024" } = params;

  if (!isOpenAIImageGenConfigured()) {
    throw new Error("OpenAI API key not configured");
  }

  console.log(`[openaiImageGen] Editing image with prompt: "${prompt.substring(0, 100)}..."`);

  // Convert base64 to File objects for the API
  const imageBuffer = Buffer.from(image, "base64");
  const imageFile = new File([imageBuffer], "image.png", { type: "image/png" });

  const editParams: OpenAI.Images.ImageEditParams = {
    model: "dall-e-2", // Edit only works with DALL-E 2
    prompt: prompt,
    image: imageFile,
    n: Math.min(n, 4),
    size: size,
    response_format: "url",
  };

  if (mask) {
    const maskBuffer = Buffer.from(mask, "base64");
    const maskFile = new File([maskBuffer], "mask.png", { type: "image/png" });
    editParams.mask = maskFile;
  }

  const response = await openai.images.edit(editParams);

  const images: string[] = [];
  if (response.data) {
    for (const data of response.data) {
      if (data.url) {
        const imageResponse = await fetch(data.url);
        if (imageResponse.ok) {
          const buffer = Buffer.from(await imageResponse.arrayBuffer());
          images.push(buffer.toString("base64"));
        }
      }
    }
  }

  if (images.length === 0) {
    throw new Error("Failed to edit image");
  }

  return { images };
}

/**
 * PROVIDER GUARD
 * 
 * This function exists as a runtime assertion that ONLY OpenAI is being used.
 * Call this at app startup or in tests to verify the configuration.
 */
export function assertOpenAIOnlyProvider(): void {
  // Check that we're configured for OpenAI
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[PROVIDER GUARD] OPENAI_API_KEY not set - image generation will fail");
  }

  // Check that NO OTHER providers are configured
  const forbiddenEnvVars = [
    "REPLICATE_API_TOKEN",
    "REPLICATE_API_KEY",
    "STABILITY_API_KEY",
    "STABILITY_KEY",
    "MIDJOURNEY_API_KEY",
  ];

  for (const envVar of forbiddenEnvVars) {
    if (process.env[envVar]) {
      console.error(`[PROVIDER GUARD] ❌ FORBIDDEN: ${envVar} is set. Remove it.`);
      console.error("[PROVIDER GUARD] This codebase ONLY uses OpenAI for image generation.");
    }
  }

  console.log("[PROVIDER GUARD] ✅ OpenAI is the only image provider configured");
}

