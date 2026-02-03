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
  PAGE_COVERAGE_CONTRACT,
  LANDSCAPE_EXTRA_CONSTRAINTS,
  PORTRAIT_EXTRA_CONSTRAINTS,
  SQUARE_EXTRA_CONSTRAINTS,
  NEGATIVE_PROMPT_LIST,
  type ImageSize,
} from "@/lib/coloringPagePromptEnforcer";
import {
  type CharacterIdentityProfile,
} from "@/lib/characterIdentity";
import {
  detectThemeRequirements,
  FORBIDDEN_FILLERS,
  FULL_PAGE_COMPOSITION_CONTRACT,
  buildCharacterBible,
  type CharacterSpec,
  type CreativeBrief,
  type PlannedScene,
} from "@/lib/creativeBrief";

/**
 * Route segment config - extend timeout for prompt generation
 */
export const maxDuration = 90; // 90 seconds for larger page counts

/**
 * POST /api/batch/prompts
 * 
 * NEW PIPELINE:
 * 1. Understand the user's idea (CreativeBrief)
 * 2. Plan unique scenes (ScenePlan)
 * 3. Generate prompts from scenes with ALL constraints
 * 
 * NO GENERIC TEMPLATES - every scene derives from the user's actual idea.
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

    const { mode, count, story, styleProfile, characterProfile, sceneInventory, basePrompt, size, complexity } = parseResult.data;

    // Validate storybook mode requires character profile
    if (mode === "storybook" && !characterProfile) {
      return NextResponse.json(
        { error: "Storybook mode requires a character profile for consistency" },
        { status: 400 }
      );
    }

    console.log(`[batch/prompts] Starting ${mode} mode with ${count} pages, complexity: ${complexity}`);
    console.log(`[batch/prompts] Base prompt: ${basePrompt?.slice(0, 200)}...`);

    // Step 1: Create Creative Brief from user's idea
    const creativeBrief = await buildCreativeBrief({
      ideaText: basePrompt || story?.outline || story?.title || "",
      bookType: mode,
      targetAge: story?.targetAge,
      settingConstraint: story?.settingConstraint,
      characterProfile,
      styleProfile,
      complexity, // Pass complexity for appropriate detail level
    });
    
    console.log(`[batch/prompts] Creative brief theme: ${creativeBrief.themeTitle}`);
    console.log(`[batch/prompts] Must include: ${creativeBrief.mustInclude.slice(0, 5).join(", ")}`);

    // Step 2: Plan unique scenes based on the creative brief
    const scenePlan = await planScenes(creativeBrief, count, mode);
    
    console.log(`[batch/prompts] Planned ${scenePlan.scenes.length} scenes, diversity: ${scenePlan.diversityScore}`);

    // Build character consistency block for storybook mode
    const characterConsistencyBlock = mode === "storybook" && characterProfile
      ? buildCharacterConsistencyBlock(characterProfile)
      : undefined;

    // Build Character Bible for storybook
    let characterBible: string | undefined;
    if (mode === "storybook" && creativeBrief.mainCharacter) {
      characterBible = buildCharacterBible(creativeBrief.mainCharacter);
    }

    // Extract CHARACTER IDENTITY PROFILE for vision validation
    let characterIdentityProfile: CharacterIdentityProfile | undefined;
    if (mode === "storybook" && characterProfile) {
      characterIdentityProfile = await extractCharacterIdentityProfile(characterProfile, basePrompt);
      console.log(`[batch/prompts] Created character identity profile: ${characterIdentityProfile.species}`);
    }

    // Step 3: Convert scenes to full prompts with ALL constraints
    const imageSize = (size || "1024x1536") as ImageSize;
    const pages: PagePromptItem[] = scenePlan.scenes.map((scene) => {
      const fullPrompt = buildFullPagePrompt({
        scene,
        creativeBrief,
        styleProfile,
        characterProfile: mode === "storybook" ? characterProfile : undefined,
        characterConsistencyBlock,
        characterBible,
        size: imageSize,
        complexity, // Pass complexity for detail level instructions
      });

      return {
        page: scene.pageNumber,
        title: scene.title,
        prompt: fullPrompt,
        sceneDescription: `${scene.action} in ${scene.location} with ${scene.props.slice(0, 4).join(", ")}`,
      };
    });

    // Validate scene diversity for storybook mode
    if (mode === "storybook") {
      validateSceneDiversity(scenePlan.scenes);
    }

    const result: BatchPromptsResponse & { characterIdentityProfile?: CharacterIdentityProfile } = {
      pages,
      mode,
      characterConsistencyBlock,
      characterIdentityProfile,
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

// ============================================================
// STEP 1: BUILD CREATIVE BRIEF
// ============================================================

type ComplexityLevel = "kids" | "simple" | "medium" | "detailed" | "ultra";

// Map complexity to age-appropriate detail levels
const COMPLEXITY_TO_DETAIL: Record<ComplexityLevel, { propsRange: string; backgroundLevel: string; lineThickness: string }> = {
  kids: { propsRange: "1-2 very simple", backgroundLevel: "none or minimal", lineThickness: "very thick (6-8pt)" },
  simple: { propsRange: "2-4 simple", backgroundLevel: "very simple", lineThickness: "thick (4-5pt)" },
  medium: { propsRange: "4-8", backgroundLevel: "moderate", lineThickness: "medium (3-4pt)" },
  detailed: { propsRange: "8-12", backgroundLevel: "detailed", lineThickness: "medium-thin (2-3pt)" },
  ultra: { propsRange: "12-20+", backgroundLevel: "very detailed with patterns", lineThickness: "thin (1-2pt)" },
};

async function buildCreativeBrief(params: {
  ideaText: string;
  bookType: "storybook" | "theme";
  targetAge?: string;
  settingConstraint?: string;
  characterProfile?: CharacterProfile;
  styleProfile: StyleProfile;
  complexity?: ComplexityLevel;
}): Promise<CreativeBrief> {
  const { ideaText, bookType, targetAge, settingConstraint, characterProfile, styleProfile, complexity = "medium" } = params;
  
  const detailLevel = COMPLEXITY_TO_DETAIL[complexity];
  
  // Detect special themes first
  const themeReqs = detectThemeRequirements(ideaText);
  
  const prompt = `You are creating a creative brief for a ${bookType === "storybook" ? "STORYBOOK (same character on every page)" : "THEME COLLECTION (varied subjects)"} coloring book.

USER'S IDEA: "${ideaText}"

${themeReqs.isSpecialTheme ? `
DETECTED THEME: ${themeReqs.themeName}
REQUIRED MOTIFS (must appear in EVERY scene): ${themeReqs.requiredMotifs.join(", ")}
FORBIDDEN CONTENT: ${themeReqs.forbiddenContent.join(", ")}
` : ""}

COMPLEXITY LEVEL: ${complexity.toUpperCase()}
- Props per scene: ${detailLevel.propsRange}
- Background detail: ${detailLevel.backgroundLevel}
- Line thickness: ${detailLevel.lineThickness}
${complexity === "kids" ? "IMPORTANT: Keep designs VERY SIMPLE for toddlers - big shapes, few details, lots of white space for easy coloring with crayons" : ""}
${complexity === "ultra" ? "IMPORTANT: Create intricate, detailed designs suitable for adult stress-relief coloring - complex patterns, many elements" : ""}

SETTING: ${settingConstraint || "mixed"}

CRITICAL RULES:
1. NEVER add generic templates (bedroom, kitchen, school, bathroom) unless user explicitly asked
2. Every element must connect to "${ideaText}"
3. ${themeReqs.isSpecialTheme ? `Every scene must include ${themeReqs.themeName} motifs` : "Scenes must match the user's actual theme"}
4. Avoid generic filler: ${FORBIDDEN_FILLERS.slice(0, 8).join(", ")}
${bookType === "storybook" ? `
5. Create ONE main character with strict consistency rules
6. Character must have "alwaysInclude" traits (e.g., "both arms visible")
7. List what "neverChange" - traits that stay identical
` : `
5. Define varied subjects that fit the theme
6. No forced main character - variety is key
`}

Return ONLY valid JSON matching this structure:
{
  "themeTitle": "specific title based on idea",
  "themeDescription": "2-3 sentences describing the theme",
  "targetAudience": "${targetAge || "all-ages"}",
  "mood": "cheerful/adventurous/cozy/magical/etc",
  "visualStyleHints": ["hint1", "hint2", "hint3"],
  "lineThickness": "thin/medium/thick",
  "complexity": "simple/medium/detailed",
  "settingWorld": "describe the world/setting derived from the idea",
  "primaryLocations": ["5-10 specific locations that fit THIS theme - NOT generic bedrooms/kitchens"],
  "timeOfDayOptions": ["morning", "afternoon", "evening"],
  ${bookType === "storybook" ? `
  "mainCharacter": {
    "name": "optional name",
    "species": "specific type (e.g., 'baby unicorn' not just 'unicorn')",
    "visualTraits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
    "outfit": "description or null",
    "accessories": ["accessory1", "accessory2"],
    "proportions": "chibi with large head / realistic / etc",
    "alwaysInclude": ["both arms/hands visible", "horn on head", "fluffy tail", "etc"],
    "neverChange": ["face shape", "eye style", "body proportions", "horn shape", "etc"]
  },
  "supportingCast": [{"type": "type", "role": "role"}],
  ` : `
  "mainCharacter": null,
  `}
  "mustInclude": ${JSON.stringify(themeReqs.requiredMotifs.length > 0 ? themeReqs.requiredMotifs : ["items that MUST appear based on the idea"])},
  "mustAvoid": ${JSON.stringify([...themeReqs.forbiddenContent, ...FORBIDDEN_FILLERS.slice(0, 5)])},
  "forbiddenFillers": ${JSON.stringify(FORBIDDEN_FILLERS.slice(0, 10))},
  "varietyPlan": {
    "sceneTypes": ["action scene", "quiet moment", "discovery", "celebration", "nature scene"],
    "actionsPool": ["10-15 specific actions that fit THIS theme"],
    "propsPool": ["15-25 theme-appropriate props - NOT generic toys/balls/rocks"],
    "compositionStyles": ["close-up face", "medium shot with background", "wide scene", "looking up at", "looking down at"]
  },
  "isHolidayTheme": ${themeReqs.isSpecialTheme},
  "holidayName": ${themeReqs.isSpecialTheme ? `"${themeReqs.themeName}"` : "null"},
  "holidayMotifs": ${JSON.stringify(themeReqs.requiredMotifs.length > 0 ? themeReqs.requiredMotifs : null)}
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2000,
    temperature: 0.7,
  });

  let responseText = response.choices[0]?.message?.content?.trim() || "";
  responseText = responseText
    .replace(/^```json\n?/i, "")
    .replace(/^```\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(responseText);
    
    // Validate and enhance
    const brief: CreativeBrief = {
      themeTitle: parsed.themeTitle || ideaText,
      themeDescription: parsed.themeDescription || "",
      targetAudience: parsed.targetAudience || "all-ages",
      mood: parsed.mood || "cheerful",
      visualStyleHints: parsed.visualStyleHints || [],
      lineThickness: parsed.lineThickness || "medium",
      complexity: parsed.complexity || "medium",
      settingWorld: parsed.settingWorld || ideaText,
      primaryLocations: parsed.primaryLocations || [],
      timeOfDayOptions: parsed.timeOfDayOptions || ["morning", "afternoon"],
      mainCharacter: parsed.mainCharacter || undefined,
      supportingCast: parsed.supportingCast || [],
      mustInclude: parsed.mustInclude || themeReqs.requiredMotifs,
      mustAvoid: parsed.mustAvoid || themeReqs.forbiddenContent,
      forbiddenFillers: parsed.forbiddenFillers || FORBIDDEN_FILLERS,
      varietyPlan: {
        sceneTypes: parsed.varietyPlan?.sceneTypes || [],
        actionsPool: parsed.varietyPlan?.actionsPool || [],
        propsPool: parsed.varietyPlan?.propsPool || [],
        compositionStyles: parsed.varietyPlan?.compositionStyles || ["close-up", "medium shot", "wide scene"],
      },
      isHolidayTheme: parsed.isHolidayTheme || themeReqs.isSpecialTheme,
      holidayName: parsed.holidayName || themeReqs.themeName,
      holidayMotifs: parsed.holidayMotifs || themeReqs.requiredMotifs,
    };
    
    return brief;
  } catch (e) {
    console.error("[batch/prompts] Failed to parse creative brief:", responseText.slice(0, 500));
    throw new Error("Failed to create creative brief");
  }
}

// ============================================================
// STEP 2: PLAN UNIQUE SCENES
// ============================================================

async function planScenes(
  brief: CreativeBrief,
  pageCount: number,
  mode: "storybook" | "theme"
): Promise<{ scenes: PlannedScene[]; usedLocations: string[]; usedProps: string[]; diversityScore: number }> {
  
  const prompt = `You are planning ${pageCount} UNIQUE coloring book scenes.

CREATIVE BRIEF:
- Theme: ${brief.themeTitle}
- Setting World: ${brief.settingWorld}
- Mood: ${brief.mood}
- Available Locations: ${brief.primaryLocations.join(", ")}
- Available Actions: ${brief.varietyPlan.actionsPool.join(", ")}
- Props Pool: ${brief.varietyPlan.propsPool.join(", ")}
- Composition Styles: ${brief.varietyPlan.compositionStyles.join(", ")}

${brief.isHolidayTheme ? `
HOLIDAY THEME: ${brief.holidayName}
REQUIRED MOTIFS (include 2-4 in EVERY scene): ${brief.holidayMotifs?.join(", ")}
` : ""}

${mode === "storybook" && brief.mainCharacter ? `
MAIN CHARACTER (same on every page):
- Species: ${brief.mainCharacter.species}
- Traits: ${brief.mainCharacter.visualTraits.join(", ")}
- Always Include: ${brief.mainCharacter.alwaysInclude.join(", ")}
Only change the character's pose/action/expression - NOT their design.
` : ""}

MUST INCLUDE across all pages: ${brief.mustInclude.join(", ")}
MUST AVOID: ${brief.mustAvoid.join(", ")}
FORBIDDEN FILLERS: ${brief.forbiddenFillers.join(", ")}

CRITICAL RULES:
1. Every scene must clearly relate to "${brief.themeTitle}"
2. NO generic templates (bedroom/kitchen/school) unless the theme IS daily routine
3. Use each location at most 2 times across ${pageCount} pages
4. Each scene needs 4-8 SPECIFIC props (named and positioned)
5. Each scene must have at least 2 props not used in the previous 2 pages
6. Vary composition: alternate close-up, medium, wide
${brief.isHolidayTheme ? `7. EVERY scene MUST include ${brief.holidayName} motifs (hearts, pumpkins, etc.)` : ""}

Return ONLY valid JSON:
{
  "scenes": [
    {
      "pageNumber": 1,
      "title": "Short Title",
      "location": "specific location from the list",
      "action": "specific action",
      "props": ["prop1 (position)", "prop2 (position)", "prop3", "prop4", "prop5"],
      "composition": "close-up / medium shot / wide scene",
      "timeOfDay": "morning/afternoon/evening",
      "mood": "scene mood",
      "themeMotifs": ["motif1", "motif2"]${mode === "storybook" ? `,
      "characterAction": "what the character is doing",
      "characterExpression": "happy/curious/excited/peaceful"` : ""}
    }
  ]
}

Generate exactly ${pageCount} scenes with UNIQUE locations, actions, and props.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: Math.min(4000, 100 + pageCount * 150), // Scale tokens with page count
    temperature: 0.8,
  });

  let responseText = response.choices[0]?.message?.content?.trim() || "";
  responseText = responseText
    .replace(/^```json\n?/i, "")
    .replace(/^```\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(responseText);
    const scenes: PlannedScene[] = parsed.scenes || [];
    
    // Calculate diversity metrics
    const usedLocations = [...new Set(scenes.map(s => s.location))];
    const allProps = scenes.flatMap(s => s.props || []);
    const usedProps = [...new Set(allProps)];
    
    // Diversity score: unique locations + unique props ratio
    const locationDiversity = usedLocations.length / Math.min(scenes.length, 10);
    const propDiversity = usedProps.length / (allProps.length || 1);
    const diversityScore = Math.round((locationDiversity * 50 + propDiversity * 50));
    
    console.log(`[batch/prompts] Diversity: ${usedLocations.length} locations, ${usedProps.length} unique props`);
    
    return { scenes, usedLocations, usedProps, diversityScore };
  } catch (e) {
    console.error("[batch/prompts] Failed to parse scene plan:", responseText.slice(0, 500));
    throw new Error("Failed to plan scenes");
  }
}

// ============================================================
// STEP 3: BUILD FULL PAGE PROMPT
// ============================================================

// Complexity-specific prompt instructions
const COMPLEXITY_INSTRUCTIONS: Record<ComplexityLevel, string> = {
  kids: `
=== COMPLEXITY: VERY SIMPLE (Ages 3-6) ===
- ONE main subject, very large and centered
- MAXIMUM 2-3 very simple props
- NO background details or very minimal
- VERY BIG shapes with THICK outlines (6-8pt)
- Simple rounded shapes only
- LOTS of white space for easy coloring with crayons
- Perfect for toddlers and preschoolers`,

  simple: `
=== COMPLEXITY: SIMPLE (Ages 6-9) ===
- ONE main subject
- 2-4 simple props maximum
- Very simple or no background
- Large open areas for easy coloring
- Thick outlines (4-5pt)
- Suitable for young children`,

  medium: `
=== COMPLEXITY: MEDIUM (Ages 9-12) ===
- 1-2 subjects
- 4-8 props and background elements
- Light background with simple shapes
- Moderate detail level
- Medium outlines (3-4pt)`,

  detailed: `
=== COMPLEXITY: DETAILED (Teens+) ===
- 1-2 main subjects with more detail
- 8-12 props and background elements
- More intricate patterns in clothing/accessories
- Detailed backgrounds
- Medium-thin outlines (2-3pt)`,

  ultra: `
=== COMPLEXITY: ULTRA DETAILED (Adults) ===
- Complex scenes with HIGH detail density
- 12-20+ props and intricate backgrounds
- Very detailed patterns and decorative elements
- Fine line work with thin outlines (1-2pt)
- Mandala-like complexity for stress-relief coloring
- Intricate designs suitable for adult coloring`,
};

function buildFullPagePrompt(params: {
  scene: PlannedScene;
  creativeBrief: CreativeBrief;
  styleProfile: StyleProfile;
  characterProfile?: CharacterProfile;
  characterConsistencyBlock?: string;
  characterBible?: string;
  size?: ImageSize;
  complexity?: ComplexityLevel;
}): string {
  const { scene, creativeBrief, styleProfile, characterProfile, characterConsistencyBlock, characterBible, size = "1024x1536", complexity = "medium" } = params;

  const parts: string[] = [];

  // Title line with complexity context
  const audienceContext = complexity === "kids" ? "for toddlers (ages 3-6)" : 
                          complexity === "simple" ? "for young children (ages 6-9)" :
                          complexity === "ultra" ? "for adults (stress-relief style)" :
                          complexity === "detailed" ? "for teens and adults" : "";
  parts.push(`Create a ${audienceContext ? audienceContext + " " : ""}coloring book page in clean black-and-white OUTLINE line art (no filled areas, no grayscale).`);

  // Add complexity-specific instructions
  parts.push(COMPLEXITY_INSTRUCTIONS[complexity]);

  // Scene description with specific props
  const propsText = scene.props.slice(0, 6).join(", ");
  parts.push(`
Scene:
${scene.title} - ${scene.action} in ${scene.location}.
Props: ${propsText}.
Composition: ${scene.composition} view.
${scene.mood ? `Mood: ${scene.mood}.` : ""}
${creativeBrief.isHolidayTheme && scene.themeMotifs?.length ? `Include ${creativeBrief.holidayName} motifs: ${scene.themeMotifs.join(", ")}.` : ""}`);

  // Character Bible for storybook mode (MORE IMPORTANT than basic consistency block)
  if (characterBible) {
    parts.push(characterBible);
  } else if (characterConsistencyBlock && characterProfile) {
    parts.push(characterConsistencyBlock);
  }

  // Background section
  parts.push(`
Background:
${styleProfile.environmentStyle}. ${scene.location} with ${creativeBrief.settingWorld} aesthetic.
Background elements extend toward edges. No large empty areas.`);

  // Composition section with FULL PAGE CONTRACT
  parts.push(`
Composition:
${styleProfile.compositionRules}. ${scene.composition} framing.
Subject fills 90-95% of frame. Position main subject in lower-middle area.`);

  // Add the FULL PAGE COMPOSITION CONTRACT (CRITICAL)
  parts.push(FULL_PAGE_COMPOSITION_CONTRACT);

  // Line style section
  parts.push(`
Line style:
${styleProfile.lineStyle}. Clean OUTLINES ONLY suitable for coloring. No filled areas.`);

  // Floor/ground section - STRONGER
  parts.push(`
Floor/ground:
Visible ground plane that extends to the bottom edge. Include floor texture (${scene.location.includes("garden") || scene.location.includes("outdoor") ? "grass, path, flowers" : "tiles, wood, rug, carpet"}) reaching near bottom margin.
Add 2-4 foreground props near bottom: ${scene.props.slice(-3).join(", ")}.`);

  // Output constraints
  parts.push(`
Output:
Printable coloring page with crisp black OUTLINES ONLY on pure white.
NO text, NO watermark. All shapes closed OUTLINES.
Artwork fills 90-95% of canvas with minimal margins.`);

  // Standard constraints
  parts.push(NO_BORDER_CONSTRAINTS);
  parts.push(FILL_CANVAS_CONSTRAINTS);
  parts.push(FOREGROUND_BOTTOM_FILL_CONSTRAINTS);
  parts.push(PAGE_COVERAGE_CONTRACT);

  // Orientation-specific
  if (size === "1536x1024") {
    parts.push(LANDSCAPE_EXTRA_CONSTRAINTS);
  } else if (size === "1024x1536") {
    parts.push(PORTRAIT_EXTRA_CONSTRAINTS);
  } else {
    parts.push(SQUARE_EXTRA_CONSTRAINTS);
  }

  // OUTLINE-ONLY constraints (most important)
  parts.push(OUTLINE_ONLY_CONSTRAINTS);

  // Avoid list - include creative brief forbidden items
  const avoidList = [
    ...creativeBrief.mustAvoid.slice(0, 5),
    ...creativeBrief.forbiddenFillers.slice(0, 5),
    ...styleProfile.mustAvoid.slice(0, 3),
    ...NEGATIVE_PROMPT_LIST.slice(0, 10)
  ];
  parts.push(`\nAVOID: ${[...new Set(avoidList)].join(", ")}.`);

  return parts.join("\n");
}

// ============================================================
// CHARACTER IDENTITY PROFILE EXTRACTION
// ============================================================

async function extractCharacterIdentityProfile(
  characterProfile: CharacterProfile,
  basePrompt?: string
): Promise<CharacterIdentityProfile> {
  const extractionPrompt = `Extract a STRICT character identity profile from this character description.

CHARACTER INFO:
- Species: ${characterProfile.species}
- Key Features: ${characterProfile.keyFeatures.join(", ")}
- Proportions: ${characterProfile.proportions}
- Face Style: ${characterProfile.faceStyle}
${characterProfile.headDetails ? `- Head Details: ${characterProfile.headDetails}` : ""}
${characterProfile.bodyDetails ? `- Body Details: ${characterProfile.bodyDetails}` : ""}
${characterProfile.clothing ? `- Clothing: ${characterProfile.clothing}` : ""}

${basePrompt ? `ADDITIONAL CONTEXT:\n${basePrompt.slice(0, 500)}` : ""}

Return ONLY valid JSON:
{
  "species": "exact species",
  "faceShape": "face shape",
  "eyeStyle": "eye style",
  "noseStyle": "nose style",
  "mouthStyle": "mouth style",
  "earStyle": "ear style",
  "hornStyle": "horn or null",
  "hairTuft": "hair or null",
  "proportions": "proportions",
  "bodyShape": "body shape",
  "tailStyle": "tail or null",
  "wingStyle": "wings or null",
  "markings": "NO filled black areas - outlines only"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: extractionPrompt }],
      max_tokens: 800,
      temperature: 0.3,
    });

    let responseText = response.choices[0]?.message?.content?.trim() || "";
    responseText = responseText
      .replace(/^```json\n?/i, "")
      .replace(/^```\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    const extracted = JSON.parse(responseText);

    return {
      characterId: `char_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      species: extracted.species || characterProfile.species,
      faceShape: extracted.faceShape || "round, soft features",
      eyeStyle: extracted.eyeStyle || "large, expressive eyes",
      noseStyle: extracted.noseStyle || "small button nose",
      mouthStyle: extracted.mouthStyle || "friendly smile",
      earStyle: extracted.earStyle || "matching species typical ears",
      hornStyle: extracted.hornStyle || undefined,
      hairTuft: extracted.hairTuft || undefined,
      proportions: extracted.proportions || characterProfile.proportions,
      bodyShape: extracted.bodyShape || "soft, rounded body",
      tailStyle: extracted.tailStyle || undefined,
      wingStyle: extracted.wingStyle || undefined,
      markings: "NO filled black areas - all markings must be OUTLINE shapes only",
      defaultOutfit: characterProfile.clothing,
      doNotChange: [
        "species",
        "face shape",
        "eye style",
        "ear shape",
        "head-to-body ratio",
        "distinctive features",
      ],
    };
  } catch (error) {
    console.error("[batch/prompts] Failed to extract character identity:", error);
    
    return {
      characterId: `char_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      species: characterProfile.species,
      faceShape: characterProfile.faceStyle || "round, soft features",
      eyeStyle: "large, expressive eyes",
      noseStyle: "small button nose",
      mouthStyle: "friendly smile",
      earStyle: "matching species typical ears",
      proportions: characterProfile.proportions,
      bodyShape: "soft, rounded body",
      markings: "NO filled black areas - outlines only",
      doNotChange: ["species", "face shape", "eye style", "proportions"],
    };
  }
}

// ============================================================
// DIVERSITY VALIDATION
// ============================================================

function validateSceneDiversity(scenes: PlannedScene[]): void {
  // Check for location repetition
  for (let i = 2; i < scenes.length; i++) {
    const loc1 = scenes[i - 2]?.location?.toLowerCase() || "";
    const loc2 = scenes[i - 1]?.location?.toLowerCase() || "";
    const loc3 = scenes[i]?.location?.toLowerCase() || "";
    
    if (loc1 && loc1 === loc2 && loc2 === loc3) {
      console.warn(`[batch/prompts] Warning: Location "${loc1}" repeated 3+ times at pages ${i - 1}, ${i}, ${i + 1}`);
    }
  }

  const uniqueLocations = new Set(scenes.map(s => s.location?.toLowerCase()).filter(Boolean));
  const minExpected = Math.min(4, Math.ceil(scenes.length / 2));
  
  if (uniqueLocations.size < minExpected) {
    console.warn(`[batch/prompts] Warning: Only ${uniqueLocations.size} unique locations for ${scenes.length} pages`);
  }

  // Check for action repetition
  const uniqueActions = new Set(scenes.map(s => s.action?.toLowerCase()).filter(Boolean));
  if (uniqueActions.size < scenes.length * 0.6) {
    console.warn(`[batch/prompts] Warning: Only ${uniqueActions.size} unique actions for ${scenes.length} pages`);
  }

  console.log(`[batch/prompts] Diversity check: ${uniqueLocations.size} locations, ${uniqueActions.size} actions`);
}
