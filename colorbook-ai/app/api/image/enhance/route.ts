import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { z } from "zod";

/**
 * Route segment config
 */
export const maxDuration = 300; // Enhancement can take time

const requestSchema = z.object({
  // Either provide imageBase64 or imageUrl
  imageBase64: z.string().optional(),
  imageUrl: z.string().url().optional(),
  // Scale factor (2x default)
  scale: z.number().min(1).max(4).default(2),
}).refine(data => data.imageBase64 || data.imageUrl, {
  message: "Either imageBase64 or imageUrl is required",
});

/**
 * POST /api/image/enhance
 * 
 * Upscales an image using Replicate's image enhancement models.
 * Returns the enhanced image as base64.
 */
export async function POST(request: NextRequest) {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  
  if (!apiToken) {
    console.error("[enhance] REPLICATE_API_TOKEN not configured");
    return NextResponse.json(
      { error: "Image enhancement service not configured. Please add REPLICATE_API_TOKEN to your environment." },
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

    const { imageBase64, imageUrl, scale } = parseResult.data;

    // Prepare input image
    let inputImage: string;
    if (imageUrl) {
      inputImage = imageUrl;
    } else if (imageBase64) {
      // Convert base64 to data URI for Replicate
      inputImage = `data:image/png;base64,${imageBase64}`;
    } else {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    console.log(`[enhance] Starting enhancement with scale=${scale}`);

    const replicate = new Replicate({
      auth: apiToken,
    });

    // Use real-esrgan for reliable upscaling
    // Model: nightmareai/real-esrgan - popular and reliable
    const output = await replicate.run(
      "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
      {
        input: {
          image: inputImage,
          scale: scale,
          face_enhance: false,
        },
      }
    );

    console.log("[enhance] Replicate output type:", typeof output);

    // The output should be a URL
    let enhancedUrl: string;
    if (typeof output === "string") {
      enhancedUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      enhancedUrl = output[0] as string;
    } else if (output && typeof output === "object" && "url" in output) {
      enhancedUrl = (output as { url: string }).url;
    } else {
      console.error("[enhance] Unexpected output format:", output);
      throw new Error("Unexpected output format from enhancement model");
    }

    console.log(`[enhance] Enhancement complete, fetching result...`);

    // Fetch the enhanced image and convert to base64
    const enhancedResponse = await fetch(enhancedUrl);
    if (!enhancedResponse.ok) {
      throw new Error("Failed to fetch enhanced image");
    }
    
    const arrayBuffer = await enhancedResponse.arrayBuffer();
    const enhancedBase64 = Buffer.from(arrayBuffer).toString("base64");

    console.log(`[enhance] Enhanced image size: ${enhancedBase64.length} chars`);

    return NextResponse.json({
      enhancedImageBase64: enhancedBase64,
      enhancedImageUrl: enhancedUrl,
      scale,
    });

  } catch (error) {
    console.error("[enhance] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to enhance image" },
      { status: 500 }
    );
  }
}
