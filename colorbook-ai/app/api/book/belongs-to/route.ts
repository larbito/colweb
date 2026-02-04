import { NextRequest, NextResponse } from "next/server";
import { generateImage, isOpenAIImageGenConfigured, type ImageSize as DalleImageSize } from "@/lib/services/openaiImageGen";
import { z } from "zod";
import {
  buildFinalColoringPrompt,
  type ImageSize,
} from "@/lib/coloringPagePromptEnforcer";
import { processPageToLetter, LETTER_WIDTH, LETTER_HEIGHT } from "@/lib/imageProcessing";

// Map sizes to DALL-E 3 compatible sizes
const SIZE_TO_DALLE: Record<string, DalleImageSize> = {
  "1024x1024": "1024x1024",
  "1024x1792": "1024x1792",
  "1792x1024": "1792x1024",
};

/**
 * Route segment config
 */
export const maxDuration = 180;

const requestSchema = z.object({
  // Character profile for the book's main character
  characterProfile: z.object({
    species: z.string(),
    faceShape: z.string().optional(),
    eyeStyle: z.string().optional(),
    proportions: z.string().optional(),
    clothing: z.string().optional(),
    keyFeatures: z.array(z.string()).optional(),
  }).optional(),
  // Fallback character description if no profile
  characterDescription: z.string().optional(),
  // Page configuration
  size: z.enum(["1024x1024", "1024x1792", "1792x1024"]).default("1024x1792"),
  // Customization
  labelText: z.string().default("THIS BOOK BELONGS TO:"),
  style: z.enum(["cute", "playful", "elegant"]).default("cute"),
  // Whether to auto-process to Letter format
  autoProcess: z.boolean().default(true),
});

/**
 * Enhance image using Replicate API
 */
async function enhanceImage(imageBase64: string, scale: number = 2): Promise<string | null> {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  
  if (!apiToken) {
    console.log("[belongs-to] REPLICATE_API_TOKEN not configured, skipping enhancement");
    return null;
  }

  try {
    const inputImage = `data:image/png;base64,${imageBase64}`;
    
    console.log(`[belongs-to] Enhancing image with scale=${scale}`);

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
      console.error("[belongs-to] Enhancement API error:", createResponse.status);
      return null;
    }

    let prediction = await createResponse.json();

    while (prediction.status === "starting" || prediction.status === "processing") {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { "Authorization": `Bearer ${apiToken}` },
      });
      
      if (!pollResponse.ok) {
        return null;
      }
      
      prediction = await pollResponse.json();
    }

    if (prediction.status !== "succeeded") {
      return null;
    }

    const output = prediction.output;
    const enhancedUrl = typeof output === "string" ? output : (Array.isArray(output) ? output[0] : null);
    
    if (!enhancedUrl) return null;

    const enhancedResponse = await fetch(enhancedUrl);
    if (!enhancedResponse.ok) return null;
    
    const arrayBuffer = await enhancedResponse.arrayBuffer();
    return Buffer.from(arrayBuffer).toString("base64");
  } catch (error) {
    console.error("[belongs-to] Enhancement error:", error);
    return null;
  }
}

/**
 * POST /api/book/belongs-to
 * 
 * Generates a "Belongs To" page for a coloring book.
 * Includes auto-processing pipeline:
 * 1. Generate image
 * 2. Enhance (optional, via Replicate)
 * 3. Reframe to US Letter (2550x3300)
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

    const { 
      characterProfile, 
      characterDescription, 
      size, 
      labelText,
      style,
      autoProcess,
    } = parseResult.data;

    // Build character description for the prompt
    let charDesc = "a cute friendly cartoon character";
    if (characterProfile) {
      const parts = [characterProfile.species];
      if (characterProfile.proportions) parts.push(`with ${characterProfile.proportions}`);
      if (characterProfile.faceShape) parts.push(`${characterProfile.faceShape} face`);
      if (characterProfile.eyeStyle) parts.push(`${characterProfile.eyeStyle} eyes`);
      charDesc = parts.join(", ");
      
      if (characterProfile.keyFeatures && characterProfile.keyFeatures.length > 0) {
        charDesc += `. Key features: ${characterProfile.keyFeatures.slice(0, 5).join(", ")}`;
      }
    } else if (characterDescription) {
      charDesc = characterDescription;
    }

    // Style-specific descriptions
    const styleDescriptions = {
      cute: "adorable kawaii style, big expressive eyes, friendly wide smile, soft rounded features",
      playful: "fun energetic style, dynamic pose, cheerful expression, bouncy proportions",
      elegant: "graceful style, gentle pose, soft expression, delicate refined details",
    };

    // Build the belongs-to page prompt - optimized for full-page fill
    const belongsToPrompt = `Create a "Belongs To" coloring book ownership page. US Letter portrait format.

LAYOUT (TOP TO BOTTOM):
1. TOP ZONE (top 25%): Large outlined decorative text "${labelText}" in a fun, bold, kid-friendly bubble font style. Text should be large and centered, taking up most of the top area.

2. NAME FIELD ZONE (below text, about 10% height): A long horizontal OUTLINED rectangle or decorative blank line where a child can write their name. Make it wide (spanning 70% of page width), centered, with simple decorative corners or flourishes.

3. CHARACTER ZONE (lower 55%): ${charDesc}, ${styleDescriptions[style]}.
   - Character is LARGE, filling most of this zone
   - Facing forward or slightly turned, looking happy and welcoming
   - Can hold a pencil, crayon, book, or be waving
   - Character feet/base touching near the bottom edge

4. DECORATIONS (scattered throughout):
   - 4-6 simple outlined stars (different sizes) scattered around
   - 3-4 simple outlined hearts scattered around
   - Simple confetti dots or circles near edges
   - Optional: small flowers or sparkles near character

CRITICAL REQUIREMENTS:
- Fill the ENTIRE page from top to bottom
- Ground/floor line visible at the VERY bottom edge
- Text at TOP, character at BOTTOM - no big gaps
- Everything centered and balanced
- Simple foreground elements (small flowers, pebbles, grass tufts) at bottom edge

This is a COLORING PAGE: pure black outlines on white background, NO fills, NO grayscale, NO shading.`;

    // Build the final prompt with all constraints
    const finalPrompt = buildFinalColoringPrompt(belongsToPrompt, {
      includeNegativeBlock: true,
      maxLength: 3800,
      size: size as ImageSize,
      extraBottomReinforcement: true,
    });

    console.log("[belongs-to] Generating belongs-to page for:", charDesc.slice(0, 80));

    // Generate the image with DALL-E 3 compatible size
    const dalleSize = SIZE_TO_DALLE[size] || "1024x1792";
    const result = await generateImage({
      prompt: finalPrompt,
      n: 1,
      size: dalleSize,
    });

    if (!result.images || result.images.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate belongs-to page" },
        { status: 500 }
      );
    }

    const originalBase64 = result.images[0];
    console.log("[belongs-to] Successfully generated belongs-to page");

    // Auto-process pipeline
    if (autoProcess) {
      console.log("[belongs-to] Starting auto-process pipeline...");
      
      // Step 1: Enhance
      let imageToProcess = originalBase64;
      let enhancedBase64: string | undefined;
      
      const enhanced = await enhanceImage(originalBase64, 2);
      if (enhanced) {
        enhancedBase64 = enhanced;
        imageToProcess = enhanced;
        console.log("[belongs-to] Enhancement complete");
      }
      
      // Step 2: Reframe to Letter
      console.log(`[belongs-to] Reframing to Letter format (${LETTER_WIDTH}x${LETTER_HEIGHT})`);
      const processResult = await processPageToLetter(imageToProcess, {
        marginPercent: 3,
        validateBottom: true,
        retryWithSmallerMargin: true,
      });
      
      console.log(`[belongs-to] Reframe complete. Coverage: ${(processResult.validation.artworkCoverage * 100).toFixed(1)}%`);

      return NextResponse.json({
        // Original generated image
        imageBase64: originalBase64,
        
        // Enhanced image (if available)
        enhancedImageBase64: enhancedBase64,
        
        // Final Letter format - USE THIS FOR PDF
        finalLetterBase64: processResult.finalLetterBase64,
        
        // Metadata
        characterUsed: charDesc,
        width: LETTER_WIDTH,
        height: LETTER_HEIGHT,
        
        // Validation
        validation: {
          isValid: processResult.validation.isValid,
          bottomEmptyPercent: processResult.validation.bottomEmptyPercent,
          artworkCoverage: processResult.validation.artworkCoverage,
        },
        
        // Status
        wasEnhanced: !!enhancedBase64,
        wasReframed: true,
      });
    }

    // Return without processing
    return NextResponse.json({
      imageBase64: originalBase64,
      characterUsed: charDesc,
    });

  } catch (error) {
    console.error("[belongs-to] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate belongs-to page" },
      { status: 500 }
    );
  }
}
