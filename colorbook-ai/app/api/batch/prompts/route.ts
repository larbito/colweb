import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import {
  batchPromptsRequestSchema,
  buildCharacterConsistencyBlock,
  type BatchPromptsResponse,
  type PagePromptItem,
  type CharacterProfile,
  type StyleProfile,
} from "@/lib/batchGenerationTypes";
import { NO_FILL_CONSTRAINTS, NEGATIVE_PROMPT_LIST } from "@/lib/coloringPagePromptEnforcer";

/**
 * POST /api/batch/prompts
 * 
 * Generates N page prompts for batch image generation.
 * 
 * Storybook mode: Same character across all pages, story arc progression
 * Theme mode: Same style, varied scenes and characters
 * 
 * Each prompt follows the structured format and includes no-fill constraints.
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
    const parseResult = batchPromptsRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { mode, count, story, styleProfile, characterProfile, sceneInventory, basePrompt } = parseResult.data;

    // Validate storybook mode requires character profile
    if (mode === "storybook" && !characterProfile) {
      return NextResponse.json(
        { error: "Storybook mode requires a character profile for consistency" },
        { status: 400 }
      );
    }

    // Build the prompt generation request
    const systemPrompt = buildSystemPrompt(mode, styleProfile, characterProfile, story);
    const userPrompt = buildUserPrompt(mode, count, story, sceneInventory, basePrompt);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    let responseText = response.choices[0]?.message?.content?.trim() || "";

    // Clean up markdown if present
    responseText = responseText
      .replace(/^```json\n?/i, "")
      .replace(/^```\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    let pagesData: { pages: Array<{ page: number; title: string; sceneDescription: string }> };
    
    try {
      pagesData = JSON.parse(responseText);
    } catch {
      console.error("[batch/prompts] Failed to parse response:", responseText.slice(0, 500));
      return NextResponse.json(
        { error: "Failed to generate prompts - invalid response format" },
        { status: 500 }
      );
    }

    // Build character consistency block for storybook mode
    const characterConsistencyBlock = mode === "storybook" && characterProfile
      ? buildCharacterConsistencyBlock(characterProfile)
      : undefined;

    // Convert scene descriptions to full prompts
    const pages: PagePromptItem[] = pagesData.pages.map((page) => {
      const fullPrompt = buildFullPagePrompt({
        sceneDescription: page.sceneDescription,
        styleProfile,
        characterProfile: mode === "storybook" ? characterProfile : undefined,
        characterConsistencyBlock,
      });

      return {
        page: page.page,
        title: page.title,
        prompt: fullPrompt,
        sceneDescription: page.sceneDescription,
      };
    });

    const result: BatchPromptsResponse = {
      pages,
      mode,
      characterConsistencyBlock,
    };

    console.log(`[batch/prompts] Generated ${pages.length} prompts in ${mode} mode`);

    return NextResponse.json(result);

  } catch (error) {
    console.error("[batch/prompts] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate prompts" },
      { status: 500 }
    );
  }
}

/**
 * Build system prompt for the AI
 */
function buildSystemPrompt(
  mode: "storybook" | "theme",
  styleProfile: StyleProfile,
  characterProfile?: CharacterProfile,
  story?: { title?: string; outline?: string; targetAge?: string; sceneVariety?: string; settingConstraint?: string }
): string {
  const ageGuide: Record<string, string> = {
    "3-6": "Very simple scenes, 2-3 large props, single activity per page",
    "6-9": "Moderate complexity, 4-6 props, clear focal point",
    "9-12": "More detail allowed, 6-8 props, can include backgrounds",
    "all-ages": "Balanced complexity suitable for all ages",
  };

  const varietyGuide: Record<string, string> = {
    low: "Keep scenes very similar, same setting with minor variations",
    medium: "Moderate variety in settings and activities",
    high: "High variety - each scene distinctly different",
  };

  let prompt = `You are a children's coloring book designer creating scene descriptions for a coloring book.

STYLE RULES (apply to every page):
- Line style: ${styleProfile.lineStyle}
- Composition: ${styleProfile.compositionRules}
- Environment: ${styleProfile.environmentStyle}
- MUST AVOID: ${styleProfile.mustAvoid.join(", ")}

TARGET AUDIENCE: ${ageGuide[story?.targetAge || "all-ages"]}
SCENE VARIETY: ${varietyGuide[story?.sceneVariety || "medium"]}
SETTING: ${story?.settingConstraint === "indoors" ? "Indoor scenes only" : story?.settingConstraint === "outdoors" ? "Outdoor scenes only" : "Mix of indoor and outdoor"}
`;

  if (mode === "storybook" && characterProfile) {
    prompt += `
MODE: STORYBOOK (Same character on every page)

MAIN CHARACTER (must appear on EVERY page, looking IDENTICAL):
- Species: ${characterProfile.species}
- Key features: ${characterProfile.keyFeatures.join(", ")}
- Proportions: ${characterProfile.proportions}
- Face: ${characterProfile.faceStyle}
${characterProfile.clothing ? `- Outfit: ${characterProfile.clothing}` : ""}
- Pose style: ${characterProfile.poseVibe}

CRITICAL: The character's appearance MUST stay consistent. Only vary:
- Pose and action
- Location/setting
- Props they interact with
- Background elements

DO NOT change: ${characterProfile.doNotChange.join(", ")}
`;
  } else {
    prompt += `
MODE: THEME (Same style, varied scenes)
Each page can feature different subjects while maintaining the same visual style.
Create variety in characters, settings, and activities while keeping the line art style consistent.
`;
  }

  if (story?.title) {
    prompt += `\nSTORY TITLE: "${story.title}"`;
  }
  if (story?.outline) {
    prompt += `\nSTORY OUTLINE: ${story.outline}`;
  }

  return prompt;
}

/**
 * Build user prompt requesting page generation
 */
function buildUserPrompt(
  mode: "storybook" | "theme",
  count: number,
  story?: { title?: string; outline?: string; targetAge?: string },
  sceneInventory?: string[],
  basePrompt?: string
): string {
  const inventoryStr = sceneInventory?.length 
    ? `\nAVAILABLE PROPS/ELEMENTS (use these across pages): ${sceneInventory.join(", ")}`
    : "";

  const basePromptRef = basePrompt 
    ? `\nREFERENCE PROMPT (use as style guide): "${basePrompt.slice(0, 500)}..."`
    : "";

  let storyArcGuidance = "";
  if (mode === "storybook") {
    storyArcGuidance = `
STORY ARC GUIDANCE:
- Page 1: Introduction - establish character and setting
- Pages 2-${Math.floor(count * 0.7)}: Rising action - different activities, building excitement
- Pages ${Math.floor(count * 0.7) + 1}-${count - 1}: Peak moments - most engaging activities
- Page ${count}: Conclusion - calm, happy ending scene`;
  }

  return `Generate exactly ${count} page descriptions for a children's coloring book.
${inventoryStr}
${basePromptRef}
${storyArcGuidance}

Return ONLY valid JSON in this exact format:
{
  "pages": [
    {
      "page": 1,
      "title": "Short Scene Title",
      "sceneDescription": "Detailed description of the scene. Include: subject(s), action, setting, 4-8 specific props, composition notes. Be very specific about positions and relationships between elements."
    },
    {
      "page": 2,
      "title": "...",
      "sceneDescription": "..."
    }
  ]
}

RULES:
1. Each sceneDescription must be detailed (50-100 words)
2. Include specific props and their positions
3. Vary activities across pages (no repeats)
4. ${mode === "storybook" ? "Keep the main character as the focal point of every scene" : "Create diverse subjects and scenes"}
5. All scenes must be child-appropriate and suitable for coloring
6. Do NOT include color descriptions (it's a coloring book)
7. Include composition notes (centered, left of frame, etc.)`;
}

/**
 * Build the full prompt for a single page
 */
function buildFullPagePrompt(params: {
  sceneDescription: string;
  styleProfile: StyleProfile;
  characterProfile?: CharacterProfile;
  characterConsistencyBlock?: string;
}): string {
  const { sceneDescription, styleProfile, characterProfile, characterConsistencyBlock } = params;

  const parts: string[] = [];

  // Title line
  parts.push("Create a kids coloring book page in clean black-and-white line art (no grayscale).");

  // Scene section
  parts.push(`\nScene:\n${sceneDescription}`);

  // Character consistency block (for storybook mode)
  if (characterConsistencyBlock) {
    parts.push(characterConsistencyBlock);
  }

  // Background/composition
  parts.push(`\nComposition:\n${styleProfile.compositionRules}. ${styleProfile.environmentStyle}.`);

  // Line style
  parts.push(`\nLine style:\n${styleProfile.lineStyle}. Clean, smooth outlines suitable for coloring.`);

  // Output constraints
  parts.push(`\nOutput:
Printable coloring page, crisp black outlines on pure white background.
NO text, NO watermark, NO signature, NO border.
All shapes closed and ready for coloring with crayons or markers.`);

  // Add mandatory no-fill constraints
  parts.push(NO_FILL_CONSTRAINTS);

  // Add avoid list
  parts.push(`\nAVOID: ${[...styleProfile.mustAvoid, ...NEGATIVE_PROMPT_LIST.slice(0, 5)].join(", ")}.`);

  return parts.join("\n");
}

