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
import { 
  NO_FILL_CONSTRAINTS, 
  NEGATIVE_PROMPT_LIST,
  LANDSCAPE_FRAMING_CONSTRAINTS,
  PORTRAIT_FRAMING_CONSTRAINTS,
  SQUARE_FRAMING_CONSTRAINTS,
  type ImageSize,
} from "@/lib/coloringPagePromptEnforcer";

/**
 * POST /api/batch/prompts
 * 
 * Generates N page prompts for batch image generation.
 * 
 * Storybook mode: 
 * - Same character across all pages (character consistency)
 * - DIFFERENT scenes with real story progression
 * - Uses Story Plan step to ensure variety
 * 
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

    const { mode, count, story, styleProfile, characterProfile, sceneInventory, basePrompt, size } = parseResult.data;

    // Validate storybook mode requires character profile
    if (mode === "storybook" && !characterProfile) {
      return NextResponse.json(
        { error: "Storybook mode requires a character profile for consistency" },
        { status: 400 }
      );
    }

    let pagesData: { pages: Array<{ page: number; title: string; sceneDescription: string; location: string; action: string }> };

    if (mode === "storybook") {
      // STORYBOOK MODE: Two-step process for better variety
      // Step 1: Generate Story Plan
      // Step 2: Generate detailed prompts from plan
      pagesData = await generateStorybookPages(count, story, styleProfile, characterProfile!, sceneInventory);
    } else {
      // THEME MODE: Single step with diverse scenes
      pagesData = await generateThemePages(count, story, styleProfile, sceneInventory, basePrompt);
    }

    // Build character consistency block for storybook mode
    const characterConsistencyBlock = mode === "storybook" && characterProfile
      ? buildCharacterConsistencyBlock(characterProfile)
      : undefined;

    // Convert scene descriptions to full prompts
    const imageSize = (size || "1024x1536") as ImageSize;
    const pages: PagePromptItem[] = pagesData.pages.map((page) => {
      const fullPrompt = buildFullPagePrompt({
        sceneDescription: page.sceneDescription,
        styleProfile,
        characterProfile: mode === "storybook" ? characterProfile : undefined,
        characterConsistencyBlock,
        size: imageSize,
      });

      return {
        page: page.page,
        title: page.title,
        prompt: fullPrompt,
        sceneDescription: page.sceneDescription,
      };
    });

    // Validate scene diversity for storybook mode
    if (mode === "storybook") {
      validateStorybookDiversity(pagesData.pages);
    }

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
 * STORYBOOK MODE: Generate pages with Story Plan for real progression and variety
 */
async function generateStorybookPages(
  count: number,
  story: { title?: string; outline?: string; targetAge?: string; sceneVariety?: string; settingConstraint?: string } | undefined,
  styleProfile: StyleProfile,
  characterProfile: CharacterProfile,
  sceneInventory?: string[]
): Promise<{ pages: Array<{ page: number; title: string; sceneDescription: string; location: string; action: string }> }> {
  
  // Diverse location pool based on setting constraint
  const indoorLocations = ["bedroom", "living room", "kitchen", "bathroom", "playroom", "classroom", "library", "supermarket", "bakery", "restaurant", "hospital", "toy store", "pet shop", "museum", "art studio"];
  const outdoorLocations = ["park", "garden", "beach", "forest", "playground", "zoo", "farm", "camping site", "mountain trail", "flower meadow", "pond", "neighborhood street", "soccer field", "picnic area", "carnival"];
  
  let locationPool: string[];
  if (story?.settingConstraint === "indoors") {
    locationPool = indoorLocations;
  } else if (story?.settingConstraint === "outdoors") {
    locationPool = outdoorLocations;
  } else {
    locationPool = [...indoorLocations, ...outdoorLocations];
  }

  // Ensure we have at least 4 distinct locations for variety
  const minDistinctLocations = Math.min(4, Math.ceil(count / 2));
  const selectedLocations = locationPool.slice(0, Math.max(minDistinctLocations, count));

  const storyPlanPrompt = `You are creating a STORYBOOK with ${count} pages featuring the SAME character in DIFFERENT locations and doing DIFFERENT activities.

CHARACTER (appears on EVERY page, identical appearance):
- Species: ${characterProfile.species}
- Key features: ${characterProfile.keyFeatures.join(", ")}
- Proportions: ${characterProfile.proportions}
- Face: ${characterProfile.faceStyle}
${characterProfile.clothing ? `- Outfit: ${characterProfile.clothing}` : ""}

${story?.title ? `STORY TITLE: "${story.title}"` : ""}
${story?.outline ? `STORY OUTLINE: ${story.outline}` : ""}

CRITICAL RULES FOR SCENE DIVERSITY:
1. NEVER repeat the same location more than 2 pages in a row
2. Use at least ${minDistinctLocations} DIFFERENT locations across the ${count} pages
3. Each page must have a UNIQUE action (no repeating activities)
4. Each page must have at least 3 props/background items DIFFERENT from the previous page
5. Vary camera framing: alternate between close-up, medium, and wide shots

AVAILABLE LOCATIONS (pick from these, use variety):
${selectedLocations.join(", ")}

${sceneInventory?.length ? `AVAILABLE PROPS: ${sceneInventory.join(", ")}` : ""}

STORY STRUCTURE:
- Page 1: Introduction - character waking up or starting their day
- Pages 2-${Math.max(2, Math.floor(count * 0.4))}: Early activities in DIFFERENT locations
- Pages ${Math.floor(count * 0.4) + 1}-${Math.floor(count * 0.8)}: Main adventure in NEW locations
- Pages ${Math.floor(count * 0.8) + 1}-${count}: Conclusion with satisfying ending

Generate exactly ${count} pages. Return ONLY valid JSON:
{
  "pages": [
    {
      "page": 1,
      "title": "Title (3-5 words)",
      "location": "specific location name",
      "action": "what character is doing",
      "sceneDescription": "Detailed scene description (60-100 words). Include: the ${characterProfile.species} doing [specific action] in [specific location]. Props: [list 4-6 specific items]. Background: [2-3 background elements]. Composition: [close-up/medium/wide shot], [centered/off-center]."
    }
  ]
}

IMPORTANT:
- Every sceneDescription must be 60-100 words
- Every page needs a DIFFERENT location or activity
- Include specific props and their positions
- Include framing (close-up/medium/wide)
- Make it a real story with beginning, middle, end`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "user", content: storyPlanPrompt },
    ],
    max_tokens: 4000,
    temperature: 0.8, // Higher temperature for more variety
  });

  let responseText = response.choices[0]?.message?.content?.trim() || "";

  // Clean up markdown if present
  responseText = responseText
    .replace(/^```json\n?/i, "")
    .replace(/^```\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  try {
    return JSON.parse(responseText);
  } catch {
    console.error("[batch/prompts] Failed to parse storybook response:", responseText.slice(0, 500));
    throw new Error("Failed to generate storybook prompts - invalid response format");
  }
}

/**
 * THEME MODE: Generate diverse themed pages
 */
async function generateThemePages(
  count: number,
  story: { title?: string; outline?: string; targetAge?: string; sceneVariety?: string; settingConstraint?: string } | undefined,
  styleProfile: StyleProfile,
  sceneInventory?: string[],
  basePrompt?: string
): Promise<{ pages: Array<{ page: number; title: string; sceneDescription: string; location: string; action: string }> }> {
  
  const ageGuide: Record<string, string> = {
    "3-6": "Very simple scenes, 2-3 large props, single activity per page",
    "6-9": "Moderate complexity, 4-6 props, clear focal point",
    "9-12": "More detail allowed, 6-8 props, can include backgrounds",
    "all-ages": "Balanced complexity suitable for all ages",
  };

  const varietyGuide: Record<string, string> = {
    low: "Keep scenes related but with different subjects",
    medium: "Good variety in subjects and settings",
    high: "High variety - each scene completely different",
  };

  const themePrompt = `Generate ${count} DIVERSE coloring book page descriptions.

STYLE RULES:
- Line style: ${styleProfile.lineStyle}
- Composition: ${styleProfile.compositionRules}
- Environment: ${styleProfile.environmentStyle}

TARGET AUDIENCE: ${ageGuide[story?.targetAge || "all-ages"]}
SCENE VARIETY: ${varietyGuide[story?.sceneVariety || "medium"]}
SETTING: ${story?.settingConstraint === "indoors" ? "Indoor scenes only" : story?.settingConstraint === "outdoors" ? "Outdoor scenes only" : "Mix of indoor and outdoor"}

${story?.title ? `THEME: "${story.title}"` : ""}
${sceneInventory?.length ? `AVAILABLE PROPS: ${sceneInventory.join(", ")}` : ""}
${basePrompt ? `STYLE REFERENCE: "${basePrompt.slice(0, 300)}..."` : ""}

Generate exactly ${count} pages. Each page should have:
- A different subject or character
- A unique activity
- Varied settings
- 4-8 specific props

Return ONLY valid JSON:
{
  "pages": [
    {
      "page": 1,
      "title": "Title",
      "location": "location",
      "action": "activity",
      "sceneDescription": "Detailed description (60-100 words)"
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "user", content: themePrompt },
    ],
    max_tokens: 4000,
    temperature: 0.7,
  });

  let responseText = response.choices[0]?.message?.content?.trim() || "";

  responseText = responseText
    .replace(/^```json\n?/i, "")
    .replace(/^```\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  try {
    return JSON.parse(responseText);
  } catch {
    console.error("[batch/prompts] Failed to parse theme response:", responseText.slice(0, 500));
    throw new Error("Failed to generate theme prompts - invalid response format");
  }
}

/**
 * Validate that storybook pages have proper diversity
 */
function validateStorybookDiversity(
  pages: Array<{ page: number; title: string; sceneDescription: string; location: string; action: string }>
): void {
  // Check for repeated locations more than 2 times in a row
  for (let i = 2; i < pages.length; i++) {
    const loc1 = pages[i - 2]?.location?.toLowerCase() || "";
    const loc2 = pages[i - 1]?.location?.toLowerCase() || "";
    const loc3 = pages[i]?.location?.toLowerCase() || "";
    
    if (loc1 && loc1 === loc2 && loc2 === loc3) {
      console.warn(`[batch/prompts] Warning: Location "${loc1}" repeated 3+ times at pages ${i - 1}, ${i}, ${i + 1}`);
    }
  }

  // Check for unique locations count
  const uniqueLocations = new Set(pages.map(p => p.location?.toLowerCase()).filter(Boolean));
  const minExpected = Math.min(4, Math.ceil(pages.length / 2));
  
  if (uniqueLocations.size < minExpected) {
    console.warn(`[batch/prompts] Warning: Only ${uniqueLocations.size} unique locations for ${pages.length} pages (expected ${minExpected}+)`);
  }

  console.log(`[batch/prompts] Diversity check: ${uniqueLocations.size} unique locations across ${pages.length} pages`);
}

/**
 * Build the full prompt for a single page with proper structure
 */
function buildFullPagePrompt(params: {
  sceneDescription: string;
  styleProfile: StyleProfile;
  characterProfile?: CharacterProfile;
  characterConsistencyBlock?: string;
  size?: ImageSize;
}): string {
  const { sceneDescription, styleProfile, characterProfile, characterConsistencyBlock, size = "1024x1536" } = params;

  const parts: string[] = [];

  // Title line
  parts.push("Create a kids coloring book page in clean black-and-white line art (no grayscale).");

  // Scene section
  parts.push(`\nScene:\n${sceneDescription}`);

  // Character consistency block (for storybook mode) - CRITICAL
  if (characterConsistencyBlock && characterProfile) {
    parts.push(`
=== CHARACTER CONSISTENCY (MUST MATCH EXACTLY) ===
Character must match the reference: ${characterProfile.species} with ${characterProfile.keyFeatures.slice(0, 4).join(", ")}.
Face: ${characterProfile.faceStyle}
Proportions: ${characterProfile.proportions}
${characterProfile.clothing ? `Outfit: ${characterProfile.clothing}` : ""}
Same design on EVERY page - do not alter any visual aspect.
Do not introduce new accessories unless specified in the scene.`);
  }

  // Background section
  parts.push(`\nBackground:\n${styleProfile.environmentStyle}. Include simple background elements relevant to the scene location.`);

  // Composition section
  parts.push(`\nComposition:\n${styleProfile.compositionRules}. Subject fills most of the frame with small margins.`);

  // Line style section
  parts.push(`\nLine style:\n${styleProfile.lineStyle}. Clean, smooth outlines suitable for coloring.`);

  // Floor/ground section
  parts.push(`\nFloor/ground:\nSimple floor indication appropriate to the setting (tiles, grass, carpet, etc.) or leave plain if indoor scene.`);

  // Output constraints section
  parts.push(`\nOutput:
Printable coloring page, crisp black outlines on pure white background.
NO text, NO watermark, NO signature, NO border.
All shapes closed and ready for coloring with crayons or markers.`);

  // Add framing constraints based on size
  if (size === "1536x1024") {
    parts.push(LANDSCAPE_FRAMING_CONSTRAINTS);
  } else if (size === "1024x1536") {
    parts.push(PORTRAIT_FRAMING_CONSTRAINTS);
  } else {
    parts.push(SQUARE_FRAMING_CONSTRAINTS);
  }

  // Add mandatory no-fill constraints
  parts.push(NO_FILL_CONSTRAINTS);

  // Add avoid list
  parts.push(`\nAVOID: ${[...styleProfile.mustAvoid, ...NEGATIVE_PROMPT_LIST.slice(0, 5)].join(", ")}.`);

  return parts.join("\n");
}
