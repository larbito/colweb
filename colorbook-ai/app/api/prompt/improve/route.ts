import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import {
  OUTLINE_ONLY_CONSTRAINTS,
  NO_BORDER_CONSTRAINTS,
  FILL_CANVAS_CONSTRAINTS,
  FOREGROUND_BOTTOM_FILL_CONSTRAINTS,
} from "@/lib/coloringPagePromptEnforcer";

/**
 * POST /api/prompt/improve
 * 
 * Converts a user's book idea into a detailed, structured "Base Prompt" 
 * in the SAME format used in Style Clone.
 * 
 * This is the MANDATORY improvement step before generating page prompts.
 */

const requestSchema = z.object({
  idea: z.string().min(5, "Idea must be at least 5 characters"),
  mode: z.enum(["storybook", "theme"]).default("storybook"),
  age: z.enum(["3-6", "6-9", "9-12", "all-ages"]).optional().default("all-ages"),
  characterHint: z.string().optional().describe("Optional character description from user"),
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

    const { idea, mode, age, characterHint } = parseResult.data;

    const ageComplexity: Record<string, string> = {
      "3-6": "SIMPLE: 1 main subject + 2-4 large props, very minimal background, bold thick outlines",
      "6-9": "MODERATE: 1-2 subjects + 4-6 props, simple background elements, medium outlines",
      "9-12": "DETAILED: Can include more props (6-10), fuller backgrounds, finer outlines",
      "all-ages": "BALANCED: Medium complexity suitable for all ages, 4-8 props, clear focal point",
    };

    const modeInstructions = mode === "storybook"
      ? `STORYBOOK MODE: The prompt must establish a consistent main character who will appear on every page.
Include detailed character description: species/type, proportions (chibi vs realistic), face style, distinctive features, outfit/accessories.
The character design must be specific enough to recreate identically on multiple pages.`
      : `THEME MODE: The prompt establishes a consistent visual style and theme.
Characters may vary between pages, but the art style, line weight, and overall aesthetic must stay consistent.`;

    const improvePrompt = `You are an expert at writing detailed prompts for coloring book page generation.

Convert the following book idea into a DETAILED, STRUCTURED "Base Prompt" that can be used to generate multiple coloring book pages.

USER'S IDEA:
"${idea}"

${characterHint ? `USER'S CHARACTER DESCRIPTION: "${characterHint}"` : ""}

MODE: ${mode === "storybook" ? "Storybook (same character on every page)" : "Theme (same style, varied scenes)"}
TARGET AGE: ${ageComplexity[age || "all-ages"]}

${modeInstructions}

You MUST output a structured prompt in this EXACT format with these section headers:

---
Create a kids coloring book page in clean black-and-white OUTLINE line art (no filled areas, no grayscale).

Scene:
[Describe the typical scene setup. For storybook: describe the main character in EXTREME detail - species, proportions, face, features, outfit. For theme: describe the general subject type and setting. Position the main subject in the lower-middle area of the frame (not floating at top).]

Background:
[Describe the style of backgrounds that will appear - simple/detailed, indoor/outdoor types, typical elements. Background elements should extend toward edges.]

Composition:
[How elements should be arranged - centered vs rule-of-thirds, how much the subject fills the frame (90-95%), typical camera angle. Main subject positioned lower in the frame. Scene extends to all edges with minimal margins.]

Line style:
[Line characteristics - thick/thin, clean/sketchy, level of detail in the lines.]

Floor/ground:
[How the ground/floor should look - MUST extend to the bottom edge of the canvas. Include floor texture (tiles, grass, wood, rug, path) that reaches near the bottom margin. Simple but visible.]

Foreground / Bottom Fill:
[Include 2-5 small foreground props near the bottom of the scene (toys, flowers, pebbles, leaves, scattered books, shoes, etc.) to fill the lower area and prevent empty bottom space.]

Output:
[Output requirements - always include: printable coloring page, crisp black OUTLINES ONLY on pure white, NO filled black areas ANYWHERE, interior regions remain WHITE for coloring, NO text, NO watermark, NO border, NO frame. Subject fills 90-95% of the canvas with minimal margins. Ground/floor extends to the bottom edge. NO empty bottom space.]
---

CRITICAL REQUIREMENTS:
1. The prompt must be LONG and DETAILED (300-500 words)
2. For storybook mode: character description must be specific enough to ensure consistency
3. MUST include explicit "NO solid black fills" and "interior regions remain WHITE" in Output section
4. MUST include "NO border, NO frame" in Output section
5. MUST include "fills 90-95% of the canvas" in Output section
6. MUST include "bottom edge" and "foreground" to ensure no empty bottom space
7. Style should match what a professional children's coloring book would look like

Return ONLY the structured prompt text (no JSON, no explanation).`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "user", content: improvePrompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    let improvedPrompt = response.choices[0]?.message?.content?.trim() || "";

    // Remove any markdown code blocks if present
    improvedPrompt = improvedPrompt
      .replace(/^```[a-z]*\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    // Validate that the prompt contains required constraint phrases
    const requiredPhrases = [
      "NO solid black fills",
      "interior regions",
      "NO border",
      "90-95%",
      "bottom edge",
      "foreground",
    ];

    const missingPhrases = requiredPhrases.filter(phrase => 
      !improvedPrompt.toLowerCase().includes(phrase.toLowerCase())
    );

    // If missing critical phrases, append them
    if (missingPhrases.length > 0) {
      console.warn(`[prompt/improve] Missing phrases, appending constraints: ${missingPhrases.join(", ")}`);
      
      improvedPrompt += `

=== MANDATORY COLORING PAGE CONSTRAINTS ===
${OUTLINE_ONLY_CONSTRAINTS}
${NO_BORDER_CONSTRAINTS}
${FILL_CANVAS_CONSTRAINTS}
${FOREGROUND_BOTTOM_FILL_CONSTRAINTS}`;
    }

    // Extract character info if present (for storybook mode)
    let extractedCharacter: {
      species?: string;
      description?: string;
      keyFeatures?: string[];
    } | null = null;

    if (mode === "storybook") {
      // Try to extract character info from the Scene section
      const sceneMatch = improvedPrompt.match(/Scene:\n([\s\S]*?)(?=\n\n[A-Z]|Background:)/i);
      if (sceneMatch) {
        const sceneText = sceneMatch[1].trim();
        extractedCharacter = {
          description: sceneText.slice(0, 300),
        };
      }
    }

    console.log(`[prompt/improve] Improved prompt length: ${improvedPrompt.length} chars`);

    return NextResponse.json({
      prompt: improvedPrompt,
      mode,
      age,
      extractedCharacter,
      constraintsIncluded: missingPhrases.length === 0,
    });

  } catch (error) {
    console.error("[prompt/improve] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to improve prompt" },
      { status: 500 }
    );
  }
}
