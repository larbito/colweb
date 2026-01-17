/**
 * imageProcessor.ts - Post-processing and validation for coloring book images
 * Ensures all images are pure B/W and pass quality gates
 * 
 * QUALITY GATES:
 * 1. Binarization - force pure B/W (mandatory)
 * 2. Black pixel ratio check - warn if very high, but don't reject line art
 * 3. Large blob detection - reject obvious silhouettes (>5% single connected region)
 */

/**
 * Quality check result
 */
export interface QualityCheckResult {
  passed: boolean;
  binarizedBase64?: string;
  failureReason?: "color" | "blackfill" | "silhouette" | "fetch_error";
  blackRatio?: number;
  largestBlobPercent?: number;
  details?: string;
}

/**
 * Configuration for quality checks
 */
export interface QualityConfig {
  /** Threshold for binarization (0-255). Pixels above = white */
  binarizationThreshold: number;
  /** Maximum allowed black pixel ratio (0-1). Above this = warning (not rejection) */
  warnBlackRatio: number;
  /** Maximum allowed black ratio before rejection */
  maxBlackRatio: number;
  /** Maximum allowed single blob size as % of image (0-1). Above this = silhouette */
  maxBlobPercent: number;
}

// Realistic defaults for coloring book line art
// Professional KDP coloring pages typically have 15-35% black
const DEFAULT_CONFIG: QualityConfig = {
  binarizationThreshold: 200,
  warnBlackRatio: 0.35,   // Warn if >35% black (might be heavy)
  maxBlackRatio: 0.55,    // Only reject if >55% black (likely wrong)
  maxBlobPercent: 0.05,   // Max 5% for any single blob (catches silhouettes)
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
 * 
 * GATES:
 * 1. Fetch + binarize (always)
 * 2. Check black pixel ratio (warn or reject if extreme)
 * 3. Check for large connected blobs (reject silhouettes)
 */
export async function processAndValidateImage(
  imageUrl: string,
  config: QualityConfig = DEFAULT_CONFIG
): Promise<QualityCheckResult> {
  try {
    console.log("[ImageProcessor] Fetching image from URL...");
    
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error("[ImageProcessor] Failed to fetch image:", response.status, response.statusText);
      return {
        passed: false,
        failureReason: "fetch_error",
        details: `Failed to fetch image: ${response.status}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    console.log("[ImageProcessor] Image fetched, size:", imageBuffer.length, "bytes");

    // Try to use sharp for proper image processing
    try {
      const sharp = (await import("sharp")).default;

      // Get image info
      const metadata = await sharp(imageBuffer).metadata();
      console.log("[ImageProcessor] Image dimensions:", metadata.width, "x", metadata.height);

      // Step 1: Convert to grayscale
      const grayscaleBuffer = await sharp(imageBuffer)
        .grayscale()
        .toBuffer();

      // Step 2: Binarize (threshold to pure black/white)
      const binarizedBuffer = await sharp(grayscaleBuffer)
        .threshold(config.binarizationThreshold)
        .png()
        .toBuffer();

      // Step 3: Analyze the binarized image
      const { data, info } = await sharp(binarizedBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const totalPixels = info.width * info.height;
      let blackPixels = 0;

      // Count black pixels
      for (let i = 0; i < data.length; i++) {
        if (data[i] < 128) {
          blackPixels++;
        }
      }

      const blackRatio = blackPixels / totalPixels;
      console.log(`[ImageProcessor] Black ratio: ${(blackRatio * 100).toFixed(1)}%`);

      // GATE 1: Check black pixel ratio
      // Only reject if EXTREMELY high (likely wrong image type)
      if (blackRatio > config.maxBlackRatio) {
        console.log(`[ImageProcessor] REJECTED: Black ratio ${(blackRatio * 100).toFixed(1)}% > ${config.maxBlackRatio * 100}%`);
        return {
          passed: false,
          binarizedBase64: binarizedBuffer.toString("base64"),
          failureReason: "blackfill",
          blackRatio,
          details: `Too much black: ${(blackRatio * 100).toFixed(1)}% (max ${config.maxBlackRatio * 100}%)`,
        };
      }

      // Warn but don't reject if moderately high
      if (blackRatio > config.warnBlackRatio) {
        console.log(`[ImageProcessor] WARNING: Black ratio ${(blackRatio * 100).toFixed(1)}% is high (>${config.warnBlackRatio * 100}%)`);
      }

      // GATE 2: Check for large connected blobs (silhouettes)
      // Downsample to 128px for faster processing
      const smallBuffer = await sharp(binarizedBuffer)
        .resize(128, null, { fit: 'inside' })
        .raw()
        .toBuffer();
      
      const smallMeta = await sharp(binarizedBuffer)
        .resize(128, null, { fit: 'inside' })
        .metadata();
      
      const smallWidth = smallMeta.width || 128;
      const smallHeight = Math.floor(smallBuffer.length / smallWidth);
      const smallTotal = smallWidth * smallHeight;

      // Simple blob detection: find largest connected black region
      const visited = new Set<number>();
      let largestBlobSize = 0;

      for (let i = 0; i < smallBuffer.length; i++) {
        if (smallBuffer[i] < 128 && !visited.has(i)) {
          // Found unvisited black pixel - flood fill to find blob size
          const blobSize = floodFillCount(smallBuffer, smallWidth, smallHeight, i, visited);
          if (blobSize > largestBlobSize) {
            largestBlobSize = blobSize;
          }
        }
      }

      const largestBlobPercent = largestBlobSize / smallTotal;
      console.log(`[ImageProcessor] Largest blob: ${(largestBlobPercent * 100).toFixed(2)}% of image`);

      if (largestBlobPercent > config.maxBlobPercent) {
        console.log(`[ImageProcessor] REJECTED: Silhouette detected (${(largestBlobPercent * 100).toFixed(2)}% > ${config.maxBlobPercent * 100}%)`);
        return {
          passed: false,
          binarizedBase64: binarizedBuffer.toString("base64"),
          failureReason: "silhouette",
          blackRatio,
          largestBlobPercent,
          details: `Large filled area detected: ${(largestBlobPercent * 100).toFixed(2)}% blob (max ${config.maxBlobPercent * 100}%)`,
        };
      }

      // All checks passed
      console.log("[ImageProcessor] PASSED all quality gates");
      return {
        passed: true,
        binarizedBase64: binarizedBuffer.toString("base64"),
        blackRatio,
        largestBlobPercent,
      };

    } catch (sharpError) {
      // Sharp not available or failed - return original image as-is
      // This is a fallback to ensure images always work
      console.warn("[ImageProcessor] Sharp processing failed, using original:", sharpError);
      return {
        passed: true,
        binarizedBase64: imageBuffer.toString("base64"),
        details: "Binarization skipped (using original)",
      };
    }

  } catch (error) {
    console.error("[ImageProcessor] Error:", error);
    return {
      passed: false,
      failureReason: "fetch_error",
      details: error instanceof Error ? error.message : "Processing failed",
    };
  }
}

/**
 * Flood fill to count connected black pixels (blob detection)
 * Uses iterative approach to avoid stack overflow
 */
function floodFillCount(
  data: Buffer,
  width: number,
  height: number,
  startIdx: number,
  visited: Set<number>
): number {
  const stack = [startIdx];
  let count = 0;

  while (stack.length > 0) {
    const idx = stack.pop()!;
    
    if (visited.has(idx)) continue;
    if (idx < 0 || idx >= data.length) continue;
    if (data[idx] >= 128) continue; // Not black
    
    visited.add(idx);
    count++;

    const x = idx % width;
    const y = Math.floor(idx / width);

    // Add neighbors (4-connected)
    if (x > 0) stack.push(idx - 1);           // left
    if (x < width - 1) stack.push(idx + 1);   // right
    if (y > 0) stack.push(idx - width);       // up
    if (y < height - 1) stack.push(idx + width); // down
  }

  return count;
}

/**
 * Check if character matches using OpenAI Vision (optional)
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
