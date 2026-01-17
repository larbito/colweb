import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured, TEXT_MODEL, logModelUsage } from "@/lib/openai";
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

// Props count by complexity - kept strict
const COMPLEXITY_PROPS = {
  simple: { min: 2, max: 4 },
  medium: { min: 4, max: 6 },
  detailed: { min: 5, max: 8 },
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
- Recurring props (choose from): ${themePack.recurringProps.slice(0, 10).join(", ")}
- FORBIDDEN: ${themePack.forbidden.join(", ")}`;
    }

    const systemPrompt = `You are a scene designer for a children's coloring book. Design SIMPLE, UNCLUTTERED scenes.

THEME: ${theme}
MAIN CHARACTER/SUBJECT: ${characterDesc}${characterType ? ` (a ${characterType})` : ""}
PAGE: ${pageNumber} of ${spec.pageCount}
${themeContext}

The previous scene was:
Title: "${previousSceneTitle}"
Scene: "${previousScenePrompt}"

Generate a NEW, DIFFERENT scene for page ${pageNumber}.

CRITICAL SIMPLICITY RULES:
- ONE main subject only
- MAXIMUM ${propsRange.max} props total (count them!)
- NO repeating items (no "many flowers", no "lots of butterflies")
- Background: almost nothing (1 horizon line, 0-1 cloud)
- 70% of the image should be empty white space

STRUCTURED SCENE FORMAT:
"SUBJECT: [ONE main character with pose]
ACTION: [simple action]
SETTING: ${themePack?.setting || "[consistent setting]"}
FOREGROUND: [1-2 items max]
MIDGROUND: [subject + 1-2 props]
BACKGROUND: [almost empty - 1 cloud max]
PROPS (${propsRange.min}-${propsRange.max} TOTAL): [list each prop ONCE]
COMPOSITION: centered, wide margins, 70% white space"

FORBIDDEN PATTERNS:
- "surrounded by many..."
- "covered in..."
- "field of..."
- "lots of..."
- More than 3 of any item

Return ONLY this JSON:
{
  "pageNumber": ${pageNumber},
  "sceneTitle": "Short 3-5 word title",
  "scenePrompt": "Full structured scene"
}`;

    logModelUsage(`Regenerate scene ${pageNumber}`, "text", TEXT_MODEL);

    const response = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a new simple, uncluttered scene for page ${pageNumber}. Maximum ${propsRange.max} props.` },
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
