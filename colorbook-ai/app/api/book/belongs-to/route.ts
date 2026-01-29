import { NextRequest, NextResponse } from "next/server";
import { generateImage, isOpenAIImageGenConfigured } from "@/lib/services/openaiImageGen";
import { z } from "zod";
import {
  buildFinalColoringPrompt,
  type ImageSize,
} from "@/lib/coloringPagePromptEnforcer";
import { type CharacterIdentityProfile } from "@/lib/characterIdentity";

/**
 * Route segment config
 */
export const maxDuration = 120;

const requestSchema = z.object({
  // Character profile for the book's main character
  characterProfile: z.object({
    species: z.string(),
    faceShape: z.string().optional(),
    eyeStyle: z.string().optional(),
    proportions: z.string().optional(),
    clothing: z.string().optional(),
  }).optional(),
  // Fallback character description if no profile
  characterDescription: z.string().optional(),
  // Page configuration
  size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).default("1024x1536"),
  orientation: z.enum(["portrait", "landscape", "square"]).default("portrait"),
  // Customization
  labelText: z.string().default("This book belongs to:"),
  style: z.enum(["cute", "playful", "elegant"]).default("cute"),
});

/**
 * POST /api/book/belongs-to
 * 
 * Generates a "Belongs To" page for a coloring book.
 * Features the book's main character with a name field for kids to write in.
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
      orientation,
      labelText,
      style 
    } = parseResult.data;

    // Build character description for the prompt
    let charDesc = "a cute friendly character";
    if (characterProfile) {
      charDesc = `the ${characterProfile.species}`;
      if (characterProfile.faceShape) charDesc += ` with ${characterProfile.faceShape}`;
      if (characterProfile.proportions) charDesc += `, ${characterProfile.proportions}`;
    } else if (characterDescription) {
      charDesc = characterDescription;
    }

    // Style-specific descriptions
    const styleDescriptions = {
      cute: "adorable, kawaii style, big expressive eyes, friendly smile",
      playful: "fun, energetic, dynamic pose, cheerful expression",
      elegant: "graceful, gentle pose, soft expression, delicate details",
    };

    // Build the belongs-to page prompt
    const belongsToPrompt = `Create a "Belongs To" coloring book page.

MAIN CONTENT:
- At the TOP of the page: Large outlined text saying "${labelText}" in a fun, kid-friendly font style
- Below the text: A long horizontal OUTLINED rectangle or decorative line where a child can write their name (this is the NAME FIELD)
- In the LOWER HALF of the page: ${charDesc}, ${styleDescriptions[style]}, positioned center-bottom

CHARACTER DETAILS:
- The character should be large and fill most of the lower portion
- Character is looking UP toward the name field area with a happy/welcoming expression
- Character can be holding a pencil, book, or waving
- Character feet/base should touch near the bottom edge

DECORATIONS:
- Add 4-6 simple outlined stars scattered around the page
- Add a few simple outlined hearts or confetti dots
- Keep decorations simple and not too busy
- Leave space around the name field for easy writing

LAYOUT:
- Text and name field in upper 35% of the page
- Character fills the lower 65%
- Ground/floor line visible at the very bottom
- All elements well-spaced and balanced

This is a COLORING PAGE: pure black outlines on white, NO fills, NO grayscale.`;

    // Build the final prompt with all constraints
    const finalPrompt = buildFinalColoringPrompt(belongsToPrompt, {
      includeNegativeBlock: true,
      maxLength: 3500,
      size: size as ImageSize,
      extraBottomReinforcement: true,
    });

    console.log("[belongs-to] Generating belongs-to page for:", charDesc.slice(0, 50));

    // Generate the image
    const result = await generateImage({
      prompt: finalPrompt,
      n: 1,
      size: size as ImageSize,
    });

    if (!result.images || result.images.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate belongs-to page" },
        { status: 500 }
      );
    }

    console.log("[belongs-to] Successfully generated belongs-to page");

    return NextResponse.json({
      imageBase64: result.images[0],
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

