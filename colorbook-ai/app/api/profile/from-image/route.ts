import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { 
  profileFromImageRequestSchema,
  DEFAULT_MUST_AVOID,
  type ProfileFromImageResponse,
  type StyleProfile,
  type CharacterProfile,
} from "@/lib/batchGenerationTypes";
import { IMAGE_ANALYSIS_SYSTEM_PROMPT } from "@/lib/coloringPagePromptEnforcer";

/**
 * POST /api/profile/from-image
 * 
 * Extracts a DETAILED profile from a reference image for batch generation.
 * 
 * CRITICAL for storybook mode:
 * - Character profile must be extremely detailed
 * - doNotChange array must list all critical visual traits
 * - This enables character consistency across all pages
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
    const parseResult = profileFromImageRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { imageBase64 } = parseResult.data;

    // Detect media type
    let mediaType = "image/png";
    if (imageBase64.startsWith("/9j/")) {
      mediaType = "image/jpeg";
    } else if (imageBase64.startsWith("R0lGOD")) {
      mediaType = "image/gif";
    } else if (imageBase64.startsWith("UklGR")) {
      mediaType = "image/webp";
    }

    // First, get the detailed structured prompt
    const promptResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: IMAGE_ANALYSIS_SYSTEM_PROMPT,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mediaType};base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const basePrompt = promptResponse.choices[0]?.message?.content?.trim() || "";

    // Now extract the profile with EXTREMELY detailed character information
    const profileExtractionPrompt = `Analyze this coloring book page and extract an EXTREMELY DETAILED profile.

CRITICAL: If there is a character, you MUST describe it in EXTREME detail for consistency across multiple pages.

Return ONLY valid JSON (no markdown) in this exact format:
{
  "styleProfile": {
    "lineStyle": "detailed description of line thickness, smoothness, boldness (e.g., 'medium-thick clean outlines, consistent 2-3px stroke weight, smooth curves')",
    "compositionRules": "how elements are arranged (e.g., 'centered subject filling 85% of frame, slight low angle view')",
    "environmentStyle": "background style (e.g., 'minimal indoor scene with simple furniture outlines')",
    "colorScheme": "black and white line art",
    "mustAvoid": ["solid black fills", "filled shapes", "shading", "grayscale", "gradients", "hatching", "textures", "border", "frame"]
  },
  "characterProfile": {
    "species": "exact type (e.g., 'pandacorn - panda with unicorn horn')",
    "keyFeatures": [
      "list EVERY distinguishing visual feature",
      "e.g., 'spiral unicorn horn with horizontal stripes'",
      "e.g., 'round panda face with outlined eye patches'",
      "e.g., 'small rounded ears at 10 and 2 o'clock positions'",
      "e.g., 'large circular eyes with tiny dot pupils'",
      "be VERY specific about shapes and positions"
    ],
    "proportions": "exact proportions (e.g., 'chibi style - head is 40% of total height, round body, short limbs')",
    "faceStyle": "detailed face description (e.g., 'perfectly round face, eyes 30% of face width, small triangle nose, gentle smile')",
    "headDetails": "horn, ears, hair details (e.g., 'spiral horn center-top of head, round ears at 45 degree angle, small tuft of hair')",
    "bodyDetails": "body specifics (e.g., 'round belly, small paws with 4 toes each, short stubby tail')",
    "clothing": "any outfit or accessories",
    "poseVibe": "general pose style",
    "doNotChange": [
      "LIST ALL CRITICAL VISUAL TRAITS THAT MUST STAY IDENTICAL",
      "horn shape and spiral pattern",
      "eye shape, size, and spacing",
      "ear shape and placement",
      "face shape (perfectly round)",
      "body proportions (chibi ratio)",
      "paw shape",
      "expression style"
    ]
  },
  "sceneInventory": ["list", "all", "visible", "props", "and", "background", "elements"],
  "extractedTheme": "detected theme"
}

CRITICAL RULES:
1. The characterProfile MUST be extremely detailed - this ensures consistency across pages
2. keyFeatures should have 6-10 specific visual traits
3. doNotChange should list 5-10 critical traits that define the character's identity
4. Be specific about shapes, sizes, positions, and proportions
5. If the character has dark patches (like panda markings), note they should be OUTLINED not filled
6. If no clear character exists, set characterProfile to null

Return ONLY the JSON.`;

    const profileResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: profileExtractionPrompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mediaType};base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    let profileText = profileResponse.choices[0]?.message?.content?.trim() || "{}";
    
    // Clean up any markdown formatting
    profileText = profileText
      .replace(/^```json\n?/i, "")
      .replace(/^```\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    let profileData: {
      styleProfile?: StyleProfile;
      characterProfile?: CharacterProfile | null;
      sceneInventory?: string[];
      extractedTheme?: string;
    };

    try {
      profileData = JSON.parse(profileText);
    } catch {
      console.error("[profile/from-image] Failed to parse profile JSON:", profileText);
      profileData = {
        styleProfile: {
          lineStyle: "Clean black outlines, medium thickness",
          compositionRules: "Centered subject filling 85% of frame",
          environmentStyle: "Simple background",
          colorScheme: "black and white line art",
          mustAvoid: DEFAULT_MUST_AVOID,
        },
        sceneInventory: [],
      };
    }

    // Ensure mustAvoid always includes our required constraints
    if (profileData.styleProfile) {
      const existingAvoid = profileData.styleProfile.mustAvoid || [];
      const mergedAvoid = [...new Set([...existingAvoid, ...DEFAULT_MUST_AVOID])];
      profileData.styleProfile.mustAvoid = mergedAvoid;
      profileData.styleProfile.colorScheme = "black and white line art";
    }

    // Ensure character profile has doNotChange array
    if (profileData.characterProfile) {
      if (!profileData.characterProfile.doNotChange || profileData.characterProfile.doNotChange.length === 0) {
        // Generate default doNotChange based on keyFeatures
        profileData.characterProfile.doNotChange = [
          "face shape",
          "eye style and size",
          "ear shape and placement",
          "body proportions",
          ...(profileData.characterProfile.keyFeatures?.slice(0, 4) || []),
        ];
      }
    }

    const result: ProfileFromImageResponse = {
      styleProfile: profileData.styleProfile || {
        lineStyle: "Clean black outlines",
        compositionRules: "Centered composition filling 85% of frame",
        environmentStyle: "Simple background",
        colorScheme: "black and white line art",
        mustAvoid: DEFAULT_MUST_AVOID,
      },
      characterProfile: profileData.characterProfile || undefined,
      sceneInventory: profileData.sceneInventory || [],
      extractedTheme: profileData.extractedTheme,
      basePrompt: basePrompt,
    };

    console.log(`[profile/from-image] Extracted profile with ${result.sceneInventory.length} scene items`);
    console.log(`[profile/from-image] Character detected: ${!!result.characterProfile}`);
    if (result.characterProfile) {
      console.log(`[profile/from-image] Character: ${result.characterProfile.species}`);
      console.log(`[profile/from-image] Locked traits: ${result.characterProfile.doNotChange?.length || 0}`);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("[profile/from-image] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract profile" },
      { status: 500 }
    );
  }
}
