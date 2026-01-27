import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { buildImprovePromptPrompt } from "@/lib/styleClonePromptBuilder";
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
  complexity: z.enum(["simple", "medium", "detailed"]),
  currentTitle: z.string().min(1),
  currentPrompt: z.string().min(1),
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

    const { styleContract, themePack, complexity, currentTitle, currentPrompt } = parseResult.data;

    // Get theme from either styleContract or themePack
    let extractedThemeGuess = "";
    if (styleContract?.extractedThemeGuess) {
      extractedThemeGuess = styleContract.extractedThemeGuess;
    } else if (themePack) {
      extractedThemeGuess = `Setting: ${themePack.setting}. Motifs: ${themePack.motifs.join(", ")}.`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: buildImprovePromptPrompt({
            currentPrompt,
            currentTitle,
            extractedThemeGuess,
            complexity: complexity as Complexity,
          }),
        },
      ],
      max_tokens: 800,
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
        pageIndex,
        title: parsed.title || currentTitle,
        scenePrompt: parsed.scenePrompt || parsed.prompt || currentPrompt,
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
    console.error("Improve prompt error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to improve prompt" },
      { status: 500 }
    );
  }
}
