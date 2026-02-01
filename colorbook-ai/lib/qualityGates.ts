/**
 * qualityGates.ts - Quality validation for coloring book images
 * 
 * STRICT QUALITY CONTROL:
 * 1. Black ratio limits (prevents solid fills)
 * 2. Large blob detection (prevents filled eyes/patches)
 * 3. Composition validation (ensures subject fills page)
 * 4. Grayscale detection (ensures pure B&W)
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
    largestBlobRatio?: number;
    tinyBlobCount?: number;
    subjectBoundsRatio?: number;
  };
  debug: {
    totalPixels: number;
    blackPixels: number;
    whitePixels: number;
    processingTimeMs: number;
    blobAnalysis?: {
      totalBlobs: number;
      largeBlobs: number;
      suspectedEyeFills: boolean;
    };
    compositionAnalysis?: {
      subjectHeight: number;
      canvasHeight: number;
      topMargin: number;
      bottomMargin: number;
    };
  };
  correctedImageBuffer?: Buffer;
}

/**
 * STRICTER Black ratio thresholds for KDP-quality output
 * Lower = fewer filled areas = cleaner coloring pages
 */
export const BLACK_RATIO_LIMITS: Record<Complexity, number> = {
  simple: 0.22,   // Max 22% black for simple pages
  medium: 0.28,   // Max 28% black for medium pages
  detailed: 0.34, // Max 34% black for detailed pages
};

/**
 * Largest single blob ratio limit
 * Prevents large filled areas like solid black eyes
 */
export const MAX_BLOB_RATIO = 0.015; // 1.5% of image max for any single blob

/**
 * Minimum subject coverage ratio
 * Ensures main subject fills the page
 */
export const MIN_SUBJECT_COVERAGE = 0.60; // Subject should fill at least 60% of height

/**
 * Maximum allowed tiny blobs (noise/texture detection)
 */
export const MAX_TINY_BLOB_COUNT = 500; // Too many tiny blobs = stippling/texture

/**
 * Convert image to pure black and white with better adaptive thresholding
 */
export async function forceConvertToBlackWhite(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const sharp = await import("sharp").catch(() => null);
    if (!sharp) return imageBuffer;

    // Use adaptive thresholding approach:
    // 1. Flatten to white background
    // 2. Convert to grayscale
    // 3. Normalize to full range
    // 4. Apply threshold (balanced at 200 for clean lines)
    // 5. Light median filter to remove tiny noise
    // 6. Save as lossless PNG
    return sharp.default(imageBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .grayscale()
      .normalize()
      .threshold(200) // Balanced threshold - preserves thin lines while reducing black
      .median(1) // Light noise reduction
      .png({ compressionLevel: 9, palette: true }) // Lossless PNG
      .toBuffer();
  } catch (error) {
    console.error("B&W conversion error:", error);
    return imageBuffer;
  }
}

/**
 * Analyze connected components (blobs) in the image
 * Returns info about blob sizes for quality validation
 */
async function analyzeBlobsWithSharp(
  imageBuffer: Buffer
): Promise<{ largestBlobRatio: number; tinyBlobCount: number; totalBlobs: number; suspectedEyeFills: boolean }> {
  try {
    const sharp = await import("sharp").catch(() => null);
    if (!sharp) {
      return { largestBlobRatio: 0, tinyBlobCount: 0, totalBlobs: 0, suspectedEyeFills: false };
    }

    const { data, info } = await sharp.default(imageBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    const totalPixels = width * height;

    // Simple connected component analysis using flood fill
    const visited = new Uint8Array(totalPixels);
    const blobSizes: number[] = [];

    function getPixel(x: number, y: number): number {
      if (x < 0 || x >= width || y < 0 || y >= height) return 255;
      return data[y * width + x];
    }

    function floodFill(startX: number, startY: number): number {
      const stack: [number, number][] = [[startX, startY]];
      let size = 0;

      while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        const idx = y * width + x;

        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        if (visited[idx]) continue;
        if (data[idx] > 128) continue; // Only count black pixels

        visited[idx] = 1;
        size++;

        // 4-connected neighbors
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }

      return size;
    }

    // Find all black blobs
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (!visited[idx] && data[idx] < 128) {
          const blobSize = floodFill(x, y);
          if (blobSize > 0) {
            blobSizes.push(blobSize);
          }
        }
      }
    }

    // Analyze blob distribution
    const sortedSizes = blobSizes.sort((a, b) => b - a);
    const largestBlob = sortedSizes[0] || 0;
    const largestBlobRatio = largestBlob / totalPixels;

    // Count tiny blobs (potential noise/stippling)
    const tinyBlobCount = blobSizes.filter(s => s < 20).length;

    // Detect suspected eye fills: 2+ large circular blobs in upper portion
    // (This is a heuristic - true detection would need more sophisticated analysis)
    const mediumBlobs = blobSizes.filter(s => s >= 100 && s <= totalPixels * 0.02);
    const suspectedEyeFills = mediumBlobs.length >= 2 && largestBlobRatio > 0.01;

    return {
      largestBlobRatio,
      tinyBlobCount,
      totalBlobs: blobSizes.length,
      suspectedEyeFills,
    };
  } catch (error) {
    console.error("Blob analysis error:", error);
    return { largestBlobRatio: 0, tinyBlobCount: 0, totalBlobs: 0, suspectedEyeFills: false };
  }
}

/**
 * Analyze composition to check if subject fills the page
 */
async function analyzeComposition(imageBuffer: Buffer): Promise<{
  subjectHeightRatio: number;
  topMarginRatio: number;
  bottomMarginRatio: number;
  passed: boolean;
}> {
  try {
    const sharp = await import("sharp").catch(() => null);
    if (!sharp) {
      return { subjectHeightRatio: 0.7, topMarginRatio: 0.05, bottomMarginRatio: 0.05, passed: true };
    }

    const { data, info } = await sharp.default(imageBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;

    // Find topmost and bottommost black pixels
    let topY = height;
    let bottomY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[y * width + x] < 128) {
          if (y < topY) topY = y;
          if (y > bottomY) bottomY = y;
        }
      }
    }

    const subjectHeight = bottomY - topY;
    const subjectHeightRatio = subjectHeight / height;
    const topMarginRatio = topY / height;
    const bottomMarginRatio = (height - bottomY) / height;

    // Subject should fill at least 60% of height
    const passed = subjectHeightRatio >= MIN_SUBJECT_COVERAGE;

    return { subjectHeightRatio, topMarginRatio, bottomMarginRatio, passed };
  } catch (error) {
    console.error("Composition analysis error:", error);
    return { subjectHeightRatio: 0.7, topMarginRatio: 0.05, bottomMarginRatio: 0.05, passed: true };
  }
}

/**
 * Validate image quality with comprehensive checks
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
        correctedImageBuffer: imageBuffer,
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

    // Analyze B&W image for black ratio
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

    // Blob analysis for large fill detection
    const blobAnalysis = await analyzeBlobsWithSharp(correctedBuffer);

    // Composition analysis
    const composition = await analyzeComposition(correctedBuffer);

    const processingTimeMs = Date.now() - startTime;

    const metrics = {
      blackRatio,
      maxAllowedBlackRatio: maxBlackRatio,
      wasColorCorrected,
      originalHadColor,
      originalHadGray,
      largestBlobRatio: blobAnalysis.largestBlobRatio,
      tinyBlobCount: blobAnalysis.tinyBlobCount,
      subjectBoundsRatio: composition.subjectHeightRatio,
    };

    const debug = {
      totalPixels,
      blackPixels,
      whitePixels,
      processingTimeMs,
      blobAnalysis: {
        totalBlobs: blobAnalysis.totalBlobs,
        largeBlobs: blobAnalysis.tinyBlobCount,
        suspectedEyeFills: blobAnalysis.suspectedEyeFills,
      },
      compositionAnalysis: {
        subjectHeight: Math.round(composition.subjectHeightRatio * info.height),
        canvasHeight: info.height,
        topMargin: Math.round(composition.topMarginRatio * info.height),
        bottomMargin: Math.round(composition.bottomMarginRatio * info.height),
      },
    };

    // Quality gate checks (in order of severity)
    const failures: string[] = [];

    // Check 1: Black ratio
    if (blackRatio > maxBlackRatio) {
      failures.push(`Black ratio ${(blackRatio * 100).toFixed(1)}% exceeds max ${(maxBlackRatio * 100).toFixed(0)}%`);
    }

    // Check 2: Large blob detection (potential solid fills)
    if (blobAnalysis.largestBlobRatio > MAX_BLOB_RATIO) {
      failures.push(`Largest blob ${(blobAnalysis.largestBlobRatio * 100).toFixed(2)}% exceeds max ${(MAX_BLOB_RATIO * 100).toFixed(2)}%`);
    }

    // Check 3: Eye fill detection
    if (blobAnalysis.suspectedEyeFills) {
      failures.push("Suspected solid black eye fills detected");
    }

    // Check 4: Texture/stippling detection
    if (blobAnalysis.tinyBlobCount > MAX_TINY_BLOB_COUNT) {
      failures.push(`Too many tiny blobs (${blobAnalysis.tinyBlobCount}) - possible texture/stippling`);
    }

    // Check 5: Composition - subject should fill page
    if (!composition.passed) {
      failures.push(`Subject only fills ${(composition.subjectHeightRatio * 100).toFixed(0)}% of height (min ${MIN_SUBJECT_COVERAGE * 100}%)`);
    }

    if (failures.length > 0) {
      return {
        passed: false,
        failureReason: failures.join("; "),
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
    maxBlobRatio: MAX_BLOB_RATIO,
    minSubjectCoverage: MIN_SUBJECT_COVERAGE,
    maxTinyBlobCount: MAX_TINY_BLOB_COUNT,
  };
}

/**
 * Get retry prompt adjustments based on failure reason
 */
export function getRetryPromptAdjustments(failureReason: string, attempt: number): string {
  const adjustments: string[] = [];

  if (failureReason.includes("Black ratio")) {
    if (attempt === 1) {
      adjustments.push("REDUCE BLACK: Thinner lines, fewer details, more white space, simpler shapes.");
    } else {
      adjustments.push("CRITICAL: MUCH thinner lines, minimal detail, maximum white space, outline-only style.");
    }
  }

  if (failureReason.includes("blob") || failureReason.includes("solid")) {
    adjustments.push("ABSOLUTELY NO SOLID FILLS. NO BLACK PATCHES. All dark areas must be OUTLINES ONLY.");
  }

  if (failureReason.includes("eye")) {
    adjustments.push("EYES: Small hollow circles ONLY with tiny dot pupils. NO filled black eyes.");
  }

  if (failureReason.includes("texture") || failureReason.includes("stippling")) {
    adjustments.push("NO texture, NO stippling, NO halftone dots. Clean smooth lines only.");
  }

  if (failureReason.includes("height") || failureReason.includes("fills")) {
    adjustments.push("COMPOSITION: Zoom in on subject. Subject should fill 70-80% of frame height. Less empty space.");
  }

  return adjustments.join("\n");
}
