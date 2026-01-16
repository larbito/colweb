import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import {
  generatePromptsRequestSchema,
  promptListResponseSchema,
  type PromptListResponse,
  MAX_PAGES,
} from "@/lib/schemas";

export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    const parseResult = generatePromptsRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { theme, mainCharacter, pageCount, complexity, lineThickness, trimSize, extraNotes, characterLock } =
      parseResult.data;

    if (pageCount > MAX_PAGES) {
      return NextResponse.json({ error: `Maximum ${MAX_PAGES} pages allowed` }, { status: 400 });
    }

    const complexityGuide = {
      kids: "Simple shapes, minimal details, large areas to color, very basic backgrounds",
      medium: "Moderate detail, balanced complexity, some background elements",
      detailed: "Intricate patterns, complex scenes, detailed backgrounds suitable for adults",
    };

    const lineGuide = {
      thin: "delicate thin outlines",
      medium: "standard medium-weight outlines",
      bold: "thick bold outlines suitable for younger children",
    };

    // Build character consistency section
    let characterSection = `MAIN CHARACTER: ${mainCharacter}`;
    if (characterLock) {
      characterSection = `
MAIN CHARACTER (LOCKED - MUST BE IDENTICAL IN ALL SCENES):
Name: ${characterLock.canonicalName}
Proportions: ${characterLock.visualRules.proportions}
Face: ${characterLock.visualRules.face}
Unique Features: ${characterLock.visualRules.uniqueFeatures.join(", ")}
Outfit: ${characterLock.visualRules.outfit}

CRITICAL: The character MUST look EXACTLY the same in every scene - same proportions, same features, same outfit.`;
    }

    const systemPrompt = `You are an expert coloring book prompt writer.
Generate ${pageCount} sequential scene prompts for a cohesive coloring book story.

THEME: ${theme}
${characterSection}
STYLE: ${complexityGuide[complexity]}, ${lineGuide[lineThickness]}
PAGE SIZE: ${trimSize}
${extraNotes ? `ADDITIONAL NOTES: ${extraNotes}` : ""}

CRITICAL RULES FOR EACH PROMPT:
1. Black and white line art ONLY - no shading, no grayscale, no gradients
2. NO text, letters, numbers, logos, or watermarks in the image
3. Clean, closed outlines perfect for coloring
4. Centered subject composition with print-friendly framing
5. Keep the main character VISUALLY IDENTICAL across all pages
6. Each prompt describes ONE clear scene/composition
7. Include simple background elements appropriate to complexity level
8. Make it a cohesive story with a beginning, middle, and end

Return ONLY this JSON structure:
{
  "pages": [
    { "pageNumber": 1, "sceneTitle": "Short title", "prompt": "Detailed scene description for the image generator..." },
    ...
  ]
}

Generate exactly ${pageCount} pages starting at pageNumber 1.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate ${pageCount} coloring page prompts for this story.` },
      ],
      temperature: 0.7,
      max_tokens: pageCount * 200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse JSON from response
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) jsonContent = jsonContent.slice(7);
    else if (jsonContent.startsWith("```")) jsonContent = jsonContent.slice(3);
    if (jsonContent.endsWith("```")) jsonContent = jsonContent.slice(0, -3);
    jsonContent = jsonContent.trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonContent);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: "Invalid JSON from AI" }, { status: 500 });
      }
    }

    const validationResult = promptListResponseSchema.safeParse(parsed);
    if (!validationResult.success) {
      console.error("Prompts validation failed:", validationResult.error);
      return NextResponse.json({ error: "AI response did not match expected format" }, { status: 500 });
    }

    return NextResponse.json(validationResult.data satisfies PromptListResponse);
  } catch (error) {
    console.error("Generate prompts error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate prompts" },
      { status: 500 }
    );
  }
}
