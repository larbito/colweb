import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { processPageToLetter, LETTER_WIDTH, LETTER_HEIGHT } from "@/lib/imageProcessing";

/**
 * Route segment config
 */
export const maxDuration = 300; // Processing can take time

const requestSchema = z.object({
  // Image to process (base64)
  imageBase64: z.string().min(1, "Image is required"),
  
  // Whether to enhance first (via Replicate)
  enhance: z.boolean().default(true),
  
  // Enhancement scale factor
  enhanceScale: z.number().min(1).max(4).default(2),
  
  // Margin for reframing (percentage)
  marginPercent: z.number().min(1).max(10).default(3),
  
  // Page ID (for tracking)
  pageId: z.string().optional(),
});

/**
 * Enhance image using Replicate API directly
 */
async function enhanceImage(imageBase64: string, scale: number): Promise<string> {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  
  if (!apiToken) {
    throw new Error("REPLICATE_API_TOKEN not configured");
  }

  // Prepare data URL for Replicate
  const inputImage = `data:image/png;base64,${imageBase64}`;
  
  console.log(`[process] Enhancing image with scale=${scale}`);

  // Create prediction
  const createResponse = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      "Prefer": "wait",
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
    throw new Error(errorData.detail || `Replicate API error: ${createResponse.status}`);
  }

  let prediction = await createResponse.json();

  // Poll for result if not completed
  while (prediction.status === "starting" || prediction.status === "processing") {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { "Authorization": `Bearer ${apiToken}` },
    });
    
    if (!pollResponse.ok) {
      throw new Error(`Failed to poll prediction: ${pollResponse.status}`);
    }
    
    prediction = await pollResponse.json();
  }

  if (prediction.status === "failed") {
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
    throw new Error("Unexpected output format from enhancement model");
  }

  // Fetch and convert to base64
  const enhancedResponse = await fetch(enhancedUrl);
  if (!enhancedResponse.ok) {
    throw new Error("Failed to fetch enhanced image");
  }
  
  const arrayBuffer = await enhancedResponse.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

/**
 * POST /api/image/process
 * 
 * Unified image processing pipeline:
 * 1. Optionally enhance image (Replicate)
 * 2. Reframe to US Letter format (2550x3300)
 * 3. Validate bottom fill
 * 
 * Returns processed image ready for PDF export.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { imageBase64, enhance, enhanceScale, marginPercent, pageId } = parseResult.data;
    
    console.log(`[process] Starting pipeline for page ${pageId || "unknown"}`);
    console.log(`[process] Options: enhance=${enhance}, scale=${enhanceScale}, margin=${marginPercent}%`);

    let imageToProcess = imageBase64;
    let enhancedBase64: string | undefined;

    // Step 1: Enhance (optional)
    if (enhance) {
      try {
        enhancedBase64 = await enhanceImage(imageBase64, enhanceScale);
        imageToProcess = enhancedBase64;
        console.log(`[process] Enhancement complete`);
      } catch (enhanceError) {
        console.error("[process] Enhancement failed:", enhanceError);
        // Continue with original image if enhancement fails
        console.log("[process] Continuing with original image");
      }
    }

    // Step 2: Reframe to Letter format
    console.log(`[process] Reframing to Letter format (${LETTER_WIDTH}x${LETTER_HEIGHT})`);
    const processResult = await processPageToLetter(imageToProcess, {
      marginPercent,
      validateBottom: true,
      retryWithSmallerMargin: true,
    });

    console.log(`[process] Reframe complete. Coverage: ${(processResult.validation.artworkCoverage * 100).toFixed(1)}%`);
    console.log(`[process] Bottom empty: ${(processResult.validation.bottomEmptyPercent * 100).toFixed(1)}%`);

    return NextResponse.json({
      pageId,
      
      // Original image (unchanged)
      originalBase64: imageBase64,
      
      // Enhanced image (if enhancement was done)
      enhancedBase64,
      
      // Final Letter format (2550x3300) - use this for PDF
      finalLetterBase64: processResult.finalLetterBase64,
      
      // Dimensions
      width: processResult.width,
      height: processResult.height,
      
      // Validation
      validation: {
        isValid: processResult.validation.isValid,
        bottomEmptyPercent: processResult.validation.bottomEmptyPercent,
        hasEmptyBottom: processResult.validation.hasEmptyBottom,
        artworkCoverage: processResult.validation.artworkCoverage,
      },
      
      // Processing info
      marginUsed: processResult.marginUsed,
      wasRetried: processResult.wasRetried,
      wasEnhanced: !!enhancedBase64,
    });

  } catch (error) {
    console.error("[process] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process image" },
      { status: 500 }
    );
  }
}

