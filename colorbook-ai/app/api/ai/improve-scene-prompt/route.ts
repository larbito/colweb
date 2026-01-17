import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { themePackSchema } from "@/lib/themePack";

const requestSchema = z.object({
  scenePrompt: z.string().min(1),
  sceneTitle: z.string(),
  pageNumber: z.number(),
  themePack: themePackSchema.optional().nullable(),
  complexity: z.enum(["simple", "medium", "detailed"]),
  characterType: z.string().optional(),
});

const responseSchema = z.object({
  pageNumber: z.number(),
  sceneTitle: z.string(),
  scenePrompt: z.string(),
});

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
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { scenePrompt, sceneTitle, pageNumber, themePack, complexity, characterType } = parseResult.data;
    const propsRange = COMPLEXITY_PROPS[complexity];

    let themeContext = "";
    if (themePack) {
      themeContext = `
THEME PACK (MUST follow):
- Setting: ${themePack.setting}
- Recurring props to use: ${themePack.recurringProps.join(", ")}
- Background motifs: ${themePack.backgroundMotifs.join(", ")}
- FORBIDDEN: ${themePack.forbidden.join(", ")}`;
    }

    const systemPrompt = `You are improving a scene description for a children's coloring book page.

CURRENT SCENE:
Title: "${sceneTitle}"
Description: "${scenePrompt}"
${characterType ? `Character type: ${characterType}` : ""}
${themeContext}

IMPROVE this scene to be:
1. More visually detailed (but still ${complexity})
2. Using the structured format below
3. Consistent with the theme pack
4. Clear visual instructions (not narrative)

REQUIRED FORMAT:
"SUBJECT: [main subject with pose, expression, body position]
ACTION: [specific action being performed]
SETTING: ${themePack?.setting || "[consistent setting]"}
FOREGROUND: [2-3 items closest to viewer]
MIDGROUND: [main subject and nearby items]
BACKGROUND: [1-2 simple far elements]
PROPS (${propsRange.min}-${propsRange.max}): [specific items from recurring props]
COMPOSITION: centered, wide margins, large open areas"

DO NOT include any style instructions (no "line art", "black and white", etc).

Return ONLY this JSON:
{
  "pageNumber": ${pageNumber},
  "sceneTitle": "Improved title (3-5 words)",
  "scenePrompt": "Full improved structured scene"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Improve this scene description while keeping the same core concept." },
      ],
      temperature: 0.7,
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
        return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
      }
    }

    const validationResult = responseSchema.safeParse(parsed);
    if (!validationResult.success) {
      return NextResponse.json({ error: "AI response format invalid" }, { status: 500 });
    }

    return NextResponse.json(validationResult.data);
  } catch (error) {
    console.error("Improve scene error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to improve scene" },
      { status: 500 }
    );
  }
}

