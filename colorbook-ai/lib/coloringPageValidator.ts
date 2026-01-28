/**
 * Coloring Page Validator
 * 
 * Validates that generated images are proper B&W coloring pages.
 * DALL-E 3 always produces anti-aliased images with gray pixels,
 * so we convert to pure B&W first, then validate the result.
 */

import type { ValidationResult } from "./coloringPageTypes";

/**
 * Validate a coloring page image
 * Returns validation result with detailed metrics
 * 
 * NOTE: We convert to B&W FIRST, then validate the converted image.
 * This is because DALL-E 3 cannot produce perfectly binary images.
 */
export async function validateColoringPage(
  imageBuffer: Buffer
): Promise<{ validation: ValidationResult; correctedBuffer: Buffer }> {
  const sharp = (await import("sharp")).default;
  
  // FIRST: Convert to pure B&W - this fixes DALL-E's anti-aliasing
  const correctedBuffer = await convertToPureBW(imageBuffer, sharp);
  
  // NOW: Validate the CONVERTED image (not the original)
  const { data, info } = await sharp(correctedBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const totalPixels = info.width * info.height;
  const channels = info.channels;
  
  // Count black vs white pixels in the converted B&W image
  let blackPixels = 0;
  let whitePixels = 0;
  let coloredPixels = 0;
  
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = channels >= 3 ? data[i + 1] : r;
    const b = channels >= 3 ? data[i + 2] : r;
    
    // After B&W conversion, pixels should be pure black or white
    const gray = Math.round((r + g + b) / 3);
    
    // Check for any remaining color (shouldn't happen after conversion)
    if (channels >= 3) {
      const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
      if (maxDiff > 5) {
        coloredPixels++;
      }
    }
    
    if (gray < 128) {
      blackPixels++;
    } else {
      whitePixels++;
    }
  }
  
  // Calculate metrics on the CONVERTED image
  const colorRatio = coloredPixels / totalPixels;
  const blackRatio = blackPixels / totalPixels;
  
  const failureReasons: string[] = [];
  
  // After conversion, there should be NO color
  const hasColor = colorRatio > 0.001;
  if (hasColor) {
    failureReasons.push(`Conversion failed: ${(colorRatio * 100).toFixed(2)}% colored pixels remain`);
  }
  
  // Check black ratio is reasonable for a coloring page
  if (blackRatio > 0.60) {
    failureReasons.push(`Too much black after conversion: ${(blackRatio * 100).toFixed(1)}% (max 60%)`);
  }
  
  if (blackRatio < 0.03) {
    failureReasons.push(`Too little black: ${(blackRatio * 100).toFixed(1)}% (min 3%)`);
  }
  
  // After B&W conversion, shading is impossible (only 0 and 255)
  const hasShading = false;
  const grayLevelCount = 2; // After conversion: just black and white
  
  const isValid = !hasColor && blackRatio <= 0.60 && blackRatio >= 0.03;
  
  return {
    validation: {
      isValid,
      hasColor,
      hasShading,
      blackRatio,
      grayLevelCount,
      failureReasons,
    },
    correctedBuffer,
  };
}

/**
 * Convert image to pure black & white
 * Uses high threshold to preserve only dark lines and make grays white
 */
async function convertToPureBW(
  imageBuffer: Buffer,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sharp: any
): Promise<Buffer> {
  // Convert to grayscale first
  const grayscale = await sharp(imageBuffer)
    .grayscale()
    .toBuffer();
  
  // Get raw pixel data
  const { data, info } = await sharp(grayscale)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  // Apply threshold - use 180 to preserve more line detail while removing grays
  // Lower threshold = more black preserved, higher = more white
  const threshold = 180;
  const bwData = Buffer.alloc(data.length);
  
  for (let i = 0; i < data.length; i++) {
    // Anything above threshold becomes white, below becomes black
    bwData[i] = data[i] > threshold ? 255 : 0;
  }
  
  // Reconstruct the image as PNG
  const bwImage = await sharp(bwData, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 1,
    },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
  
  return bwImage;
}

/**
 * Quick check if image has significant color (not just B&W with anti-aliasing)
 * Used for fast detection of colored images
 */
export async function quickColorCheck(imageBuffer: Buffer): Promise<boolean> {
  const sharp = (await import("sharp")).default;
  
  // Sample a small version of the image
  const { data, info } = await sharp(imageBuffer)
    .resize(100, 100, { fit: "inside" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const channels = info.channels;
  if (channels < 3) return true; // Grayscale is fine
  
  let coloredPixels = 0;
  const totalPixels = info.width * info.height;
  
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Significant color difference means this is a colored image
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    if (maxDiff > 30) {
      coloredPixels++;
    }
  }
  
  const colorRatio = coloredPixels / totalPixels;
  
  // If more than 10% of sampled pixels have strong color, it's a colored image
  // We're lenient here because we convert to B&W anyway
  return colorRatio <= 0.10;
}

/**
 * Analyze image and suggest improvements
 */
export async function analyzeForRetry(imageBuffer: Buffer): Promise<string[]> {
  const { validation } = await validateColoringPage(imageBuffer);
  
  const suggestions: string[] = [];
  
  if (validation.hasColor) {
    suggestions.push("Add stronger emphasis on BLACK AND WHITE ONLY");
    suggestions.push("Add 'monochrome' and 'grayscale' to style");
  }
  
  if (validation.hasShading) {
    suggestions.push("Add 'flat colors only' and 'no shading'");
    suggestions.push("Emphasize 'pure line art' with 'no gradients'");
  }
  
  if (validation.blackRatio > 0.50) {
    suggestions.push("Simplify the design with fewer elements");
    suggestions.push("Use thinner lines");
    suggestions.push("Reduce background detail");
  }
  
  return suggestions;
}

