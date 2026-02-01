import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { buildScenePromptsGenerationPrompt, buildPromptEvaluationPrompt } from "@/lib/styleClonePromptBuilder";
import type { StyleClonePrompt } from "@/lib/styleClone";
import type { Complexity } from "@/lib/generationSpec";

/**
 * Generate scene prompts with novelty memory and theme adherence
 * 
 * Features:
 * - Prevents repetition of props/settings/actions
 * - Enforces user theme in every scene
 * - Validates prompt quality before returning
 * - Batches large page counts to prevent timeouts
 */

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
  styleContract: styleContractSchema.optional().nullable(),
  themePack: themePackSchema,
  userTheme: z.string().optional(),
  mode: z.enum(["series", "collection"]),
  pagesCount: z.number().int().min(1).max(80),
  complexity: z.enum(["simple", "medium", "detailed"]),
  characterName: z.string().optional(),
  characterDescription: z.string().optional(),
});

// Batch size for generating prompts (prevents timeout)
const BATCH_SIZE = 20;

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

    // Get theme from either styleContract or themePack
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

    // Use userTheme as override if provided
    const effectiveTheme = userTheme || extractedThemeGuess;

    if (!effectiveTheme) {
      return NextResponse.json(
        { error: "No theme information provided. Please extract style first or provide a theme." },
        { status: 400 }
      );
    }

    console.log(`[prompts] Generating ${pagesCount} prompts for theme: "${effectiveTheme.substring(0, 100)}..."`);

    // For large page counts, generate in batches
    let allPrompts: StyleClonePrompt[] = [];
    const batches = Math.ceil(pagesCount / BATCH_SIZE);

    for (let batch = 0; batch < batches; batch++) {
      const batchStart = batch * BATCH_SIZE;
      const batchCount = Math.min(BATCH_SIZE, pagesCount - batchStart);

      console.log(`[prompts] Generating batch ${batch + 1}/${batches} (${batchCount} prompts)`);

      const generationPrompt = buildScenePromptsGenerationPrompt({
        extractedThemeGuess: effectiveTheme,
        userTheme,
        mode,
        pagesCount: batchCount,
        complexity: complexity as Complexity,
        characterName: finalCharacterName,
        characterDescription: finalCharacterDescription,
      });

      // Add context about previous batches to maintain novelty
      let contextPrompt = generationPrompt;
      if (batch > 0 && allPrompts.length > 0) {
        const usedElements = allPrompts.slice(-10).map(p => 
          `- ${p.title}: ${p.scenePrompt.substring(0, 100)}`
        ).join("\n");
        contextPrompt += `\n\nPREVIOUSLY GENERATED (DO NOT REPEAT THESE):\n${usedElements}\n\nStart page numbering at ${batchStart + 1}.`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert at creating detailed, cohesive coloring book scene descriptions. 
You MUST:
1. Follow the user's theme EXACTLY
2. Never repeat settings, props, or actions
3. Output valid JSON only
4. Each scene must feel unique but part of the same world`,
          },
          {
            role: "user",
            content: contextPrompt,
          },
        ],
        max_tokens: Math.max(2000, Math.min(8000, batchCount * 400)),
        temperature: 0.75, // Slightly higher for more variety
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error(`[prompts] No response for batch ${batch + 1}`);
        continue;
      }

      // Parse batch prompts
      try {
        const parsed = JSON.parse(content);
        let promptsArray: unknown[] = [];

        if (Array.isArray(parsed)) {
          promptsArray = parsed;
        } else if (typeof parsed === "object" && parsed !== null) {
          promptsArray = parsed.prompts || parsed.pages || parsed.scenes || parsed.data || parsed.items || [];

          if (promptsArray.length === 0) {
            for (const key of Object.keys(parsed)) {
              if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
                promptsArray = parsed[key];
                break;
              }
            }
          }
        }

        const batchPrompts: StyleClonePrompt[] = promptsArray.map((p: unknown, index: number) => {
          const item = p as { 
            pageIndex?: number; 
            title?: string; 
            scenePrompt?: string; 
            prompt?: string; 
            description?: string;
            doNotRepeat?: string[];
          };
          return {
            pageIndex: batchStart + (item.pageIndex || index + 1),
            title: item.title || `Scene ${batchStart + index + 1}`,
            scenePrompt: item.scenePrompt || item.prompt || item.description || "",
          };
        });

        // Validate prompts before adding
        const validPrompts = batchPrompts.filter(p => p.scenePrompt && p.scenePrompt.length > 50);
        allPrompts = [...allPrompts, ...validPrompts];

        console.log(`[prompts] Batch ${batch + 1}: generated ${validPrompts.length} valid prompts`);

      } catch (parseError) {
        console.error(`[prompts] Parse error for batch ${batch + 1}:`, parseError);
      }

      // Short delay between batches
      if (batch < batches - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Validate we have enough prompts
    if (allPrompts.length < pagesCount * 0.8) {
      console.warn(`[prompts] Only generated ${allPrompts.length}/${pagesCount} prompts`);
    }

    // Re-index prompts to ensure sequential page numbers
    const finalPrompts = allPrompts.map((p, idx) => ({
      ...p,
      pageIndex: idx + 1,
    }));

    // Evaluate prompt quality (optional quality gate)
    let evaluationResult = null;
    if (userTheme && finalPrompts.length > 0) {
      try {
        const evalPrompt = buildPromptEvaluationPrompt({
          prompts: finalPrompts.slice(0, 10), // Sample first 10
          userTheme,
        });

        const evalResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: evalPrompt }],
          max_tokens: 500,
          temperature: 0.3,
          response_format: { type: "json_object" },
        });

        const evalContent = evalResponse.choices[0]?.message?.content;
        if (evalContent) {
          evaluationResult = JSON.parse(evalContent);
          console.log(`[prompts] Quality evaluation: ${JSON.stringify(evaluationResult)}`);
        }
      } catch (evalError) {
        console.warn("[prompts] Evaluation failed:", evalError);
      }
    }

    return NextResponse.json({
      prompts: finalPrompts,
      debug: {
        model: "gpt-4o",
        promptsGenerated: finalPrompts.length,
        promptsRequested: pagesCount,
        batchesUsed: batches,
        themeUsed: effectiveTheme.substring(0, 300) + "...",
        userThemeProvided: !!userTheme,
        mode,
        complexity,
        characterIncluded: !!finalCharacterName,
        evaluation: evaluationResult,
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
