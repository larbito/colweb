import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { characterLockSchema } from "@/lib/schemas";
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
  theme: z.string().min(1),
  mainCharacter: z.string().optional(),
  characterType: z.string().optional(),
  characterLock: characterLockSchema.optional().nullable(),
  themePack: themePackSchema.optional().nullable(),
  spec: generationSpecSchema,
});

// Response returns structured scenePrompt
const pageSchema = z.object({
  pageNumber: z.number(),
  sceneTitle: z.string(),
  scenePrompt: z.string(), // Rich structured scene description
});

const responseSchema = z.object({
  pages: z.array(pageSchema),
});

export type ScenePromptResponse = z.infer<typeof responseSchema>;

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

    const { theme, mainCharacter, characterType, themePack, spec } = parseResult.data;

    const propsRange = COMPLEXITY_PROPS[spec.complexity];
    const characterDesc = mainCharacter ? mainCharacter : "the main subject";

    // Build theme context
    let themeContext = "";
    if (themePack) {
      themeContext = `
THEME PACK (use consistently across ALL pages):
- Setting: ${themePack.setting}
- Mood: ${themePack.artMood}
- Allowed subjects: ${themePack.allowedSubjects.join(", ")}
- Recurring props (MUST reuse): ${themePack.recurringProps.join(", ")}
- Background motifs: ${themePack.backgroundMotifs.join(", ")}
- FORBIDDEN: ${themePack.forbidden.join(", ")}`;
    }

    const systemPrompt = `You are a scene designer for a ${spec.pageCount}-page children's coloring book.

THEME: ${theme}
MAIN CHARACTER/SUBJECT: ${characterDesc}${characterType ? ` (a ${characterType})` : ""}
BOOK MODE: ${spec.bookMode === "series" ? "Series - SAME main character on every page" : "Collection - varied subjects but SAME world/setting"}
${themeContext}

YOUR TASK:
Generate ${spec.pageCount} STRUCTURED scene descriptions that form a cohesive book.

CRITICAL RULES:
1. ALL pages must use the SAME setting/world (${themePack?.setting || "a consistent cheerful world"})
2. REUSE props from the recurring props list - don't invent random props
3. Each scene is VISUAL INSTRUCTIONS, not a story paragraph
4. Props count: ${propsRange.min}-${propsRange.max} per page

STRUCTURED SCENE FORMAT (use this EXACT structure):
"SUBJECT: [main subject description with pose/emotion]
ACTION: [what the subject is doing]
SETTING: ${themePack?.setting || "[consistent setting for all pages]"}
FOREGROUND: [items in front, closest to viewer]
MIDGROUND: [main subject area]
BACKGROUND: [far elements, keep simple]
PROPS (${propsRange.min}-${propsRange.max}): [list specific props from recurring list]
COMPOSITION: centered, wide margins, large open coloring areas"

EXAMPLE OUTPUT:
"SUBJECT: Happy bunny with big smile, sitting pose, ears up
ACTION: Holding a watering can, watering flowers
SETTING: Sunny Meadow Garden with white picket fence
FOREGROUND: 3 tulips, grass tufts
MIDGROUND: Bunny character with watering can
BACKGROUND: 2 fluffy clouds, sun in corner
PROPS (5): watering can, 3 tulips, grass tuft, 2 clouds, sun
COMPOSITION: centered, wide margins, large open coloring areas"

DO NOT include style instructions (no "black and white", "line art", etc).

Return JSON:
{
  "pages": [
    {
      "pageNumber": 1,
      "sceneTitle": "Short 3-5 word title",
      "scenePrompt": "Full structured scene using format above"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate ${spec.pageCount} structured scene descriptions for this coloring book.` },
      ],
      temperature: 0.7,
      max_tokens: 4000,
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
        return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
      }
    }

    const validationResult = responseSchema.safeParse(parsed);
    if (!validationResult.success) {
      console.error("Response validation failed:", validationResult.error);
      return NextResponse.json(
        { error: "AI response format invalid", details: validationResult.error.flatten() },
        { status: 500 }
      );
    }

    return NextResponse.json(validationResult.data);
  } catch (error) {
    console.error("Generate prompts error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate prompts" },
      { status: 500 }
    );
  }
}
