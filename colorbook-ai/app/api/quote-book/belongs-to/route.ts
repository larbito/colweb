import { NextRequest, NextResponse } from "next/server";
import { generateImage, isOpenAIImageGenConfigured } from "@/lib/services/openaiImageGen";
import { z } from "zod";
import {
  buildQuoteBelongsToPrompt,
  CRITICAL_COLORING_PAGE_RULES,
  type DecorationLevel,
  type DecorationTheme,
  type IconSet,
  type TypographyStyle,
  type FrameStyle,
} from "@/lib/quotePagePromptEnforcer";
import { processPageToLetter, LETTER_WIDTH, LETTER_HEIGHT } from "@/lib/imageProcessing";

/**
 * Route segment config
 */
export const maxDuration = 180;

const requestSchema = z.object({
  // Style settings (matching the book's style)
  decorationLevel: z.enum(["text_only", "minimal_icons", "border_only", "full_background"]).default("minimal_icons"),
  decorationTheme: z.enum(["floral", "stars", "mandala", "hearts", "nature", "geometric", "doodles", "mixed"]).default("stars"),
  iconSet: z.enum(["stars", "hearts", "doodles", "sports", "kids"]).default("stars"),
  typographyStyle: z.enum(["bubble", "script", "block", "mixed"]).default("bubble"),
  frameStyle: z.enum(["none", "thin", "corners"]).default("thin"),
  
  // Page configuration
  size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).default("1024x1536"),
  
  // Customization
  labelText: z.string().default("THIS BOOK BELONGS TO:"),
  
  // Whether to auto-process to Letter format
  autoProcess: z.boolean().default(true),
});

/**
 * Enhance image using Replicate API
 */
async function enhanceImage(imageBase64: string, scale: number = 2): Promise<string | null> {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  
  if (!apiToken) {
    console.log("[quote-belongs-to] REPLICATE_API_TOKEN not configured, skipping enhancement");
    return null;
  }

  try {
    const inputImage = `data:image/png;base64,${imageBase64}`;
    
    console.log(`[quote-belongs-to] Enhancing image with scale=${scale}`);

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
      console.error("[quote-belongs-to] Enhancement API error:", createResponse.status);
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
    console.error("[quote-belongs-to] Enhancement error:", error);
    return null;
  }
}

/**
 * POST /api/quote-book/belongs-to
 * 
 * Generates a "Belongs To" page specifically for Quote Books.
 * NO CHARACTERS - only typography and decorations matching the book's style.
 * 
 * Includes auto-processing pipeline:
 * 1. Generate image (decoration-based, no characters)
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
      decorationLevel,
      decorationTheme,
      iconSet,
      typographyStyle,
      frameStyle,
      size, 
      labelText,
      autoProcess,
    } = parseResult.data;

    // Build the belongs-to prompt using the decoration-based builder (NO CHARACTERS)
    const basePrompt = buildQuoteBelongsToPrompt({
      decorationLevel,
      decorationTheme,
      iconSet,
      typographyStyle,
      frameStyle,
    });

    // Add custom label text if different from default
    let finalPrompt = basePrompt;
    if (labelText !== "THIS BOOK BELONGS TO:") {
      finalPrompt = basePrompt.replace("THIS BOOK BELONGS TO:", labelText);
    }

    // Add page fill requirements
    finalPrompt += `

=== PAGE FILL REQUIREMENTS ===
- Full-page composition, artwork fills 92-97% of page height.
- Title text at TOP (large and centered).
- Name line/box in upper-middle area.
- Decorations fill remaining space according to decoration level.
- Minimal top/bottom margins.

*** FINAL REMINDER: NO animals, NO characters, NO mascots. Typography + decorations only. ***`;

    console.log(`[quote-belongs-to] Generating belongs-to page (level: ${decorationLevel}, theme: ${decorationTheme})`);

    // Generate the image
    const result = await generateImage({
      prompt: finalPrompt,
      n: 1,
      size: size as "1024x1024" | "1024x1536" | "1536x1024",
    });

    if (!result.images || result.images.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate belongs-to page" },
        { status: 500 }
      );
    }

    const originalBase64 = result.images[0];
    console.log("[quote-belongs-to] Successfully generated belongs-to page (no characters)");

    // Auto-process pipeline
    if (autoProcess) {
      console.log("[quote-belongs-to] Starting auto-process pipeline...");
      
      // Step 1: Enhance
      let imageToProcess = originalBase64;
      let enhancedBase64: string | undefined;
      
      const enhanced = await enhanceImage(originalBase64, 2);
      if (enhanced) {
        enhancedBase64 = enhanced;
        imageToProcess = enhanced;
        console.log("[quote-belongs-to] Enhancement complete");
      }
      
      // Step 2: Reframe to Letter
      console.log(`[quote-belongs-to] Reframing to Letter format (${LETTER_WIDTH}x${LETTER_HEIGHT})`);
      const processResult = await processPageToLetter(imageToProcess, {
        marginPercent: 3,
        validateBottom: true,
        retryWithSmallerMargin: true,
      });
      
      console.log(`[quote-belongs-to] Reframe complete. Coverage: ${(processResult.validation.artworkCoverage * 100).toFixed(1)}%`);

      return NextResponse.json({
        // Original generated image
        imageBase64: originalBase64,
        
        // Enhanced image (if available)
        enhancedImageBase64: enhancedBase64,
        
        // Final Letter format - USE THIS FOR PDF
        finalLetterBase64: processResult.finalLetterBase64,
        
        // Metadata
        decorationLevel,
        decorationTheme,
        typographyStyle,
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
        
        // Confirm no character was used
        noCharacter: true,
      });
    }

    // Return without processing
    return NextResponse.json({
      imageBase64: originalBase64,
      decorationLevel,
      decorationTheme,
      typographyStyle,
      noCharacter: true,
    });

  } catch (error) {
    console.error("[quote-belongs-to] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate belongs-to page" },
      { status: 500 }
    );
  }
}

