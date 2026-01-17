import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { themePackSchema } from "@/lib/themePack";

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
  themePack: themePackSchema.optional().nullable(),
  spec: generationSpecSchema,
  previousSceneTitle: z.string(),
  previousScenePrompt: z.string(),
});

// Response returns structured scenePrompt
const responseSchema = z.object({
  pageNumber: z.number(),
  sceneTitle: z.string(),
  scenePrompt: z.string(),
});

export type RegenerateSceneResponse = z.infer<typeof responseSchema>;

// Props count by complexity
const COMPLEXITY_PROPS = {
  simple: { min: 3, max: 5 },
  medium: { min: 5, max: 7 },
  detailed: { min: 6, max: 8 },
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
      themePack,
      spec,
      previousSceneTitle,
      previousScenePrompt,
    } = parseResult.data;

    const propsRange = COMPLEXITY_PROPS[spec.complexity];
    const characterDesc = mainCharacter ? mainCharacter : "the main subject";

    // Build theme context
    let themeContext = "";
    if (themePack) {
      themeContext = `
THEME PACK (use consistently):
- Setting: ${themePack.setting}
- Mood: ${themePack.artMood}
- Allowed subjects: ${themePack.allowedSubjects.join(", ")}
- Recurring props (MUST reuse): ${themePack.recurringProps.join(", ")}
- Background motifs: ${themePack.backgroundMotifs.join(", ")}
- FORBIDDEN: ${themePack.forbidden.join(", ")}`;
    }

    const systemPrompt = `You are a scene designer for a children's coloring book.

THEME: ${theme}
MAIN CHARACTER/SUBJECT: ${characterDesc}${characterType ? ` (a ${characterType})` : ""}
PAGE: ${pageNumber} of ${spec.pageCount}
${themeContext}

The previous scene was:
Title: "${previousSceneTitle}"
Scene: "${previousScenePrompt}"

Generate a NEW, DIFFERENT structured scene for page ${pageNumber}.

STRUCTURED SCENE FORMAT (use EXACTLY):
"SUBJECT: [main subject with pose/emotion]
ACTION: [what subject is doing]
SETTING: ${themePack?.setting || "[same setting as other pages]"}
FOREGROUND: [items in front]
MIDGROUND: [main subject area]
BACKGROUND: [far elements, keep simple]
PROPS (${propsRange.min}-${propsRange.max}): [list from recurring props]
COMPOSITION: centered, wide margins, large open areas"

DO NOT include style instructions.

Return ONLY this JSON:
{
  "pageNumber": ${pageNumber},
  "sceneTitle": "Short 3-5 word title",
  "scenePrompt": "Full structured scene"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a new structured scene for page ${pageNumber}.` },
      ],
      temperature: 0.85,
      max_tokens: 500,
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
