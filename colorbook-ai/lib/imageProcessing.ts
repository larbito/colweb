/**
 * imageProcessing.ts
 * 
 * Server-side image processing for coloring book pages.
 * Handles reframing to US Letter format and quality validation.
 * 
 * Target: US Letter 8.5x11 @ 300 DPI = 2550x3300 pixels
 * 
 * PROCESSING STRATEGY:
 * 1. Generate at model-supported size closest to US Letter ratio (0.772)
 * 2. Post-process to 2550x3300 using content-aware crop+scale
 * 3. NEVER stretch; always preserve aspect ratio
 * 4. Ensure artwork fills page with minimal margins (no empty bands)
 */

import sharp from "sharp";

// ============================================
// CONSTANTS
// ============================================

/** US Letter dimensions at 300 DPI */
export const LETTER_WIDTH = 2550;
export const LETTER_HEIGHT = 3300;
export const LETTER_DPI = 300;
export const LETTER_RATIO = LETTER_WIDTH / LETTER_HEIGHT; // 0.7727

/** Landscape US Letter */
export const LETTER_LANDSCAPE_WIDTH = 3300;
export const LETTER_LANDSCAPE_HEIGHT = 2550;

/** Processing margins - minimal to maximize usable area */
export const DEFAULT_MARGIN_PERCENT = 2; // 2% margin (reduced from 3%)
export const MIN_MARGIN_PERCENT = 1.5;
export const MAX_MARGIN_PERCENT = 4;

/** Validation thresholds */
export const WHITE_THRESHOLD = 245; // Pixels brighter than this are "white"
export const NEAR_WHITE_THRESHOLD = 240; // Near-white for border detection
export const BOTTOM_EMPTY_THRESHOLD = 0.85; // 85% white = "empty" (stricter)
export const BOTTOM_CHECK_PERCENT = 15; // Check bottom 15% of image
export const TOP_CHECK_PERCENT = 10; // Check top 10% for empty bands

/** Quality thresholds by complexity */
export const COMPLEXITY_BLACK_RATIOS: Record<string, number> = {
  simple: 0.18,
  medium: 0.25,
  detailed: 0.30,
  ultra: 0.35,
};

/** 
 * Luminance threshold for binarization.
 * Pixels with luminance < this value become black ink.
 * Pixels with luminance >= this value become pure white.
 * Tuned for coloring pages - captures fine lines while removing gray backgrounds.
 */
export const BINARIZATION_THRESHOLD = 235;

// ============================================
// TYPES
// ============================================

export interface BoundingBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ReframeResult {
  imageBase64: string;
  width: number;
  height: number;
  boundingBox: BoundingBox;
  marginUsed: number;
}

export interface ValidationResult {
  isValid: boolean;
  bottomEmptyPercent: number;
  hasEmptyBottom: boolean;
  artworkCoverage: number;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert base64 to Buffer, stripping data URL prefix if present
 */
export function base64ToBuffer(base64: string): Buffer {
  let cleanBase64 = base64;
  if (base64.includes(",")) {
    cleanBase64 = base64.split(",")[1];
  }
  return Buffer.from(cleanBase64, "base64");
}

/**
 * Convert Buffer to base64 string (without data URL prefix)
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

// ============================================
// FORCE PURE BLACK/WHITE (MANDATORY POSTPROCESS)
// ============================================

/**
 * MANDATORY postprocessing for all coloring pages.
 * Converts ANY image to pure black line art on pure white background.
 * 
 * CRITICAL: This function handles INVERTED images (white lines on black background).
 * If the image is mostly dark (>50% black), it will be inverted before processing.
 * 
 * This GUARANTEES the background is always white, even if the model
 * returns a dark or colored canvas.
 * 
 * Algorithm:
 * 1. Convert to grayscale
 * 2. Detect if image is inverted (mostly dark)
 * 3. For each pixel:
 *    - Normal: If luminance < threshold: black (ink), else: white (background)
 *    - Inverted: If luminance > (255-threshold): black (ink was white), else: white
 * 4. Output as PNG (lossless)
 * 
 * @param imageBase64 - Input image as base64 string
 * @param threshold - Luminance threshold (default 235). Lower = more pixels become ink.
 * @returns Pure black/white image as base64 string (ALWAYS white background)
 */
export async function forcePureBlackWhite(
  imageBase64: string,
  threshold: number = BINARIZATION_THRESHOLD
): Promise<string> {
  const imageBuffer = base64ToBuffer(imageBase64);
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  
  if (width === 0 || height === 0) {
    throw new Error("Invalid image dimensions");
  }
  
  // Get raw pixel data in grayscale
  const { data: grayData } = await image
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  // ============================================
  // DETECT IF IMAGE IS INVERTED (mostly dark)
  // ============================================
  let darkPixels = 0;
  const totalPixels = grayData.length;
  const darkThreshold = 128; // Pixels below this are "dark"
  
  for (let i = 0; i < grayData.length; i++) {
    if (grayData[i] < darkThreshold) {
      darkPixels++;
    }
  }
  
  const darkRatio = darkPixels / totalPixels;
  
  // Detect if image is inverted (mostly dark)
  // Special case: if nearly 100% dark, the model produced a completely black image
  // In this case, we can't recover any content - just make it white
  const isCompletelyBlack = darkRatio > 0.98;
  const isInverted = darkRatio > 0.5 && !isCompletelyBlack;
  
  console.log(`[forcePureBlackWhite] Image analysis: darkRatio=${(darkRatio * 100).toFixed(1)}%, isInverted=${isInverted}, isCompletelyBlack=${isCompletelyBlack}`);
  
  // If image is completely black (no content), this is a FAILED generation
  // Throw an error so the caller knows to retry
  if (isCompletelyBlack) {
    console.error(`[forcePureBlackWhite] FAILED: Image is completely black (${(darkRatio * 100).toFixed(1)}% dark) - no content to recover`);
    throw new Error(`IMAGE_NO_CONTENT: Generated image is completely black (${(darkRatio * 100).toFixed(1)}% dark). Model failed to generate any content.`);
  }
  
  // Create output buffer (RGB - 3 channels)
  const outputData = Buffer.alloc(width * height * 3);
  
  // For inverted images: bright pixels (lines) become black, dark pixels (background) become white
  // For normal images: dark pixels (lines) become black, bright pixels (background) become white
  const invertedThreshold = 255 - threshold; // ~20 for detecting lines on dark background
  
  for (let i = 0; i < grayData.length; i++) {
    const luminance = grayData[i];
    const outputIdx = i * 3;
    
    let isInk: boolean;
    
    if (isInverted) {
      // Inverted image: light pixels are ink (white lines on black background)
      // Lines on black background have high luminance
      isInk = luminance > invertedThreshold;
    } else {
      // Normal image: dark pixels are ink (black lines on white background)
      isInk = luminance < threshold;
    }
    
    if (isInk) {
      // Ink pixel -> pure black
      outputData[outputIdx] = 0;     // R
      outputData[outputIdx + 1] = 0; // G
      outputData[outputIdx + 2] = 0; // B
    } else {
      // Background pixel -> pure white
      outputData[outputIdx] = 255;     // R
      outputData[outputIdx + 1] = 255; // G
      outputData[outputIdx + 2] = 255; // B
    }
  }
  
  // Create output image
  const outputBuffer = await sharp(outputData, {
    raw: {
      width,
      height,
      channels: 3,
    },
  })
    .png({ compressionLevel: 6 })
    .toBuffer();
  
  console.log(`[forcePureBlackWhite] Output created (${width}x${height}), was inverted: ${isInverted}`);
  
  return bufferToBase64(outputBuffer);
}

/**
 * Check if an image has a white background.
 * Returns true if the border region is predominantly white.
 */
export async function hasWhiteBackground(
  imageBase64: string,
  minWhiteRatio: number = 0.95
): Promise<boolean> {
  const imageBuffer = base64ToBuffer(imageBase64);
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  
  if (width === 0 || height === 0) {
    return false;
  }
  
  // Get grayscale data
  const { data } = await image
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  // Check border region (2% from each edge)
  const borderSize = Math.max(1, Math.round(Math.min(width, height) * 0.02));
  let whitePixels = 0;
  let totalBorderPixels = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Check if pixel is in border region
      const inBorder = (
        x < borderSize || 
        x >= width - borderSize || 
        y < borderSize || 
        y >= height - borderSize
      );
      
      if (inBorder) {
        totalBorderPixels++;
        if (data[y * width + x] >= WHITE_THRESHOLD) {
          whitePixels++;
        }
      }
    }
  }
  
  const whiteRatio = whitePixels / totalBorderPixels;
  return whiteRatio >= minWhiteRatio;
}

// ============================================
// BOUNDING BOX DETECTION
// ============================================

/**
 * Detect the bounding box of non-white artwork in an image.
 * Uses a threshold to find where the actual drawing is.
 */
export async function detectArtworkBoundingBox(
  imageBuffer: Buffer,
  threshold: number = WHITE_THRESHOLD
): Promise<{ bbox: BoundingBox; width: number; height: number }> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // Get raw pixel data (grayscale for faster processing)
  const { data } = await image
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  // Scan for non-white pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelValue = data[y * width + x];
      if (pixelValue < threshold) {
        // Found a non-white pixel
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Handle edge case: all white image
  if (minX > maxX || minY > maxY) {
    return {
      bbox: { left: 0, top: 0, right: width, bottom: height, width, height },
      width,
      height,
    };
  }

  return {
    bbox: {
      left: minX,
      top: minY,
      right: maxX,
      bottom: maxY,
      width: maxX - minX,
      height: maxY - minY,
    },
    width,
    height,
  };
}

// ============================================
// REFRAME TO LETTER
// ============================================

/**
 * Reframe an image to US Letter format (2550x3300).
 * 
 * Process:
 * 1. Detect artwork bounding box
 * 2. Add padding (2-4%)
 * 3. Crop to padded bbox
 * 4. Scale to fit Letter with margin
 * 5. Center on white background
 * 
 * @param imageBase64 - Source image as base64
 * @param marginPercent - Target margin percentage (default 3%)
 * @returns Reframed image as base64
 */
export async function reframeToLetter(
  imageBase64: string,
  marginPercent: number = DEFAULT_MARGIN_PERCENT
): Promise<ReframeResult> {
  const imageBuffer = base64ToBuffer(imageBase64);
  
  // 1. Detect artwork bounding box
  const { bbox, width: origWidth, height: origHeight } = await detectArtworkBoundingBox(imageBuffer);
  
  // 2. Add padding to bounding box (2-4% of original size)
  const paddingPercent = 0.03; // 3% padding
  const paddingX = Math.round(origWidth * paddingPercent);
  const paddingY = Math.round(origHeight * paddingPercent);
  
  const expandedBbox = {
    left: Math.max(0, bbox.left - paddingX),
    top: Math.max(0, bbox.top - paddingY),
    right: Math.min(origWidth, bbox.right + paddingX),
    bottom: Math.min(origHeight, bbox.bottom + paddingY),
    width: 0,
    height: 0,
  };
  expandedBbox.width = expandedBbox.right - expandedBbox.left;
  expandedBbox.height = expandedBbox.bottom - expandedBbox.top;
  
  // 3. Crop to expanded bounding box
  const cropped = await sharp(imageBuffer)
    .extract({
      left: expandedBbox.left,
      top: expandedBbox.top,
      width: expandedBbox.width,
      height: expandedBbox.height,
    })
    .toBuffer();
  
  // 4. Calculate target size with margin
  const marginPixels = Math.round(Math.min(LETTER_WIDTH, LETTER_HEIGHT) * (marginPercent / 100));
  const targetWidth = LETTER_WIDTH - (marginPixels * 2);
  const targetHeight = LETTER_HEIGHT - (marginPixels * 2);
  
  // Calculate scale to fit while preserving aspect ratio
  const scaleX = targetWidth / expandedBbox.width;
  const scaleY = targetHeight / expandedBbox.height;
  const scale = Math.min(scaleX, scaleY);
  
  const scaledWidth = Math.round(expandedBbox.width * scale);
  const scaledHeight = Math.round(expandedBbox.height * scale);
  
  // 5. Resize the cropped artwork
  const resized = await sharp(cropped)
    .resize(scaledWidth, scaledHeight, {
      fit: "inside",
      withoutEnlargement: false,
    })
    .toBuffer();
  
  // 6. Create white background and composite
  const offsetX = Math.round((LETTER_WIDTH - scaledWidth) / 2);
  const offsetY = Math.round((LETTER_HEIGHT - scaledHeight) / 2);
  
  const finalBuffer = await sharp({
    create: {
      width: LETTER_WIDTH,
      height: LETTER_HEIGHT,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      {
        input: resized,
        left: offsetX,
        top: offsetY,
      },
    ])
    .png()
    .toBuffer();
  
  return {
    imageBase64: bufferToBase64(finalBuffer),
    width: LETTER_WIDTH,
    height: LETTER_HEIGHT,
    boundingBox: expandedBbox,
    marginUsed: marginPercent,
  };
}

// ============================================
// BOTTOM EMPTINESS VALIDATION
// ============================================

/**
 * Check if the bottom portion of an image is mostly empty (white).
 * Used to validate that the page fills properly.
 */
export async function validateBottomFill(
  imageBase64: string,
  bottomPercent: number = BOTTOM_CHECK_PERCENT,
  emptyThreshold: number = BOTTOM_EMPTY_THRESHOLD
): Promise<ValidationResult> {
  const imageBuffer = base64ToBuffer(imageBase64);
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  
  // Extract bottom portion
  const bottomHeight = Math.round(height * (bottomPercent / 100));
  const bottomTop = height - bottomHeight;
  
  const { data } = await image
    .extract({
      left: 0,
      top: bottomTop,
      width: width,
      height: bottomHeight,
    })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  // Count white pixels
  let whitePixels = 0;
  const totalPixels = data.length;
  
  for (let i = 0; i < totalPixels; i++) {
    if (data[i] >= WHITE_THRESHOLD) {
      whitePixels++;
    }
  }
  
  const bottomEmptyPercent = whitePixels / totalPixels;
  const hasEmptyBottom = bottomEmptyPercent >= emptyThreshold;
  
  // Calculate overall artwork coverage
  const { bbox } = await detectArtworkBoundingBox(imageBuffer);
  const artworkArea = bbox.width * bbox.height;
  const totalArea = width * height;
  const artworkCoverage = artworkArea / totalArea;
  
  return {
    isValid: !hasEmptyBottom,
    bottomEmptyPercent,
    hasEmptyBottom,
    artworkCoverage,
  };
}

// ============================================
// FULL PROCESSING PIPELINE
// ============================================

export interface ProcessPageOptions {
  marginPercent?: number;
  validateBottom?: boolean;
  retryWithSmallerMargin?: boolean;
}

export interface ProcessPageResult {
  finalLetterBase64: string;
  width: number;
  height: number;
  validation: ValidationResult;
  marginUsed: number;
  wasRetried: boolean;
}

/**
 * Full processing pipeline for a coloring page:
 * 1. Reframe to Letter format
 * 2. Validate bottom fill
 * 3. Optionally retry with smaller margin if bottom is empty
 */
export async function processPageToLetter(
  imageBase64: string,
  options: ProcessPageOptions = {}
): Promise<ProcessPageResult> {
  const {
    marginPercent = DEFAULT_MARGIN_PERCENT,
    validateBottom = true,
    retryWithSmallerMargin = true,
  } = options;
  
  // First attempt
  let result = await reframeToLetter(imageBase64, marginPercent);
  let validation = await validateBottomFill(result.imageBase64);
  let wasRetried = false;
  
  // If bottom is empty and retry is enabled, try with smaller margin
  if (validateBottom && validation.hasEmptyBottom && retryWithSmallerMargin) {
    const smallerMargin = MIN_MARGIN_PERCENT;
    result = await reframeToLetter(imageBase64, smallerMargin);
    validation = await validateBottomFill(result.imageBase64);
    wasRetried = true;
  }
  
  return {
    finalLetterBase64: result.imageBase64,
    width: LETTER_WIDTH,
    height: LETTER_HEIGHT,
    validation,
    marginUsed: result.marginUsed,
    wasRetried,
  };
}

// ============================================
// ENHANCED IMAGE PROCESSING
// ============================================

/**
 * Process an enhanced image to Letter format.
 * Enhanced images are typically larger, so we scale down to Letter.
 */
export async function processEnhancedToLetter(
  enhancedBase64: string,
  options: ProcessPageOptions = {}
): Promise<ProcessPageResult> {
  // Enhanced images may be 2x or 4x the original size
  // We still reframe to detect artwork bounds
  return processPageToLetter(enhancedBase64, options);
}

// ============================================
// COMPREHENSIVE QUALITY VALIDATION
// ============================================

export interface QualityValidationResult {
  isValid: boolean;
  issues: string[];
  blackRatio: number;
  hasEmptyTop: boolean;
  hasEmptyBottom: boolean;
  hasDarkBorder: boolean;
  artworkCoverage: number;
  shouldRetry: boolean;
  retryPromptAddition: string;
}

/**
 * Comprehensive quality validation for coloring pages.
 * Checks for all quality gates before showing as final.
 */
export async function validateColoringPageQuality(
  imageBase64: string,
  complexity: string = "medium"
): Promise<QualityValidationResult> {
  const imageBuffer = base64ToBuffer(imageBase64);
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const issues: string[] = [];
  let shouldRetry = false;
  const retryAdditions: string[] = [];
  
  // Get grayscale data for analysis
  const { data } = await image
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  // 1. Check black ratio
  let blackPixels = 0;
  let darkPixels = 0;
  const totalPixels = width * height;
  
  for (let i = 0; i < data.length; i++) {
    if (data[i] < 50) blackPixels++;
    if (data[i] < 100) darkPixels++;
  }
  
  const blackRatio = blackPixels / totalPixels;
  const maxBlackRatio = COMPLEXITY_BLACK_RATIOS[complexity] || 0.25;
  
  if (blackRatio > maxBlackRatio) {
    issues.push(`Black ratio too high: ${(blackRatio * 100).toFixed(1)}% > ${(maxBlackRatio * 100)}%`);
    shouldRetry = true;
    retryAdditions.push("REDUCE black filled areas. Use only thin outlines, no solid fills.");
  }
  
  // 2. Check for dark border (indicates wrong background)
  const borderSize = Math.round(Math.min(width, height) * 0.02);
  let borderDarkPixels = 0;
  let borderTotalPixels = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < borderSize || x >= width - borderSize || y < borderSize || y >= height - borderSize) {
        borderTotalPixels++;
        if (data[y * width + x] < NEAR_WHITE_THRESHOLD) {
          borderDarkPixels++;
        }
      }
    }
  }
  
  const hasDarkBorder = (borderDarkPixels / borderTotalPixels) > 0.1;
  if (hasDarkBorder) {
    issues.push("Dark border detected - not a clean white background");
    shouldRetry = true;
    retryAdditions.push("PURE WHITE BACKGROUND ONLY. No dark edges, no frames, no borders.");
  }
  
  // 3. Check for empty top band
  const topHeight = Math.round(height * (TOP_CHECK_PERCENT / 100));
  let topWhitePixels = 0;
  
  for (let y = 0; y < topHeight; y++) {
    for (let x = 0; x < width; x++) {
      if (data[y * width + x] >= WHITE_THRESHOLD) {
        topWhitePixels++;
      }
    }
  }
  
  const topWhiteRatio = topWhitePixels / (topHeight * width);
  const hasEmptyTop = topWhiteRatio > 0.90;
  
  if (hasEmptyTop) {
    issues.push("Empty top band detected - artwork should fill page");
    shouldRetry = true;
    retryAdditions.push("Artwork must fill the ENTIRE page from top to bottom. No empty margins.");
  }
  
  // 4. Check for empty bottom band
  const bottomHeight = Math.round(height * (BOTTOM_CHECK_PERCENT / 100));
  const bottomStart = height - bottomHeight;
  let bottomWhitePixels = 0;
  
  for (let y = bottomStart; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[y * width + x] >= WHITE_THRESHOLD) {
        bottomWhitePixels++;
      }
    }
  }
  
  const bottomWhiteRatio = bottomWhitePixels / (bottomHeight * width);
  const hasEmptyBottom = bottomWhiteRatio > BOTTOM_EMPTY_THRESHOLD;
  
  if (hasEmptyBottom) {
    issues.push("Empty bottom band detected - artwork should fill page");
    shouldRetry = true;
    retryAdditions.push("Artwork must extend to the bottom of the page. No empty bottom area.");
  }
  
  // 5. Calculate artwork coverage
  const { bbox } = await detectArtworkBoundingBox(imageBuffer);
  const artworkCoverage = (bbox.width * bbox.height) / totalPixels;
  
  if (artworkCoverage < 0.6) {
    issues.push(`Low artwork coverage: ${(artworkCoverage * 100).toFixed(1)}%`);
    shouldRetry = true;
    retryAdditions.push("Make the artwork LARGER to fill more of the page area.");
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    blackRatio,
    hasEmptyTop,
    hasEmptyBottom,
    hasDarkBorder,
    artworkCoverage,
    shouldRetry,
    retryPromptAddition: retryAdditions.join(" "),
  };
}

// ============================================
// CONTENT-AWARE SMART CROP AND SCALE
// ============================================

export interface SmartCropOptions {
  targetWidth?: number;
  targetHeight?: number;
  minMargin?: number; // Minimum margin in percent (default 1.5%)
  maxMargin?: number; // Maximum margin in percent (default 4%)
  landscape?: boolean;
}

export interface SmartCropResult {
  imageBase64: string;
  width: number;
  height: number;
  cropInfo: {
    originalBbox: BoundingBox;
    expandedBbox: BoundingBox;
    scaleApplied: number;
    marginApplied: number;
  };
}

/**
 * Smart content-aware crop and scale to US Letter.
 * 
 * Process:
 * 1. Detect artwork bounding box (non-white pixels)
 * 2. Expand bbox by small padding (1.5-4%)
 * 3. Calculate optimal scale to fill Letter page
 * 4. Center and composite onto white background
 * 
 * CRITICAL: Never stretch, always preserve aspect ratio
 */
export async function smartCropToLetter(
  imageBase64: string,
  options: SmartCropOptions = {}
): Promise<SmartCropResult> {
  const {
    targetWidth = LETTER_WIDTH,
    targetHeight = LETTER_HEIGHT,
    minMargin = MIN_MARGIN_PERCENT,
    maxMargin = MAX_MARGIN_PERCENT,
    landscape = false,
  } = options;
  
  const finalWidth = landscape ? LETTER_LANDSCAPE_WIDTH : targetWidth;
  const finalHeight = landscape ? LETTER_LANDSCAPE_HEIGHT : targetHeight;
  
  const imageBuffer = base64ToBuffer(imageBase64);
  
  // 1. Detect artwork bounding box
  const { bbox: originalBbox, width: origWidth, height: origHeight } = 
    await detectArtworkBoundingBox(imageBuffer);
  
  // Handle edge case: no artwork detected
  if (originalBbox.width === 0 || originalBbox.height === 0) {
    // Return as-is, scaled to fit
    const scaled = await sharp(imageBuffer)
      .resize(finalWidth, finalHeight, { fit: "contain", background: "#ffffff" })
      .png()
      .toBuffer();
    
    return {
      imageBase64: bufferToBase64(scaled),
      width: finalWidth,
      height: finalHeight,
      cropInfo: {
        originalBbox,
        expandedBbox: originalBbox,
        scaleApplied: 1,
        marginApplied: 0,
      },
    };
  }
  
  // 2. Expand bounding box by padding (use dynamic padding based on artwork size)
  const artworkRatio = (originalBbox.width * originalBbox.height) / (origWidth * origHeight);
  const paddingPercent = artworkRatio > 0.7 ? minMargin / 100 : maxMargin / 100;
  
  const paddingX = Math.round(origWidth * paddingPercent);
  const paddingY = Math.round(origHeight * paddingPercent);
  
  const expandedBbox: BoundingBox = {
    left: Math.max(0, originalBbox.left - paddingX),
    top: Math.max(0, originalBbox.top - paddingY),
    right: Math.min(origWidth, originalBbox.right + paddingX),
    bottom: Math.min(origHeight, originalBbox.bottom + paddingY),
    width: 0,
    height: 0,
  };
  expandedBbox.width = expandedBbox.right - expandedBbox.left;
  expandedBbox.height = expandedBbox.bottom - expandedBbox.top;
  
  // 3. Crop to expanded bounding box
  const cropped = await sharp(imageBuffer)
    .extract({
      left: expandedBbox.left,
      top: expandedBbox.top,
      width: expandedBbox.width,
      height: expandedBbox.height,
    })
    .toBuffer();
  
  // 4. Calculate target usable area (with minimal margin)
  const marginPixels = Math.round(Math.min(finalWidth, finalHeight) * (minMargin / 100));
  const usableWidth = finalWidth - marginPixels * 2;
  const usableHeight = finalHeight - marginPixels * 2;
  
  // 5. Calculate scale to fill usable area (preserve aspect ratio, no stretching)
  const scaleX = usableWidth / expandedBbox.width;
  const scaleY = usableHeight / expandedBbox.height;
  const scale = Math.min(scaleX, scaleY); // Use smaller to fit within bounds
  
  const scaledWidth = Math.round(expandedBbox.width * scale);
  const scaledHeight = Math.round(expandedBbox.height * scale);
  
  // 6. Resize the cropped artwork
  const resized = await sharp(cropped)
    .resize(scaledWidth, scaledHeight, {
      fit: "inside",
      withoutEnlargement: false, // Allow upscaling for small images
      kernel: "lanczos3", // High-quality resampling
    })
    .toBuffer();
  
  // 7. Create white background and center the artwork
  const offsetX = Math.round((finalWidth - scaledWidth) / 2);
  const offsetY = Math.round((finalHeight - scaledHeight) / 2);
  
  const finalBuffer = await sharp({
    create: {
      width: finalWidth,
      height: finalHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      {
        input: resized,
        left: offsetX,
        top: offsetY,
      },
    ])
    .png({ compressionLevel: 6 })
    .toBuffer();
  
  return {
    imageBase64: bufferToBase64(finalBuffer),
    width: finalWidth,
    height: finalHeight,
    cropInfo: {
      originalBbox,
      expandedBbox,
      scaleApplied: scale,
      marginApplied: minMargin,
    },
  };
}

// ============================================
// FULL PRODUCTION PIPELINE
// ============================================

export interface ProductionPipelineOptions {
  complexity?: string;
  landscape?: boolean;
  validateQuality?: boolean;
  autoRetryOnFail?: boolean;
}

export interface ProductionPipelineResult {
  finalImageBase64: string;
  width: number;
  height: number;
  quality: QualityValidationResult;
  cropInfo?: SmartCropResult["cropInfo"];
  processingNotes: string[];
}

/**
 * Full production pipeline for coloring pages:
 * 1. Validate input image quality
 * 2. Smart crop and scale to US Letter (2550x3300)
 * 3. Re-validate output quality
 * 4. Return production-ready PNG
 */
export async function processToProductionPNG(
  imageBase64: string,
  options: ProductionPipelineOptions = {}
): Promise<ProductionPipelineResult> {
  const {
    complexity = "medium",
    landscape = false,
    validateQuality = true,
  } = options;
  
  const notes: string[] = [];
  
  // 1. Smart crop and scale to US Letter
  const cropResult = await smartCropToLetter(imageBase64, {
    landscape,
    minMargin: MIN_MARGIN_PERCENT,
    maxMargin: MAX_MARGIN_PERCENT,
  });
  
  notes.push(`Scaled to ${cropResult.width}x${cropResult.height} (scale: ${cropResult.cropInfo.scaleApplied.toFixed(2)}x)`);
  
  // 2. Validate quality of the processed image
  let quality: QualityValidationResult;
  
  if (validateQuality) {
    quality = await validateColoringPageQuality(cropResult.imageBase64, complexity);
    
    if (!quality.isValid) {
      notes.push(`Quality issues found: ${quality.issues.join(", ")}`);
    }
  } else {
    quality = {
      isValid: true,
      issues: [],
      blackRatio: 0,
      hasEmptyTop: false,
      hasEmptyBottom: false,
      hasDarkBorder: false,
      artworkCoverage: 1,
      shouldRetry: false,
      retryPromptAddition: "",
    };
  }
  
  return {
    finalImageBase64: cropResult.imageBase64,
    width: cropResult.width,
    height: cropResult.height,
    quality,
    cropInfo: cropResult.cropInfo,
    processingNotes: notes,
  };
}

// ============================================
// UTILITY: URL to Buffer
// ============================================

/**
 * Fetch image from URL and convert to base64.
 * Uses new URL() instead of deprecated url.parse()
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  // Use new URL API (not deprecated url.parse)
  const parsedUrl = new URL(imageUrl);
  
  const response = await fetch(parsedUrl.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  return bufferToBase64(buffer);
}

