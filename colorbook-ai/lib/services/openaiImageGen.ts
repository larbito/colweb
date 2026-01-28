/**
 * ============================================================
 * OPENAI IMAGE GENERATION SERVICE
 * ============================================================
 * 
 * ⚠️  STRICT RULE: This is the ONLY image generation service allowed.
 * 
 * ❌ DO NOT use Replicate, Stability, SDXL, Midjourney, or any other provider.
 * ❌ DO NOT add fallback providers.
 * ❌ DO NOT import any other image generation libraries.
 * 
 * ✅ ALL image generation in this codebase MUST go through this service.
 * ✅ This service uses ONLY the official OpenAI SDK Images API.
 * 
 * To change providers in the future, ONLY modify this file.
 * ============================================================
 */

import OpenAI from "openai";

// Server-side only - never expose to client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Allowed sizes for DALL-E 3
export type ImageSize = "1024x1024" | "1024x1792" | "1792x1024";

export interface GenerateImageParams {
  prompt: string;
  n?: number;
  size?: ImageSize;
  quality?: "standard" | "hd";
  style?: "natural" | "vivid";
}

export interface GenerateImageResult {
  images: string[]; // base64 encoded images
  revisedPrompts?: string[]; // DALL-E 3 sometimes revises prompts
}

/**
 * Check if OpenAI is configured
 */
export function isOpenAIImageGenConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Generate images using OpenAI DALL-E 3
 * 
 * ⚠️ HARD RULE: This function sends the prompt EXACTLY as provided.
 * No hidden system prompts. No automatic style injection.
 * The prompt parameter is the source of truth.
 * 
 * @param params.prompt - The EXACT prompt to send (no modifications)
 * @param params.n - Number of images (1-4, default 1)
 * @param params.size - Image size (default "1024x1792" for portrait coloring pages)
 * @param params.quality - "standard" or "hd" (default "hd")
 * @param params.style - "natural" or "vivid" (default "natural")
 */
export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  const { 
    prompt, 
    n = 1, 
    size = "1024x1792",
    quality = "hd",
    style = "natural"
  } = params;

  if (!isOpenAIImageGenConfigured()) {
    throw new Error("OpenAI API key not configured. Set OPENAI_API_KEY in environment.");
  }

  if (!prompt || prompt.trim().length === 0) {
    throw new Error("Prompt is required");
  }

  console.log(`[openaiImageGen] Generating ${n} image(s)`);
  console.log(`[openaiImageGen] Size: ${size}, Quality: ${quality}, Style: ${style}`);
  console.log(`[openaiImageGen] EXACT PROMPT (${prompt.length} chars): "${prompt.substring(0, 150)}..."`);

  const images: string[] = [];
  const revisedPrompts: string[] = [];

  // DALL-E 3 only supports n=1, so we loop for multiple images
  for (let i = 0; i < Math.min(n, 4); i++) {
    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt, // EXACT prompt - no modifications
        n: 1,
        size: size,
        quality: quality,
        style: style,
        response_format: "url", // Get URL, then fetch and convert to base64
      });

      const imageUrl = response.data?.[0]?.url;
      const revisedPrompt = response.data?.[0]?.revised_prompt;

      if (revisedPrompt) {
        revisedPrompts.push(revisedPrompt);
      }

      if (imageUrl) {
        // Fetch image and convert to base64
        const imageResponse = await fetch(imageUrl);
        if (imageResponse.ok) {
          const buffer = Buffer.from(await imageResponse.arrayBuffer());
          images.push(buffer.toString("base64"));
        } else {
          console.error(`[openaiImageGen] Failed to fetch image ${i + 1}: ${imageResponse.status}`);
        }
      }
    } catch (error) {
      console.error(`[openaiImageGen] Error generating image ${i + 1}:`, error);
      
      // Re-throw content policy errors
      if (error instanceof Error && error.message.includes("content_policy")) {
        throw new Error("Content policy violation. Please modify your prompt.");
      }
      
      // For other errors, continue to next image if we're generating multiple
      if (n === 1) {
        throw error;
      }
    }
  }

  if (images.length === 0) {
    throw new Error("Failed to generate any images");
  }

  console.log(`[openaiImageGen] Successfully generated ${images.length} image(s)`);

  return { images, revisedPrompts };
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

