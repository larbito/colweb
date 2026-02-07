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
    const imageSize = (size || "1024x1792") as ImageSize;
    
    // CRITICAL: Ensure we only process exactly `count` scenes
    const scenesToProcess = scenePlan.scenes.slice(0, count);
    
    const pages: PagePromptItem[] = scenesToProcess.map((scene, index) => {
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

      // Get subject for variety themes
      const sceneSubject = (scene as { subject?: string }).subject;
      
      return {
        page: index + 1, // Force sequential page numbers from 1 to count
        title: scene.title,
        prompt: fullPrompt,
        sceneDescription: sceneSubject 
          ? `${sceneSubject} - ${scene.action} in ${scene.location}` 
          : `${scene.action} in ${scene.location} with ${scene.props.slice(0, 4).join(", ")}`,
      };
    });

    // Validate scene diversity for storybook mode
    if (mode === "storybook") {
      validateSceneDiversity(scenesToProcess);
    }
    
    // Final validation: ensure exact count
    if (pages.length !== count) {
      console.warn(`[batch/prompts] MISMATCH: requested ${count} pages, returning ${pages.length}`);
    }

    const result: BatchPromptsResponse & { characterIdentityProfile?: CharacterIdentityProfile } = {
      pages,
      mode,
      characterConsistencyBlock,
      characterIdentityProfile,
    };

    console.log(`[batch/prompts] Generated EXACTLY ${pages.length} prompts (requested: ${count}) in ${mode} mode`);

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
  
  // Parse user's idea for key requirements
  const ideaLower = ideaText.toLowerCase();
  const hasKawaiiStyle = ideaLower.includes("kawaii") || ideaLower.includes("cute") || ideaLower.includes("chibi");
  const hasMultipleCharacters = ideaLower.match(/two|2|both|pair|couple|friends|together/i);
  const animalsOnly = (ideaLower.includes("animal") || ideaLower.includes("animals")) && !ideaLower.includes("kid") && !ideaLower.includes("child") && !ideaLower.includes("person");
  const noHumans = animalsOnly || ideaLower.includes("no human") || ideaLower.includes("no people") || ideaLower.includes("no kid") || ideaLower.includes("animals only");
  
  // Detect if user wants VARIETY (different subjects on each page)
  // "cute animals" = many different animals, not the same one repeated
  const wantsVariety = (
    ideaLower.includes("animals") || // plural = variety
    ideaLower.includes("different") ||
    ideaLower.includes("variety") ||
    ideaLower.includes("various") ||
    ideaLower.includes("collection") ||
    (bookType === "theme") // theme mode implies variety
  );
  
  // Detect specific animal categories for smart variety
  const animalCategory = 
    ideaLower.includes("farm") ? "farm" :
    ideaLower.includes("jungle") || ideaLower.includes("safari") || ideaLower.includes("wild") ? "wild" :
    ideaLower.includes("ocean") || ideaLower.includes("sea") || ideaLower.includes("underwater") ? "ocean" :
    ideaLower.includes("forest") || ideaLower.includes("woodland") ? "forest" :
    ideaLower.includes("pet") || ideaLower.includes("domestic") ? "pets" :
    ideaLower.includes("bird") ? "birds" :
    ideaLower.includes("dinosaur") || ideaLower.includes("dino") ? "dinosaurs" :
    ideaLower.includes("insect") || ideaLower.includes("bug") ? "insects" :
    "mixed"; // Default to a mix of all cute animals
  
  const prompt = `You are creating a creative brief for a ${bookType === "storybook" ? "STORYBOOK (same character on every page)" : "THEME COLLECTION (varied subjects)"} coloring book.

USER'S EXACT REQUEST: "${ideaText}"

=== ANALYZE USER'S REQUEST CAREFULLY ===
${hasKawaiiStyle ? `
⚠️ STYLE REQUIREMENT: User wants KAWAII/CUTE style
- Use rounded, soft shapes
- Big heads with large eyes
- Small bodies (chibi proportions)
- Friendly, adorable expressions
- This style MUST be consistent on ALL pages
` : ""}
${hasMultipleCharacters ? `
⚠️ CHARACTER COUNT: User wants MULTIPLE characters (two or more)
- EVERY scene MUST include at least TWO characters together
- Both characters must be visible and interacting
- DO NOT show just one character alone
` : ""}
${noHumans ? `
⚠️ NO HUMANS: User wants ANIMALS ONLY
- NO human children, kids, or people
- Focus ONLY on animal characters
- No human hands, faces, or figures
` : ""}
${wantsVariety ? `
⚠️ VARIETY REQUIRED: User wants DIFFERENT subjects on each page
- Do NOT repeat the same animal/subject on multiple pages
- Each page should feature a DIFFERENT animal or character
- Create a diverse pool of subjects that fit the theme
- Category hint: ${animalCategory}
` : ""}

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

CRITICAL RULES - FOLLOW EXACTLY:
1. NEVER add generic templates (bedroom, kitchen, school, bathroom) unless user explicitly asked
2. Every element must connect to "${ideaText}"
3. ${themeReqs.isSpecialTheme ? `Every scene must include ${themeReqs.themeName} motifs` : "Scenes must match the user's actual theme"}
4. Avoid generic filler: ${FORBIDDEN_FILLERS.slice(0, 8).join(", ")}
${noHumans ? `5. NO HUMANS - only show the animals/characters user requested` : ""}
${hasMultipleCharacters ? `6. ALWAYS show MULTIPLE characters together - NEVER just one` : ""}
${bookType === "storybook" ? `
7. Create ${hasMultipleCharacters ? "TWO main characters that are ALWAYS together" : "ONE main character"} with strict consistency rules
8. Character(s) must have "alwaysInclude" traits (e.g., "both characters visible")
9. List what "neverChange" - traits that stay identical
` : `
7. Define varied subjects that fit the theme
8. No forced main character - variety is key
`}

Return ONLY valid JSON matching this structure:
{
  "themeTitle": "specific title based on idea",
  "themeDescription": "2-3 sentences describing the theme",
  "targetAudience": "${targetAge || "all-ages"}",
  "mood": "cheerful/adventurous/cozy/magical/etc",
  "artStyle": "${hasKawaiiStyle ? "kawaii/cute - rounded shapes, big eyes, chibi proportions" : "standard coloring book style"}",
  "visualStyleHints": ["hint1", "hint2", "hint3"${hasKawaiiStyle ? ', "kawaii", "chibi proportions", "big cute eyes"' : ""}],
  "lineThickness": "thin/medium/thick",
  "complexity": "simple/medium/detailed",
  "settingWorld": "describe the world/setting derived from the idea",
  "primaryLocations": ["5-10 specific locations that fit THIS theme - NOT generic bedrooms/kitchens"],
  "timeOfDayOptions": ["morning", "afternoon", "evening"],
  "characterCount": ${hasMultipleCharacters ? 2 : 1},
  "noHumans": ${noHumans},
  ${bookType === "storybook" ? `
  "mainCharacter": {
    "name": "optional name",
    "species": "specific type (e.g., 'baby unicorn' not just 'unicorn')${noHumans ? " - MUST be an animal, NOT a human" : ""}",
    "visualTraits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
    "outfit": "description or null",
    "accessories": ["accessory1", "accessory2"],
    "proportions": "${hasKawaiiStyle ? "kawaii/chibi - large head, small body, big eyes" : "chibi with large head / realistic / etc"}",
    "alwaysInclude": ["both arms/hands visible", "${hasMultipleCharacters ? "BOTH characters always together" : "full body visible"}", "etc"],
    "neverChange": ["face shape", "eye style", "body proportions", "${hasKawaiiStyle ? "kawaii style" : "character design"}", "etc"]
  },
  ${hasMultipleCharacters ? `"secondCharacter": {
    "name": "optional name",
    "species": "specific type${noHumans ? " - MUST be an animal, NOT a human" : ""}",
    "visualTraits": ["trait1", "trait2"],
    "relationship": "how they relate to main character"
  },` : ""}
  "supportingCast": [{"type": "type", "role": "role"}],
  ` : `
  "mainCharacter": null,
  `}
  "mustInclude": ${JSON.stringify(themeReqs.requiredMotifs.length > 0 ? themeReqs.requiredMotifs : ["items that MUST appear based on the idea"])}${hasMultipleCharacters ? '.concat(["both characters together in every scene"])' : ""},
  "mustAvoid": ${JSON.stringify([...themeReqs.forbiddenContent, ...FORBIDDEN_FILLERS.slice(0, 5)])}${noHumans ? '.concat(["human children", "kids", "human figures", "people"])' : ""},
  "forbiddenFillers": ${JSON.stringify(FORBIDDEN_FILLERS.slice(0, 10))},
  "varietyPlan": {
    "sceneTypes": ["action scene", "quiet moment", "discovery", "celebration", "nature scene"],
    "actionsPool": ["10-15 specific actions that fit THIS theme${hasMultipleCharacters ? " - actions for TWO characters together" : ""}"],
    "propsPool": ["15-25 theme-appropriate props - NOT generic toys/balls/rocks"],
    "compositionStyles": ["close-up face", "medium shot with background", "wide scene", "looking up at", "looking down at"]${wantsVariety ? `,
    "subjectsPool": ["LIST 25-40 DIFFERENT ${animalCategory === "mixed" ? "cute animals" : animalCategory + " animals/subjects"} - each page will feature ONE different subject from this pool. Include: mammals, birds, sea creatures, etc. as appropriate. Make them diverse and creative!"]` : ""}
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
        subjectsPool: parsed.varietyPlan?.subjectsPool || [],
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
// STEP 2: PLAN UNIQUE SCENES (with chunked generation for large counts)
// ============================================================

// Maximum scenes per API call to stay within token limits
const MAX_SCENES_PER_CHUNK = 15;

async function planScenes(
  brief: CreativeBrief,
  pageCount: number,
  mode: "storybook" | "theme"
): Promise<{ scenes: PlannedScene[]; usedLocations: string[]; usedProps: string[]; diversityScore: number }> {
  
  // For large page counts, generate in chunks
  if (pageCount > MAX_SCENES_PER_CHUNK) {
    console.log(`[batch/prompts] Large page count (${pageCount}), using chunked generation`);
    return planScenesChunked(brief, pageCount, mode);
  }
  
  // For smaller counts, generate all at once
  return planScenesChunk(brief, pageCount, mode, 1, []);
}

/**
 * Chunked scene generation for large page counts (>15 pages)
 * Generates scenes in batches and maintains continuity between chunks
 */
async function planScenesChunked(
  brief: CreativeBrief,
  totalPages: number,
  mode: "storybook" | "theme"
): Promise<{ scenes: PlannedScene[]; usedLocations: string[]; usedProps: string[]; diversityScore: number }> {
  
  const allScenes: PlannedScene[] = [];
  const usedLocationsSet = new Set<string>();
  const usedPropsSet = new Set<string>();
  
  let currentPage = 1;
  let chunkIndex = 0;
  
  while (currentPage <= totalPages) {
    const remainingPages = totalPages - currentPage + 1;
    const chunkSize = Math.min(MAX_SCENES_PER_CHUNK, remainingPages);
    
    console.log(`[batch/prompts] Generating chunk ${chunkIndex + 1}: pages ${currentPage}-${currentPage + chunkSize - 1} of ${totalPages}`);
    
    // Generate this chunk
    const chunkResult = await planScenesChunk(
      brief, 
      chunkSize, 
      mode, 
      currentPage,
      allScenes.slice(-5) // Pass last 5 scenes for context
    );
    
    // Add scenes with correct page numbers
    for (const scene of chunkResult.scenes) {
      scene.pageNumber = currentPage + (scene.pageNumber - 1);
      allScenes.push(scene);
      if (scene.location) usedLocationsSet.add(scene.location.toLowerCase());
      if (scene.props) scene.props.forEach(p => usedPropsSet.add(p.toLowerCase()));
    }
    
    currentPage += chunkSize;
    chunkIndex++;
    
    // Small delay between chunks to avoid rate limits
    if (currentPage <= totalPages) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  // Calculate diversity metrics
  const usedLocations = [...usedLocationsSet];
  const usedProps = [...usedPropsSet];
  const locationDiversity = usedLocations.length / Math.min(allScenes.length, 20);
  const propDiversity = usedProps.length / Math.max(allScenes.length * 4, 1);
  const diversityScore = Math.round((locationDiversity * 50 + propDiversity * 50));
  
  console.log(`[batch/prompts] Chunked generation complete: ${allScenes.length} scenes, ${usedLocations.length} locations, ${usedProps.length} props`);
  
  return { scenes: allScenes, usedLocations, usedProps, diversityScore };
}

/**
 * Generate a single chunk of scenes
 */
async function planScenesChunk(
  brief: CreativeBrief,
  chunkSize: number,
  mode: "storybook" | "theme",
  startPageNumber: number,
  previousScenes: PlannedScene[]
): Promise<{ scenes: PlannedScene[]; usedLocations: string[]; usedProps: string[]; diversityScore: number }> {
  
  // Build context from previous scenes to avoid repetition
  const usedSubjects = [...new Set(previousScenes.map(s => (s as { subject?: string }).subject).filter(Boolean))];
  const previousContext = previousScenes.length > 0 ? `
RECENTLY USED (DO NOT REPEAT):
${usedSubjects.length > 0 ? `- ⚠️ ALREADY USED SUBJECTS (DO NOT USE AGAIN): ${usedSubjects.join(", ")}` : ""}
- Locations: ${[...new Set(previousScenes.map(s => s.location))].join(", ")}
- Actions: ${[...new Set(previousScenes.map(s => s.action))].join(", ")}
- Props: ${[...new Set(previousScenes.flatMap(s => s.props?.slice(0, 2) || []))].slice(0, 10).join(", ")}
` : "";
  
  // Extract style and character requirements from brief
  const artStyle = (brief as { artStyle?: string }).artStyle || "";
  const characterCount = (brief as { characterCount?: number }).characterCount || 1;
  const noHumans = (brief as { noHumans?: boolean }).noHumans || false;
  const isKawaii = artStyle.toLowerCase().includes("kawaii") || artStyle.toLowerCase().includes("cute");
  
  // Get subjects pool for variety (if available)
  const subjectsPool = brief.varietyPlan?.subjectsPool || [];
  const hasSubjectsPool = subjectsPool.length > 0;
  
  const prompt = `You are planning ${chunkSize} UNIQUE coloring book scenes (pages ${startPageNumber} to ${startPageNumber + chunkSize - 1}).

CREATIVE BRIEF:
- Theme: ${brief.themeTitle}
- Setting World: ${brief.settingWorld}
- Mood: ${brief.mood}
${artStyle ? `- Art Style: ${artStyle}` : ""}
- Available Locations: ${brief.primaryLocations.join(", ")}
- Available Actions: ${brief.varietyPlan.actionsPool.join(", ")}
- Props Pool: ${brief.varietyPlan.propsPool.join(", ")}
- Composition Styles: ${brief.varietyPlan.compositionStyles.join(", ")}
${hasSubjectsPool ? `
⚠️ SUBJECTS POOL (use DIFFERENT subject on each page):
${subjectsPool.join(", ")}
RULE: Each page MUST feature a DIFFERENT subject from this pool. NO REPEATS!` : ""}
${previousContext}
${brief.isHolidayTheme ? `
HOLIDAY THEME: ${brief.holidayName}
REQUIRED MOTIFS (include 2-4 in EVERY scene): ${brief.holidayMotifs?.join(", ")}
` : ""}

${isKawaii ? `
⚠️ KAWAII/CUTE STYLE REQUIRED:
- All characters must have kawaii/chibi proportions
- Big heads, small bodies, large cute eyes
- Rounded, soft shapes
- Adorable expressions
` : ""}

${characterCount > 1 ? `
⚠️ TWO CHARACTERS REQUIRED IN EVERY SCENE:
- BOTH characters must appear together in EVERY single scene
- Show them interacting, playing, or doing activities together
- NEVER show just one character alone
` : ""}

${noHumans ? `
⚠️ NO HUMANS ALLOWED:
- Only show animal characters
- NO human children, kids, or people
- NO human hands, faces, or figures
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
3. Use each location at most ONCE in this batch
4. Each scene needs 4-8 SPECIFIC props (named and positioned)
5. Each scene must have at least 2 props not used in the previous scenes
6. Vary composition: alternate close-up, medium, wide
${hasSubjectsPool ? `7. ⚠️ EACH PAGE MUST HAVE A DIFFERENT SUBJECT/ANIMAL - pick from the subjects pool, NO REPEATING the same animal twice!` : ""}
${brief.isHolidayTheme ? `8. EVERY scene MUST include ${brief.holidayName} motifs (hearts, pumpkins, etc.)` : ""}
${characterCount > 1 ? `9. EVERY scene MUST show BOTH characters together - this is MANDATORY` : ""}
${noHumans ? `10. NO HUMANS - only animal characters allowed` : ""}

Return ONLY valid JSON:
{
  "scenes": [
    {
      "pageNumber": 1,
      "title": "Short Title",${hasSubjectsPool ? `
      "subject": "SPECIFIC animal/subject from the pool - DIFFERENT for each page",` : ""}
      "location": "specific location from the list",
      "action": "specific action${characterCount > 1 ? " for BOTH characters together" : ""}",
      "props": ["prop1 (position)", "prop2 (position)", "prop3", "prop4", "prop5"],
      "composition": "close-up / medium shot / wide scene",
      "timeOfDay": "morning/afternoon/evening",
      "mood": "scene mood",
      "themeMotifs": ["motif1", "motif2"]${mode === "storybook" ? `,
      "characterAction": "what the character${characterCount > 1 ? "s are" : " is"} doing",
      "characterExpression": "happy/curious/excited/peaceful"${characterCount > 1 ? `,
      "bothCharactersPresent": true` : ""}` : ""}
    }
  ]
}

IMPORTANT: Generate EXACTLY ${chunkSize} scenes (not more, not less) starting at page ${startPageNumber}.
${hasSubjectsPool ? "⚠️ CRITICAL: Each page MUST feature a DIFFERENT animal/subject - DO NOT repeat!" : ""}
${characterCount > 1 ? "⚠️ EVERY scene MUST have BOTH characters visible and interacting." : ""}
${noHumans ? "⚠️ NO human characters allowed - only animals." : ""}
${isKawaii ? "⚠️ All characters must be drawn in kawaii/cute style with chibi proportions." : ""}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 4000, // Enough for 15 scenes
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
    let scenes: PlannedScene[] = parsed.scenes || [];
    
    // CRITICAL: Ensure we have EXACTLY the requested number of scenes
    if (scenes.length > chunkSize) {
      console.warn(`[batch/prompts] Chunk returned ${scenes.length} scenes, but only ${chunkSize} requested - TRUNCATING`);
      scenes = scenes.slice(0, chunkSize);
    } else if (scenes.length < chunkSize) {
      console.warn(`[batch/prompts] Chunk returned ${scenes.length} scenes, expected ${chunkSize}`);
    }
    
    // Fix page numbering - ensure sequential starting from 1
    scenes = scenes.map((scene, index) => ({
      ...scene,
      pageNumber: index + 1, // Force sequential numbering within chunk
    }));
    
    // Calculate diversity metrics for this chunk
    const usedLocations = [...new Set(scenes.map(s => s.location).filter(Boolean))];
    const allProps = scenes.flatMap(s => s.props || []);
    const usedProps = [...new Set(allProps)];
    
    const locationDiversity = usedLocations.length / Math.min(scenes.length, 10);
    const propDiversity = usedProps.length / (allProps.length || 1);
    const diversityScore = Math.round((locationDiversity * 50 + propDiversity * 50));
    
    console.log(`[batch/prompts] Chunk generated: ${scenes.length} scenes (requested ${chunkSize}), ${usedLocations.length} locations, ${usedProps.length} unique props`);
    
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
  const { scene, creativeBrief, styleProfile, characterProfile, characterConsistencyBlock, characterBible, size = "1024x1792", complexity = "medium" } = params;

  // Extract extended brief properties
  const artStyle = (creativeBrief as { artStyle?: string }).artStyle || "";
  const characterCount = (creativeBrief as { characterCount?: number }).characterCount || 1;
  const noHumans = (creativeBrief as { noHumans?: boolean }).noHumans || false;
  const isKawaii = artStyle.toLowerCase().includes("kawaii") || artStyle.toLowerCase().includes("cute");

  const parts: string[] = [];

  // Title line with complexity context and style
  const audienceContext = complexity === "kids" ? "for toddlers (ages 3-6)" : 
                          complexity === "simple" ? "for young children (ages 6-9)" :
                          complexity === "ultra" ? "for adults (stress-relief style)" :
                          complexity === "detailed" ? "for teens and adults" : "";
  const styleContext = isKawaii ? "KAWAII/CUTE style with chibi proportions, big eyes, rounded shapes " : "";
  parts.push(`Create a ${styleContext}${audienceContext ? audienceContext + " " : ""}coloring book page in clean black-and-white OUTLINE line art (no filled areas, no grayscale).`);

  // Add style requirements
  if (isKawaii) {
    parts.push(`
=== KAWAII/CUTE STYLE REQUIRED ===
- All characters must have KAWAII/CHIBI proportions
- Large heads (2-3x body size), big round eyes
- Small bodies, short limbs
- Rounded, soft shapes everywhere
- Adorable, friendly expressions`);
  }

  // Add character count requirements
  if (characterCount > 1) {
    parts.push(`
=== TWO CHARACTERS REQUIRED ===
- BOTH characters must be visible in this scene
- Show them together, interacting or side by side
- Do NOT show just one character alone`);
  }

  // Add no-humans requirement
  if (noHumans) {
    parts.push(`
=== NO HUMANS ===
- Only animal characters allowed
- NO human children, kids, people, or human figures
- NO human hands, faces, or bodies`);
  }

  // Add complexity-specific instructions
  parts.push(COMPLEXITY_INSTRUCTIONS[complexity]);

  // Get subject if this is a variety theme
  const sceneSubject = (scene as { subject?: string }).subject;
  
  // Scene description with specific props
  const propsText = scene.props.slice(0, 6).join(", ");
  parts.push(`
Scene:
${scene.title}${sceneSubject ? ` - featuring a ${sceneSubject}` : ""} - ${scene.action} in ${scene.location}.
${sceneSubject ? `MAIN SUBJECT: A cute ${sceneSubject} (this specific animal/subject is the star of this page).` : ""}
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
  if (size === "1792x1024" || size === "1536x1024") {
    parts.push(LANDSCAPE_EXTRA_CONSTRAINTS);
  } else if (size === "1024x1792" || size === "1024x1536") {
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
  
  // Add no-humans constraint if applicable
  if (noHumans) {
    avoidList.push("human children", "kids", "people", "human figures", "human hands", "human faces");
  }
  
  // Add character count constraint
  if (characterCount > 1) {
    avoidList.push("single character alone", "only one character");
  }
  
  parts.push(`\nAVOID: ${[...new Set(avoidList)].join(", ")}.`);
  
  // Final reminder for critical requirements
  if (isKawaii || characterCount > 1 || noHumans) {
    const reminders: string[] = [];
    if (isKawaii) reminders.push("kawaii/chibi style with big eyes");
    if (characterCount > 1) reminders.push("BOTH characters visible together");
    if (noHumans) reminders.push("NO humans - animals only");
    parts.push(`\nCRITICAL REMINDER: ${reminders.join(", ")}.`);
  }

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
