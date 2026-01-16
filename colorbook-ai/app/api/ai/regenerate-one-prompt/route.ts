import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { characterLockSchema } from "@/lib/schemas";

const requestSchema = z.object({
  pageNumber: z.number().int().min(1),
  theme: z.string().min(1),
  mainCharacter: z.string().optional(),
  characterLock: characterLockSchema.optional(),
  stylePreset: z.enum(["kids", "medium", "detailed"]),
  lineThickness: z.enum(["thin", "medium", "bold"]),
  trimSize: z.string(),
  previousSceneTitle: z.string(),
  previousPrompt: z.string(),
  totalPages: z.number().int().min(1).optional(),
});

const responseSchema = z.object({
  pageNumber: z.number(),
  sceneTitle: z.string(),
  prompt: z.string(),
});

export type RegenerateOnePromptResponse = z.infer<typeof responseSchema>;

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

    const {
      pageNumber,
      theme,
      mainCharacter,
      characterLock,
      stylePreset,
      lineThickness,
      trimSize,
      previousSceneTitle,
      previousPrompt,
      totalPages,
    } = parseResult.data;

    const complexityGuide = {
      kids: "Very simple shapes, minimal details, large areas to color, ages 3-6",
      medium: "Moderate detail, balanced complexity, ages 6-12",
      detailed: "Intricate patterns, complex scenes, for teens and adults",
    };

    const lineGuide = {
      thin: "delicate thin outlines",
      medium: "standard medium-weight outlines",
      bold: "thick bold outlines suitable for younger children",
    };

    // Build character section
    let characterSection = mainCharacter ? `MAIN CHARACTER: ${mainCharacter}` : "";
    if (characterLock) {
      characterSection = `
MAIN CHARACTER (LOCKED - MUST BE IDENTICAL):
Name: ${characterLock.canonicalName}
Proportions: ${characterLock.visualRules.proportions}
Face: ${characterLock.visualRules.face}
Unique Features: ${characterLock.visualRules.uniqueFeatures.join(", ")}
Outfit: ${characterLock.visualRules.outfit}`;
    }

    const systemPrompt = `You are a coloring book prompt writer. Generate ONE replacement prompt for page ${pageNumber}.

THEME: ${theme}
${characterSection}
STYLE: ${complexityGuide[stylePreset]}, ${lineGuide[lineThickness]}
PAGE SIZE: ${trimSize}
${totalPages ? `TOTAL PAGES IN BOOK: ${totalPages}` : ""}

The previous prompt was:
Title: "${previousSceneTitle}"
Prompt: "${previousPrompt}"

Generate a NEW, DIFFERENT scene for this page number that:
1. Fits the same theme and story arc
2. Features the SAME main character with IDENTICAL visual appearance
3. Is suitable for black & white line art coloring
4. Has NO text, letters, numbers, or watermarks in the image
5. Uses simple background appropriate for coloring

Return ONLY this JSON:
{
  "pageNumber": ${pageNumber},
  "sceneTitle": "Short descriptive title",
  "prompt": "Detailed scene description for the image generator..."
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a new prompt for page ${pageNumber}, different from the previous one.` },
      ],
      temperature: 0.8,
      max_tokens: 400,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse JSON
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

    const validationResult = responseSchema.safeParse(parsed);
    if (!validationResult.success) {
      return NextResponse.json({ error: "AI response format invalid" }, { status: 500 });
    }

    return NextResponse.json(validationResult.data);
  } catch (error) {
    console.error("Regenerate one prompt error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to regenerate prompt" },
      { status: 500 }
    );
  }
}

