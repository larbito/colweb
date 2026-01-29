import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";

/**
 * Route segment config
 */
export const maxDuration = 30; // 30 seconds

/**
 * POST /api/idea/generate
 * 
 * Generates a complete coloring book idea with AI.
 * DIVERSITY ENFORCED: Each regeneration produces a genuinely different concept.
 * 
 * Features:
 * - ideaSeed: Forces different random generation each call
 * - previousIdeas: Excludes recently generated ideas
 * - Theme rotation: Cycles through diverse theme buckets
 * - Must-differ constraints: Prevents similar characters/settings
 */

// Theme buckets for diversity - rotate through these
const THEME_BUCKETS = [
  // Animals & Creatures
  "woodland animals", "ocean creatures", "jungle safari", "farm life", "dinosaurs",
  "mythical creatures", "insects and bugs", "arctic animals", "pets and companions",
  // Fantasy & Adventure
  "magical kingdom", "space exploration", "underwater adventure", "fairy garden",
  "dragon quest", "pirate treasure", "enchanted forest", "robot friends",
  // Everyday Life
  "school day", "family picnic", "cooking adventures", "sports and games",
  "birthday party", "playground fun", "camping trip", "garden helpers",
  // Nature & Seasons
  "spring flowers", "summer beach", "autumn harvest", "winter wonderland",
  "rainy day", "sunny meadow", "nighttime stars", "rainbow world",
  // Vehicles & Machines
  "construction site", "train journey", "airplane adventure", "fire station",
  "race cars", "sailing boats", "hot air balloons", "bicycle rides",
  // Creative & Whimsical
  "music makers", "art studio", "circus fun", "candy land",
  "monster friends", "superhero training", "time travel", "miniature world",
];

// Character type pools for variety
const CHARACTER_TYPES = [
  // Animals
  "curious bunny", "brave kitten", "friendly puppy", "playful bear cub",
  "wise owl", "cheerful squirrel", "gentle deer", "adventurous fox",
  "happy penguin", "fluffy sheep", "tiny mouse", "proud lion cub",
  // Fantasy
  "young dragon", "friendly unicorn", "little fairy", "small elf",
  "gentle giant", "baby phoenix", "mermaid child", "cloud sprite",
  // Everyday
  "young child", "group of friends", "family", "sibling duo",
  // Objects (for theme mode)
  "magical items", "talking vehicles", "animated toys", "friendly robots",
];

const requestSchema = z.object({
  themeHint: z.string().optional().describe("Optional theme hint from user"),
  age: z.enum(["3-6", "6-9", "9-12", "all-ages"]).optional().default("all-ages"),
  mode: z.enum(["storybook", "theme"]).optional().default("storybook"),
  // DIVERSITY PARAMETERS
  ideaSeed: z.string().optional().describe("Unique seed to force different generation"),
  previousIdeas: z.array(z.object({
    title: z.string().optional(),
    theme: z.string().optional(),
    mainCharacter: z.string().optional(),
  })).optional().describe("Previous ideas to avoid repeating"),
  excludeThemes: z.array(z.string()).optional().describe("Theme buckets to exclude"),
  excludeCharacterTypes: z.array(z.string()).optional().describe("Character types to exclude"),
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

    const { 
      themeHint, 
      age, 
      mode, 
      ideaSeed, 
      previousIdeas = [], 
      excludeThemes = [],
      excludeCharacterTypes = [],
    } = parseResult.data;

    // Build diversity constraints
    const diversityConstraints = buildDiversityConstraints(
      previousIdeas,
      excludeThemes,
      excludeCharacterTypes,
      ideaSeed
    );

    const ageDescriptions: Record<string, string> = {
      "3-6": "preschool/toddler (very simple scenes, 2-4 large objects)",
      "6-9": "early elementary (moderate detail, 4-6 objects per page)",
      "9-12": "older kids (more detailed scenes, can include backgrounds)",
      "all-ages": "all ages (balanced complexity suitable for everyone)",
    };

    const modeDescription = mode === "storybook"
      ? "STORYBOOK format (same main character throughout with story progression)"
      : "THEMED COLLECTION format (same theme but varied subjects/scenes)";

    const ideaPrompt = `You are a creative children's book author specializing in coloring books.
You MUST generate a COMPLETELY NEW and ORIGINAL idea that is DIFFERENT from any previous ideas.

=== CREATIVITY SEED: ${ideaSeed || crypto.randomUUID()} ===
Use this seed to inspire a UNIQUE direction. Different seeds = different ideas.

=== REQUIREMENTS ===
- Target age: ${ageDescriptions[age || "all-ages"]}
- Format: ${modeDescription}
${themeHint ? `- Theme hint from user: "${themeHint}"` : "- No specific theme requested (BE CREATIVE and UNEXPECTED!)"}

${diversityConstraints}

=== YOUR TASK ===
Create an ENGAGING, ORIGINAL idea that would make a DELIGHTFUL coloring book.

Include:
1. BOOK TITLE: A catchy, memorable title (MUST be unique)
2. THEME: The overall theme/setting (BE CREATIVE - avoid common themes)
3. MAIN CHARACTER (if storybook): A lovable character with specific visual details
4. TARGET EMOTION: What feeling should kids get (joy, curiosity, calm, adventure)
5. EXAMPLE SCENES: 8-12 example page ideas that would work as coloring pages
6. UNIQUE ANGLE: What makes THIS book special and different

Return ONLY valid JSON in this exact format:
{
  "title": "Book title (UNIQUE - not similar to previous)",
  "theme": "One sentence describing the theme",
  "mainCharacter": "Character name and brief visual description (or null for theme mode)",
  "characterType": "General type: bunny, dragon, child, robot, etc.",
  "targetEmotion": "Primary emotion/feeling",
  "exampleScenes": ["Scene 1 description", "Scene 2 description", ...],
  "uniqueAngle": "What makes this special",
  "fullIdea": "A 2-3 sentence pitch that summarizes the entire book concept",
  "themeBucket": "Which theme category this falls into"
}

IMPORTANT: Be genuinely creative! Surprise the user with an unexpected but delightful concept.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "user", content: ideaPrompt },
      ],
      max_tokens: 1500,
      temperature: 1.0, // Maximum creativity for diverse ideas
    });

    let responseText = response.choices[0]?.message?.content?.trim() || "";

    // Clean up JSON markers
    responseText = responseText
      .replace(/^```json\n?/i, "")
      .replace(/^```\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    try {
      const ideaData = JSON.parse(responseText);

      console.log(`[idea/generate] Generated idea: "${ideaData.title}" (theme: ${ideaData.themeBucket || ideaData.theme})`);

      return NextResponse.json({
        idea: ideaData.fullIdea,
        title: ideaData.title,
        theme: ideaData.theme,
        mainCharacter: ideaData.mainCharacter,
        characterType: ideaData.characterType,
        targetEmotion: ideaData.targetEmotion,
        exampleScenes: ideaData.exampleScenes,
        uniqueAngle: ideaData.uniqueAngle,
        themeBucket: ideaData.themeBucket,
        // Return seed for tracking
        ideaSeed: ideaSeed || "generated",
      });

    } catch {
      // If JSON parsing fails, try to extract the idea from the text
      console.error("[idea/generate] Failed to parse JSON, using raw text");
      return NextResponse.json({
        idea: responseText,
        title: null,
        theme: null,
        mainCharacter: null,
        exampleScenes: [],
        ideaSeed: ideaSeed || "generated",
      });
    }

  } catch (error) {
    console.error("[idea/generate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate idea" },
      { status: 500 }
    );
  }
}

/**
 * Build diversity constraints based on previous ideas
 */
function buildDiversityConstraints(
  previousIdeas: Array<{ title?: string; theme?: string; mainCharacter?: string }>,
  excludeThemes: string[],
  excludeCharacterTypes: string[],
  ideaSeed?: string
): string {
  const constraints: string[] = [];

  // Must-differ constraints from previous ideas
  if (previousIdeas.length > 0) {
    constraints.push("=== MUST BE DIFFERENT FROM THESE PREVIOUS IDEAS ===");
    
    const prevTitles = previousIdeas.map(p => p.title).filter(Boolean);
    const prevThemes = previousIdeas.map(p => p.theme).filter(Boolean);
    const prevCharacters = previousIdeas.map(p => p.mainCharacter).filter(Boolean);

    if (prevTitles.length > 0) {
      constraints.push(`Previous titles (DO NOT reuse or make similar): ${prevTitles.join(", ")}`);
    }
    if (prevThemes.length > 0) {
      constraints.push(`Previous themes (MUST be COMPLETELY DIFFERENT): ${prevThemes.join(", ")}`);
    }
    if (prevCharacters.length > 0) {
      constraints.push(`Previous characters (use DIFFERENT species/type): ${prevCharacters.join(", ")}`);
    }

    constraints.push("\nCRITICAL: Your new idea MUST NOT reuse:");
    constraints.push("- Same or similar main character species/name");
    constraints.push("- Same primary setting or location theme");
    constraints.push("- Same core plot premise or story structure");
    constraints.push("- Similar title patterns or keywords");
  }

  // Exclude specific themes
  if (excludeThemes.length > 0) {
    constraints.push(`\nEXCLUDE these theme categories: ${excludeThemes.join(", ")}`);
  }

  // Exclude specific character types
  if (excludeCharacterTypes.length > 0) {
    constraints.push(`EXCLUDE these character types: ${excludeCharacterTypes.join(", ")}`);
  }

  // Suggest a random theme bucket for diversity
  const availableThemes = THEME_BUCKETS.filter(t => 
    !excludeThemes.includes(t) && 
    !previousIdeas.some(p => p.theme?.toLowerCase().includes(t.toLowerCase()))
  );
  
  if (availableThemes.length > 0) {
    // Use ideaSeed to pick a consistent but varied theme
    const themeIndex = ideaSeed 
      ? Math.abs(hashCode(ideaSeed)) % availableThemes.length
      : Math.floor(Math.random() * availableThemes.length);
    const suggestedTheme = availableThemes[themeIndex];
    
    constraints.push(`\n=== THEME SUGGESTION (for diversity) ===`);
    constraints.push(`Consider exploring: "${suggestedTheme}" or something equally unique.`);
    constraints.push(`Available theme directions: ${availableThemes.slice(0, 5).join(", ")}, ...`);
  }

  // Suggest a random character type for storybook mode
  const availableCharacters = CHARACTER_TYPES.filter(c =>
    !excludeCharacterTypes.includes(c) &&
    !previousIdeas.some(p => p.mainCharacter?.toLowerCase().includes(c.split(" ").pop() || ""))
  );

  if (availableCharacters.length > 0) {
    const charIndex = ideaSeed
      ? Math.abs(hashCode(ideaSeed + "char")) % availableCharacters.length
      : Math.floor(Math.random() * availableCharacters.length);
    const suggestedChar = availableCharacters[charIndex];

    constraints.push(`\n=== CHARACTER SUGGESTION (for storybook mode) ===`);
    constraints.push(`Consider: "${suggestedChar}" or a completely unique character.`);
  }

  return constraints.join("\n");
}

/**
 * Simple hash function to convert string to number for seeded randomness
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}
