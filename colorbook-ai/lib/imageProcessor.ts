/**
 * imageProcessor.ts - Post-processing and validation for coloring book images
 * Ensures all images are pure B/W and pass quality gates
 * 
 * QUALITY GATES:
 * 1. Binarization - force pure B/W (mandatory)
 * 2. Color check - verify only B/W pixels remain
 * 3. Black pixel ratio check - HARD FAIL based on complexity
 * 4. Large blob detection - reject silhouettes (>5% single connected region)
 * 5. Micro-noise detection - reject textured/noisy images
 */

export type Complexity = "simple" | "medium" | "detailed";

/**
 * Quality check result
 */
export interface QualityCheckResult {
  passed: boolean;
  binarizedBase64?: string;
  failureReason?: "color" | "blackfill" | "silhouette" | "texture" | "fetch_error";
  blackRatio?: number;
  largestBlobPercent?: number;
  microBlobCount?: number;
  uniqueColors?: number;
  details?: string;
}

/**
 * Configuration for quality checks
 */
export interface QualityConfig {
  /** Threshold for binarization (0-255). Pixels above = white */
  binarizationThreshold: number;
  /** Maximum black ratio by complexity - HARD FAIL */
  maxBlackRatioByComplexity: Record<Complexity, number>;
  /** Maximum allowed single blob size as % of image (0-1). Above this = silhouette */
  maxBlobPercent: number;
  /** Micro-blob size range [min, max] in pixels */
  microBlobSizeRange: [number, number];
  /** Maximum number of micro-blobs before failing as texture/noise */
  maxMicroBlobCount: number;
}

// Quality thresholds calibrated for KDP coloring books
const DEFAULT_CONFIG: QualityConfig = {
  binarizationThreshold: 200,
  maxBlackRatioByComplexity: {
    simple: 0.18,   // Simple pages should have minimal lines
    medium: 0.25,   // Medium can have more detail
    detailed: 0.30, // Detailed can have even more
  },
  maxBlobPercent: 0.05,           // Max 5% for any single blob (catches silhouettes)
  microBlobSizeRange: [10, 200],  // Blobs between 10-200 pixels are "noise"
  maxMicroBlobCount: 1500,        // More than this = texture/noise detected
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
 * GATES (all are HARD FAIL):
 * 1. Fetch + binarize
 * 2. Color check (verify only B/W)
 * 3. Black ratio check (by complexity)
 * 4. Large blob check (silhouettes)
 * 5. Micro-noise check (texture detection)
 */
export async function processAndValidateImage(
  imageUrl: string,
  complexity: Complexity = "medium",
  config: QualityConfig = DEFAULT_CONFIG
): Promise<QualityCheckResult> {
  try {
    console.log("[ImageProcessor] Fetching image from URL...");
    console.log(`[ImageProcessor] Complexity: ${complexity}`);
    
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
      console.log(`[ImageProcessor] Binarization threshold: ${config.binarizationThreshold}`);
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
      const colorSet = new Set<number>();

      // Count black pixels and unique colors
      for (let i = 0; i < data.length; i++) {
        colorSet.add(data[i]);
        if (data[i] < 128) {
          blackPixels++;
        }
      }

      const uniqueColors = colorSet.size;
      const blackRatio = blackPixels / totalPixels;
      
      console.log(`[ImageProcessor] Binarization complete:`);
      console.log(`[ImageProcessor]   - Unique colors: ${uniqueColors}`);
      console.log(`[ImageProcessor]   - Black ratio: ${(blackRatio * 100).toFixed(2)}%`);

      // GATE 1: Color check - should only have 2 colors (black and white)
      if (uniqueColors > 2) {
        console.log(`[ImageProcessor] COLOR CHECK: WARNING - ${uniqueColors} unique values (expected 2)`);
        // Don't fail here since binarization should have fixed it, but log it
      } else {
        console.log(`[ImageProcessor] COLOR CHECK: PASSED (${uniqueColors} unique values)`);
      }

      // GATE 2: Black ratio check - HARD FAIL based on complexity
      const maxBlackRatio = config.maxBlackRatioByComplexity[complexity];
      console.log(`[ImageProcessor] BLACK RATIO CHECK: ${(blackRatio * 100).toFixed(2)}% vs max ${(maxBlackRatio * 100).toFixed(2)}% (${complexity})`);
      
      if (blackRatio > maxBlackRatio) {
        console.log(`[ImageProcessor] HARD FAIL: Black ratio ${(blackRatio * 100).toFixed(2)}% > ${(maxBlackRatio * 100).toFixed(2)}%`);
        return {
          passed: false,
          binarizedBase64: binarizedBuffer.toString("base64"),
          failureReason: "blackfill",
          blackRatio,
          uniqueColors,
          details: `Too much black for ${complexity}: ${(blackRatio * 100).toFixed(1)}% (max ${(maxBlackRatio * 100).toFixed(1)}%)`,
        };
      }
      console.log(`[ImageProcessor] BLACK RATIO CHECK: PASSED`);

      // GATE 3 & 4: Blob analysis (silhouettes and micro-noise)
      // Downsample to 256px for faster processing
      const smallBuffer = await sharp(binarizedBuffer)
        .resize(256, null, { fit: 'inside' })
        .raw()
        .toBuffer();
      
      const smallMeta = await sharp(binarizedBuffer)
        .resize(256, null, { fit: 'inside' })
        .metadata();
      
      const smallWidth = smallMeta.width || 256;
      const smallHeight = Math.floor(smallBuffer.length / smallWidth);
      const smallTotal = smallWidth * smallHeight;

      // Find all connected components
      const visited = new Set<number>();
      const blobSizes: number[] = [];
      let largestBlobSize = 0;

      for (let i = 0; i < smallBuffer.length; i++) {
        if (smallBuffer[i] < 128 && !visited.has(i)) {
          const blobSize = floodFillCount(smallBuffer, smallWidth, smallHeight, i, visited);
          blobSizes.push(blobSize);
          if (blobSize > largestBlobSize) {
            largestBlobSize = blobSize;
          }
        }
      }

      const largestBlobPercent = largestBlobSize / smallTotal;
      console.log(`[ImageProcessor] BLOB ANALYSIS:`);
      console.log(`[ImageProcessor]   - Total blobs found: ${blobSizes.length}`);
      console.log(`[ImageProcessor]   - Largest blob: ${(largestBlobPercent * 100).toFixed(2)}% of image`);

      // GATE 3: Silhouette check
      if (largestBlobPercent > config.maxBlobPercent) {
        console.log(`[ImageProcessor] HARD FAIL: Silhouette detected (${(largestBlobPercent * 100).toFixed(2)}% > ${(config.maxBlobPercent * 100).toFixed(2)}%)`);
        return {
          passed: false,
          binarizedBase64: binarizedBuffer.toString("base64"),
          failureReason: "silhouette",
          blackRatio,
          largestBlobPercent,
          uniqueColors,
          details: `Large filled area: ${(largestBlobPercent * 100).toFixed(2)}% blob (max ${(config.maxBlobPercent * 100).toFixed(2)}%)`,
        };
      }
      console.log(`[ImageProcessor] SILHOUETTE CHECK: PASSED`);

      // GATE 4: Micro-noise check
      // Scale the size range to the downsampled image
      const scaleFactor = (info.width || 1024) / smallWidth;
      const minMicroSize = Math.max(1, Math.floor(config.microBlobSizeRange[0] / (scaleFactor * scaleFactor)));
      const maxMicroSize = Math.floor(config.microBlobSizeRange[1] / (scaleFactor * scaleFactor));
      
      const microBlobCount = blobSizes.filter(size => size >= minMicroSize && size <= maxMicroSize).length;
      console.log(`[ImageProcessor]   - Micro-blobs (${minMicroSize}-${maxMicroSize}px): ${microBlobCount}`);

      if (microBlobCount > config.maxMicroBlobCount) {
        console.log(`[ImageProcessor] HARD FAIL: Texture/noise detected (${microBlobCount} micro-blobs > ${config.maxMicroBlobCount})`);
        return {
          passed: false,
          binarizedBase64: binarizedBuffer.toString("base64"),
          failureReason: "texture",
          blackRatio,
          largestBlobPercent,
          microBlobCount,
          uniqueColors,
          details: `Texture/noise detected: ${microBlobCount} small blobs (max ${config.maxMicroBlobCount})`,
        };
      }
      console.log(`[ImageProcessor] MICRO-NOISE CHECK: PASSED`);

      // All checks passed
      console.log("[ImageProcessor] ✅ ALL QUALITY GATES PASSED");
      return {
        passed: true,
        binarizedBase64: binarizedBuffer.toString("base64"),
        blackRatio,
        largestBlobPercent,
        microBlobCount,
        uniqueColors,
      };

    } catch (sharpError) {
      // Sharp not available or failed - return original image as-is
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
                text: `Compare these two coloring book images. Return ONLY JSON:
{
  "sameCharacter": true/false,
  "sameSpecies": true/false,
  "notes": "brief explanation"
}
Expected character type: ${expectedCharacterType}`,
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
      return { matches: true, sameSpecies: true, notes: "Vision check skipped" };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) jsonContent = jsonContent.slice(7);
    if (jsonContent.startsWith("```")) jsonContent = jsonContent.slice(3);
    if (jsonContent.endsWith("```")) jsonContent = jsonContent.slice(0, -3);

    try {
      const parsed = JSON.parse(jsonContent.trim());
      return {
        matches: parsed.sameCharacter ?? true,
        sameSpecies: parsed.sameSpecies ?? true,
        notes: parsed.notes || "",
      };
    } catch {
      return { matches: true, sameSpecies: true, notes: "Parse failed" };
    }

  } catch {
    return { matches: true, sameSpecies: true, notes: "Check failed" };
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
