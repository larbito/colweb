import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import {
  generatePromptsRequestSchema,
  promptListResponseSchema,
  type PromptListResponse,
  MAX_PAGES,
} from "@/lib/schemas";

export async function POST(request: NextRequest) {
  // Check if OpenAI is configured
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    // Validate request
    const parseResult = generatePromptsRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { theme, mainCharacter, pageCount, complexity, lineThickness, trimSize, extraNotes } =
      parseResult.data;

    // Extra validation for max pages
    if (pageCount > MAX_PAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PAGES} pages allowed` },
        { status: 400 }
      );
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

    const systemPrompt = `You are an expert coloring book prompt writer.
Generate ${pageCount} sequential scene prompts for a cohesive coloring book story.

THEME: ${theme}
MAIN CHARACTER: ${mainCharacter}
STYLE: ${complexityGuide[complexity]}, ${lineGuide[lineThickness]}
PAGE SIZE: ${trimSize}
${extraNotes ? `ADDITIONAL NOTES: ${extraNotes}` : ""}

CRITICAL RULES FOR EACH PROMPT:
1. Black and white line art ONLY - no shading, no grayscale, no gradients
2. NO text, letters, numbers, logos, or watermarks in the image
3. Clean, closed outlines perfect for coloring
4. Centered subject composition with print-friendly framing
5. Keep the main character VISUALLY CONSISTENT across all pages (same attributes, proportions)
6. Each prompt describes ONE clear scene/composition
7. Include simple background elements appropriate to complexity level
8. Make it a cohesive story with a beginning, middle, and end

RESPONSE FORMAT - Return ONLY this JSON structure:
{
  "pages": [
    { "pageNumber": 1, "sceneTitle": "Short title", "prompt": "Detailed scene description..." },
    ...
  ]
}

Generate exactly ${pageCount} pages. Start with pageNumber 1.
Return JSON only, no markdown, no explanation.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate ${pageCount} coloring page prompts for this story.` },
      ],
      temperature: 0.7,
      max_tokens: pageCount * 150, // ~150 tokens per page
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse and validate the response
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "Invalid JSON from AI" }, { status: 500 });
    }

    const validationResult = promptListResponseSchema.safeParse(parsed);
    if (!validationResult.success) {
      console.error("AI response validation failed:", validationResult.error);
      return NextResponse.json({ error: "AI response did not match expected format" }, { status: 500 });
    }

    // Ensure we have the right number of pages
    const pages = validationResult.data.pages;
    if (pages.length !== pageCount) {
      console.warn(`AI returned ${pages.length} pages but ${pageCount} were requested`);
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

