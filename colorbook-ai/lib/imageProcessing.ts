/**
 * imageProcessing.ts
 * 
 * Server-side image processing for coloring book pages.
 * Handles reframing to US Letter format and quality validation.
 * 
 * Target: US Letter 8.5x11 @ 300 DPI = 2550x3300 pixels
 */

import sharp from "sharp";

// ============================================
// CONSTANTS
// ============================================

/** US Letter dimensions at 300 DPI */
export const LETTER_WIDTH = 2550;
export const LETTER_HEIGHT = 3300;
export const LETTER_DPI = 300;

/** Processing margins */
export const DEFAULT_MARGIN_PERCENT = 3; // 3% margin on each side
export const MIN_MARGIN_PERCENT = 2;
export const MAX_MARGIN_PERCENT = 5;

/** Validation thresholds */
export const WHITE_THRESHOLD = 245; // Pixels brighter than this are "white"
export const BOTTOM_EMPTY_THRESHOLD = 0.90; // 90% white = "empty"
export const BOTTOM_CHECK_PERCENT = 12; // Check bottom 12% of image

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

