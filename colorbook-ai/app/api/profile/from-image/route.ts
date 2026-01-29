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
 * Extracts a detailed profile from a reference image for batch generation.
 * Returns:
 * - styleProfile: Visual style rules
 * - characterProfile: Character details for consistency (if character detected)
 * - sceneInventory: Props and elements that can be reused
 * - basePrompt: Full structured prompt describing the reference
 * 
 * Input: { imageBase64: string }
 * Output: ProfileFromImageResponse
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

    // Now extract the profile for batch generation
    const profileExtractionPrompt = `Analyze this coloring book page image and extract a detailed profile for generating similar pages.

You MUST return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "styleProfile": {
    "lineStyle": "description of line thickness, smoothness, boldness",
    "compositionRules": "how elements are arranged (centered, rule of thirds, etc.)",
    "environmentStyle": "background style (minimal, detailed, indoor, outdoor)",
    "colorScheme": "black and white line art",
    "mustAvoid": ["solid black fills", "shading", "grayscale", "gradients", "hatching", "textures", "filled shapes"]
  },
  "characterProfile": {
    "species": "type of character (panda, unicorn, cat, etc.)",
    "keyFeatures": ["list", "of", "distinguishing", "visual", "features"],
    "proportions": "chibi/realistic/stylized, big head small body, etc.",
    "faceStyle": "round face, big eyes, small nose, etc.",
    "clothing": "outfit or accessories if any",
    "poseVibe": "playful/calm/active/curious",
    "doNotChange": ["critical", "features", "that", "must", "stay", "consistent"]
  },
  "sceneInventory": ["list", "of", "props", "and", "background", "elements", "visible"],
  "extractedTheme": "detected theme or setting (e.g., 'cozy home', 'magical forest')"
}

IMPORTANT RULES:
1. Be EXTREMELY detailed about the character - include every distinguishing feature
2. The "doNotChange" array must include the most critical visual traits for consistency
3. "mustAvoid" MUST always include: "solid black fills", "filled shapes", "shading", "grayscale", "gradients"
4. If no clear character is present, set characterProfile to null
5. Include at least 8-10 items in sceneInventory
6. Return ONLY the JSON object, no other text`;

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
      max_tokens: 1500,
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
      // Return a basic profile with defaults
      profileData = {
        styleProfile: {
          lineStyle: "Clean black outlines, medium thickness",
          compositionRules: "Centered subject with margins",
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

    const result: ProfileFromImageResponse = {
      styleProfile: profileData.styleProfile || {
        lineStyle: "Clean black outlines",
        compositionRules: "Centered composition",
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

    return NextResponse.json(result);

  } catch (error) {
    console.error("[profile/from-image] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract profile" },
      { status: 500 }
    );
  }
}

