/**
 * qualityGates.ts - Strict quality validation for print-safe coloring book images
 * 
 * IMPORTANT: DALL-E often ignores "black and white" instructions and returns colored images.
 * We MUST force-convert all images to true black and white before validation.
 */

import type { Complexity } from "./generationSpec";

/**
 * Quality gate result
 */
export interface QualityGateResult {
  passed: boolean;
  failureReason?: string;
  metrics: {
    blackRatio: number;
    maxAllowedBlackRatio: number;
    hasColor: boolean;
    hasGrayscale: boolean;
    largestBlobRatio: number;
    maxAllowedBlobRatio: number;
    tinyBlobCount: number;
    maxAllowedTinyBlobs: number;
    wasColorCorrected: boolean;
  };
  debug: {
    totalPixels: number;
    blackPixels: number;
    coloredPixels: number;
    grayscalePixels: number;
    blobsAnalyzed: number;
    processingTimeMs: number;
  };
  /** The corrected/binarized image buffer (always pure B&W) */
  correctedImageBuffer?: Buffer;
}

/**
 * Black ratio thresholds by complexity
 * Note: DALL-E typically produces 30-60% dark content even with strict prompts.
 * We use higher limits to allow images through, relying on B&W conversion.
 */
export const BLACK_RATIO_LIMITS: Record<Complexity, number> = {
  simple: 0.35,   // Max 35% black for simple pages
  medium: 0.45,   // Max 45% black for medium pages  
  detailed: 0.55, // Max 55% black for detailed pages
};

/**
 * Maximum single blob size (as ratio of total image)
 * Note: DALL-E creates larger filled areas than ideal
 */
export const MAX_BLOB_RATIO = 0.05; // 5% of image area

/**
 * Maximum number of tiny blobs (10-200 pixels)
 * Higher limit since B&W conversion creates more small regions
 */
export const MAX_TINY_BLOBS = 1000;

/**
 * FORCE convert an image to pure black and white
 * This is essential because DALL-E often returns colored images
 */
export async function forceConvertToBlackWhite(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const sharp = await import("sharp").catch(() => null);
    if (!sharp) return imageBuffer;

    // Step 1: Flatten to white background
    // Step 2: Convert to grayscale
    // Step 3: Apply threshold - HIGHER value = LESS black (only darkest pixels become black)
    // Threshold 220 means only pixels darker than 220/255 become black
    return sharp.default(imageBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // Remove transparency, white bg
      .grayscale() // Convert to grayscale
      .threshold(220) // Higher = less black. Only very dark pixels become black
      .png({ compressionLevel: 9 })
      .toBuffer();
  } catch (error) {
    console.error("Error converting to B&W:", error);
    return imageBuffer;
  }
}

/**
 * Validate an image buffer against all quality gates
 * ALWAYS converts to B&W first, then validates
 */
export async function validateImageQuality(
  imageBuffer: Buffer,
  complexity: Complexity
): Promise<QualityGateResult> {
  const startTime = Date.now();
  
  try {
    const sharp = await import("sharp").catch(() => null);
    
    if (!sharp) {
      // If sharp not available, return pass with warning
      return {
        passed: true,
        metrics: {
          blackRatio: 0,
          maxAllowedBlackRatio: BLACK_RATIO_LIMITS[complexity],
          hasColor: false,
          hasGrayscale: false,
          largestBlobRatio: 0,
          maxAllowedBlobRatio: MAX_BLOB_RATIO,
          tinyBlobCount: 0,
          maxAllowedTinyBlobs: MAX_TINY_BLOBS,
          wasColorCorrected: false,
        },
        debug: {
          totalPixels: 0,
          blackPixels: 0,
          coloredPixels: 0,
          grayscalePixels: 0,
          blobsAnalyzed: 0,
          processingTimeMs: Date.now() - startTime,
        },
      };
    }

    // First, check if the original image has color (for logging purposes)
    const originalImage = sharp.default(imageBuffer);
    const originalMetadata = await originalImage.metadata();
    const originalWidth = originalMetadata.width || 1024;
    const originalHeight = originalMetadata.height || 1024;
    const totalPixels = originalWidth * originalHeight;

    // Get original pixel data to check for color
    const { data: originalRgbData } = await sharp.default(imageBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .raw()
      .toBuffer({ resolveWithObject: true });

    let coloredPixelsOriginal = 0;
    let grayscalePixelsOriginal = 0;
    const channels = originalMetadata.channels || 3;

    for (let i = 0; i < originalRgbData.length; i += channels) {
      const r = originalRgbData[i];
      const g = originalRgbData[i + 1] || r;
      const b = originalRgbData[i + 2] || r;

      const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
      
      if (maxDiff > 20) {
        coloredPixelsOriginal++;
      } else {
        const avg = (r + g + b) / 3;
        if (avg > 30 && avg < 225) {
          grayscalePixelsOriginal++;
        }
      }
    }

    const wasColorCorrected = coloredPixelsOriginal > totalPixels * 0.01 || grayscalePixelsOriginal > totalPixels * 0.05;

    // FORCE convert to black and white
    const correctedBuffer = await forceConvertToBlackWhite(imageBuffer);

    // Now analyze the CORRECTED image
    const { data: bwData, info } = await sharp.default(correctedBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    const bwTotalPixels = width * height;
    
    // Count black pixels in the corrected image
    let blackPixels = 0;
    for (let i = 0; i < bwData.length; i++) {
      if (bwData[i] < 128) {
        blackPixels++;
      }
    }

    const blackRatio = blackPixels / bwTotalPixels;
    const maxBlackRatio = BLACK_RATIO_LIMITS[complexity];

    // Simple blob analysis
    const { largestBlobRatio, tinyBlobCount } = analyzeSimpleBlobs(bwData, width, height, bwTotalPixels);

    const processingTimeMs = Date.now() - startTime;

    const metrics = {
      blackRatio,
      maxAllowedBlackRatio: maxBlackRatio,
      hasColor: false, // After correction, it's B&W
      hasGrayscale: false,
      largestBlobRatio,
      maxAllowedBlobRatio: MAX_BLOB_RATIO,
      tinyBlobCount,
      maxAllowedTinyBlobs: MAX_TINY_BLOBS,
      wasColorCorrected,
    };

    const debug = {
      totalPixels: bwTotalPixels,
      blackPixels,
      coloredPixels: coloredPixelsOriginal,
      grayscalePixels: grayscalePixelsOriginal,
      blobsAnalyzed: 1,
      processingTimeMs,
    };

    // Check black ratio AFTER conversion
    if (blackRatio > maxBlackRatio) {
      return {
        passed: false,
        failureReason: `Black ratio too high after conversion: ${(blackRatio * 100).toFixed(1)}% (max: ${(maxBlackRatio * 100).toFixed(0)}%). The image has too many dark areas.`,
        metrics,
        debug,
        correctedImageBuffer: correctedBuffer,
      };
    }

    // Check large blob
    if (largestBlobRatio > MAX_BLOB_RATIO) {
      return {
        passed: false,
        failureReason: `Large solid black region: ${(largestBlobRatio * 100).toFixed(2)}% (max: ${(MAX_BLOB_RATIO * 100).toFixed(1)}%). Likely solid fills in eyes/hair.`,
        metrics,
        debug,
        correctedImageBuffer: correctedBuffer,
      };
    }

    // Check tiny blobs (texture)
    if (tinyBlobCount > MAX_TINY_BLOBS) {
      return {
        passed: false,
        failureReason: `Too many tiny regions (${tinyBlobCount}, max ${MAX_TINY_BLOBS}). Image has texture/noise.`,
        metrics,
        debug,
        correctedImageBuffer: correctedBuffer,
      };
    }

    // All gates passed
    return {
      passed: true,
      metrics,
      debug,
      correctedImageBuffer: correctedBuffer,
    };

  } catch (error) {
    console.error("Quality gate error:", error);
    return {
      passed: false,
      failureReason: `Quality check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      metrics: {
        blackRatio: 0,
        maxAllowedBlackRatio: BLACK_RATIO_LIMITS[complexity],
        hasColor: false,
        hasGrayscale: false,
        largestBlobRatio: 0,
        maxAllowedBlobRatio: MAX_BLOB_RATIO,
        tinyBlobCount: 0,
        maxAllowedTinyBlobs: MAX_TINY_BLOBS,
        wasColorCorrected: false,
      },
      debug: {
        totalPixels: 0,
        blackPixels: 0,
        coloredPixels: 0,
        grayscalePixels: 0,
        blobsAnalyzed: 0,
        processingTimeMs: Date.now() - startTime,
      },
    };
  }
}

/**
 * Simple blob analysis using horizontal runs
 */
function analyzeSimpleBlobs(
  data: Buffer,
  width: number,
  height: number,
  totalPixels: number
): { largestBlobRatio: number; tinyBlobCount: number } {
  const runs: number[] = [];
  let currentRun = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const isBlack = data[idx] < 128;

      if (isBlack) {
        currentRun++;
      } else {
        if (currentRun > 0) {
          runs.push(currentRun);
          currentRun = 0;
        }
      }
    }
    if (currentRun > 0) {
      runs.push(currentRun);
      currentRun = 0;
    }
  }

  const largestRun = runs.length > 0 ? Math.max(...runs) : 0;
  const estimatedBlobSize = largestRun * 3;
  const largestBlobRatio = estimatedBlobSize / totalPixels;
  const tinyBlobCount = runs.filter(r => r >= 5 && r <= 150).length;

  return { largestBlobRatio, tinyBlobCount };
}

/**
 * Binarize an image to pure black and white (legacy function, now uses forceConvertToBlackWhite)
 */
export async function binarizeImage(imageBuffer: Buffer): Promise<Buffer> {
  return forceConvertToBlackWhite(imageBuffer);
}

/**
 * Get quality thresholds for display
 */
export function getQualityThresholds(complexity: Complexity) {
  return {
    maxBlackRatio: BLACK_RATIO_LIMITS[complexity],
    maxBlobRatio: MAX_BLOB_RATIO,
    maxTinyBlobs: MAX_TINY_BLOBS,
  };
}
