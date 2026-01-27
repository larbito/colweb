import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { buildImprovePromptPrompt } from "@/lib/styleClonePromptBuilder";
import type { ThemePack, StyleClonePrompt } from "@/lib/styleClone";
import type { Complexity } from "@/lib/generationSpec";

const themePackSchema = z.object({
  setting: z.string(),
  recurringProps: z.array(z.string()),
  motifs: z.array(z.string()),
  allowedSubjects: z.array(z.string()),
  forbiddenElements: z.array(z.string()),
  characterName: z.string().optional(),
  characterDescription: z.string().optional(),
});

const requestSchema = z.object({
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

    const { themePack, complexity, currentTitle, currentPrompt } = parseResult.data;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: buildImprovePromptPrompt({
            currentPrompt,
            currentTitle,
            themePack: themePack as ThemePack,
            complexity: complexity as Complexity,
          }),
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

