import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import type { StyleClonePrompt } from "@/lib/styleClone";
import type { Complexity } from "@/lib/generationSpec";

const styleContractSchema = z.object({
  styleSummary: z.string(),
  styleContractText: z.string(),
  forbiddenList: z.array(z.string()),
  recommendedLineThickness: z.enum(["thin", "medium", "bold"]),
  recommendedComplexity: z.enum(["simple", "medium", "detailed"]),
  outlineRules: z.string(),
  backgroundRules: z.string(),
  compositionRules: z.string(),
  eyeRules: z.string(),
  extractedThemeGuess: z.string().optional(),
}).optional().nullable();

const themePackSchema = z.object({
  setting: z.string(),
  recurringProps: z.array(z.string()),
  motifs: z.array(z.string()),
  allowedSubjects: z.array(z.string()),
  forbiddenElements: z.array(z.string()),
  characterName: z.string().optional(),
  characterDescription: z.string().optional(),
}).optional().nullable();

const requestSchema = z.object({
  styleContract: styleContractSchema,
  themePack: themePackSchema,
  mode: z.enum(["series", "collection"]),
  complexity: z.enum(["simple", "medium", "detailed"]),
  previousTitle: z.string().optional(),
  previousPrompt: z.string().optional(),
  existingTitles: z.array(z.string()).optional(),
  characterName: z.string().optional(),
  characterDescription: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pageIndex: string }> }
) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured." },
      { status: 503 }
    );
  }

  try {
    const { pageIndex: pageIndexStr } = await params;
    const pageIndex = parseInt(pageIndexStr, 10);
    if (isNaN(pageIndex) || pageIndex < 1) {
      return NextResponse.json(
        { error: "Invalid page index" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { styleContract, themePack, mode, complexity, previousTitle, previousPrompt, existingTitles, characterName, characterDescription } = parseResult.data;

    const complexityGuide = {
      simple: "2-4 props, minimal background, single subject",
      medium: "4-8 props, light background, 1-2 subjects",
      detailed: "8-12 props, rich backgrounds",
    };

    // Build theme information from either source
    let themeInfo = "";
    if (styleContract?.extractedThemeGuess) {
      themeInfo = `THEME/WORLD FROM REFERENCE:
${styleContract.extractedThemeGuess}`;
    }
    if (themePack) {
      themeInfo += `
THEME PACK:
- Setting: ${themePack.setting}
- Recurring props: ${themePack.recurringProps.join(", ")}
- Motifs: ${themePack.motifs.join(", ")}`;
    }

    // Character info for Series mode
    let characterInfo = "";
    if (mode === "series") {
      const charName = characterName || themePack?.characterName || "";
      const charDesc = characterDescription || themePack?.characterDescription || "";
      if (charName) {
        characterInfo = `
MAIN CHARACTER (must appear in this scene):
- Name: ${charName}
${charDesc ? `- Description: ${charDesc}` : ""}`;
      }
    }

    const systemPrompt = `Generate a NEW, UNIQUE scene prompt for page ${pageIndex} of a coloring book.

${themeInfo}
${characterInfo}

MODE: ${mode === "series" ? "SERIES - Same main character in every scene" : "COLLECTION - Same style, different subjects"}
COMPLEXITY: ${(complexity as Complexity).toUpperCase()} - ${complexityGuide[complexity as Complexity]}

${previousTitle ? `PREVIOUS TITLE (generate something DIFFERENT): ${previousTitle}` : ""}
${previousPrompt ? `PREVIOUS PROMPT (generate something DIFFERENT):\n${previousPrompt}` : ""}
${existingTitles?.length ? `AVOID these existing titles: ${existingTitles.join(", ")}` : ""}

REQUIREMENTS FOR THE SCENE:
1. SUBJECT: Clear main focus${mode === "series" ? ` - must be ${characterName || "the main character"}` : ""}
2. ACTION: Active, engaging pose or activity
3. SETTING: Specific location within the theme world
4. PROPS: List 3-8 specific props from the theme
5. COMPOSITION: "Centered subject with 15% margins, [foreground/background notes]"

OUTPUT FORMAT (JSON):
{
  "pageIndex": ${pageIndex},
  "title": "Short scene title (3-5 words)",
  "scenePrompt": "Detailed scene description (5-10 lines) following the requirements above"
}

Make it UNIQUE, engaging, and consistent with the theme/world. No references to color.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: systemPrompt,
        },
      ],
      max_tokens: 600,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    let prompt: StyleClonePrompt;
    try {
      const parsed = JSON.parse(content);
      prompt = {
        pageIndex: parsed.pageIndex || pageIndex,
        title: parsed.title || `Scene ${pageIndex}`,
        scenePrompt: parsed.scenePrompt || parsed.prompt || "",
      };
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      prompt,
      debug: {
        model: "gpt-4o",
        tokensUsed: response.usage?.total_tokens,
      },
    });
  } catch (error) {
    console.error("Regenerate prompt error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to regenerate prompt" },
      { status: 500 }
    );
  }
}
