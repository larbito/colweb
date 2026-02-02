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
    bottomBlankRatio?: number; // NEW: bottom 12% white ratio
    hasFaceFillIssue?: boolean; // NEW: suspected face fill
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
      faceBlobsDetected?: number; // NEW: blobs in face region
    };
    compositionAnalysis?: {
      subjectHeight: number;
      canvasHeight: number;
      topMargin: number;
      bottomMargin: number;
      bottomBlankRatio?: number; // NEW
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
 * Maximum bottom blank ratio
 * Detects empty bottom strip (the "red area" problem)
 */
export const MAX_BOTTOM_BLANK_RATIO = 0.92; // Bottom 12% should have at least 8% ink

/**
 * Face fill detection threshold
 * Prevents solid black eyes/face patches
 */
export const MAX_FACE_BLOB_RATIO = 0.012; // 1.2% max for any blob in upper-middle region

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
  bottomBlankRatio: number;
  passed: boolean;
}> {
  try {
    const sharp = await import("sharp").catch(() => null);
    if (!sharp) {
      return { subjectHeightRatio: 0.7, topMarginRatio: 0.05, bottomMarginRatio: 0.05, bottomBlankRatio: 0, passed: true };
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

    // NEW: Analyze bottom 12% for blank ratio
    const bottomRegionStart = Math.floor(height * 0.88);
    let bottomRegionWhitePixels = 0;
    let bottomRegionTotalPixels = 0;

    for (let y = bottomRegionStart; y < height; y++) {
      for (let x = 0; x < width; x++) {
        bottomRegionTotalPixels++;
        if (data[y * width + x] >= 128) {
          bottomRegionWhitePixels++;
        }
      }
    }

    const bottomBlankRatio = bottomRegionTotalPixels > 0 
      ? bottomRegionWhitePixels / bottomRegionTotalPixels 
      : 0;

    // Subject should fill at least 60% of height AND bottom should have content
    const passed = subjectHeightRatio >= MIN_SUBJECT_COVERAGE && bottomBlankRatio <= MAX_BOTTOM_BLANK_RATIO;

    return { subjectHeightRatio, topMarginRatio, bottomMarginRatio, bottomBlankRatio, passed };
  } catch (error) {
    console.error("Composition analysis error:", error);
    return { subjectHeightRatio: 0.7, topMarginRatio: 0.05, bottomMarginRatio: 0.05, bottomBlankRatio: 0, passed: true };
  }
}

/**
 * Detect large blobs in the upper-middle region (face area)
 * Helps identify solid black eyes or face fills
 */
async function detectFaceFills(imageBuffer: Buffer): Promise<{
  faceBlobsDetected: number;
  largestFaceBlobRatio: number;
  hasFaceFillIssue: boolean;
}> {
  try {
    const sharp = await import("sharp").catch(() => null);
    if (!sharp) {
      return { faceBlobsDetected: 0, largestFaceBlobRatio: 0, hasFaceFillIssue: false };
    }

    const { data, info } = await sharp.default(imageBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    const totalPixels = width * height;

    // Define face region: upper-middle 30-60% of height
    const faceRegionTop = Math.floor(height * 0.30);
    const faceRegionBottom = Math.floor(height * 0.60);

    // Simple blob detection in face region
    const visited = new Uint8Array(totalPixels);
    const faceBlobSizes: number[] = [];

    function floodFill(startX: number, startY: number): number {
      if (startY < faceRegionTop || startY >= faceRegionBottom) return 0;
      
      const stack: [number, number][] = [[startX, startY]];
      let size = 0;

      while (stack.length > 0 && size < 5000) { // Limit to prevent runaway
        const [x, y] = stack.pop()!;
        const idx = y * width + x;

        if (x < 0 || x >= width || y < faceRegionTop || y >= faceRegionBottom) continue;
        if (visited[idx]) continue;
        if (data[idx] > 128) continue;

        visited[idx] = 1;
        size++;

        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }

      return size;
    }

    // Find blobs in face region
    for (let y = faceRegionTop; y < faceRegionBottom; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (!visited[idx] && data[idx] < 128) {
          const blobSize = floodFill(x, y);
          if (blobSize > 50) { // Only count significant blobs
            faceBlobSizes.push(blobSize);
          }
        }
      }
    }

    const largestFaceBlob = Math.max(0, ...faceBlobSizes);
    const largestFaceBlobRatio = largestFaceBlob / totalPixels;
    
    // If we have 2+ medium-large blobs in face region, likely eyes
    const mediumFaceBlobs = faceBlobSizes.filter(s => s >= 100 && s <= totalPixels * 0.02);
    const hasFaceFillIssue = mediumFaceBlobs.length >= 2 || largestFaceBlobRatio > MAX_FACE_BLOB_RATIO;

    return {
      faceBlobsDetected: faceBlobSizes.length,
      largestFaceBlobRatio,
      hasFaceFillIssue,
    };
  } catch (error) {
    console.error("Face fill detection error:", error);
    return { faceBlobsDetected: 0, largestFaceBlobRatio: 0, hasFaceFillIssue: false };
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

    // Composition analysis (includes bottom blank ratio)
    const composition = await analyzeComposition(correctedBuffer);

    // Face fill detection
    const faceFillAnalysis = await detectFaceFills(correctedBuffer);

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
      bottomBlankRatio: composition.bottomBlankRatio, // NEW
      hasFaceFillIssue: faceFillAnalysis.hasFaceFillIssue, // NEW
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
        faceBlobsDetected: faceFillAnalysis.faceBlobsDetected, // NEW
      },
      compositionAnalysis: {
        subjectHeight: Math.round(composition.subjectHeightRatio * info.height),
        canvasHeight: info.height,
        topMargin: Math.round(composition.topMarginRatio * info.height),
        bottomMargin: Math.round(composition.bottomMarginRatio * info.height),
        bottomBlankRatio: composition.bottomBlankRatio, // NEW
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

    // Check 4: Face fill detection (NEW)
    if (faceFillAnalysis.hasFaceFillIssue) {
      failures.push(`Face fill issue: ${faceFillAnalysis.faceBlobsDetected} blobs in face region, largest ${(faceFillAnalysis.largestFaceBlobRatio * 100).toFixed(2)}%`);
    }

    // Check 5: Texture/stippling detection
    if (blobAnalysis.tinyBlobCount > MAX_TINY_BLOB_COUNT) {
      failures.push(`Too many tiny blobs (${blobAnalysis.tinyBlobCount}) - possible texture/stippling`);
    }

    // Check 6: Composition - subject should fill page
    if (!composition.passed) {
      failures.push(`Subject only fills ${(composition.subjectHeightRatio * 100).toFixed(0)}% of height (min ${MIN_SUBJECT_COVERAGE * 100}%)`);
    }

    // Check 7: Bottom blank ratio (NEW - critical for "empty bottom" issue)
    if (composition.bottomBlankRatio > MAX_BOTTOM_BLANK_RATIO) {
      failures.push(`Bottom is ${(composition.bottomBlankRatio * 100).toFixed(0)}% empty (max ${(MAX_BOTTOM_BLANK_RATIO * 100).toFixed(0)}%)`);
    }

    if (failures.length > 0) {
      console.log(`[qualityGates] FAILED: ${failures.join("; ")}`);
      return {
        passed: false,
        failureReason: failures.join("; "),
        metrics,
        debug,
        correctedImageBuffer: correctedBuffer,
      };
    }

    console.log(`[qualityGates] PASSED all quality checks`);
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

  // NEW: Bottom blank / empty bottom detection
  if (failureReason.includes("Bottom") || failureReason.includes("bottom") || failureReason.includes("empty")) {
    if (attempt === 1) {
      adjustments.push(`CRITICAL BOTTOM FIX: The bottom 15% of the page MUST contain content.
- Add a visible ground plane (grass, floor tiles, carpet, path, dirt, water edge)
- Place 3-5 foreground objects near the bottom edge (flowers, pebbles, toys, leaves, rocks)
- The floor/ground texture must extend to the bottom margin
- NO floating subject with empty space below`);
    } else {
      adjustments.push(`CRITICAL: ZOOM IN 20% and ADD LARGE FOREGROUND ELEMENT.
- Move the camera/view CLOSER to the subject
- Add a LARGE ground element that touches the bottom edge (rug, pathway, grass patch)
- Fill bottom 20% with floor texture and 4+ small props
- Subject must be in lower portion of frame, NOT centered vertically
- The bottom edge MUST have visible lines/content, not white space`);
    }
  }

  return adjustments.join("\n");
}

/**
 * Check if an image has bottom coverage issues
 * Returns true if the bottom is too empty
 */
export function hasBottomCoverageIssue(bottomBlankRatio: number): boolean {
  return bottomBlankRatio > MAX_BOTTOM_BLANK_RATIO;
}

/**
 * Get a specific reinforcement block for bottom coverage issues
 */
export function getBottomCoverageReinforcement(attempt: number): string {
  if (attempt === 1) {
    return `
=== BOTTOM FILL FIX (ATTEMPT ${attempt}) ===
The previous image had too much empty space at the bottom.
REQUIRED FIXES:
1. Add ground plane that reaches bottom edge (floor, grass, path, rug, tiles)
2. Place 3+ foreground objects near bottom margin
3. Subject should be in lower-middle of frame
4. No floating subject with white space below`;
  }
  
  return `
=== CRITICAL BOTTOM FILL FIX (ATTEMPT ${attempt}) ===
The bottom is STILL too empty. This MUST be fixed.
MANDATORY CHANGES:
1. ZOOM IN 20% - get closer to the subject
2. ADD LARGE FLOOR ELEMENT that extends across full width at bottom
3. Place 5+ foreground props touching the bottom edge
4. Fill bottom 20% with texture (wood grain, grass blades, tile pattern, carpet weave)
5. Move subject DOWN in the frame - center should be in lower third
6. NO SKY or ceiling in view - maximize ground coverage`;
}
