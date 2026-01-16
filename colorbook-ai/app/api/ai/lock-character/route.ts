import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import {
  lockCharacterRequestSchema,
  characterLockSchema,
  type LockCharacterResponse,
} from "@/lib/schemas";

export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    const parseResult = lockCharacterRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { theme, mainCharacterName, mainCharacterDescription, stylePreset, lineThickness } = parseResult.data;

    const lineThicknessRules = {
      thin: { outer: "2px thin lines", inner: "1px delicate inner details", ends: "pointed" },
      medium: { outer: "3-4px medium outlines", inner: "2px inner details", ends: "slightly rounded" },
      bold: { outer: "5-6px thick bold outlines", inner: "3px inner details", ends: "rounded" },
    };

    const complexityRules = {
      kids: "Very simple shapes, minimal details, large areas to color, ages 3-6",
      medium: "Moderate detail, balanced complexity, ages 6-12",
      detailed: "Intricate patterns, complex scenes, for teens and adults",
    };

    const systemPrompt = `You are an expert character designer for coloring books.
Create a CANONICAL character definition that will keep the character EXACTLY consistent across all pages.

Return ONLY a JSON object with this EXACT structure:
{
  "canonicalName": "string - the character's name",
  "visualRules": {
    "proportions": "string - exact body proportions (e.g., 'head is 1/3 of body height, large round eyes')",
    "face": "string - exact facial features (e.g., 'round face, button nose, two dots for eyes, curved smile')",
    "uniqueFeatures": ["array of 3-5 distinguishing visual features"],
    "outfit": "string - exact clothing/accessories description",
    "lineRules": {
      "outerStroke": "${lineThicknessRules[lineThickness].outer}",
      "innerStroke": "${lineThicknessRules[lineThickness].inner}",
      "strokeEnds": "${lineThicknessRules[lineThickness].ends}",
      "noShading": true
    },
    "backgroundRules": "string - how backgrounds should be drawn",
    "compositionRules": "string - how to frame the character in scenes"
  },
  "negativeRules": ["array of things to NEVER include"]
}

Character to define:
Name: ${mainCharacterName}
Description: ${mainCharacterDescription}
Theme: ${theme}
Style: ${complexityRules[stylePreset]}

CRITICAL RULES:
- NO copyrighted or trademarked characters
- Define EXACT visual attributes so the character looks IDENTICAL in every scene
- Include specific proportions (ratios, sizes)
- The character must be suitable for black & white line art coloring pages
- Negative rules must include: "no text", "no shading", "no grayscale", "no gradients", "no watermarks"`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Create the canonical character lock for ${mainCharacterName}.` },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse JSON from response
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
        return NextResponse.json({ error: "Invalid JSON from AI" }, { status: 500 });
      }
    }

    // Validate with zod
    const validationResult = characterLockSchema.safeParse(parsed);
    if (!validationResult.success) {
      console.error("Character lock validation failed:", validationResult.error);
      return NextResponse.json({ error: "AI response did not match expected format" }, { status: 500 });
    }

    const result: LockCharacterResponse = {
      characterLock: validationResult.data,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Lock character error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to lock character" },
      { status: 500 }
    );
  }
}

