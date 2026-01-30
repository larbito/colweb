import { NextRequest, NextResponse } from "next/server";
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
 * Uses HTTP API directly for reliability.
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

    // Use Replicate HTTP API directly
    // Model: nightmareai/real-esrgan for reliable upscaling
    const createResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        "Prefer": "wait", // Wait for result instead of polling
      },
      body: JSON.stringify({
        version: "f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
        input: {
          image: inputImage,
          scale: scale,
          face_enhance: false,
        },
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}));
      console.error("[enhance] Replicate API error:", errorData);
      throw new Error(errorData.detail || `Replicate API error: ${createResponse.status}`);
    }

    let prediction = await createResponse.json();
    console.log("[enhance] Prediction status:", prediction.status);

    // If not completed yet, poll for result
    while (prediction.status === "starting" || prediction.status === "processing") {
      console.log("[enhance] Polling for result...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          "Authorization": `Bearer ${apiToken}`,
        },
      });
      
      if (!pollResponse.ok) {
        throw new Error(`Failed to poll prediction: ${pollResponse.status}`);
      }
      
      prediction = await pollResponse.json();
      console.log("[enhance] Poll status:", prediction.status);
    }

    if (prediction.status === "failed") {
      console.error("[enhance] Prediction failed:", prediction.error);
      throw new Error(prediction.error || "Enhancement failed");
    }

    if (prediction.status !== "succeeded") {
      throw new Error(`Unexpected prediction status: ${prediction.status}`);
    }

    // Get the output URL
    const output = prediction.output;
    let enhancedUrl: string;
    
    if (typeof output === "string") {
      enhancedUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      enhancedUrl = output[0];
    } else {
      console.error("[enhance] Unexpected output format:", output);
      throw new Error("Unexpected output format from enhancement model");
    }

    console.log(`[enhance] Enhancement complete, fetching result from: ${enhancedUrl.slice(0, 50)}...`);

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
