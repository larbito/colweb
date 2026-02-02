import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import type { ImageAnalysis } from "@/lib/coloringPageTypes";

const requestSchema = z.object({
  imageBase64: z.string().min(1, "Image is required"),
});

/**
 * POST /api/analyze-image
 * 
 * Analyzes an uploaded coloring page image using GPT-4o vision
 * to extract character, style, scene, and constraint information.
 * 
 * This is the REAL analysis - not fake/generic extraction.
 */
export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) {
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

    const { imageBase64 } = parseResult.data;

    // Detect media type
    let mediaType = "image/png";
    if (imageBase64.startsWith("/9j/")) {
      mediaType = "image/jpeg";
    }

    console.log("[analyze-image] Starting vision analysis...");

    // The detailed vision analysis prompt
    const analysisPrompt = `You are an expert at analyzing children's coloring book pages. Analyze this image in EXTREME DETAIL.

Your task is to extract a comprehensive JSON that captures everything needed to recreate similar pages in the exact same style.

ANALYZE THE IMAGE CAREFULLY AND EXTRACT:

1. CHARACTER DETAILS:
   - What species/type of character is this? (bear, unicorn, cat, bunny, etc.)
   - What special features does it have? (horn, wings, crown, etc.)
   - How are the eyes drawn? (big round, small dots, cute anime style, etc.)
   - What are the body proportions? (big head small body, realistic, chibi, etc.)
   - What pose is the character in?
   - What clothing/accessories are they wearing?

2. LINE ART STYLE:
   - How thick are the outer contour lines? (thin/medium/thick)
   - How thick are the inner detail lines? (thin/medium/thick)
   - Describe the overall line style (smooth vector, sketchy, geometric, etc.)
   - Is there any shading? (none/minimal/heavy)

3. SCENE DETAILS:
   - What location/setting is this? (kitchen, bedroom, outdoor, etc.)
   - What props/objects are in the foreground?
   - What's in the background?
   - How is the composition arranged?

4. STYLE CONSTRAINTS:
   - List ALL the style rules that make this a proper coloring page

OUTPUT ONLY THIS JSON (no markdown, no explanation):
{
  "character": {
    "species": "string - the main character type",
    "special_features": ["array of special features like horn, wings, etc"],
    "eye_style": "string - describe how eyes are drawn",
    "body_proportions": "string - describe proportions",
    "pose": "string - describe the pose",
    "clothing_accessories": ["array of clothing/accessories worn"]
  },
  "line_art": {
    "outer_line_weight": "thin" | "medium" | "thick",
    "inner_line_weight": "thin" | "medium" | "thick",
    "style": "string - describe line style",
    "shading": "none" | "minimal" | "heavy"
  },
  "scene": {
    "location": "string - the setting",
    "props": ["array of foreground objects"],
    "background": ["array of background elements"],
    "composition": "string - describe arrangement"
  },
  "constraints": [
    "black and white only",
    "no color",
    "no grayscale shading",
    "no cross-hatching",
    "white background",
    "closed shapes for coloring",
    "child-friendly",
    "print-ready"
  ]
}

Be EXTREMELY specific and accurate. This will be used to generate matching pages.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: analysisPrompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mediaType};base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.2, // Low temperature for consistent analysis
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from vision model" },
        { status: 500 }
      );
    }

    console.log("[analyze-image] Raw response:", content.substring(0, 500));

    // Parse the JSON response
    let analysis: ImageAnalysis;
    try {
      // Clean the response - remove markdown code blocks if present
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      }
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      const parsed = JSON.parse(jsonStr);

      // Build character signature for consistency
      const characterSignature = buildCharacterSignature(parsed);
      const styleLock = buildStyleLock(parsed);

      analysis = {
        character: {
          species: parsed.character?.species || "cute animal",
          special_features: parsed.character?.special_features || [],
          eye_style: parsed.character?.eye_style || "big round cute eyes",
          body_proportions: parsed.character?.body_proportions || "large head small body",
          pose: parsed.character?.pose || "standing",
          clothing_accessories: parsed.character?.clothing_accessories || [],
        },
        line_art: {
          outer_line_weight: validateLineWeight(parsed.line_art?.outer_line_weight),
          inner_line_weight: validateLineWeight(parsed.line_art?.inner_line_weight),
          style: parsed.line_art?.style || "clean smooth vector-like outlines",
          shading: validateShading(parsed.line_art?.shading),
        },
        scene: {
          location: parsed.scene?.location || "indoor",
          props: parsed.scene?.props || [],
          background: parsed.scene?.background || [],
          composition: parsed.scene?.composition || "character centered",
        },
        constraints: parsed.constraints || getDefaultConstraints(),
        character_signature: characterSignature,
        style_lock: styleLock,
      };

    } catch (parseError) {
      console.error("[analyze-image] JSON parse error:", parseError);
      return NextResponse.json(
        { error: "Failed to parse vision analysis. Please try again." },
        { status: 500 }
      );
    }

    console.log("[analyze-image] Analysis complete:", {
      character: analysis.character.species,
      location: analysis.scene.location,
      lineStyle: analysis.line_art.outer_line_weight,
    });

    return NextResponse.json({
      analysis,
      debug: {
        model: "gpt-4o",
        tokensUsed: response.usage?.total_tokens,
      },
    });

  } catch (error) {
    console.error("[analyze-image] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}

function validateLineWeight(value: unknown): "thin" | "medium" | "thick" {
  if (value === "thin" || value === "medium" || value === "thick") return value;
  return "thick";
}

function validateShading(value: unknown): "none" | "minimal" | "heavy" {
  if (value === "none" || value === "minimal" || value === "heavy") return value;
  return "none";
}

function getDefaultConstraints(): string[] {
  return [
    "black and white only",
    "no color",
    "no grayscale shading",
    "no gradients",
    "no cross-hatching",
    "no sketchy lines",
    "white background",
    "closed shapes for coloring",
    "child-friendly",
    "print-ready",
  ];
}

function buildCharacterSignature(parsed: Record<string, unknown>): string {
  const char = parsed.character as Record<string, unknown> | undefined;
  if (!char) return "cute cartoon character";
  
  const parts: string[] = [];
  
  if (char.species) parts.push(String(char.species));
  if (Array.isArray(char.special_features) && char.special_features.length > 0) {
    parts.push(`with ${char.special_features.join(" and ")}`);
  }
  if (char.eye_style) parts.push(String(char.eye_style));
  if (char.body_proportions) parts.push(String(char.body_proportions));
  
  return parts.join(", ") || "cute cartoon character";
}

function buildStyleLock(parsed: Record<string, unknown>): string {
  const lineArt = parsed.line_art as Record<string, unknown> | undefined;
  const outerWeight = lineArt?.outer_line_weight || "thick";
  const style = lineArt?.style || "clean smooth vector-like outlines";
  
  return `cute kids coloring book, ${outerWeight} clean outline, ${style}, no shading, white background, print-ready coloring page`;
}









