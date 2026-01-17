import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";

// GenerationSpec schema
const generationSpecSchema = z.object({
  bookMode: z.enum(["series", "collection"]),
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
  mainCharacter: z.string().optional(),
  characterType: z.string().optional(),
  spec: generationSpecSchema,
  previousSceneTitle: z.string(),
  previousScenePrompt: z.string(),
});

// Response returns scenePrompt only
const responseSchema = z.object({
  pageNumber: z.number(),
  sceneTitle: z.string(),
  scenePrompt: z.string(),
});

export type RegenerateSceneResponse = z.infer<typeof responseSchema>;

// Complexity guide
const COMPLEXITY_PROPS = {
  simple: "2-4 props",
  medium: "4-6 props",
  detailed: "6-8 props",
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
      console.error("Validation error:", JSON.stringify(parseResult.error.flatten(), null, 2));
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      pageNumber,
      theme,
      mainCharacter,
      characterType,
      spec,
      previousSceneTitle,
      previousScenePrompt,
    } = parseResult.data;

    const propsGuide = COMPLEXITY_PROPS[spec.complexity];
    const characterDesc = mainCharacter ? mainCharacter : "the main character";

    const systemPrompt = `You are a scene planner for a children's coloring book.

THEME: ${theme}
MAIN CHARACTER: ${characterDesc}${characterType ? ` (a ${characterType})` : ""}
PAGE: ${pageNumber} of ${spec.pageCount}
PROPS PER PAGE: ${propsGuide}

The previous scene idea was:
Title: "${previousSceneTitle}"
Scene: "${previousScenePrompt}"

Generate a NEW, DIFFERENT scene idea for page ${pageNumber}.

SCENE IDEA FORMAT (STRICT):
- 1-2 sentences MAXIMUM
- Describe: character + action + setting + ${propsGuide}
- List specific props by name and count
- NO style language (no "black and white", "line art", etc.)
- Make it different from the previous scene

Return ONLY this JSON:
{
  "pageNumber": ${pageNumber},
  "sceneTitle": "Short 3-5 word title",
  "scenePrompt": "1-2 sentence scene idea with props list"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a new scene idea for page ${pageNumber}.` },
      ],
      temperature: 0.85,
      max_tokens: 300,
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
    console.error("Regenerate scene error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to regenerate scene" },
      { status: 500 }
    );
  }
}
