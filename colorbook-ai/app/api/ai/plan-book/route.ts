import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import {
  type IdeaSpec,
  type PageOutline,
  type CharacterSheet,
  type ScenePlan,
  IDEA_SPEC_SYSTEM_PROMPT,
  PAGE_OUTLINE_SYSTEM_PROMPT,
  CHARACTER_SHEET_SYSTEM_PROMPT,
  getComplexityConfig,
  isGenericFiller,
  isTemplateUnlessRequested,
  GENERIC_FILLERS,
} from "@/lib/ideaPlanner";

export const maxDuration = 120;

const requestSchema = z.object({
  userIdea: z.string().min(1),
  bookType: z.enum(["storybook", "theme", "quotes"]),
  pageCount: z.number().int().min(1).max(80),
  complexity: z.enum(["simple", "medium", "detailed", "ultra"]).default("medium"),
  targetAudience: z.enum(["toddlers", "kids", "tweens", "teens", "adults"]).default("kids"),
});

/**
 * POST /api/ai/plan-book
 * 
 * Two-stage smart planning:
 * 1. Parse user idea into IdeaSpec
 * 2. Generate unique PageOutlines with anti-repetition
 * 3. For storybook: create CharacterSheet
 */
export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "OpenAI not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { userIdea, bookType, pageCount, complexity, targetAudience } = requestSchema.parse(body);
    
    console.log(`[plan-book] Planning ${bookType} with ${pageCount} pages, complexity: ${complexity}`);
    
    // Stage 1: Parse user idea into IdeaSpec
    const ideaSpec = await parseIdeaSpec(userIdea, bookType, complexity, targetAudience);
    console.log(`[plan-book] IdeaSpec created: theme="${ideaSpec.theme}", world="${ideaSpec.world}"`);
    
    // Stage 2: Generate CharacterSheet for storybook mode
    let characterSheet: CharacterSheet | undefined;
    if (bookType === "storybook" && ideaSpec.subjects.length > 0) {
      characterSheet = await generateCharacterSheet(ideaSpec);
      console.log(`[plan-book] CharacterSheet created: species="${characterSheet.species}"`);
    }
    
    // Stage 3: Generate PageOutlines with anti-repetition
    const scenePlan = await generateScenePlan(ideaSpec, pageCount, bookType, complexity);
    console.log(`[plan-book] ScenePlan created: ${scenePlan.pages.length} pages, diversity=${scenePlan.diversityScore}`);
    
    // Validate and clean the plan
    const cleanedPlan = cleanScenePlan(scenePlan, ideaSpec, userIdea);
    
    return NextResponse.json({
      ideaSpec,
      characterSheet,
      scenePlan: cleanedPlan,
      complexity,
    });
    
  } catch (error) {
    console.error("[plan-book] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to plan book" },
      { status: 500 }
    );
  }
}

// ============================================================
// Stage 1: Parse User Idea
// ============================================================

async function parseIdeaSpec(
  userIdea: string,
  bookType: string,
  complexity: string,
  targetAudience: string
): Promise<IdeaSpec> {
  const prompt = `${IDEA_SPEC_SYSTEM_PROMPT}

USER INPUT: "${userIdea}"
BOOK TYPE: ${bookType}
COMPLEXITY: ${complexity}
TARGET AUDIENCE: ${targetAudience}

Analyze this and return a JSON IdeaSpec:
{
  "subjects": ["main character(s)"],
  "world": "the setting/world",
  "theme": "core theme",
  "targetAudience": "${targetAudience}",
  "complexity": "${complexity}",
  "mood": "overall mood",
  "mustInclude": ["theme-required elements"],
  "forbidden": ["off-theme elements", "generic fillers"],
  "userConstraints": ["explicit constraints from input"],
  "isHolidayTheme": true/false,
  "holidayName": "if applicable",
  "holidayMotifs": ["hearts", "etc"],
  "suggestedSettings": ["5-10 theme-appropriate locations"],
  "suggestedActions": ["10-15 theme-appropriate activities"],
  "suggestedProps": ["20-30 theme-appropriate props"]
}

CRITICAL: 
- Do NOT suggest bedroom/kitchen/school unless user explicitly asked
- All settings/actions/props must derive from "${userIdea}"
- Forbidden list must include: ${GENERIC_FILLERS.slice(0, 5).join(", ")}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2000,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content || "";
  const cleaned = content.replace(/```json\n?/gi, "").replace(/```\n?/gi, "").trim();
  
  try {
    const parsed = JSON.parse(cleaned);
    return {
      subjects: parsed.subjects || [],
      world: parsed.world || userIdea,
      theme: parsed.theme || userIdea,
      targetAudience: parsed.targetAudience || targetAudience,
      complexity: parsed.complexity || complexity,
      mood: parsed.mood || "cheerful",
      mustInclude: parsed.mustInclude || [],
      forbidden: [...(parsed.forbidden || []), ...GENERIC_FILLERS],
      userConstraints: parsed.userConstraints || [],
      isHolidayTheme: parsed.isHolidayTheme || false,
      holidayName: parsed.holidayName,
      holidayMotifs: parsed.holidayMotifs,
      suggestedSettings: parsed.suggestedSettings || [],
      suggestedActions: parsed.suggestedActions || [],
      suggestedProps: parsed.suggestedProps || [],
    };
  } catch {
    console.error("[plan-book] Failed to parse IdeaSpec:", cleaned.slice(0, 500));
    // Fallback
    return {
      subjects: [userIdea.split(" ").slice(0, 3).join(" ")],
      world: userIdea,
      theme: userIdea,
      targetAudience: targetAudience as IdeaSpec["targetAudience"],
      complexity: complexity as IdeaSpec["complexity"],
      mood: "cheerful",
      mustInclude: [],
      forbidden: GENERIC_FILLERS,
      userConstraints: [],
      isHolidayTheme: false,
      suggestedSettings: [],
      suggestedActions: [],
      suggestedProps: [],
    };
  }
}

// ============================================================
// Stage 2: Generate CharacterSheet
// ============================================================

async function generateCharacterSheet(ideaSpec: IdeaSpec): Promise<CharacterSheet> {
  const mainSubject = ideaSpec.subjects[0] || "cute character";
  
  const prompt = `${CHARACTER_SHEET_SYSTEM_PROMPT}

CREATE A CHARACTER SHEET FOR: ${mainSubject}
WORLD: ${ideaSpec.world}
STYLE: Clean outline coloring page (black lines on white)

Return JSON:
{
  "id": "char_${Date.now()}",
  "name": "optional name",
  "species": "SPECIFIC species (e.g., 'baby panda with round cheeks', not just 'panda')",
  "proportions": "EXACT body proportions (e.g., 'chibi style, head is 40% of total height')",
  "faceShape": "precise face shape",
  "eyeStyle": "precise eye design (MUST be outline only, no solid black)",
  "noseStyle": "nose design",
  "mouthStyle": "mouth style",
  "earStyle": "ear shape and position",
  "hornStyle": "if applicable or null",
  "tailStyle": "if applicable or null",
  "wingStyle": "if applicable or null",
  "hairTuft": "if applicable or null",
  "defaultOutfit": "if applicable",
  "signatureAccessories": ["distinctive items"],
  "handsRule": "MUST always show both hands/paws clearly in every scene",
  "doNotChange": ["list every feature that must stay IDENTICAL across pages"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1500,
    temperature: 0.5,
  });

  const content = response.choices[0]?.message?.content || "";
  const cleaned = content.replace(/```json\n?/gi, "").replace(/```\n?/gi, "").trim();
  
  try {
    const parsed = JSON.parse(cleaned);
    return {
      id: parsed.id || `char_${Date.now()}`,
      name: parsed.name,
      species: parsed.species || mainSubject,
      proportions: parsed.proportions || "chibi with large head",
      faceShape: parsed.faceShape || "round",
      eyeStyle: parsed.eyeStyle || "large round eyes with small outline pupils",
      noseStyle: parsed.noseStyle || "small button nose",
      mouthStyle: parsed.mouthStyle || "friendly smile",
      earStyle: parsed.earStyle || "matching species",
      hornStyle: parsed.hornStyle,
      tailStyle: parsed.tailStyle,
      wingStyle: parsed.wingStyle,
      hairTuft: parsed.hairTuft,
      defaultOutfit: parsed.defaultOutfit,
      signatureAccessories: parsed.signatureAccessories,
      handsRule: parsed.handsRule || "MUST always show both hands/paws clearly",
      doNotChange: parsed.doNotChange || ["face shape", "eye style", "proportions", "species"],
    };
  } catch {
    console.error("[plan-book] Failed to parse CharacterSheet");
    return {
      id: `char_${Date.now()}`,
      species: mainSubject,
      proportions: "chibi with large head",
      faceShape: "round",
      eyeStyle: "large round eyes",
      noseStyle: "small button nose",
      mouthStyle: "friendly smile",
      earStyle: "matching species",
      handsRule: "MUST always show both hands/paws clearly",
      doNotChange: ["face shape", "eye style", "proportions"],
    };
  }
}

// ============================================================
// Stage 3: Generate Scene Plan
// ============================================================

async function generateScenePlan(
  ideaSpec: IdeaSpec,
  pageCount: number,
  bookType: string,
  complexity: string
): Promise<ScenePlan> {
  const config = getComplexityConfig(complexity);
  
  const prompt = `${PAGE_OUTLINE_SYSTEM_PROMPT}

CREATE ${pageCount} UNIQUE SCENES for a ${bookType.toUpperCase()} coloring book.

IDEA SPEC:
- Theme: ${ideaSpec.theme}
- World: ${ideaSpec.world}
- Subjects: ${ideaSpec.subjects.join(", ")}
- Mood: ${ideaSpec.mood}
- Must Include: ${ideaSpec.mustInclude.join(", ")}
- Forbidden: ${ideaSpec.forbidden.slice(0, 10).join(", ")}
${ideaSpec.isHolidayTheme ? `- Holiday: ${ideaSpec.holidayName}, Motifs: ${ideaSpec.holidayMotifs?.join(", ")}` : ""}

AVAILABLE SETTINGS: ${ideaSpec.suggestedSettings.slice(0, 10).join(", ")}
AVAILABLE ACTIONS: ${ideaSpec.suggestedActions.slice(0, 15).join(", ")}
AVAILABLE PROPS: ${ideaSpec.suggestedProps.slice(0, 20).join(", ")}

COMPLEXITY: ${complexity} (${config.propsRange[0]}-${config.propsRange[1]} props per scene)

ANTI-REPETITION RULES:
1. Use each setting at most TWICE across all ${pageCount} pages
2. Each scene must have 2+ props NOT used in previous 3 pages
3. Vary compositions: close-up, medium, wide (rotate through)
4. Every scene needs a unique "noveltyTag"

Return JSON:
{
  "pages": [
    {
      "pageIndex": 1,
      "title": "Short Title",
      "setting": "specific location",
      "action": "specific action",
      "props": ["prop1 (position)", "prop2", "prop3", "prop4"],
      "compositionNotes": "close-up / medium shot / wide scene",
      "noveltyTag": "what makes this unique",
      "characterPose": "pose description (for storybook)",
      "characterExpression": "emotion"
    }
  ],
  "diversityScore": 0-100,
  "usedSettings": ["list all"],
  "usedProps": ["list all unique"],
  "usedActions": ["list all"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: Math.min(4000, 200 + pageCount * 120),
    temperature: 0.8,
  });

  const content = response.choices[0]?.message?.content || "";
  const cleaned = content.replace(/```json\n?/gi, "").replace(/```\n?/gi, "").trim();
  
  try {
    const parsed = JSON.parse(cleaned);
    return {
      pages: parsed.pages || [],
      diversityScore: parsed.diversityScore || 50,
      usedSettings: parsed.usedSettings || [],
      usedProps: parsed.usedProps || [],
      usedActions: parsed.usedActions || [],
    };
  } catch {
    console.error("[plan-book] Failed to parse ScenePlan:", cleaned.slice(0, 500));
    throw new Error("Failed to generate scene plan");
  }
}

// ============================================================
// Clean and Validate Scene Plan
// ============================================================

function cleanScenePlan(
  plan: ScenePlan,
  ideaSpec: IdeaSpec,
  userInput: string
): ScenePlan {
  const cleanedPages = plan.pages.map((page, idx) => {
    // Remove generic fillers from props
    const cleanedProps = page.props.filter(prop => !isGenericFiller(prop));
    
    // Check if setting is a template without user request
    let setting = page.setting;
    if (isTemplateUnlessRequested(setting, userInput)) {
      // Replace with a theme-appropriate setting
      setting = ideaSpec.suggestedSettings[idx % ideaSpec.suggestedSettings.length] || setting;
    }
    
    return {
      ...page,
      setting,
      props: cleanedProps.length >= 3 ? cleanedProps : page.props.slice(0, 4),
    };
  });
  
  return {
    ...plan,
    pages: cleanedPages,
  };
}

