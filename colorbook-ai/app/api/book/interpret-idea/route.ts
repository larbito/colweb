import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";

/**
 * Route segment config
 */
export const maxDuration = 30;

const requestSchema = z.object({
  ideaText: z.string().min(10, "Idea must be at least 10 characters"),
  bookType: z.enum(["storybook", "theme"]),
  pagesCount: z.number().int().min(1).max(80),
  targetAge: z.enum(["3-6", "6-9", "9-12", "all-ages"]).optional(),
  settingConstraint: z.enum(["indoors", "outdoors", "mixed"]).optional(),
  variety: z.enum(["low", "medium", "high"]).optional(),
});

export interface InterpretedIdea {
  coreTheme: string;
  mustHave: string[];
  mustAvoid: string[];
  settingWorld: string;
  mainCharacter?: {
    name: string;
    species: string;
    visualTraits: string[];
    consistentRules: string[];
  };
  scenePalette: Array<{
    sceneType: string;
    examples: string[];
  }>;
  compositionGuidance: string;
  styleKeywords: string[];
}

/**
 * POST /api/book/interpret-idea
 * 
 * Interprets the user's book idea and extracts structured constraints.
 * This ensures prompts are generated from the user's explicit request,
 * not from generic templates.
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

    const { ideaText, bookType, pagesCount, targetAge, settingConstraint, variety } = parseResult.data;

    console.log(`[interpret-idea] Processing: "${ideaText.substring(0, 100)}..." (${bookType}, ${pagesCount} pages)`);

    // Build the interpretation prompt
    const interpretPrompt = `You are an expert at interpreting user ideas for coloring books.

USER IDEA: "${ideaText}"

BOOK TYPE: ${bookType === "storybook" ? "STORYBOOK - same main character across all pages" : "THEME COLLECTION - consistent theme, varied subjects"}
PAGES: ${pagesCount}
AGE: ${targetAge || "all-ages"}

EXTRACT STRICT CONSTRAINTS from the user's idea:

1. CORE THEME - What is the main theme/concept? (extract from user text)
2. MUST HAVE - What elements/motifs MUST appear? (explicit from user)
3. MUST AVOID - What should NOT appear? (implicit - opposite of theme)
4. SETTING WORLD - Where does this take place? (explicit from user, NOT generic daily life)
5. ${bookType === "storybook" ? "MAIN CHARACTER - Extract detailed character description" : "SUBJECT TYPES - What kinds of subjects fit this theme?"}
6. SCENE PALETTE - What types of scenes fit this theme? (NOT bedroom/kitchen unless user said so)

CRITICAL RULES:
- If user says "alien planet", settingWorld = "alien planet" (NOT Earth locations)
- If user says "Valentine's Day", every scene MUST have Valentine motifs (hearts, love, etc.)
- If user says "turtle in a garden", every scene MUST be garden/outdoor nature (NO bedrooms)
- If user says specific character (name, species), that IS the main character for storybook
- Do NOT add generic indoor daily life scenes unless user explicitly requested them
- Scene palette should be DIVERSE but ON-THEME

OUTPUT valid JSON with this EXACT structure:
{
  "coreTheme": "one sentence core theme extracted from user idea",
  "mustHave": ["specific", "elements", "mentioned", "by", "user", "or", "implied", "by", "theme"],
  "mustAvoid": ["things", "that", "break", "this", "theme"],
  "settingWorld": "specific world/setting from user idea",
  ${bookType === "storybook" ? `
  "mainCharacter": {
    "name": "character name if provided, or generic like 'the turtle'",
    "species": "exact species/type",
    "visualTraits": ["key", "visual", "features", "mentioned", "or", "typical", "of", "species"],
    "consistentRules": ["same face", "same proportions", "same outfit if mentioned"]
  },` : `
  "subjectTypes": ["types", "of", "subjects", "that", "fit", "the", "theme"],`}
  "scenePalette": [
    {
      "sceneType": "descriptive scene category",
      "examples": ["example 1", "example 2"]
    }
  ],
  "compositionGuidance": "guidance for how to frame scenes (close-up, wide, etc.)",
  "styleKeywords": ["visual", "style", "keywords", "like", "cute", "bold", "realistic", "cartoonish"]
}

EXAMPLES (to guide your understanding):
- If idea = "turtle in a garden": settingWorld = "garden/outdoor nature", scenePalette = [{sceneType: "garden activities", examples: ["watering flowers", "eating lettuce"]}, {sceneType: "nature exploration", examples: ["finding bugs", "under a tree"]}]
- If idea = "alien adventures on another planet": settingWorld = "alien planet with unusual sky and alien creatures", scenePalette = [{sceneType: "alien environment", examples: ["exploring crystal caves", "meeting friendly aliens", "flying over purple valleys"]}]
- If idea = "Valentine's Day with love quotes": coreTheme = "Valentine's Day coloring pages", mustHave = ["hearts", "roses", "love birds", "romance"], scenePalette = [{sceneType: "romantic scenes", examples: ["couple having picnic", "exchanging gifts", "garden with heart-shaped flowers"]}]

Be SPECIFIC. Extract from the user's actual text. Do NOT default to generic templates.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "user", content: interpretPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.3, // Low temperature for consistent interpretation
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    try {
      const interpreted = JSON.parse(content) as InterpretedIdea;
      
      console.log(`[interpret-idea] Theme: "${interpreted.coreTheme}"`);
      console.log(`[interpret-idea] Setting: "${interpreted.settingWorld}"`);
      console.log(`[interpret-idea] Scene types: ${interpreted.scenePalette.map(s => s.sceneType).join(", ")}`);

      return NextResponse.json({
        interpretedIdea: interpreted,
        debug: {
          model: "gpt-4o",
          tokensUsed: response.usage?.total_tokens,
          ideaLength: ideaText.length,
        },
      });

    } catch (parseError) {
      console.error("[interpret-idea] Parse error:", parseError, "Content:", content.substring(0, 500));
      return NextResponse.json(
        { error: "Failed to parse interpretation" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("[interpret-idea] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to interpret idea" },
      { status: 500 }
    );
  }
}

