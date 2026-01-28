/**
 * Coloring Page Validator
 * 
 * Validates that generated images are proper B&W coloring pages
 * without color, grayscale shading, or other unwanted elements.
 */

import type { ValidationResult } from "./coloringPageTypes";

/**
 * Validate a coloring page image
 * Returns validation result with detailed metrics
 */
export async function validateColoringPage(
  imageBuffer: Buffer
): Promise<{ validation: ValidationResult; correctedBuffer: Buffer }> {
  const sharp = (await import("sharp")).default;
  
  // Get image metadata and raw pixel data
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  
  const totalPixels = info.width * info.height;
  const channels = info.channels;
  
  // Analyze the image
  let blackPixels = 0;
  let whitePixels = 0;
  let coloredPixels = 0;
  let grayPixels = 0;
  const grayLevels = new Set<number>();
  
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Check if pixel has color (RGB values significantly different)
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    
    if (maxDiff > 15) {
      // This pixel has color
      coloredPixels++;
    } else {
      // Grayscale pixel - check the level
      const gray = Math.round((r + g + b) / 3);
      grayLevels.add(gray);
      
      if (gray < 50) {
        blackPixels++;
      } else if (gray > 240) {
        whitePixels++;
      } else {
        grayPixels++;
      }
    }
  }
  
  // Calculate metrics
  const colorRatio = coloredPixels / totalPixels;
  const blackRatio = blackPixels / totalPixels;
  const grayRatio = grayPixels / totalPixels;
  const grayLevelCount = grayLevels.size;
  
  // Determine if image passes validation
  const hasColor = colorRatio > 0.01; // More than 1% colored pixels
  const hasShading = grayRatio > 0.05 || grayLevelCount > 20; // More than 5% gray or many gray levels
  
  const failureReasons: string[] = [];
  
  if (hasColor) {
    failureReasons.push(`Image has ${(colorRatio * 100).toFixed(1)}% colored pixels`);
  }
  
  if (hasShading) {
    failureReasons.push(`Image has ${(grayRatio * 100).toFixed(1)}% gray pixels with ${grayLevelCount} different gray levels`);
  }
  
  if (blackRatio > 0.50) {
    failureReasons.push(`Too much black: ${(blackRatio * 100).toFixed(1)}% (max 50%)`);
  }
  
  if (blackRatio < 0.05) {
    failureReasons.push(`Too little black: ${(blackRatio * 100).toFixed(1)}% (min 5%)`);
  }
  
  const isValid = !hasColor && !hasShading && blackRatio <= 0.50 && blackRatio >= 0.05;
  
  // Always convert to pure B&W for output
  const correctedBuffer = await convertToPureBW(imageBuffer, sharp);
  
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
 * Uses adaptive thresholding for best results
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
  
  // Apply threshold - use 200 to make more whites and preserve only dark lines
  const threshold = 200;
  const bwData = Buffer.alloc(data.length);
  
  for (let i = 0; i < data.length; i++) {
    bwData[i] = data[i] > threshold ? 255 : 0;
  }
  
  // Reconstruct the image
  const bwImage = await sharp(bwData, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 1,
    },
  })
    .png()
    .toBuffer();
  
  return bwImage;
}

/**
 * Quick check if image is likely a valid coloring page
 * Used for fast rejection before full validation
 */
export async function quickColorCheck(imageBuffer: Buffer): Promise<boolean> {
  const sharp = (await import("sharp")).default;
  
  // Sample a small version of the image
  const { data, info } = await sharp(imageBuffer)
    .resize(100, 100, { fit: "inside" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const channels = info.channels;
  let coloredPixels = 0;
  
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    if (maxDiff > 20) {
      coloredPixels++;
    }
  }
  
  const totalPixels = info.width * info.height;
  const colorRatio = coloredPixels / totalPixels;
  
  // If more than 5% of sampled pixels have color, reject
  return colorRatio <= 0.05;
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

