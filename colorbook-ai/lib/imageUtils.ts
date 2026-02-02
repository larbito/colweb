/**
 * imageUtils.ts
 * 
 * Image processing utilities for coloring book generation.
 * - US Letter "cover" crop (fill without padding)
 * - Empty band detection
 * - White background compositing
 */

import sharp from "sharp";

// US Letter aspect ratio (8.5/11)
export const US_LETTER_RATIO = 8.5 / 11; // 0.7727

// US Letter dimensions at various DPIs
export const US_LETTER_SIZES = {
  // 300 DPI (print quality)
  print: { width: 2550, height: 3300 },
  // 150 DPI (preview)
  preview: { width: 1275, height: 1650 },
  // 72 DPI (web)
  web: { width: 612, height: 792 },
};

/**
 * Crop an image to US Letter aspect ratio using "cover" fit.
 * This ensures NO empty padding - the image fills the entire frame.
 * 
 * @param imageBase64 - Source image as base64
 * @param targetSize - Target size preset (print, preview, web)
 * @returns Cropped image as base64
 */
export async function cropToUSLetter(
  imageBase64: string,
  targetSize: "print" | "preview" | "web" = "print"
): Promise<string> {
  const imageBuffer = Buffer.from(imageBase64, "base64");
  const target = US_LETTER_SIZES[targetSize];
  
  // Use sharp's "cover" fit to fill the frame (may crop some edges)
  const croppedBuffer = await sharp(imageBuffer)
    .resize(target.width, target.height, {
      fit: "cover",
      position: "centre", // Center crop
    })
    .png()
    .toBuffer();
  
  return croppedBuffer.toString("base64");
}

/**
 * Composite image onto white background (for transparent PNGs).
 * Ensures quote pages have white background, not transparent.
 * 
 * @param imageBase64 - Source image as base64
 * @returns Image with white background as base64
 */
export async function compositeOnWhite(imageBase64: string): Promise<string> {
  const imageBuffer = Buffer.from(imageBase64, "base64");
  
  // Get image dimensions
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1536;
  
  // Create white background
  const whiteBackground = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .png()
    .toBuffer();
  
  // Composite image on white background
  const compositedBuffer = await sharp(whiteBackground)
    .composite([{ input: imageBuffer }])
    .png()
    .toBuffer();
  
  return compositedBuffer.toString("base64");
}

/**
 * Empty band detector - checks if top/bottom regions are too empty.
 * Returns validation result indicating if image has empty bands.
 * 
 * @param imageBase64 - Image to analyze
 * @param samplePercent - How much of top/bottom to sample (default 8%)
 * @param emptyThreshold - Ratio above which region is "empty" (default 0.92)
 * @returns Validation result with details
 */
export async function detectEmptyBands(
  imageBase64: string,
  samplePercent: number = 0.08,
  emptyThreshold: number = 0.92
): Promise<{
  valid: boolean;
  hasEmptyTop: boolean;
  hasEmptyBottom: boolean;
  topWhiteRatio: number;
  bottomWhiteRatio: number;
  retryAddendum?: string;
}> {
  const imageBuffer = Buffer.from(imageBase64, "base64");
  
  // Get image as raw pixels
  const { data, info } = await sharp(imageBuffer)
    .greyscale() // Convert to grayscale for analysis
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const width = info.width;
  const height = info.height;
  const sampleHeight = Math.floor(height * samplePercent);
  
  // Count white pixels in top region
  let topWhiteCount = 0;
  let topTotalPixels = width * sampleHeight;
  
  for (let y = 0; y < sampleHeight; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = data[y * width + x];
      // Consider pixel "white" if > 250 (near white)
      if (pixel > 250) {
        topWhiteCount++;
      }
    }
  }
  
  // Count white pixels in bottom region
  let bottomWhiteCount = 0;
  let bottomTotalPixels = width * sampleHeight;
  const bottomStartY = height - sampleHeight;
  
  for (let y = bottomStartY; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = data[y * width + x];
      if (pixel > 250) {
        bottomWhiteCount++;
      }
    }
  }
  
  const topWhiteRatio = topWhiteCount / topTotalPixels;
  const bottomWhiteRatio = bottomWhiteCount / bottomTotalPixels;
  
  const hasEmptyTop = topWhiteRatio > emptyThreshold;
  const hasEmptyBottom = bottomWhiteRatio > emptyThreshold;
  const valid = !hasEmptyTop && !hasEmptyBottom;
  
  // Build retry addendum if there are empty bands
  let retryAddendum: string | undefined;
  if (!valid) {
    const parts: string[] = ["\n=== CRITICAL: FIX EMPTY BANDS ==="];
    if (hasEmptyTop) {
      parts.push("- TOP IS EMPTY: Add visible line-art at the top (sky/clouds/ceiling/wall detail/tree branches)");
    }
    if (hasEmptyBottom) {
      parts.push("- BOTTOM IS EMPTY: Add ground/floor texture and foreground props reaching the bottom edge");
    }
    parts.push("The top and bottom 8% of the page MUST contain visible line-art elements.");
    retryAddendum = parts.join("\n");
  }
  
  return {
    valid,
    hasEmptyTop,
    hasEmptyBottom,
    topWhiteRatio,
    bottomWhiteRatio,
    retryAddendum,
  };
}

/**
 * Process image for final US Letter export.
 * - Composite on white (if transparent)
 * - Crop to US Letter ratio
 * - Validate no empty bands
 * 
 * @param imageBase64 - Source image
 * @param options - Processing options
 * @returns Processed image and validation result
 */
export async function processForUSLetter(
  imageBase64: string,
  options: {
    compositeWhite?: boolean;
    validateBands?: boolean;
    targetSize?: "print" | "preview" | "web";
  } = {}
): Promise<{
  imageBase64: string;
  validation: {
    valid: boolean;
    hasEmptyTop: boolean;
    hasEmptyBottom: boolean;
    topWhiteRatio: number;
    bottomWhiteRatio: number;
  };
}> {
  const {
    compositeWhite = true,
    validateBands = true,
    targetSize = "print",
  } = options;
  
  let processedImage = imageBase64;
  
  // Step 1: Composite on white if requested
  if (compositeWhite) {
    processedImage = await compositeOnWhite(processedImage);
  }
  
  // Step 2: Crop to US Letter
  processedImage = await cropToUSLetter(processedImage, targetSize);
  
  // Step 3: Validate bands
  let validation = {
    valid: true,
    hasEmptyTop: false,
    hasEmptyBottom: false,
    topWhiteRatio: 0,
    bottomWhiteRatio: 0,
  };
  
  if (validateBands) {
    const bandResult = await detectEmptyBands(processedImage);
    validation = {
      valid: bandResult.valid,
      hasEmptyTop: bandResult.hasEmptyTop,
      hasEmptyBottom: bandResult.hasEmptyBottom,
      topWhiteRatio: bandResult.topWhiteRatio,
      bottomWhiteRatio: bandResult.bottomWhiteRatio,
    };
  }
  
  return {
    imageBase64: processedImage,
    validation,
  };
}

/**
 * Get the retry prompt addendum for empty band issues.
 */
export function getEmptyBandRetryAddendum(hasEmptyTop: boolean, hasEmptyBottom: boolean): string {
  const parts: string[] = [];
  
  if (hasEmptyTop) {
    parts.push("CRITICAL: Add visible elements at the TOP edge (clouds, ceiling, sky, wall detail, tree branches).");
  }
  if (hasEmptyBottom) {
    parts.push("CRITICAL: Add ground/floor texture and foreground props that REACH the BOTTOM edge.");
  }
  
  if (parts.length > 0) {
    parts.unshift("=== FIX EMPTY BANDS (MANDATORY) ===");
    parts.push("The image must have visible line-art content at BOTH the top and bottom edges.");
  }
  
  return parts.join("\n");
}

