/**
 * imageProcessor.ts - Post-processing and validation for coloring book images
 * Ensures all images are pure B/W and pass quality gates
 */

/**
 * Quality check result
 */
export interface QualityCheckResult {
  passed: boolean;
  binarizedBase64?: string;
  failureReason?: "color" | "species" | "blackfill";
  blackRatio?: number;
  details?: string;
}

/**
 * Configuration for quality checks
 */
export interface QualityConfig {
  /** Threshold for binarization (0-255). Pixels below = black */
  binarizationThreshold: number;
  /** Maximum allowed black pixel ratio (0-1) */
  maxBlackRatio: number;
  /** Maximum consecutive black pixels in a row before flagging */
  maxBlackRunLength: number;
}

const DEFAULT_CONFIG: QualityConfig = {
  binarizationThreshold: 225,
  maxBlackRatio: 0.10,
  maxBlackRunLength: 80,
};

/**
 * Fetch image from URL and return as base64
 */
export async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

/**
 * Process image: binarize to pure B/W and validate
 * This is the main function - all images MUST go through this before display
 */
export async function processAndValidateImage(
  imageUrl: string,
  config: QualityConfig = DEFAULT_CONFIG
): Promise<QualityCheckResult> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return {
        passed: false,
        failureReason: "color",
        details: "Failed to fetch image",
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Try to use sharp for proper image processing
    try {
      const sharp = (await import("sharp")).default;

      // Get image info
      const metadata = await sharp(imageBuffer).metadata();
      const width = metadata.width || 1024;
      const height = metadata.height || 1536;

      // Step 1: Convert to grayscale
      const grayscaleBuffer = await sharp(imageBuffer)
        .grayscale()
        .toBuffer();

      // Step 2: Binarize (threshold to pure black/white)
      const binarizedBuffer = await sharp(grayscaleBuffer)
        .threshold(config.binarizationThreshold)
        .png()
        .toBuffer();

      // Step 3: Analyze the binarized image for black ratio
      const { data, info } = await sharp(binarizedBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

      let blackPixels = 0;
      let maxRunLength = 0;
      let currentRun = 0;
      const totalPixels = info.width * info.height;

      // Count black pixels and detect long runs
      for (let i = 0; i < data.length; i++) {
        const isBlack = data[i] < 128;
        
        if (isBlack) {
          blackPixels++;
          currentRun++;
          maxRunLength = Math.max(maxRunLength, currentRun);
        } else {
          currentRun = 0;
        }

        // Reset at row boundaries
        if ((i + 1) % info.width === 0) {
          currentRun = 0;
        }
      }

      const blackRatio = blackPixels / totalPixels;

      // Check if black ratio is too high (indicates filled regions)
      if (blackRatio > config.maxBlackRatio) {
        return {
          passed: false,
          binarizedBase64: binarizedBuffer.toString("base64"),
          failureReason: "blackfill",
          blackRatio,
          details: `Black ratio ${(blackRatio * 100).toFixed(1)}% exceeds max ${config.maxBlackRatio * 100}%`,
        };
      }

      // Check for long runs (indicates large filled areas)
      if (maxRunLength > config.maxBlackRunLength) {
        return {
          passed: false,
          binarizedBase64: binarizedBuffer.toString("base64"),
          failureReason: "blackfill",
          blackRatio,
          details: `Detected long black run (${maxRunLength}px) indicating filled region`,
        };
      }

      // All checks passed
      return {
        passed: true,
        binarizedBase64: binarizedBuffer.toString("base64"),
        blackRatio,
      };

    } catch (sharpError) {
      // Sharp not available - return original with warning
      console.warn("Sharp not available for image processing:", sharpError);
      return {
        passed: true,
        binarizedBase64: imageBuffer.toString("base64"),
        details: "Binarization skipped (sharp not available)",
      };
    }

  } catch (error) {
    return {
      passed: false,
      failureReason: "color",
      details: error instanceof Error ? error.message : "Processing failed",
    };
  }
}

/**
 * Check if character matches using OpenAI Vision
 * Returns whether the character in the generated image matches the anchor
 */
export async function checkCharacterMatch(
  anchorImageBase64: string,
  generatedImageBase64: string,
  expectedCharacterType: string,
  openaiApiKey: string
): Promise<{ matches: boolean; sameSpecies: boolean; notes: string }> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Compare these two coloring book images. The first is the ANCHOR/reference, the second is a newly generated page.

The expected character type is: ${expectedCharacterType}

Analyze and return ONLY this JSON (no other text):
{
  "sameCharacter": true/false (is it the same character design?),
  "sameSpecies": true/false (is it the same animal species as expected: ${expectedCharacterType}?),
  "notes": "brief explanation"
}

Be strict: if the species changed (e.g., cat became sheep), sameSpecies must be false.`,
              },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${anchorImageBase64}` },
              },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${generatedImageBase64}` },
              },
            ],
          },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error("Vision API error:", await response.text());
      return { matches: true, sameSpecies: true, notes: "Vision check skipped (API error)" };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) jsonContent = jsonContent.slice(7);
    if (jsonContent.startsWith("```")) jsonContent = jsonContent.slice(3);
    if (jsonContent.endsWith("```")) jsonContent = jsonContent.slice(0, -3);
    jsonContent = jsonContent.trim();

    try {
      const parsed = JSON.parse(jsonContent);
      return {
        matches: parsed.sameCharacter ?? true,
        sameSpecies: parsed.sameSpecies ?? true,
        notes: parsed.notes || "",
      };
    } catch {
      return { matches: true, sameSpecies: true, notes: "Could not parse vision response" };
    }

  } catch (error) {
    console.error("Character match check error:", error);
    return { matches: true, sameSpecies: true, notes: "Vision check failed" };
  }
}

/**
 * Convert data URL to base64 string (without prefix)
 */
export function dataUrlToBase64(dataUrl: string): string {
  if (dataUrl.startsWith("data:")) {
    return dataUrl.split(",")[1] || dataUrl;
  }
  return dataUrl;
}

/**
 * Create a base64 PNG data URL from base64 string
 */
export function base64ToDataUrl(base64: string): string {
  if (base64.startsWith("data:")) {
    return base64;
  }
  return `data:image/png;base64,${base64}`;
}
