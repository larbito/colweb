import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";

/**
 * Route segment config
 */
export const maxDuration = 30; // 30 seconds

/**
 * POST /api/idea/generate
 * 
 * Generates a complete coloring book idea with AI.
 * Returns a full book concept including theme, character suggestions, and example scenes.
 */

const requestSchema = z.object({
  themeHint: z.string().optional().describe("Optional theme hint from user"),
  age: z.enum(["3-6", "6-9", "9-12", "all-ages"]).optional().default("all-ages"),
  mode: z.enum(["storybook", "theme"]).optional().default("storybook"),
});

export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
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

    const { themeHint, age, mode } = parseResult.data;

    const ageDescriptions: Record<string, string> = {
      "3-6": "preschool/toddler (very simple scenes, 2-4 large objects)",
      "6-9": "early elementary (moderate detail, 4-6 objects per page)",
      "9-12": "older kids (more detailed scenes, can include backgrounds)",
      "all-ages": "all ages (balanced complexity suitable for everyone)",
    };

    const modeDescription = mode === "storybook"
      ? "STORYBOOK format (same main character throughout with story progression)"
      : "THEMED COLLECTION format (same theme but varied subjects/scenes)";

    const ideaPrompt = `You are a creative children's book author specializing in coloring books.

Generate a COMPLETE coloring book idea for the following:
- Target age: ${ageDescriptions[age || "all-ages"]}
- Format: ${modeDescription}
${themeHint ? `- Theme hint from user: "${themeHint}"` : "- No specific theme requested (be creative!)"}

Create an engaging, original idea that would make a great coloring book. Include:

1. BOOK TITLE: A catchy, memorable title
2. THEME: The overall theme/setting (magical forest, ocean adventure, farm life, etc.)
3. MAIN CHARACTER (if storybook mode): A lovable main character with description
4. TARGET EMOTION: What feeling should kids get (joy, curiosity, calm, adventure)
5. EXAMPLE SCENES: 8-12 example page ideas that would work well as coloring pages
6. UNIQUE ANGLE: What makes this book special or different

Return the idea in this exact JSON format:
{
  "title": "Book title",
  "theme": "One sentence describing the theme",
  "mainCharacter": "Character name and brief description (or null for theme mode)",
  "targetEmotion": "Primary emotion/feeling",
  "exampleScenes": ["Scene 1 description", "Scene 2 description", ...],
  "uniqueAngle": "What makes this special",
  "fullIdea": "A 2-3 sentence pitch that summarizes the entire book concept"
}

Be creative, original, and think about what kids actually enjoy coloring!`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "user", content: ideaPrompt },
      ],
      max_tokens: 1500,
      temperature: 0.9, // High creativity for idea generation
    });

    let responseText = response.choices[0]?.message?.content?.trim() || "";

    // Clean up JSON markers
    responseText = responseText
      .replace(/^```json\n?/i, "")
      .replace(/^```\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    try {
      const ideaData = JSON.parse(responseText);

      console.log(`[idea/generate] Generated idea: "${ideaData.title}"`);

      return NextResponse.json({
        idea: ideaData.fullIdea,
        title: ideaData.title,
        theme: ideaData.theme,
        mainCharacter: ideaData.mainCharacter,
        targetEmotion: ideaData.targetEmotion,
        exampleScenes: ideaData.exampleScenes,
        uniqueAngle: ideaData.uniqueAngle,
      });

    } catch {
      // If JSON parsing fails, try to extract the idea from the text
      console.error("[idea/generate] Failed to parse JSON, using raw text");
      return NextResponse.json({
        idea: responseText,
        title: null,
        theme: null,
        mainCharacter: null,
        exampleScenes: [],
      });
    }

  } catch (error) {
    console.error("[idea/generate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate idea" },
      { status: 500 }
    );
  }
}

