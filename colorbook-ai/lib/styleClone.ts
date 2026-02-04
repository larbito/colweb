/**
 * styleClone.ts - Types and in-memory storage for Style Clone Generator
 * NOTE: This is demo/temporary storage. Projects expire after 6 hours.
 */

import type { Complexity, LineThickness } from "./generationSpec";

// ============================================
// Style Clone Types
// ============================================

export interface StyleContract {
  /** Human-readable summary of the style */
  styleSummary: string;
  /** Strict rules appended to every image prompt */
  styleContractText: string;
  /** Elements that should never appear */
  forbiddenList: string[];
  /** Recommended line thickness based on reference analysis */
  recommendedLineThickness: LineThickness;
  /** Recommended complexity based on reference analysis */
  recommendedComplexity: Complexity;
  /** Outline thickness rules */
  outlineRules: string;
  /** Background density rules */
  backgroundRules: string;
  /** Composition rules */
  compositionRules: string;
  /** Eye/face rules to avoid fills */
  eyeRules: string;
  /** Extracted theme/world/setting guess from the reference image */
  extractedThemeGuess: string;
}

export interface ThemePack {
  /** Setting/world description */
  setting: string;
  /** List of recurring props */
  recurringProps: string[];
  /** Visual motifs */
  motifs: string[];
  /** Allowed subjects for this theme */
  allowedSubjects: string[];
  /** Elements to avoid */
  forbiddenElements: string[];
  /** Optional character description for series mode */
  characterDescription?: string;
  /** Optional character name for series mode */
  characterName?: string;
}

export interface StyleClonePrompt {
  pageIndex: number;
  title: string;
  scenePrompt: string;
}

export interface StyleCloneImage {
  pageIndex: number;
  imageBase64?: string;
  imageUrl?: string;
  finalPrompt: string;
  passedGates: boolean;
  debug: StyleCloneDebugInfo;
}

export interface StyleCloneDebugInfo {
  provider: string;
  imageModel: string;
  textModel: string;
  size: string;
  promptHash: string;
  promptPreview: string;
  finalPrompt: string;
  negativePrompt: string;
  thresholds: {
    blackRatio: number;
    maxBlackRatio: number;
    blobThreshold: number;
  };
  blackRatio?: number;
  blobStats?: {
    largestBlob: number;
    totalBlobs: number;
    microNoiseCount: number;
  };
  /** Whether the image was force-converted from color to B&W */
  colorCorrectionApplied?: boolean;
  retries: number;
  failureReason?: string;
}

export type StyleCloneMode = "series" | "collection";

export interface StyleCloneProject {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  /** Base64 of the uploaded reference image */
  referenceImageBase64: string;
  /** Mode: series (same character) or collection (same style only) */
  mode: StyleCloneMode;
  /** User-provided theme text (optional) */
  themeText: string;
  /** Number of pages to generate */
  pagesCount: number;
  /** Complexity level */
  complexity: Complexity;
  /** Line thickness */
  lineThickness: LineThickness;
  /** KDP size preset */
  sizePreset: string;
  /** Generated theme pack */
  themePack: ThemePack | null;
  /** Extracted style contract from reference */
  styleContract: StyleContract | null;
  /** Whether the anchor/sample has been approved */
  anchorApproved: boolean;
  /** Base64 of the approved anchor image */
  anchorImageBase64: string | null;
  /** Generated prompts */
  prompts: StyleClonePrompt[];
  /** Generated images */
  images: StyleCloneImage[];
}

// ============================================
// In-Memory Storage (Demo Mode)
// ============================================

const projectStore = new Map<string, StyleCloneProject>();

// Cleanup interval - run every 15 minutes
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
const PROJECT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Cleanup expired projects
function cleanupExpiredProjects() {
  const now = new Date();
  for (const [id, project] of projectStore.entries()) {
    if (project.expiresAt < now) {
      projectStore.delete(id);
      console.log(`[StyleClone] Cleaned up expired project: ${id}`);
    }
  }
}

// Start cleanup interval (only on server)
if (typeof window === "undefined") {
  setInterval(cleanupExpiredProjects, CLEANUP_INTERVAL_MS);
}

/**
 * Generate a unique project ID
 */
export function generateProjectId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `sc_${timestamp}_${random}`;
}

/**
 * Create a new style clone project
 */
export function createProject(params: {
  referenceImageBase64: string;
  mode: StyleCloneMode;
  themeText: string;
  pagesCount: number;
  complexity: Complexity;
  lineThickness: LineThickness;
  sizePreset: string;
}): StyleCloneProject {
  const id = generateProjectId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PROJECT_TTL_MS);

  const project: StyleCloneProject = {
    id,
    createdAt: now,
    expiresAt,
    referenceImageBase64: params.referenceImageBase64,
    mode: params.mode,
    themeText: params.themeText,
    pagesCount: params.pagesCount,
    complexity: params.complexity,
    lineThickness: params.lineThickness,
    sizePreset: params.sizePreset,
    themePack: null,
    styleContract: null,
    anchorApproved: false,
    anchorImageBase64: null,
    prompts: [],
    images: [],
  };

  projectStore.set(id, project);
  console.log(`[StyleClone] Created project: ${id}, expires at ${expiresAt.toISOString()}`);
  
  return project;
}

/**
 * Get a project by ID
 */
export function getProject(id: string): StyleCloneProject | undefined {
  const project = projectStore.get(id);
  if (project && project.expiresAt < new Date()) {
    projectStore.delete(id);
    return undefined;
  }
  return project;
}

/**
 * Update a project
 */
export function updateProject(id: string, updates: Partial<StyleCloneProject>): StyleCloneProject | undefined {
  const project = getProject(id);
  if (!project) return undefined;

  const updated = { ...project, ...updates };
  projectStore.set(id, updated);
  return updated;
}

/**
 * Delete a project
 */
export function deleteProject(id: string): boolean {
  return projectStore.delete(id);
}

/**
 * Get all active projects (for debugging)
 */
export function getAllProjects(): StyleCloneProject[] {
  cleanupExpiredProjects();
  return Array.from(projectStore.values());
}

// ============================================
// Size Presets for KDP
// ============================================

export const KDP_SIZE_PRESETS: Record<string, { label: string; pixels: string; aspectRatio: string }> = {
  "8.5x11": { label: "8.5 × 11 in (US Letter)", pixels: "1024x1326", aspectRatio: "portrait" },
  "8x10": { label: "8 × 10 in", pixels: "1024x1280", aspectRatio: "portrait" },
  "6x9": { label: "6 × 9 in", pixels: "1024x1792", aspectRatio: "portrait" },
  "A4": { label: "A4 (International)", pixels: "1024x1448", aspectRatio: "portrait" },
  "8.5x8.5": { label: "8.5 × 8.5 in (Square)", pixels: "1024x1024", aspectRatio: "square" },
};

// ============================================
// Black Ratio Thresholds by Complexity
// ============================================

export const BLACK_RATIO_THRESHOLDS: Record<Complexity, number> = {
  simple: 0.20,
  medium: 0.27,
  detailed: 0.33,
};

export const BLOB_SIZE_THRESHOLD = 0.015; // 1.5% of image area

