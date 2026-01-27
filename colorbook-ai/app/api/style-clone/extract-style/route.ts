import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import type { StyleContract } from "@/lib/styleClone";

const requestSchema = z.object({
  referenceImageBase64: z.string().min(1, "Reference image is required"),
});

/**
 * REAL style extraction using GPT-4o vision
 * Analyzes the uploaded reference image to extract:
 * - Visual style rules (line thickness, composition, etc.)
 * - Theme/world guess (setting, motifs, subjects)
 * - Forbidden elements (what NOT to include)
 */
export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured." },
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

    const { referenceImageBase64 } = parseResult.data;

    // Determine the image media type
    let mediaType = "image/png";
    if (referenceImageBase64.startsWith("/9j/")) {
      mediaType = "image/jpeg";
    } else if (referenceImageBase64.startsWith("iVBOR")) {
      mediaType = "image/png";
    }

    // Detailed vision analysis prompt
    const analysisPrompt = `You are an expert at analyzing coloring book pages. Analyze this reference coloring page image in EXTREME DETAIL.

Your task is to extract a comprehensive "Style Contract" that will be used to generate new pages matching this exact style.

ANALYZE CAREFULLY:

1. LINE WORK:
   - Measure the approximate line thickness (thin ~1-2px, medium ~3-4px, bold ~5-8px)
   - Are lines consistent or varied?
   - How are inner details drawn vs outer contours?
   - Are stroke ends rounded or sharp?

2. COMPOSITION:
   - Where is the main subject positioned? (centered, offset, etc.)
   - How much margin/whitespace around edges?
   - What's the subject-to-background ratio?

3. COMPLEXITY:
   - Count approximate number of elements/props
   - How intricate are the patterns?
   - Is it suitable for young kids (simple) or older (detailed)?

4. BACKGROUND TREATMENT:
   - Is background empty, minimal, or detailed?
   - What kinds of background elements exist?

5. EYES/FACE HANDLING:
   - How are eyes drawn? (outline only, small dots, etc.)
   - Are there any solid black filled areas? Where?

6. THEME/WORLD:
   - What setting/world does this depict?
   - What recurring visual motifs do you see?
   - What subjects/characters are shown?
   - What props and objects appear?

7. STYLE CHARACTERISTICS:
   - Is this kawaii, realistic, cartoonish, etc.?
   - Any distinctive artistic choices?

OUTPUT a JSON object with this EXACT structure:
{
  "styleSummary": "1-2 sentence human-readable summary of the overall style",
  
  "styleContractText": "A detailed 10-15 line STRICT ruleset that MUST be followed to recreate this style. Include specific rules about: line weights (outer vs inner), eye treatment (MUST outline only, tiny dot pupils max, NO solid black fills), composition (centered subject, X% margins), background density, prop count limits, NO shading/gradients/textures/crosshatching allowed.",
  
  "forbiddenList": ["list", "of", "specific", "things", "to", "avoid", "based", "on", "this", "style"],
  
  "recommendedLineThickness": "thin" or "medium" or "bold",
  
  "recommendedComplexity": "simple" or "medium" or "detailed",
  
  "outlineRules": "Specific rules about outline weights and treatment",
  
  "backgroundRules": "Specific rules about background density and elements",
  
  "compositionRules": "Specific rules about subject placement and margins",
  
  "eyeRules": "CRITICAL: How eyes MUST be drawn to avoid solid black fills",
  
  "extractedThemeGuess": "A detailed paragraph describing the likely theme/world/setting, recurring motifs, types of subjects, and visual vocabulary that new scenes should follow to feel cohesive with this reference."
}

Be EXTREMELY specific and detailed. This will be used to generate dozens of matching pages.`;

    // Use GPT-4o for vision analysis
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: analysisPrompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mediaType};base64,${referenceImageBase64}`,
                detail: "high", // Use high detail for accurate analysis
              },
            },
          ],
        },
      ],
      max_tokens: 3000,
      temperature: 0.3, // Lower temperature for more consistent analysis
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI vision analysis" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let styleContract: StyleContract;
    try {
      const parsed = JSON.parse(content);
      
      // Validate and structure the response with defaults
      styleContract = {
        styleSummary: parsed.styleSummary || "Clean line art coloring page style",
        styleContractText: parsed.styleContractText || buildDefaultStyleContract(),
        forbiddenList: Array.isArray(parsed.forbiddenList) ? parsed.forbiddenList : getDefaultForbiddenList(),
        recommendedLineThickness: validateLineThickness(parsed.recommendedLineThickness),
        recommendedComplexity: validateComplexity(parsed.recommendedComplexity),
        outlineRules: parsed.outlineRules || "Medium-weight outer contours, thinner inner details",
        backgroundRules: parsed.backgroundRules || "Minimal background, 3-5 simple props maximum",
        compositionRules: parsed.compositionRules || "Centered main subject with 15% margins on all sides",
        eyeRules: parsed.eyeRules || "Eyes must be outlined only with tiny dot pupils. NO solid black fills.",
        extractedThemeGuess: parsed.extractedThemeGuess || "Generic coloring book theme",
      };

      // Ensure styleContractText includes critical rules if missing
      if (!styleContract.styleContractText.toLowerCase().includes("no solid black")) {
        styleContract.styleContractText += "\n- Eyes MUST be outlined only; tiny dot pupils allowed; NO large solid black fills anywhere.";
      }
      if (!styleContract.styleContractText.toLowerCase().includes("no shading")) {
        styleContract.styleContractText += "\n- NO shading, NO gradients, NO textures, NO crosshatching, NO halftones.";
      }

    } catch (parseError) {
      console.error("Failed to parse vision analysis:", parseError, "Content:", content.substring(0, 500));
      return NextResponse.json(
        { error: "Failed to parse AI vision analysis. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      styleContract,
      debug: {
        model: "gpt-4.1",
        tokensUsed: response.usage?.total_tokens,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        analysisComplete: true,
      },
    });
  } catch (error) {
    console.error("Extract style error:", error);

    if (error instanceof Error) {
      if (error.message.includes("rate_limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please wait and try again." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract style" },
      { status: 500 }
    );
  }
}

function validateLineThickness(value: unknown): "thin" | "medium" | "bold" {
  if (value === "thin" || value === "medium" || value === "bold") {
    return value;
  }
  return "medium";
}

function validateComplexity(value: unknown): "simple" | "medium" | "detailed" {
  if (value === "simple" || value === "medium" || value === "detailed") {
    return value;
  }
  return "medium";
}

function buildDefaultStyleContract(): string {
  return `STYLE CONTRACT - STRICT RULES:
- Pure black lines on pure white background ONLY
- Outer contour lines: medium-bold weight (4-6pt equivalent)
- Inner detail lines: thinner weight (2-3pt equivalent)
- All stroke ends should be rounded
- Eyes: OUTLINE ONLY with tiny dot pupils (1-2px max); NO solid black fills
- Hair: outline strands only, NEVER solid black
- Subject centered with 10-15% margins on all sides
- Background: minimal, 3-5 simple props maximum
- All shapes must be CLOSED for coloring
- NO shading, NO gradients, NO textures, NO crosshatching
- NO shadows of any kind
- NO text, letters, numbers, logos, or watermarks`;
}

function getDefaultForbiddenList(): string[] {
  return [
    "solid black fills",
    "shading",
    "gradients", 
    "textures",
    "crosshatching",
    "halftones",
    "shadows",
    "color",
    "grayscale",
    "text or letters",
    "watermarks",
    "logos",
    "complex overlapping elements",
    "dark backgrounds",
    "solid black eyes",
    "solid black hair",
  ];
}
