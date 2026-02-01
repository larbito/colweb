import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";

/**
 * Route segment config
 */
export const maxDuration = 30;

const requestSchema = z.object({
  pageNumber: z.number().int().min(1),
  currentPrompt: z.string(),
  basePrompt: z.string().optional(),
  mode: z.enum(["storybook", "theme"]),
  characterProfile: z.any().optional(),
});

/**
 * POST /api/ai/regenerate-one-prompt
 * 
 * Regenerates a SINGLE page prompt while maintaining consistency with the book.
 */
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

    const { pageNumber, currentPrompt, basePrompt, mode, characterProfile } = parseResult.data;

    // Build regeneration prompt
    const systemPrompt = mode === "storybook" 
      ? buildStorybookRegenerationPrompt(pageNumber, currentPrompt, basePrompt, characterProfile)
      : buildThemeRegenerationPrompt(pageNumber, currentPrompt, basePrompt);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "user", content: systemPrompt },
      ],
      max_tokens: 1000,
      temperature: 0.8,
    });

    let responseText = response.choices[0]?.message?.content?.trim() || "";
    
    // Clean JSON response
    responseText = responseText
      .replace(/^```json\n?/i, "")
      .replace(/^```\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    try {
      const data = JSON.parse(responseText);
      return NextResponse.json({
        prompt: data.prompt || data.sceneDescription,
        title: data.title,
        pageNumber,
      });
    } catch {
      // If not valid JSON, try to extract the prompt directly
      return NextResponse.json({
        prompt: responseText,
        pageNumber,
      });
    }

  } catch (error) {
    console.error("[regenerate-one-prompt] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to regenerate prompt" },
      { status: 500 }
    );
  }
}

function buildStorybookRegenerationPrompt(
  pageNumber: number,
  currentPrompt: string,
  basePrompt?: string,
  characterProfile?: unknown
): string {
  const charInfo = characterProfile 
    ? `\nCHARACTER PROFILE:\n${JSON.stringify(characterProfile, null, 2)}`
    : "";

  return `You are regenerating a SINGLE page prompt for page ${pageNumber} of a STORYBOOK coloring book.

The current prompt is:
"${currentPrompt}"

${basePrompt ? `BOOK THEME/CONCEPT:\n"${basePrompt}"` : ""}
${charInfo}

Generate a NEW, DIFFERENT scene for page ${pageNumber} that:
1. Uses the SAME character (do not change character design)
2. Has a DIFFERENT location or activity
3. Has DIFFERENT props and background elements
4. Maintains the overall book theme
5. Includes composition rules: subject fills 70-85% of page height, foreground touches bottom

Return ONLY valid JSON:
{
  "title": "Short page title",
  "prompt": "Full detailed scene description (80-120 words) for a coloring page. Include: subject action, location, 4-6 specific props with positions, camera framing. The ${characterProfile ? (characterProfile as { species?: string }).species || 'main character' : 'main character'} [does specific action] in [specific location]. Add composition: subject centered, fills frame, ground/floor extends to bottom edge, 2-3 foreground props near bottom."
}`;
}

function buildThemeRegenerationPrompt(
  pageNumber: number,
  currentPrompt: string,
  basePrompt?: string
): string {
  return `You are regenerating a SINGLE page prompt for page ${pageNumber} of a THEMED coloring book.

The current prompt is:
"${currentPrompt}"

${basePrompt ? `BOOK THEME/CONCEPT:\n"${basePrompt}"` : ""}

Generate a NEW, DIFFERENT scene for page ${pageNumber} that:
1. Stays on theme but uses DIFFERENT subject/activity
2. Has DIFFERENT props and background elements
3. Maintains consistent art style
4. Includes composition rules: subject fills 70-85% of page height, foreground touches bottom

Return ONLY valid JSON:
{
  "title": "Short page title",
  "prompt": "Full detailed scene description (80-120 words) for a coloring page. Include: subject, action, location, 4-6 specific props with positions, camera framing. Add composition: subject centered, fills frame, ground/floor extends to bottom edge, 2-3 foreground props near bottom."
}`;
}
