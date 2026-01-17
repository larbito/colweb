import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured, TEXT_MODEL, logModelUsage } from "@/lib/openai";
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

CRITICAL RULES FOR SIMPLE, CLEAN SCENES:
1. ALL pages must use the SAME setting/world (${themePack?.setting || "a consistent cheerful world"})
2. ONE main subject per page (never more than 2)
3. MAXIMUM ${propsRange.max} props total - count them!
4. NO repeating patterns (NO "many flowers", NO "rows of butterflies", NO "field of stars")
5. Background must be VERY simple: 1-2 clouds max, simple horizon, maybe 1 sun
6. Each scene is VISUAL INSTRUCTIONS, not a story

ANTI-CLUTTER RULES:
- Never say "surrounded by many..." or "covered in..." or "field of..."
- Never have more than 3 of the same item type
- Keep 70% of the image as empty white space
- Background = almost nothing (1 horizon line, 0-2 clouds)

STRUCTURED SCENE FORMAT (use this EXACT structure):
"SUBJECT: [ONE main character with pose/emotion]
ACTION: [simple action]
SETTING: ${themePack?.setting || "[same setting every page]"}
FOREGROUND: [1-2 items only]
MIDGROUND: [main subject + 1-2 props]
BACKGROUND: [almost nothing - 1 cloud or sun max]
PROPS (${propsRange.min}-${propsRange.max} TOTAL): [list each prop ONCE - no multiples]
COMPOSITION: centered, wide margins, 70% white space"

GOOD EXAMPLE:
"SUBJECT: Happy bunny with big smile, sitting pose
ACTION: Holding a carrot
SETTING: Sunny Garden
FOREGROUND: 2 flowers, grass tuft
MIDGROUND: Bunny with carrot
BACKGROUND: 1 cloud, sun
PROPS (5): carrot, 2 flowers, grass tuft, 1 cloud, sun
COMPOSITION: centered, wide margins, 70% white space"

BAD EXAMPLE (TOO CLUTTERED - AVOID):
"SUBJECT: Bunny surrounded by many butterflies
ACTION: Playing in a field of flowers with lots of decorations
BACKGROUND: Many clouds, birds everywhere, trees all around"

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

    logModelUsage("Generate scene prompts", "text", TEXT_MODEL);
    
    const response = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate ${spec.pageCount} structured scene descriptions for this coloring book. Remember: simple, uncluttered, maximum ${propsRange.max} props per page.` },
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
