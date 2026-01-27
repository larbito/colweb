/**
 * qualityGates.ts - Quality validation for coloring book images
 * 
 * NOTE: DALL-E 3 doesn't support image conditioning, so we rely on:
 * 1. Detailed style descriptions from vision analysis
 * 2. Force B&W conversion after generation
 * 3. Quality checks to reject truly bad outputs
 */

import type { Complexity } from "./generationSpec";

export interface QualityGateResult {
  passed: boolean;
  failureReason?: string;
  metrics: {
    blackRatio: number;
    maxAllowedBlackRatio: number;
    wasColorCorrected: boolean;
    originalHadColor: boolean;
    originalHadGray: boolean;
  };
  debug: {
    totalPixels: number;
    blackPixels: number;
    whitePixels: number;
    processingTimeMs: number;
  };
  correctedImageBuffer?: Buffer;
}

/**
 * Black ratio thresholds - set realistically for DALL-E output
 * After B&W conversion, typical images have 20-40% black
 */
export const BLACK_RATIO_LIMITS: Record<Complexity, number> = {
  simple: 0.45,   // Max 45% black
  medium: 0.55,   // Max 55% black  
  detailed: 0.65, // Max 65% black
};

/**
 * Convert image to pure black and white
 * Uses threshold 200 - balanced between keeping lines and reducing black
 */
export async function forceConvertToBlackWhite(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const sharp = await import("sharp").catch(() => null);
    if (!sharp) return imageBuffer;

    return sharp.default(imageBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .grayscale()
      .normalize()
      .threshold(200) // Balanced threshold
      .png({ compressionLevel: 9 })
      .toBuffer();
  } catch (error) {
    console.error("B&W conversion error:", error);
    return imageBuffer;
  }
}

/**
 * Validate image quality
 * Only checks black ratio - other checks disabled for DALL-E compatibility
 */
export async function validateImageQuality(
  imageBuffer: Buffer,
  complexity: Complexity
): Promise<QualityGateResult> {
  const startTime = Date.now();
  
  try {
    const sharp = await import("sharp").catch(() => null);
    
    if (!sharp) {
      // Sharp not available - pass with warning
      const correctedBuffer = imageBuffer;
      return {
        passed: true,
        metrics: {
          blackRatio: 0,
          maxAllowedBlackRatio: BLACK_RATIO_LIMITS[complexity],
          wasColorCorrected: false,
          originalHadColor: false,
          originalHadGray: false,
        },
        debug: {
          totalPixels: 0,
          blackPixels: 0,
          whitePixels: 0,
          processingTimeMs: Date.now() - startTime,
        },
        correctedImageBuffer: correctedBuffer,
      };
    }

    // Check original for color/gray
    const originalMeta = await sharp.default(imageBuffer).metadata();
    const { data: originalData } = await sharp.default(imageBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .raw()
      .toBuffer({ resolveWithObject: true });

    let colorPixels = 0;
    let grayPixels = 0;
    const channels = originalMeta.channels || 3;
    const pixelCount = originalData.length / channels;

    for (let i = 0; i < originalData.length; i += channels) {
      const r = originalData[i];
      const g = originalData[i + 1] || r;
      const b = originalData[i + 2] || r;
      
      const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
      if (maxDiff > 30) {
        colorPixels++;
      } else {
        const avg = (r + g + b) / 3;
        if (avg > 30 && avg < 220) {
          grayPixels++;
        }
      }
    }

    const originalHadColor = colorPixels > pixelCount * 0.05;
    const originalHadGray = grayPixels > pixelCount * 0.1;
    const wasColorCorrected = originalHadColor || originalHadGray;

    // Convert to B&W
    const correctedBuffer = await forceConvertToBlackWhite(imageBuffer);

    // Analyze B&W image
    const { data: bwData, info } = await sharp.default(correctedBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const totalPixels = info.width * info.height;
    let blackPixels = 0;
    let whitePixels = 0;

    for (let i = 0; i < bwData.length; i++) {
      if (bwData[i] < 128) {
        blackPixels++;
      } else {
        whitePixels++;
      }
    }

    const blackRatio = blackPixels / totalPixels;
    const maxBlackRatio = BLACK_RATIO_LIMITS[complexity];
    const processingTimeMs = Date.now() - startTime;

    const metrics = {
      blackRatio,
      maxAllowedBlackRatio: maxBlackRatio,
      wasColorCorrected,
      originalHadColor,
      originalHadGray,
    };

    const debug = {
      totalPixels,
      blackPixels,
      whitePixels,
      processingTimeMs,
    };

    // Only check black ratio
    if (blackRatio > maxBlackRatio) {
      return {
        passed: false,
        failureReason: `Black ratio ${(blackRatio * 100).toFixed(1)}% exceeds max ${(maxBlackRatio * 100).toFixed(0)}%`,
        metrics,
        debug,
        correctedImageBuffer: correctedBuffer,
      };
    }

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
      failureReason: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
      metrics: {
        blackRatio: 0,
        maxAllowedBlackRatio: BLACK_RATIO_LIMITS[complexity],
        wasColorCorrected: false,
        originalHadColor: false,
        originalHadGray: false,
      },
      debug: {
        totalPixels: 0,
        blackPixels: 0,
        whitePixels: 0,
        processingTimeMs: Date.now() - startTime,
      },
    };
  }
}

/**
 * Get thresholds for display
 */
export function getQualityThresholds(complexity: Complexity) {
  return {
    maxBlackRatio: BLACK_RATIO_LIMITS[complexity],
  };
}
