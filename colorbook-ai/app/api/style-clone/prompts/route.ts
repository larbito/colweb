import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { buildScenePromptsPrompt } from "@/lib/styleClonePromptBuilder";
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
  mode: z.enum(["series", "collection"]),
  pagesCount: z.number().int().min(1).max(80),
  complexity: z.enum(["simple", "medium", "detailed"]),
});

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

    const { themePack, mode, pagesCount, complexity } = parseResult.data;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: buildScenePromptsPrompt({
            themePack: themePack as ThemePack,
            mode,
            pagesCount,
            complexity: complexity as Complexity,
          }),
        },
      ],
      max_tokens: Math.min(4000, pagesCount * 200), // Scale tokens with page count
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let prompts: StyleClonePrompt[];
    try {
      const parsed = JSON.parse(content);
      
      // Handle both array and object with prompts/pages key
      const promptsArray = Array.isArray(parsed) 
        ? parsed 
        : (parsed.prompts || parsed.pages || parsed.scenes || []);
      
      prompts = promptsArray.map((p: { pageIndex?: number; title?: string; scenePrompt?: string; prompt?: string }, index: number) => ({
        pageIndex: p.pageIndex || index + 1,
        title: p.title || `Scene ${index + 1}`,
        scenePrompt: p.scenePrompt || p.prompt || "",
      }));

      // Ensure we have the requested number of prompts
      if (prompts.length < pagesCount) {
        console.warn(`Only generated ${prompts.length} prompts, requested ${pagesCount}`);
      }
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      prompts,
      debug: {
        model: "gpt-4o",
        tokensUsed: response.usage?.total_tokens,
        promptsGenerated: prompts.length,
      },
    });
  } catch (error) {
    console.error("Prompts generation error:", error);

    if (error instanceof Error) {
      if (error.message.includes("rate_limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please wait and try again." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate prompts" },
      { status: 500 }
    );
  }
}

