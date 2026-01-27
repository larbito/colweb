import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { buildScenePromptsGenerationPrompt } from "@/lib/styleClonePromptBuilder";
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
  extractedThemeGuess: z.string(),
});

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
  // Can receive either styleContract (with extractedThemeGuess) or themePack
  styleContract: styleContractSchema.optional().nullable(),
  themePack: themePackSchema,
  userTheme: z.string().optional(),
  mode: z.enum(["series", "collection"]),
  pagesCount: z.number().int().min(1).max(80),
  complexity: z.enum(["simple", "medium", "detailed"]),
  // For Series mode
  characterName: z.string().optional(),
  characterDescription: z.string().optional(),
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

    const { styleContract, themePack, userTheme, mode, pagesCount, complexity, characterName, characterDescription } = parseResult.data;

    // Get the theme/world from either styleContract or themePack
    let extractedThemeGuess = "";
    let finalCharacterName = characterName;
    let finalCharacterDescription = characterDescription;

    if (styleContract?.extractedThemeGuess) {
      extractedThemeGuess = styleContract.extractedThemeGuess;
    } else if (themePack) {
      extractedThemeGuess = `Setting: ${themePack.setting}. 
Visual motifs: ${themePack.motifs.join(", ")}. 
Recurring elements: ${themePack.recurringProps.join(", ")}.
Allowed subjects: ${themePack.allowedSubjects.join(", ")}.`;
      
      if (themePack.characterName) {
        finalCharacterName = finalCharacterName || themePack.characterName;
        finalCharacterDescription = finalCharacterDescription || themePack.characterDescription;
      }
    }

    if (!extractedThemeGuess && !userTheme) {
      return NextResponse.json(
        { error: "No theme information provided. Please extract style first or provide a theme." },
        { status: 400 }
      );
    }

    // Build the prompt generation request
    const generationPrompt = buildScenePromptsGenerationPrompt({
      extractedThemeGuess: extractedThemeGuess || userTheme || "",
      userTheme,
      mode,
      pagesCount,
      complexity: complexity as Complexity,
      characterName: finalCharacterName,
      characterDescription: finalCharacterDescription,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: "You are an expert at creating detailed, cohesive coloring book scene descriptions. Always output valid JSON.",
        },
        {
          role: "user",
          content: generationPrompt,
        },
      ],
      max_tokens: Math.max(2000, Math.min(8000, pagesCount * 400)),
      temperature: 0.7,
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
      
      // Handle both array and object with prompts key
      let promptsArray: unknown[] = [];
      
      if (Array.isArray(parsed)) {
        promptsArray = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        // Try common keys first
        promptsArray = parsed.prompts || parsed.pages || parsed.scenes || parsed.data || parsed.items || [];
        
        // If still empty, look for any array property in the response
        if (promptsArray.length === 0) {
          for (const key of Object.keys(parsed)) {
            if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
              promptsArray = parsed[key];
              console.log(`Found prompts array under key: ${key}`);
              break;
            }
          }
        }
      }
      
      if (promptsArray.length === 0) {
        console.error("No prompts array found in response:", content.substring(0, 500));
        return NextResponse.json(
          { error: "AI returned empty or invalid prompts. Please try again." },
          { status: 500 }
        );
      }
      
      prompts = promptsArray.map((p: unknown, index: number) => {
        const item = p as { pageIndex?: number; title?: string; scenePrompt?: string; prompt?: string; description?: string };
        return {
          pageIndex: item.pageIndex || index + 1,
          title: item.title || `Scene ${index + 1}`,
          scenePrompt: item.scenePrompt || item.prompt || item.description || "",
        };
      });

      // Validate prompt quality
      const validPrompts = prompts.filter(p => p.scenePrompt && p.scenePrompt.length > 50);
      if (validPrompts.length < prompts.length) {
        console.warn(`${prompts.length - validPrompts.length} prompts were too short`);
      }

      // Ensure we have the requested number of prompts
      if (prompts.length < pagesCount) {
        console.warn(`Only generated ${prompts.length} prompts, requested ${pagesCount}`);
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content.substring(0, 500));
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      prompts,
      debug: {
        model: "gpt-4.1",
        tokensUsed: response.usage?.total_tokens,
        promptsGenerated: prompts.length,
        themeUsed: extractedThemeGuess.substring(0, 200) + "...",
        mode,
        complexity,
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
