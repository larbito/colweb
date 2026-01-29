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
  OUTLINE_ONLY_CONSTRAINTS,
  NO_BORDER_CONSTRAINTS,
  FILL_CANVAS_CONSTRAINTS,
  FOREGROUND_BOTTOM_FILL_CONSTRAINTS,
  LANDSCAPE_EXTRA_CONSTRAINTS,
  PORTRAIT_EXTRA_CONSTRAINTS,
  SQUARE_EXTRA_CONSTRAINTS,
  NEGATIVE_PROMPT_LIST,
  type ImageSize,
} from "@/lib/coloringPagePromptEnforcer";

/**
 * Route segment config - extend timeout for prompt generation
 */
export const maxDuration = 60; // 60 seconds

/**
 * POST /api/batch/prompts
 * 
 * Generates N page prompts for batch image generation.
 * 
 * STORYBOOK MODE: 
 * - Same character across all pages (character consistency LOCKED)
 * - Different scenes with real story progression
 * - Uses Story Plan step to ensure variety
 * 
 * THEME MODE: Same style, varied scenes and characters
 * 
 * ALL prompts enforce:
 * - Outline-only (no filled black areas)
 * - No border/frame
 * - Fill the canvas (90-95%)
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
      pagesData = await generateStorybookPages(count, story, styleProfile, characterProfile!, sceneInventory);
    } else {
      pagesData = await generateThemePages(count, story, styleProfile, sceneInventory, basePrompt);
    }

    // Build character consistency block for storybook mode (CRITICAL)
    const characterConsistencyBlock = mode === "storybook" && characterProfile
      ? buildCharacterConsistencyBlock(characterProfile)
      : undefined;

    // Convert scene descriptions to full prompts with ALL constraints
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
  
  // Diverse location pool
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

  const minDistinctLocations = Math.min(4, Math.ceil(count / 2));
  const selectedLocations = locationPool.slice(0, Math.max(minDistinctLocations, count));

  // Build EXTREMELY detailed character description for consistency
  const characterDescription = `
=== CHARACTER PROFILE (LOCKED - DO NOT MODIFY) ===

IDENTITY:
- Species/Type: ${characterProfile.species}
- Key Visual Features: ${characterProfile.keyFeatures.join(", ")}
- Body Proportions: ${characterProfile.proportions}
- Face Design: ${characterProfile.faceStyle}
${characterProfile.headDetails ? `- Head Details: ${characterProfile.headDetails}` : ""}
${characterProfile.bodyDetails ? `- Body Details: ${characterProfile.bodyDetails}` : ""}
${characterProfile.clothing ? `- Outfit/Accessories: ${characterProfile.clothing}` : ""}

CONSISTENCY RULES (CRITICAL):
1. Same face shape and size on EVERY page
2. Same eye style (shape, size, placement) on EVERY page
3. Same ear shape and position on EVERY page
4. Same body-to-head ratio on EVERY page
5. Same distinctive features (horn shape, wing style, tail, spots, etc.)
6. Same line thickness and detail level
7. ONLY change: POSE, ACTION, EXPRESSION - NOT the character design

WARNING: Do NOT redesign the character between pages. Do NOT alter proportions.
The character must be INSTANTLY RECOGNIZABLE as the SAME individual on all pages.`;

  const storyPlanPrompt = `You are creating a STORYBOOK with ${count} pages.

${characterDescription}

${story?.title ? `STORY TITLE: "${story.title}"` : ""}
${story?.outline ? `STORY OUTLINE: ${story.outline}` : ""}

=== SCENE DIVERSITY RULES (CRITICAL) ===
1. NEVER repeat the same location more than 2 pages in a row
2. Use at least ${minDistinctLocations} DIFFERENT locations across ${count} pages
3. Each page MUST have a UNIQUE activity/action (no repeated activities)
4. Each page MUST have at least 3 props DIFFERENT from the previous page
5. Vary camera framing: alternate between close-up, medium, and wide shots
6. Vary time of day if applicable (morning, afternoon, evening)
7. Vary the character's emotional state (happy, curious, excited, peaceful)

AVAILABLE LOCATIONS (MUST USE ${minDistinctLocations}+ OF THESE): ${selectedLocations.join(", ")}
${sceneInventory?.length ? `AVAILABLE PROPS: ${sceneInventory.join(", ")}` : ""}

=== STORY STRUCTURE ===
- Page 1: Introduction - establish character and initial setting
- Pages 2-${Math.max(2, Math.floor(count * 0.4))}: Rising action - DIFFERENT locations, new challenges
- Pages ${Math.floor(count * 0.4) + 1}-${Math.floor(count * 0.8)}: Main adventure - variety of activities
- Pages ${Math.floor(count * 0.8) + 1}-${count}: Resolution - wrap up story

Generate exactly ${count} pages. Return ONLY valid JSON:
{
  "pages": [
    {
      "page": 1,
      "title": "Short Title",
      "location": "specific location from list above",
      "action": "unique activity",
      "sceneDescription": "Detailed scene (80-120 words): The [character type] [specific action] in [specific location]. 4-6 named props with positions. Camera framing (close-up/medium/wide). Do NOT describe character features - only pose/action."
    }
  ]
}

=== SCENE DESCRIPTION RULES ===
- Do NOT redesign or re-describe character features in any description
- ONLY describe WHAT the character is DOING and WHERE
- Reference "the ${characterProfile.species}" without listing physical features
- Focus on: location details, action, props, background elements, framing
- Include specific prop names and positions (e.g., "a red ball on the left")
- Each description must be visually distinct from all others`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "user", content: storyPlanPrompt },
    ],
    max_tokens: 4000,
    temperature: 0.8,
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

Generate exactly ${count} pages with:
- Different subjects or characters
- Unique activities
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
      "sceneDescription": "Detailed description (80-120 words) including subject, action, props, background, and framing"
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
  for (let i = 2; i < pages.length; i++) {
    const loc1 = pages[i - 2]?.location?.toLowerCase() || "";
    const loc2 = pages[i - 1]?.location?.toLowerCase() || "";
    const loc3 = pages[i]?.location?.toLowerCase() || "";
    
    if (loc1 && loc1 === loc2 && loc2 === loc3) {
      console.warn(`[batch/prompts] Warning: Location "${loc1}" repeated 3+ times at pages ${i - 1}, ${i}, ${i + 1}`);
    }
  }

  const uniqueLocations = new Set(pages.map(p => p.location?.toLowerCase()).filter(Boolean));
  const minExpected = Math.min(4, Math.ceil(pages.length / 2));
  
  if (uniqueLocations.size < minExpected) {
    console.warn(`[batch/prompts] Warning: Only ${uniqueLocations.size} unique locations for ${pages.length} pages`);
  }

  console.log(`[batch/prompts] Diversity: ${uniqueLocations.size} unique locations across ${pages.length} pages`);
}

/**
 * Build the full prompt for a single page with ALL constraints
 * 
 * Includes:
 * - Scene description
 * - Character consistency (storybook mode)
 * - Background/environment
 * - Composition (fill frame)
 * - Floor/ground (STRONGER - extends to bottom)
 * - NO BORDER constraints
 * - FILL CANVAS constraints (90-95%)
 * - FOREGROUND / BOTTOM FILL constraints (NO empty bottom)
 * - Orientation-specific layout
 * - OUTLINE-ONLY constraints
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
  parts.push("Create a kids coloring book page in clean black-and-white OUTLINE line art (no filled areas, no grayscale).");

  // Scene section
  parts.push(`\nScene:\n${sceneDescription}`);

  // Character consistency block (CRITICAL for storybook mode)
  if (characterConsistencyBlock && characterProfile) {
    parts.push(characterConsistencyBlock);
  }

  // Background section
  parts.push(`\nBackground:\n${styleProfile.environmentStyle}. Simple background elements relevant to the scene, extending toward edges.`);

  // Composition section (STRONGER - emphasize filling the frame and lower positioning)
  parts.push(`\nComposition:\n${styleProfile.compositionRules}. Subject fills 90-95% of the frame. Position main subject in lower-middle area (not floating at top). Scene extends to all edges.`);

  // Line style section
  parts.push(`\nLine style:\n${styleProfile.lineStyle}. Clean, smooth OUTLINES ONLY suitable for coloring. No filled areas.`);

  // Floor/ground section (STRONGER - must reach bottom edge)
  parts.push(`\nFloor/ground:
Visible ground plane that extends to the bottom edge of the canvas. Include floor texture (tiles, wood, grass, path, rug) that reaches near the bottom margin. Add 2-4 small foreground props near the bottom (toys, flowers, pebbles, leaves, etc.) to fill any remaining space.`);

  // Output constraints
  parts.push(`\nOutput:
Printable coloring page with crisp black OUTLINES ONLY on pure white background.
NO text, NO watermark, NO signature.
All shapes must be closed OUTLINES ready for coloring.
Artwork fills 90-95% of the canvas with minimal margins.`);

  // NO BORDER constraints (MANDATORY)
  parts.push(NO_BORDER_CONSTRAINTS);

  // FILL CANVAS constraints (MANDATORY)
  parts.push(FILL_CANVAS_CONSTRAINTS);

  // FOREGROUND / BOTTOM FILL constraints (NEW - prevents empty bottom)
  parts.push(FOREGROUND_BOTTOM_FILL_CONSTRAINTS);

  // Add orientation-specific framing
  if (size === "1536x1024") {
    parts.push(LANDSCAPE_EXTRA_CONSTRAINTS);
  } else if (size === "1024x1536") {
    parts.push(PORTRAIT_EXTRA_CONSTRAINTS);
  } else {
    parts.push(SQUARE_EXTRA_CONSTRAINTS);
  }

  // OUTLINE-ONLY constraints (MANDATORY - most important)
  parts.push(OUTLINE_ONLY_CONSTRAINTS);

  // Avoid list (includes new empty space items)
  parts.push(`\nAVOID: ${[...styleProfile.mustAvoid.slice(0, 5), ...NEGATIVE_PROMPT_LIST.slice(0, 15)].join(", ")}.`);

  return parts.join("\n");
}
