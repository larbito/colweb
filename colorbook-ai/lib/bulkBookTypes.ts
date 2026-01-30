/**
 * Bulk Book Creation Types
 * 
 * Supports creating up to 10 books with up to 40 pages each.
 * Each book can be either a Character/Scene coloring book or a Quote/Text coloring book.
 */

// ============================================================
// ENUMS & CONSTANTS
// ============================================================

export const MAX_BOOKS_PER_BATCH = 10;
export const MAX_PAGES_PER_BOOK = 40;
export const DEFAULT_PAGES_PER_BOOK = 10;

export type BookType = "coloring_scenes" | "quote_text";
export type BookMode = "storybook" | "theme_book"; // storybook = same character, theme_book = different scenes/characters
export type BatchStatus = "draft" | "generating" | "paused" | "completed" | "failed";
export type BookStatus = "draft" | "prompts_ready" | "generating" | "generated" | "enhancing" | "enhanced" | "approved" | "exported";
export type PageStatus = "draft" | "prompt_ready" | "queued" | "generating" | "generated" | "enhancing" | "enhanced" | "approved" | "failed";

// Quote-specific types (reused from quote book)
export type DecorationLevel = "text_only" | "minimal_icons" | "border_only" | "full_background";
export type TypographyStyle = "bubble" | "script" | "block" | "mixed";
export type IconSet = "stars" | "hearts" | "doodles" | "sports" | "kids";
export type DecorationTheme = "floral" | "stars" | "mandala" | "hearts" | "nature" | "geometric" | "doodles" | "mixed";
export type QuoteMode = "different_quotes" | "quote_variations";
export type ToneType = "cute" | "bold" | "calm" | "funny" | "motivational" | "romantic" | "faith" | "sports" | "kids" | "inspirational";
export type AudienceType = "kids" | "teens" | "adults" | "all";

// ============================================================
// BOOK IDEA (Step 1)
// ============================================================

export interface BookIdea {
  id: string;
  title: string;
  bookType: BookType;
  concept: string; // Short description/idea
  targetAge?: AudienceType;
  bookMode: BookMode;
  pageCount: number;
  isApproved: boolean;
  
  // Book-specific settings
  settings: BookSettings;
}

export interface BookSettings {
  // Common settings
  pageSize: "letter"; // Always 8.5x11 for now
  fillPage: boolean;
  
  // For coloring_scenes
  sameCharacter?: boolean;
  characterDescription?: string;
  artStyle?: string;
  
  // For quote_text
  decorationLevel?: DecorationLevel;
  typographyStyle?: TypographyStyle;
  iconSet?: IconSet;
  decorationTheme?: DecorationTheme;
  quoteMode?: QuoteMode;
  tone?: ToneType;
}

// ============================================================
// PAGE (Step 2 & 3)
// ============================================================

export interface BookPage {
  id: string;
  bookId: string;
  index: number; // 1-based page number
  
  // Step 2: Page idea/content
  ideaText: string; // Scene description or quote text
  isIdeaApproved: boolean;
  
  // Step 3: Final prompt
  finalPrompt: string;
  isPromptApproved: boolean;
  promptGeneratedAt?: number;
  
  // Step 4: Generation
  status: PageStatus;
  imageBase64?: string;
  enhancedImageBase64?: string;
  finalLetterBase64?: string;
  activeVersion: "original" | "enhanced" | "finalLetter";
  error?: string;
  
  // Timestamps
  generatedAt?: number;
  enhancedAt?: number;
  approvedAt?: number;
  
  // Duration tracking for ETA
  generationDurationMs?: number;
  enhancementDurationMs?: number;
}

// ============================================================
// BOOK (Full book state)
// ============================================================

export interface Book {
  id: string;
  batchId: string;
  
  // From BookIdea
  title: string;
  bookType: BookType;
  concept: string;
  targetAge?: AudienceType;
  bookMode: BookMode;
  settings: BookSettings;
  
  // Pages
  pages: BookPage[];
  
  // Status
  status: BookStatus;
  
  // Belongs-to page (generated separately)
  belongsToPage?: {
    imageBase64?: string;
    enhancedImageBase64?: string;
    finalLetterBase64?: string;
    status: PageStatus;
  };
  
  // Export
  pdfUrl?: string;
  exportedAt?: number;
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// BATCH (Step 4 & 5)
// ============================================================

export interface Batch {
  id: string;
  
  // Books
  books: Book[];
  
  // Status
  status: BatchStatus;
  
  // Progress tracking
  totalPages: number;
  generatedPages: number;
  enhancedPages: number;
  approvedPages: number;
  failedPages: number;
  
  // ETA tracking
  startedAt?: number;
  completedAt?: number;
  avgGenerationMs: number;
  avgEnhancementMs: number;
  
  // Settings
  notifyOnComplete: boolean;
  notifyEmail?: string;
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// STEP MANAGEMENT
// ============================================================

export type BulkStep = 1 | 2 | 3 | 4 | 5;

export interface BulkState {
  currentStep: BulkStep;
  
  // Step 1: Book ideas
  bookIdeas: BookIdea[];
  
  // Step 2-5: Full batch with books and pages
  batch: Batch | null;
  
  // UI state
  isGeneratingIdeas: boolean;
  isGeneratingPageIdeas: boolean;
  isImprovingPrompts: boolean;
  isGeneratingImages: boolean;
  isEnhancing: boolean;
  
  // Selected for editing
  selectedBookId: string | null;
  selectedPageId: string | null;
}

// ============================================================
// API TYPES
// ============================================================

export interface GenerateBookIdeasRequest {
  count: number;
  themes?: string[];
  targetAge?: AudienceType;
  bookType?: BookType;
}

export interface GenerateBookIdeasResponse {
  ideas: Omit<BookIdea, "id" | "isApproved" | "settings">[];
}

export interface GeneratePageIdeasRequest {
  bookId: string;
  bookType: BookType;
  concept: string;
  pageCount: number;
  settings: BookSettings;
}

export interface GeneratePageIdeasResponse {
  pages: { index: number; ideaText: string }[];
}

export interface ImprovePromptRequest {
  bookId: string;
  pageId: string;
  ideaText: string;
  bookType: BookType;
  settings: BookSettings;
  bookConcept: string;
  characterDescription?: string;
}

export interface ImprovePromptResponse {
  finalPrompt: string;
}

export interface BatchStatusResponse {
  batch: Batch;
  isRunning: boolean;
}

// ============================================================
// HELPERS
// ============================================================

export function createEmptyBookIdea(): BookIdea {
  return {
    id: crypto.randomUUID(),
    title: "",
    bookType: "coloring_scenes",
    concept: "",
    targetAge: "kids",
    bookMode: "theme_book",
    pageCount: DEFAULT_PAGES_PER_BOOK,
    isApproved: false,
    settings: {
      pageSize: "letter",
      fillPage: true,
      sameCharacter: false,
      decorationLevel: "minimal_icons",
      typographyStyle: "bubble",
    },
  };
}

export function createEmptyPage(bookId: string, index: number): BookPage {
  return {
    id: crypto.randomUUID(),
    bookId,
    index,
    ideaText: "",
    isIdeaApproved: false,
    finalPrompt: "",
    isPromptApproved: false,
    status: "draft",
    activeVersion: "original",
  };
}

export function createEmptyBatch(): Batch {
  return {
    id: crypto.randomUUID(),
    books: [],
    status: "draft",
    totalPages: 0,
    generatedPages: 0,
    enhancedPages: 0,
    approvedPages: 0,
    failedPages: 0,
    avgGenerationMs: 30000, // 30s default estimate
    avgEnhancementMs: 15000, // 15s default estimate
    notifyOnComplete: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function bookIdeaToBook(idea: BookIdea, batchId: string): Book {
  const pages: BookPage[] = Array.from({ length: idea.pageCount }, (_, i) => 
    createEmptyPage(idea.id, i + 1)
  );
  
  return {
    id: idea.id,
    batchId,
    title: idea.title,
    bookType: idea.bookType,
    concept: idea.concept,
    targetAge: idea.targetAge,
    bookMode: idea.bookMode,
    settings: idea.settings,
    pages,
    status: "draft",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function calculateBatchProgress(batch: Batch): {
  generationPercent: number;
  enhancementPercent: number;
  overallPercent: number;
  etaSeconds: number | null;
} {
  if (batch.totalPages === 0) {
    return { generationPercent: 0, enhancementPercent: 0, overallPercent: 0, etaSeconds: null };
  }
  
  const generationPercent = (batch.generatedPages / batch.totalPages) * 100;
  const enhancementPercent = (batch.enhancedPages / batch.totalPages) * 100;
  
  // Overall: 70% weight on generation, 30% on enhancement
  const overallPercent = (generationPercent * 0.7) + (enhancementPercent * 0.3);
  
  // ETA calculation
  let etaSeconds: number | null = null;
  if (batch.status === "generating" && batch.avgGenerationMs > 0) {
    const remainingGeneration = batch.totalPages - batch.generatedPages;
    const remainingEnhancement = batch.totalPages - batch.enhancedPages;
    
    const genEtaMs = remainingGeneration * batch.avgGenerationMs;
    const enhEtaMs = remainingEnhancement * batch.avgEnhancementMs;
    
    etaSeconds = Math.round((genEtaMs + enhEtaMs) / 1000);
  }
  
  return { generationPercent, enhancementPercent, overallPercent, etaSeconds };
}

export function formatEta(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

