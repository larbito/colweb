import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { buildThemePackPrompt } from "@/lib/styleClonePromptBuilder";
import type { ThemePack } from "@/lib/styleClone";

const requestSchema = z.object({
  themeText: z.string().optional(),
  mode: z.enum(["series", "collection"]),
  referenceImageBase64: z.string().optional(),
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

    const { themeText, mode, referenceImageBase64 } = parseResult.data;

    // Build messages array
    const messages: Parameters<typeof openai.chat.completions.create>[0]["messages"] = [];

    // If we have a reference image, include it for context
    if (referenceImageBase64) {
      let mediaType = "image/png";
      if (referenceImageBase64.startsWith("/9j/")) {
        mediaType = "image/jpeg";
      }

      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Use this reference image as inspiration for the theme. ${buildThemePackPrompt({ userTheme: themeText, mode })}`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mediaType};base64,${referenceImageBase64}`,
              detail: "low",
            },
          },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: buildThemePackPrompt({ userTheme: themeText, mode }),
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 1500,
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
    let themePack: ThemePack;
    try {
      const parsed = JSON.parse(content);
      
      themePack = {
        setting: parsed.setting || "A magical world",
        recurringProps: Array.isArray(parsed.recurringProps) ? parsed.recurringProps : [],
        motifs: Array.isArray(parsed.motifs) ? parsed.motifs : [],
        allowedSubjects: Array.isArray(parsed.allowedSubjects) ? parsed.allowedSubjects : [],
        forbiddenElements: Array.isArray(parsed.forbiddenElements) ? parsed.forbiddenElements : [],
        characterName: mode === "series" ? (parsed.characterName || undefined) : undefined,
        characterDescription: mode === "series" ? (parsed.characterDescription || undefined) : undefined,
      };
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      themePack,
      debug: {
        model: "gpt-4o",
        tokensUsed: response.usage?.total_tokens,
      },
    });
  } catch (error) {
    console.error("Theme pack generation error:", error);

    if (error instanceof Error) {
      if (error.message.includes("rate_limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please wait and try again." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate theme pack" },
      { status: 500 }
    );
  }
}

