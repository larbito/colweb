/**
 * GenerationSpec - Unified specification for coloring book generation
 * Used across all prompt generation and image generation endpoints
 */

// Base complexity for GenerationSpec (API schema)
export type Complexity = "simple" | "medium" | "detailed";
// Extended complexity that includes all UI options
export type ExtendedComplexity = "kids" | "simple" | "medium" | "detailed" | "ultra";
export type LineThickness = "thin" | "medium" | "bold";

/**
 * Map extended complexity to base complexity for API compatibility
 */
export function mapExtendedToBaseComplexity(extended: ExtendedComplexity): Complexity {
  switch (extended) {
    case "kids":
      return "simple";
    case "ultra":
      return "detailed";
    default:
      return extended;
  }
}

export interface GenerationSpec {
  /** Trim size label, e.g. "8.5x11" */
  trimSize: string;
  /** Pixel dimensions for image generation, e.g. "1024x1536" */
  pixelSize: string;
  /** Complexity level affects number of elements */
  complexity: Complexity;
  /** Line thickness affects stroke weights */
  lineThickness: LineThickness;
  /** Number of content pages (max 80) */
  pageCount: number;
  /** Include blank pages between content pages */
  includeBlankBetween: boolean;
  /** Include "This book belongs to" page */
  includeBelongsTo: boolean;
  /** Include page numbers */
  includePageNumbers: boolean;
  /** Include copyright page */
  includeCopyrightPage: boolean;
  /** Style preset - fixed to kids-kdp for now */
  stylePreset: "kids-kdp";
}

/**
 * Trim size to pixel size mapping (portrait orientation)
 * All sizes are portrait: width < height
 */
export const TRIM_TO_PIXELS: Record<string, string> = {
  "8.5×11": "1024x1326",   // ~8.5:11 ratio
  "8.5x11": "1024x1326",
  "8×10": "1024x1280",     // 8:10 ratio
  "8x10": "1024x1280",
  "6×9": "1024x1536",      // 6:9 ratio (2:3)
  "6x9": "1024x1536",
  "A4": "1024x1448",       // A4 ratio ~1:1.414
};

/**
 * Default generation spec
 */
export const DEFAULT_SPEC: GenerationSpec = {
  trimSize: "8.5x11",
  pixelSize: "1024x1326",
  complexity: "simple",
  lineThickness: "bold",
  pageCount: 12,
  includeBlankBetween: false,
  includeBelongsTo: true,
  includePageNumbers: false,
  includeCopyrightPage: true,
  stylePreset: "kids-kdp",
};

/**
 * Create a GenerationSpec from UI inputs
 */
export function createSpec(params: {
  trimSize: string;
  complexity: Complexity;
  lineThickness: LineThickness;
  pageCount: number;
  includeBlankBetween?: boolean;
  includeBelongsTo?: boolean;
  includePageNumbers?: boolean;
  includeCopyrightPage?: boolean;
}): GenerationSpec {
  const pixelSize = TRIM_TO_PIXELS[params.trimSize] || TRIM_TO_PIXELS["8.5x11"];
  
  return {
    trimSize: params.trimSize,
    pixelSize,
    complexity: params.complexity,
    lineThickness: params.lineThickness,
    pageCount: Math.min(Math.max(1, params.pageCount), 80),
    includeBlankBetween: params.includeBlankBetween ?? false,
    includeBelongsTo: params.includeBelongsTo ?? true,
    includePageNumbers: params.includePageNumbers ?? false,
    includeCopyrightPage: params.includeCopyrightPage ?? true,
    stylePreset: "kids-kdp",
  };
}

/**
 * Get pixel dimensions as [width, height] tuple
 */
export function getPixelDimensions(spec: GenerationSpec): [number, number] {
  const [w, h] = spec.pixelSize.split("x").map(Number);
  return [w, h];
}

