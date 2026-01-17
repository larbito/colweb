import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { characterLockSchema } from "@/lib/schemas";

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
  spec: generationSpecSchema,
});

// Response returns scenePrompt only (NOT final prompt with style rules)
const pageSchema = z.object({
  pageNumber: z.number(),
  sceneTitle: z.string(),
  scenePrompt: z.string(), // Short scene idea, NOT full prompt
});

const responseSchema = z.object({
  pages: z.array(pageSchema),
});

export type ScenePromptResponse = z.infer<typeof responseSchema>;

// Complexity guide for scene generation
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

    const { theme, mainCharacter, characterType, spec } = parseResult.data;

    const propsGuide = COMPLEXITY_PROPS[spec.complexity];
    const characterDesc = mainCharacter ? mainCharacter : "the main character";

    const systemPrompt = `You are a scene planner for a ${spec.pageCount}-page children's coloring book.

THEME: ${theme}
MAIN CHARACTER: ${characterDesc}${characterType ? ` (a ${characterType})` : ""}
PROPS PER PAGE: ${propsGuide}

YOUR TASK:
Generate ${spec.pageCount} SHORT scene ideas that form a cohesive story arc.

SCENE IDEA FORMAT (STRICT):
- 1-2 sentences MAXIMUM
- Describe: character + action + setting + ${propsGuide}
- List specific props by name and count
- NO style language (no "black and white", "line art", "coloring page", etc.)
- NO descriptions of line weight, shading, or artistic style

GOOD EXAMPLE:
"Benny the bunny waters carrots in a garden; include: 1 watering can, 5 carrots, 3 flowers, 1 wooden fence, 2 clouds."

BAD EXAMPLE (too long, has style language):
"A beautiful black and white line art coloring page showing Benny the bunny in a detailed garden scene..."

Return JSON:
{
  "pages": [
    {
      "pageNumber": 1,
      "sceneTitle": "Short 3-5 word title",
      "scenePrompt": "1-2 sentence scene idea with props list"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate ${spec.pageCount} scene ideas for this coloring book.` },
      ],
      temperature: 0.7,
      max_tokens: 3000,
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
