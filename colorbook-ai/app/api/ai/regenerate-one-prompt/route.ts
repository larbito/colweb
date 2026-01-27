import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { characterLockSchema } from "@/lib/schemas";

// Accept GenerationSpec directly
const generationSpecSchema = z.object({
  trimSize: z.string(),
  pixelSize: z.string(),
  complexity: z.enum(["simple", "medium", "detailed"]),
  lineThickness: z.enum(["thin", "medium", "bold"]),
  pageCount: z.number().int().min(1).max(80),
  includeBlankBetween: z.boolean(),
  includeBelongsTo: z.boolean(),
  includePageNumbers: z.boolean(),
  includeCopyrightPage: z.boolean(),
  stylePreset: z.literal("kids-kdp"),
});

const requestSchema = z.object({
  pageNumber: z.number().int().min(1),
  theme: z.string().min(1),
  characterLock: characterLockSchema.optional().nullable(),
  spec: generationSpecSchema,
  previousSceneTitle: z.string(),
  previousPrompt: z.string(),
});

const responseSchema = z.object({
  pageNumber: z.number(),
  sceneTitle: z.string(),
  prompt: z.string(),
});

export type RegenerateOnePromptRequest = z.infer<typeof requestSchema>;
export type RegenerateOnePromptResponse = z.infer<typeof responseSchema>;

// Complexity guidelines
const COMPLEXITY_GUIDE = {
  simple: "1 main subject + 2-4 simple props, minimal/no background, very large coloring areas",
  medium: "1-2 subjects + 4-8 props, light simple background, moderate detail",
  detailed: "1-2 subjects + 8-12 props, more intricate patterns but still NO shading",
};

const LINE_GUIDE = {
  thin: "medium outer lines, thin inner details",
  medium: "thick outer lines, medium inner details",
  bold: "very thick outer lines, thick inner details",
};

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
      characterLock,
      spec,
      previousSceneTitle,
      previousPrompt,
    } = parseResult.data;

    // Build character section
    let characterSection = "";
    if (characterLock) {
      characterSection = `
MAIN CHARACTER (LOCKED - MUST BE IDENTICAL):
Name: ${characterLock.canonicalName}
Proportions: ${characterLock.visualRules.proportions}
Face: ${characterLock.visualRules.face}
Unique Features: ${characterLock.visualRules.uniqueFeatures.join(", ")}
Outfit: ${characterLock.visualRules.outfit}`;
    }

    const systemPrompt = `You are a coloring book prompt writer. Generate ONE replacement prompt for page ${pageNumber} of ${spec.pageCount}.

THEME: ${theme}
${characterSection}

GENERATION SPEC:
- Complexity: ${spec.complexity} - ${COMPLEXITY_GUIDE[spec.complexity]}
- Line Thickness: ${spec.lineThickness} - ${LINE_GUIDE[spec.lineThickness]}
- Trim Size: ${spec.trimSize}

The previous prompt for this page was:
Title: "${previousSceneTitle}"
Prompt: "${previousPrompt}"

Generate a NEW, DIFFERENT scene for page ${pageNumber} that:
1. Is different from the previous prompt
2. Fits the theme and story arc (page ${pageNumber} of ${spec.pageCount})
3. Features the SAME main character with IDENTICAL appearance
4. Matches complexity level: "${spec.complexity}"
5. Suitable for black & white line art coloring
6. NO text, letters, numbers in the image
7. Portrait orientation composition

Return ONLY this JSON:
{
  "pageNumber": ${pageNumber},
  "sceneTitle": "Short 3-5 word title",
  "prompt": "Detailed scene description..."
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a new, different prompt for page ${pageNumber}.` },
      ],
      temperature: 0.85,
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
