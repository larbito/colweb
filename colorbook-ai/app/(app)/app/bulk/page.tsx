"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AppTopbar } from "@/components/app/app-topbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProgressPanel } from "@/components/app/progress-panel";
import {
  Sparkles,
  Loader2,
  Wand2,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  StopCircle,
  RefreshCw,
  Eye,
  Download,
  FileDown,
  Book as BookIcon,
  Quote,
  Palette,
  Image as ImageIcon,
  Layers,
  Settings2,
  Copy,
  Edit,
  Boxes,
  AlertCircle,
  Info,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  type BookIdea,
  type BookType,
  type BookMode,
  type BookSettings,
  type AudienceType,
  type DecorationLevel,
  type TypographyStyle,
  type BulkStep,
  type Batch,
  type Book,
  type BookPage,
  MAX_BOOKS_PER_BATCH,
  MAX_PAGES_PER_BOOK,
  DEFAULT_PAGES_PER_BOOK,
  createEmptyBookIdea,
  createEmptyBatch,
  bookIdeaToBook,
  calculateBatchProgress,
  formatEta,
} from "@/lib/bulkBookTypes";

// ============================================================
// STEP INDICATOR COMPONENT
// ============================================================

interface StepIndicatorProps {
  currentStep: BulkStep;
  onStepClick: (step: BulkStep) => void;
  canNavigateTo: (step: BulkStep) => boolean;
}

const STEPS = [
  { step: 1 as BulkStep, label: "Book Ideas", description: "Define your books" },
  { step: 2 as BulkStep, label: "Page Plans", description: "Plan each page" },
  { step: 3 as BulkStep, label: "Prompts", description: "Improve & approve" },
  { step: 4 as BulkStep, label: "Generate", description: "Create images" },
  { step: 5 as BulkStep, label: "Review", description: "Approve & export" },
];

function StepIndicator({ currentStep, onStepClick, canNavigateTo }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between mb-8 px-4">
      {STEPS.map((s, idx) => {
        const isActive = currentStep === s.step;
        const isCompleted = currentStep > s.step;
        const canClick = canNavigateTo(s.step);
        
        return (
          <div key={s.step} className="flex items-center">
            <button
              onClick={() => canClick && onStepClick(s.step)}
              disabled={!canClick}
              className={`flex flex-col items-center ${canClick ? "cursor-pointer" : "cursor-not-allowed"}`}
            >
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mb-2 transition-all
                  ${isActive ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : ""}
                  ${isCompleted ? "bg-green-500 text-white" : ""}
                  ${!isActive && !isCompleted ? "bg-muted text-muted-foreground" : ""}
                `}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : s.step}
              </div>
              <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {s.label}
              </span>
              <span className="text-[10px] text-muted-foreground">{s.description}</span>
            </button>
            
            {idx < STEPS.length - 1 && (
              <div className={`w-16 h-0.5 mx-2 ${currentStep > s.step ? "bg-green-500" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// BOOK IDEA CARD COMPONENT
// ============================================================

interface BookIdeaCardProps {
  idea: BookIdea;
  index: number;
  onUpdate: (id: string, updates: Partial<BookIdea>) => void;
  onDelete: (id: string) => void;
  onApprove: (id: string) => void;
  onRegenerate: (id: string) => void;
  isGenerating?: boolean;
}

function BookIdeaCard({ idea, index, onUpdate, onDelete, onApprove, onRegenerate, isGenerating }: BookIdeaCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <Card className={`transition-all ${idea.isApproved ? "border-green-500/50 bg-green-50/30" : ""}`}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              idea.isApproved ? "bg-green-500 text-white" : "bg-primary/10 text-primary"
            }`}>
              {idea.isApproved ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <div>
              <Input
                value={idea.title}
                onChange={(e) => onUpdate(idea.id, { title: e.target.value })}
                placeholder="Book title..."
                className="font-medium border-0 p-0 h-auto text-base focus-visible:ring-0 bg-transparent"
              />
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={idea.bookType === "coloring_scenes" ? "default" : "secondary"} className="text-[10px]">
                  {idea.bookType === "coloring_scenes" ? (
                    <><Palette className="h-3 w-3 mr-1" />Coloring Scenes</>
                  ) : (
                    <><Quote className="h-3 w-3 mr-1" />Quote/Text</>
                  )}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {idea.pageCount} pages
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(idea.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Book Type Selection */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpdate(idea.id, { bookType: "coloring_scenes" })}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                idea.bookType === "coloring_scenes"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Palette className="h-5 w-5 mb-1 text-primary" />
              <div className="font-medium text-sm">Coloring Scenes</div>
              <div className="text-xs text-muted-foreground">Characters & scenes</div>
            </button>
            <button
              onClick={() => onUpdate(idea.id, { bookType: "quote_text" })}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                idea.bookType === "quote_text"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Quote className="h-5 w-5 mb-1 text-purple-500" />
              <div className="font-medium text-sm">Quote/Text</div>
              <div className="text-xs text-muted-foreground">Typography pages</div>
            </button>
          </div>
          
          {/* Concept/Idea */}
          <div>
            <label className="text-sm font-medium mb-1 block">Book Concept/Idea</label>
            <Textarea
              value={idea.concept}
              onChange={(e) => onUpdate(idea.id, { concept: e.target.value })}
              placeholder={idea.bookType === "coloring_scenes" 
                ? "e.g., A brave little fox goes on adventures in the forest..." 
                : "e.g., Motivational quotes about self-love and confidence for teens..."
              }
              className="min-h-[80px]"
            />
          </div>
          
          {/* Book Mode */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpdate(idea.id, { bookMode: "theme_book" })}
              className={`p-2 rounded-lg border text-left text-sm transition-all ${
                idea.bookMode === "theme_book"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Layers className="h-4 w-4 mb-1" />
              <div className="font-medium">Theme Book</div>
              <div className="text-xs text-muted-foreground">Different scenes/characters</div>
            </button>
            <button
              onClick={() => onUpdate(idea.id, { bookMode: "storybook" })}
              className={`p-2 rounded-lg border text-left text-sm transition-all ${
                idea.bookMode === "storybook"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <BookIcon className="h-4 w-4 mb-1" />
              <div className="font-medium">Storybook</div>
              <div className="text-xs text-muted-foreground">Same character throughout</div>
            </button>
          </div>
          
          {/* Page Count & Target Age */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Number of Pages</label>
              <Input
                type="number"
                min={1}
                max={MAX_PAGES_PER_BOOK}
                value={idea.pageCount}
                onChange={(e) => onUpdate(idea.id, { pageCount: Math.min(MAX_PAGES_PER_BOOK, Math.max(1, parseInt(e.target.value) || 1)) })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Target Audience</label>
              <select
                value={idea.targetAge || "kids"}
                onChange={(e) => onUpdate(idea.id, { targetAge: e.target.value as AudienceType })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="kids">Kids (3-8)</option>
                <option value="teens">Teens (9-16)</option>
                <option value="adults">Adults</option>
                <option value="all">All Ages</option>
              </select>
            </div>
          </div>
          
          {/* Quote-specific settings */}
          {idea.bookType === "quote_text" && (
            <div className="p-3 bg-muted/30 rounded-lg space-y-3">
              <div className="text-sm font-medium flex items-center gap-2">
                <Quote className="h-4 w-4" />
                Quote Book Settings
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Decoration Level</label>
                  <select
                    value={idea.settings.decorationLevel || "minimal_icons"}
                    onChange={(e) => onUpdate(idea.id, { 
                      settings: { ...idea.settings, decorationLevel: e.target.value as DecorationLevel } 
                    })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="text_only">Text Only</option>
                    <option value="minimal_icons">Minimal Icons</option>
                    <option value="border_only">Border Only</option>
                    <option value="full_background">Full Background</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Typography Style</label>
                  <select
                    value={idea.settings.typographyStyle || "bubble"}
                    onChange={(e) => onUpdate(idea.id, { 
                      settings: { ...idea.settings, typographyStyle: e.target.value as TypographyStyle } 
                    })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="bubble">Bubble</option>
                    <option value="script">Script</option>
                    <option value="block">Block</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
          {/* Coloring-specific settings */}
          {idea.bookType === "coloring_scenes" && idea.bookMode === "storybook" && (
            <div className="p-3 bg-muted/30 rounded-lg space-y-3">
              <div className="text-sm font-medium flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Storybook Character
              </div>
              <Textarea
                value={idea.settings.characterDescription || ""}
                onChange={(e) => onUpdate(idea.id, { 
                  settings: { ...idea.settings, characterDescription: e.target.value, sameCharacter: true } 
                })}
                placeholder="Describe your main character (e.g., A small orange fox with big eyes, wearing a blue scarf...)"
                className="min-h-[60px] text-sm"
              />
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant={idea.isApproved ? "secondary" : "default"}
              size="sm"
              onClick={() => onApprove(idea.id)}
              className="flex-1"
            >
              {idea.isApproved ? (
                <><CheckCircle2 className="mr-2 h-4 w-4" />Approved</>
              ) : (
                <><Check className="mr-2 h-4 w-4" />Approve</>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRegenerate(idea.id)}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export default function BulkCreatePage() {
  // Step management
  const [currentStep, setCurrentStep] = useState<BulkStep>(1);
  
  // Step 1: Book ideas
  const [bookIdeas, setBookIdeas] = useState<BookIdea[]>([createEmptyBookIdea()]);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  
  // AI idea generation settings
  const [showIdeaGenerator, setShowIdeaGenerator] = useState(false);
  const [ideaCount, setIdeaCount] = useState(5);
  const [ideaThemes, setIdeaThemes] = useState("");
  const [ideaAudience, setIdeaAudience] = useState<AudienceType>("kids");
  const [ideaBookType, setIdeaBookType] = useState<BookType | "both">("both");
  
  // Step 2-5: Batch state
  const [batch, setBatch] = useState<Batch | null>(null);
  const [isGeneratingPageIdeas, setIsGeneratingPageIdeas] = useState(false);
  const [isImprovingPrompts, setIsImprovingPrompts] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Polling for batch status
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // ==================== STEP NAVIGATION ====================
  
  const canNavigateTo = useCallback((step: BulkStep): boolean => {
    if (step === 1) return true;
    if (step === 2) return bookIdeas.some(i => i.isApproved);
    // Step 3: Can go if batch exists (has books with pages)
    if (step === 3) return batch !== null && batch.books.length > 0;
    // Step 4: Can go if at least some prompts are ready (not necessarily all approved)
    if (step === 4) return batch !== null && batch.books.some(b => b.pages.some(p => p.finalPrompt && p.finalPrompt.trim() !== ""));
    if (step === 5) return batch !== null && batch.generatedPages > 0;
    return false;
  }, [bookIdeas, batch]);
  
  const goToNextStep = () => {
    if (currentStep < 5 && canNavigateTo((currentStep + 1) as BulkStep)) {
      setCurrentStep((currentStep + 1) as BulkStep);
    }
  };
  
  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as BulkStep);
    }
  };
  
  // ==================== STEP 1: BOOK IDEAS ====================
  
  const addBookIdea = () => {
    if (bookIdeas.length < MAX_BOOKS_PER_BATCH) {
      setBookIdeas([...bookIdeas, createEmptyBookIdea()]);
    }
  };
  
  const updateBookIdea = (id: string, updates: Partial<BookIdea>) => {
    setBookIdeas(bookIdeas.map(idea => 
      idea.id === id ? { ...idea, ...updates } : idea
    ));
  };
  
  const deleteBookIdea = (id: string) => {
    if (bookIdeas.length > 1) {
      setBookIdeas(bookIdeas.filter(idea => idea.id !== id));
    }
  };
  
  const approveBookIdea = (id: string) => {
    setBookIdeas(bookIdeas.map(idea => 
      idea.id === id ? { ...idea, isApproved: !idea.isApproved } : idea
    ));
  };
  
  const approveAllIdeas = () => {
    setBookIdeas(bookIdeas.map(idea => ({ ...idea, isApproved: true })));
  };
  
  const generateBookIdeas = async () => {
    setIsGeneratingIdeas(true);
    
    try {
      const response = await fetch("/api/bulk/generate-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: ideaCount,
          themes: ideaThemes.split(",").map(t => t.trim()).filter(t => t),
          targetAge: ideaAudience,
          bookType: ideaBookType === "both" ? undefined : ideaBookType,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate ideas");
      }
      
      // Add generated ideas
      const newIdeas: BookIdea[] = data.ideas.map((idea: any) => ({
        ...createEmptyBookIdea(),
        id: crypto.randomUUID(),
        title: idea.title,
        bookType: idea.bookType,
        concept: idea.concept,
        targetAge: idea.targetAge || ideaAudience,
        bookMode: idea.bookMode || "theme_book",
        pageCount: idea.pageCount || DEFAULT_PAGES_PER_BOOK,
      }));
      
      setBookIdeas([...bookIdeas.filter(i => i.title || i.concept), ...newIdeas].slice(0, MAX_BOOKS_PER_BATCH));
      setShowIdeaGenerator(false);
      toast.success(`Generated ${newIdeas.length} book ideas!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate ideas");
    } finally {
      setIsGeneratingIdeas(false);
    }
  };
  
  const proceedToStep2 = () => {
    const approvedIdeas = bookIdeas.filter(i => i.isApproved);
    if (approvedIdeas.length === 0) {
      toast.error("Please approve at least one book idea");
      return;
    }
    
    // Create batch from approved ideas
    const newBatch = createEmptyBatch();
    newBatch.books = approvedIdeas.map(idea => bookIdeaToBook(idea, newBatch.id));
    newBatch.totalPages = newBatch.books.reduce((sum, b) => sum + b.pages.length, 0);
    
    setBatch(newBatch);
    setCurrentStep(2);
  };
  
  // ==================== STEP 2: GENERATE PAGE IDEAS ====================
  
  const [generatingBookIds, setGeneratingBookIds] = useState<Set<string>>(new Set());
  
  const generatePageIdeasForBook = async (book: Book) => {
    if (!batch) return;
    
    // Mark book as generating
    setGeneratingBookIds(prev => new Set([...prev, book.id]));
    
    try {
      const response = await fetch("/api/bulk/generate-page-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: book.id,
          bookType: book.bookType,
          concept: book.concept || book.title,
          pageCount: book.pages.length,
          settings: book.settings,
          targetAge: book.targetAge,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate page ideas");
      }
      
      // Update batch with generated page ideas
      setBatch(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          books: prev.books.map(b => 
            b.id === book.id 
              ? {
                  ...b,
                  pages: b.pages.map((page, idx) => ({
                    ...page,
                    ideaText: data.pages[idx]?.ideaText || page.ideaText,
                  }))
                }
              : b
          )
        };
      });
      
      toast.success(`Generated page ideas for "${book.title || 'Book'}"`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate page ideas");
    } finally {
      setGeneratingBookIds(prev => {
        const next = new Set(prev);
        next.delete(book.id);
        return next;
      });
    }
  };
  
  const generateAllPageIdeasForBatch = async () => {
    if (!batch) return;
    
    setIsGeneratingPageIdeas(true);
    
    // Generate for all books in parallel (with some concurrency limit)
    const books = batch.books;
    const concurrency = 3;
    
    for (let i = 0; i < books.length; i += concurrency) {
      const chunk = books.slice(i, i + concurrency);
      await Promise.all(chunk.map(book => generatePageIdeasForBook(book)));
    }
    
    setIsGeneratingPageIdeas(false);
    toast.success("Generated all page ideas!");
  };
  
  // ==================== STEP 3: IMPROVE PROMPTS ====================
  
  const [improvingPageIds, setImprovingPageIds] = useState<Set<string>>(new Set());
  const [improvingBookIds, setImprovingBookIds] = useState<Set<string>>(new Set());
  
  const improvePromptForPage = async (book: Book, page: BookPage) => {
    if (!batch) return;
    
    setImprovingPageIds(prev => new Set([...prev, page.id]));
    
    try {
      const response = await fetch("/api/bulk/improve-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: book.id,
          pageId: page.id,
          pageIndex: page.index,
          ideaText: page.ideaText,
          bookType: book.bookType,
          bookConcept: book.concept || book.title,
          settings: book.settings,
          targetAge: book.targetAge,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to improve prompt");
      }
      
      // Update the page with the generated prompt
      setBatch(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          books: prev.books.map(b => 
            b.id === book.id 
              ? {
                  ...b,
                  pages: b.pages.map(p =>
                    p.id === page.id 
                      ? { 
                          ...p, 
                          finalPrompt: data.finalPrompt, 
                          promptGeneratedAt: data.generatedAt,
                          status: "prompt_ready" as const
                        } 
                      : p
                  )
                }
              : b
          )
        };
      });
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to improve prompt");
    } finally {
      setImprovingPageIds(prev => {
        const next = new Set(prev);
        next.delete(page.id);
        return next;
      });
    }
  };
  
  const improveAllPromptsForBook = async (book: Book) => {
    if (!batch) return;
    
    setImprovingBookIds(prev => new Set([...prev, book.id]));
    
    // Improve all pages in the book sequentially
    for (const page of book.pages) {
      if (!page.finalPrompt || page.finalPrompt.trim() === "") {
        await improvePromptForPage(book, page);
      }
    }
    
    setImprovingBookIds(prev => {
      const next = new Set(prev);
      next.delete(book.id);
      return next;
    });
    
    toast.success(`Improved all prompts for "${book.title || 'Book'}"`);
  };
  
  const improveAllPromptsForBatch = async () => {
    if (!batch) return;
    
    setIsImprovingPrompts(true);
    
    // Process books with concurrency of 2
    const books = batch.books;
    const concurrency = 2;
    
    for (let i = 0; i < books.length; i += concurrency) {
      const chunk = books.slice(i, i + concurrency);
      await Promise.all(chunk.map(book => improveAllPromptsForBook(book)));
    }
    
    setIsImprovingPrompts(false);
    toast.success("All prompts improved!");
  };
  
  const approvePrompt = (bookId: string, pageId: string) => {
    setBatch(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        books: prev.books.map(b => 
          b.id === bookId 
            ? {
                ...b,
                pages: b.pages.map(p =>
                  p.id === pageId ? { ...p, isPromptApproved: !p.isPromptApproved } : p
                )
              }
            : b
        )
      };
    });
  };
  
  const approveAllPromptsInBook = (bookId: string) => {
    setBatch(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        books: prev.books.map(b => 
          b.id === bookId 
            ? {
                ...b,
                pages: b.pages.map(p => ({ ...p, isPromptApproved: true }))
              }
            : b
        )
      };
    });
  };
  
  const approveAllPromptsInBatch = () => {
    setBatch(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        books: prev.books.map(b => ({
          ...b,
          pages: b.pages.map(p => ({ ...p, isPromptApproved: true }))
        }))
      };
    });
  };
  
  // Count pages with prompts ready
  const promptsReadyCount = batch?.books.reduce(
    (sum, b) => sum + b.pages.filter(p => p.finalPrompt && p.finalPrompt.trim() !== "").length, 
    0
  ) || 0;
  const promptsApprovedCount = batch?.books.reduce(
    (sum, b) => sum + b.pages.filter(p => p.isPromptApproved).length, 
    0
  ) || 0;
  
  // ==================== STEP 4: GENERATE IMAGES ====================
  
  const [generationPaused, setGenerationPaused] = useState(false);
  const generationAbortRef = useRef(false);
  const [currentGeneratingPage, setCurrentGeneratingPage] = useState<{bookId: string; pageId: string} | null>(null);
  
  const generateImageForPage = async (book: Book, page: BookPage): Promise<boolean> => {
    if (!batch || generationAbortRef.current) return false;
    
    setCurrentGeneratingPage({ bookId: book.id, pageId: page.id });
    
    // Update page status to generating
    setBatch(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        books: prev.books.map(b => 
          b.id === book.id 
            ? {
                ...b,
                pages: b.pages.map(p =>
                  p.id === page.id ? { ...p, status: "generating" as const } : p
                )
              }
            : b
        )
      };
    });
    
    try {
      const startTime = Date.now();
      
      const response = await fetch("/api/batch/generate-one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: page.index,
          prompt: page.finalPrompt || `Create a coloring page for: ${page.ideaText}`,
          size: "1024x1536",
          maxRetries: 0, // Skip retries for speed in bulk mode
          isStorybookMode: book.bookMode === "storybook",
          validateOutline: false, // Skip validation for speed
          validateCharacter: false,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }
      
      const durationMs = Date.now() - startTime;
      
      // Update page with generated image
      setBatch(prev => {
        if (!prev) return prev;
        const newGeneratedPages = prev.generatedPages + 1;
        // Update average generation time
        const newAvgMs = prev.avgGenerationMs > 0 
          ? (prev.avgGenerationMs * prev.generatedPages + durationMs) / newGeneratedPages
          : durationMs;
          
        return {
          ...prev,
          generatedPages: newGeneratedPages,
          avgGenerationMs: newAvgMs,
          books: prev.books.map(b => 
            b.id === book.id 
              ? {
                  ...b,
                  pages: b.pages.map(p =>
                    p.id === page.id 
                      ? { 
                          ...p, 
                          status: "generated" as const,
                          imageBase64: data.imageBase64,
                          generatedAt: Date.now(),
                          generationDurationMs: durationMs,
                        } 
                      : p
                  )
                }
              : b
          )
        };
      });
      
      return true;
    } catch (error) {
      console.error(`Failed to generate page ${page.index}:`, error);
      
      // Update page status to failed
      setBatch(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          failedPages: prev.failedPages + 1,
          books: prev.books.map(b => 
            b.id === book.id 
              ? {
                  ...b,
                  pages: b.pages.map(p =>
                    p.id === page.id 
                      ? { 
                          ...p, 
                          status: "failed" as const,
                          error: error instanceof Error ? error.message : "Generation failed",
                        } 
                      : p
                  )
                }
              : b
          )
        };
      });
      
      return false;
    } finally {
      setCurrentGeneratingPage(null);
    }
  };
  
  const startGeneration = async () => {
    if (!batch) return;
    
    setIsGeneratingImages(true);
    generationAbortRef.current = false;
    
    // Update batch status
    setBatch(prev => prev ? { ...prev, status: "generating", startedAt: Date.now() } : prev);
    
    // Get all pages that need generation (have prompts but no images)
    const pagesToGenerate: Array<{book: Book; page: BookPage}> = [];
    for (const book of batch.books) {
      for (const page of book.pages) {
        if (page.finalPrompt && !page.imageBase64 && page.status !== "generating") {
          pagesToGenerate.push({ book, page });
        }
      }
    }
    
    // Generate pages one by one (can be parallelized later)
    for (const { book, page } of pagesToGenerate) {
      if (generationAbortRef.current) break;
      
      // Wait if paused
      while (generationPaused && !generationAbortRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (generationAbortRef.current) break;
      
      await generateImageForPage(book, page);
    }
    
    setIsGeneratingImages(false);
    setBatch(prev => prev ? { ...prev, status: "completed", completedAt: Date.now() } : prev);
    
    if (!generationAbortRef.current) {
      toast.success("All images generated!");
    }
  };
  
  const pauseGeneration = () => {
    setGenerationPaused(true);
  };
  
  const resumeGeneration = () => {
    setGenerationPaused(false);
  };
  
  const stopGeneration = () => {
    generationAbortRef.current = true;
    setGenerationPaused(false);
    setIsGeneratingImages(false);
  };
  
  const retryFailedPages = async () => {
    if (!batch) return;
    
    // Reset failed pages
    setBatch(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        failedPages: 0,
        books: prev.books.map(b => ({
          ...b,
          pages: b.pages.map(p => 
            p.status === "failed" ? { ...p, status: "draft" as const, error: undefined } : p
          )
        }))
      };
    });
    
    // Start generation again
    await startGeneration();
  };
  
  // ==================== STEP 5: REVIEW & EXPORT ====================
  
  const [enhancingPageIds, setEnhancingPageIds] = useState<Set<string>>(new Set());
  const [selectedBookForExport, setSelectedBookForExport] = useState<string | null>(null);
  const [viewingPage, setViewingPage] = useState<{bookId: string; page: BookPage} | null>(null);
  
  const enhancePage = async (book: Book, page: BookPage) => {
    if (!page.imageBase64) return;
    
    setEnhancingPageIds(prev => new Set([...prev, page.id]));
    
    // Update page status
    setBatch(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        books: prev.books.map(b => 
          b.id === book.id 
            ? {
                ...b,
                pages: b.pages.map(p =>
                  p.id === page.id ? { ...p, status: "enhancing" as const } : p
                )
              }
            : b
        )
      };
    });
    
    try {
      const startTime = Date.now();
      
      const response = await fetch("/api/image/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: page.imageBase64,
          pageType: "coloring",
          scale: 2,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to enhance image");
      }
      
      const durationMs = Date.now() - startTime;
      
      // Update page with enhanced image
      setBatch(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          enhancedPages: prev.enhancedPages + 1,
          books: prev.books.map(b => 
            b.id === book.id 
              ? {
                  ...b,
                  pages: b.pages.map(p =>
                    p.id === page.id 
                      ? { 
                          ...p, 
                          status: "enhanced" as const,
                          enhancedImageBase64: data.enhancedBase64,
                          finalLetterBase64: data.finalLetterBase64,
                          activeVersion: "finalLetter" as const,
                          enhancedAt: Date.now(),
                          enhancementDurationMs: durationMs,
                        } 
                      : p
                  )
                }
              : b
          )
        };
      });
      
      toast.success(`Enhanced page ${page.index}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to enhance image");
      
      // Reset status
      setBatch(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          books: prev.books.map(b => 
            b.id === book.id 
              ? {
                  ...b,
                  pages: b.pages.map(p =>
                    p.id === page.id ? { ...p, status: "generated" as const } : p
                  )
                }
              : b
          )
        };
      });
    } finally {
      setEnhancingPageIds(prev => {
        const next = new Set(prev);
        next.delete(page.id);
        return next;
      });
    }
  };
  
  const enhanceAllPagesInBook = async (book: Book) => {
    const pagesToEnhance = book.pages.filter(p => p.imageBase64 && !p.enhancedImageBase64);
    
    for (const page of pagesToEnhance) {
      await enhancePage(book, page);
    }
    
    toast.success(`Enhanced all pages in "${book.title || 'Book'}"`);
  };
  
  const enhanceAllPagesInBatch = async () => {
    if (!batch) return;
    
    setIsEnhancing(true);
    
    for (const book of batch.books) {
      await enhanceAllPagesInBook(book);
    }
    
    setIsEnhancing(false);
    toast.success("All pages enhanced!");
  };
  
  const approvePage = (bookId: string, pageId: string) => {
    setBatch(prev => {
      if (!prev) return prev;
      const newApprovedCount = prev.books.reduce((sum, b) => 
        sum + b.pages.filter(p => p.id === pageId ? !p.approvedAt : p.approvedAt).length, 
        0
      );
      
      return {
        ...prev,
        approvedPages: newApprovedCount,
        books: prev.books.map(b => 
          b.id === bookId 
            ? {
                ...b,
                pages: b.pages.map(p =>
                  p.id === pageId 
                    ? { ...p, approvedAt: p.approvedAt ? undefined : Date.now(), status: "approved" as const } 
                    : p
                )
              }
            : b
        )
      };
    });
  };
  
  const regeneratePage = async (book: Book, page: BookPage) => {
    // Reset the page and regenerate
    setBatch(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        generatedPages: Math.max(0, prev.generatedPages - 1),
        books: prev.books.map(b => 
          b.id === book.id 
            ? {
                ...b,
                pages: b.pages.map(p =>
                  p.id === page.id 
                    ? { 
                        ...p, 
                        status: "draft" as const,
                        imageBase64: undefined,
                        enhancedImageBase64: undefined,
                        finalLetterBase64: undefined,
                        activeVersion: "original" as const,
                        approvedAt: undefined,
                      } 
                    : p
                )
              }
            : b
        )
      };
    });
    
    // Get the updated book and page
    const updatedBook = batch?.books.find(b => b.id === book.id);
    const updatedPage = updatedBook?.pages.find(p => p.id === page.id);
    
    if (updatedBook && updatedPage) {
      await generateImageForPage(updatedBook, { ...updatedPage, imageBase64: undefined });
    }
  };
  
  const downloadBookAsPdf = async (book: Book) => {
    // TODO: Implement PDF export using the existing export modal logic
    toast.info("PDF export coming soon!");
  };
  
  const downloadAllAsZip = async () => {
    // TODO: Implement ZIP download
    toast.info("ZIP download coming soon!");
  };
  
  // ==================== STATS ====================
  
  const approvedCount = bookIdeas.filter(i => i.isApproved).length;
  const totalPagesCount = bookIdeas.filter(i => i.isApproved).reduce((sum, i) => sum + i.pageCount, 0);
  
  // ==================== RENDER ====================
  
  return (
    <>
      <AppTopbar
        title="Bulk Book Creation"
        subtitle="Create multiple coloring books at once"
      />
      
      <main className="flex-1 overflow-auto">
        <div className="container max-w-6xl py-6">
          {/* Step Indicator */}
          <StepIndicator 
            currentStep={currentStep}
            onStepClick={setCurrentStep}
            canNavigateTo={canNavigateTo}
          />
          
          {/* Step Content */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Step 1: Book Ideas</h2>
                  <p className="text-muted-foreground">
                    Define up to {MAX_BOOKS_PER_BATCH} books with up to {MAX_PAGES_PER_BOOK} pages each
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm py-1 px-3">
                    {approvedCount} approved · {totalPagesCount} total pages
                  </Badge>
                </div>
              </div>
              
              {/* Action Bar */}
              <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg">
                <Button
                  variant="outline"
                  onClick={() => setShowIdeaGenerator(true)}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Ideas with AI
                </Button>
                <Button
                  variant="outline"
                  onClick={addBookIdea}
                  disabled={bookIdeas.length >= MAX_BOOKS_PER_BATCH}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Book ({bookIdeas.length}/{MAX_BOOKS_PER_BATCH})
                </Button>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  onClick={approveAllIdeas}
                  disabled={bookIdeas.every(i => i.isApproved)}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve All
                </Button>
              </div>
              
              {/* Book Ideas Grid */}
              <div className="grid gap-4">
                {bookIdeas.map((idea, idx) => (
                  <BookIdeaCard
                    key={idea.id}
                    idea={idea}
                    index={idx}
                    onUpdate={updateBookIdea}
                    onDelete={deleteBookIdea}
                    onApprove={approveBookIdea}
                    onRegenerate={() => {}}
                    isGenerating={isGeneratingIdeas}
                  />
                ))}
              </div>
              
              {/* Navigation */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={proceedToStep2}
                  disabled={approvedCount === 0}
                  size="lg"
                >
                  Continue to Page Plans
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
          
          {currentStep === 2 && batch && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Step 2: Page Plans</h2>
                  <p className="text-muted-foreground">
                    Plan the content for each page in your {batch.books.length} books
                  </p>
                </div>
                <Button
                  variant="default"
                  onClick={generateAllPageIdeasForBatch}
                  disabled={isGeneratingPageIdeas || generatingBookIds.size > 0}
                >
                  {isGeneratingPageIdeas ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating All...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate All Page Ideas
                    </>
                  )}
                </Button>
              </div>
              
              {/* Books with page lists */}
              <div className="space-y-6">
                {batch.books.map((book, bookIdx) => (
                  <Card key={book.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {book.bookType === "coloring_scenes" ? (
                              <Palette className="h-5 w-5 text-primary" />
                            ) : (
                              <Quote className="h-5 w-5 text-purple-500" />
                            )}
                            {book.title || `Book ${bookIdx + 1}`}
                          </CardTitle>
                          <CardDescription>
                            {book.pages.length} pages · {book.bookType === "coloring_scenes" ? "Coloring Scenes" : "Quote/Text"}
                          </CardDescription>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => generatePageIdeasForBook(book)}
                          disabled={generatingBookIds.has(book.id)}
                        >
                          {generatingBookIds.has(book.id) ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Wand2 className="mr-2 h-4 w-4" />
                              Generate All Page Ideas
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {book.pages.map((page, pageIdx) => (
                          <div
                            key={page.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${
                              page.isIdeaApproved ? "bg-green-50/50 border-green-200" : "bg-muted/30"
                            }`}
                          >
                            <div className={`
                              w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0
                              ${page.isIdeaApproved ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}
                            `}>
                              {page.isIdeaApproved ? <Check className="h-4 w-4" /> : pageIdx + 1}
                            </div>
                            <div className="flex-1">
                              <Textarea
                                value={page.ideaText}
                                onChange={(e) => {
                                  setBatch(prev => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      books: prev.books.map(b => 
                                        b.id === book.id 
                                          ? {
                                              ...b,
                                              pages: b.pages.map(p =>
                                                p.id === page.id ? { ...p, ideaText: e.target.value } : p
                                              )
                                            }
                                          : b
                                      )
                                    };
                                  });
                                }}
                                placeholder={book.bookType === "coloring_scenes" 
                                  ? `Scene ${pageIdx + 1}: Describe what happens...`
                                  : `Quote ${pageIdx + 1}: Enter your quote...`
                                }
                                className="min-h-[60px] text-sm"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setBatch(prev => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      books: prev.books.map(b => 
                                        b.id === book.id 
                                          ? {
                                              ...b,
                                              pages: b.pages.map(p =>
                                                p.id === page.id ? { ...p, isIdeaApproved: !p.isIdeaApproved } : p
                                              )
                                            }
                                          : b
                                      )
                                    };
                                  });
                                }}
                              >
                                <Check className={`h-4 w-4 ${page.isIdeaApproved ? "text-green-500" : ""}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Navigation */}
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={goToPrevStep}>
                  <ChevronLeft className="mr-2 h-5 w-5" />
                  Back to Book Ideas
                </Button>
                <Button
                  onClick={goToNextStep}
                  disabled={!canNavigateTo(3)}
                  size="lg"
                >
                  Continue to Prompts
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
          
          {currentStep === 3 && batch && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Step 3: Improve Prompts</h2>
                  <p className="text-muted-foreground">
                    Generate and approve detailed prompts for each page
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm py-1 px-3">
                    {promptsReadyCount} / {batch.totalPages} ready · {promptsApprovedCount} approved
                  </Badge>
                  <Button
                    variant="outline"
                    onClick={approveAllPromptsInBatch}
                    disabled={promptsReadyCount === 0 || promptsApprovedCount === batch.totalPages}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve All
                  </Button>
                  <Button
                    onClick={improveAllPromptsForBatch}
                    disabled={isImprovingPrompts || improvingBookIds.size > 0}
                  >
                    {isImprovingPrompts ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Improving...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Improve All Prompts
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Books with page prompts */}
              <div className="space-y-6">
                {batch.books.map((book, bookIdx) => {
                  const bookPromptsReady = book.pages.filter(p => p.finalPrompt && p.finalPrompt.trim() !== "").length;
                  const bookPromptsApproved = book.pages.filter(p => p.isPromptApproved).length;
                  const isBookImproving = improvingBookIds.has(book.id);
                  
                  return (
                    <Card key={book.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {book.bookType === "coloring_scenes" ? (
                                <Palette className="h-5 w-5 text-primary" />
                              ) : (
                                <Quote className="h-5 w-5 text-purple-500" />
                              )}
                              {book.title || `Book ${bookIdx + 1}`}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <span>{book.pages.length} pages</span>
                              <span>·</span>
                              <span className={bookPromptsReady === book.pages.length ? "text-green-600" : ""}>
                                {bookPromptsReady}/{book.pages.length} prompts ready
                              </span>
                              <span>·</span>
                              <span className={bookPromptsApproved === book.pages.length ? "text-green-600" : ""}>
                                {bookPromptsApproved} approved
                              </span>
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => approveAllPromptsInBook(book.id)}
                              disabled={bookPromptsReady === 0 || bookPromptsApproved === book.pages.length}
                            >
                              <Check className="mr-1 h-3 w-3" />
                              Approve All
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => improveAllPromptsForBook(book)}
                              disabled={isBookImproving || isImprovingPrompts}
                            >
                              {isBookImproving ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Improving...
                                </>
                              ) : (
                                <>
                                  <Wand2 className="mr-2 h-4 w-4" />
                                  Improve All
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {book.pages.map((page, pageIdx) => {
                            const isPageImproving = improvingPageIds.has(page.id);
                            const hasPrompt = page.finalPrompt && page.finalPrompt.trim() !== "";
                            
                            return (
                              <div
                                key={page.id}
                                className={`p-4 rounded-lg border ${
                                  page.isPromptApproved 
                                    ? "bg-green-50/50 border-green-200" 
                                    : hasPrompt 
                                      ? "bg-blue-50/30 border-blue-200" 
                                      : "bg-muted/30"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0
                                    ${page.isPromptApproved 
                                      ? "bg-green-500 text-white" 
                                      : hasPrompt 
                                        ? "bg-blue-500 text-white" 
                                        : "bg-muted text-muted-foreground"
                                    }
                                  `}>
                                    {page.isPromptApproved ? <Check className="h-4 w-4" /> : pageIdx + 1}
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    {/* Idea Text */}
                                    <div className="mb-2">
                                      <div className="text-xs font-medium text-muted-foreground mb-1">
                                        {book.bookType === "coloring_scenes" ? "Scene:" : "Quote:"}
                                      </div>
                                      <p className="text-sm">{page.ideaText || <span className="text-muted-foreground italic">No content</span>}</p>
                                    </div>
                                    
                                    {/* Generated Prompt */}
                                    {hasPrompt && (
                                      <div className="mt-3 pt-3 border-t">
                                        <div className="flex items-center justify-between mb-1">
                                          <div className="text-xs font-medium text-muted-foreground">
                                            Generated Prompt:
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs"
                                            onClick={() => {
                                              navigator.clipboard.writeText(page.finalPrompt);
                                              toast.success("Prompt copied!");
                                            }}
                                          >
                                            <Copy className="h-3 w-3 mr-1" />
                                            Copy
                                          </Button>
                                        </div>
                                        <div className="bg-muted/50 rounded p-2 max-h-24 overflow-y-auto">
                                          <p className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                                            {page.finalPrompt.slice(0, 300)}{page.finalPrompt.length > 300 ? "..." : ""}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Actions */}
                                  <div className="flex flex-col gap-1 flex-shrink-0">
                                    {hasPrompt && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => approvePrompt(book.id, page.id)}
                                      >
                                        <Check className={`h-4 w-4 ${page.isPromptApproved ? "text-green-500" : ""}`} />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => improvePromptForPage(book, page)}
                                      disabled={isPageImproving || !page.ideaText}
                                    >
                                      {isPageImproving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <RefreshCw className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={goToPrevStep}>
                  <ChevronLeft className="mr-2 h-5 w-5" />
                  Back to Page Plans
                </Button>
                <Button onClick={goToNextStep} disabled={!canNavigateTo(4)} size="lg">
                  Start Generation
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
          
          {currentStep === 4 && batch && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Step 4: Generate Images</h2>
                  <p className="text-muted-foreground">
                    Generating {batch.totalPages} pages across {batch.books.length} books
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {batch.failedPages > 0 && (
                    <Button variant="outline" onClick={retryFailedPages} disabled={isGeneratingImages}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry Failed ({batch.failedPages})
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Progress Panel - New unified design */}
              <ProgressPanel
                phase={
                  isGeneratingImages 
                    ? generationPaused 
                      ? "paused" 
                      : "generating"
                    : batch.generatedPages === batch.totalPages 
                      ? "complete" 
                      : "idle"
                }
                current={batch.generatedPages}
                total={batch.totalPages}
                label={
                  isGeneratingImages 
                    ? generationPaused 
                      ? "Paused" 
                      : `Generating page ${batch.generatedPages + 1}...`
                    : batch.generatedPages === batch.totalPages 
                      ? "All pages generated!" 
                      : "Ready to generate"
                }
                estimatedSeconds={
                  isGeneratingImages && batch.avgGenerationMs > 0
                    ? Math.round(((batch.totalPages - batch.generatedPages) * batch.avgGenerationMs) / 1000)
                    : undefined
                }
                canPause={isGeneratingImages && !generationPaused}
                canCancel={isGeneratingImages}
                onPause={pauseGeneration}
                onResume={resumeGeneration}
                onCancel={stopGeneration}
              />
              
              {/* Start/Resume Button when not generating */}
              {!isGeneratingImages && batch.generatedPages < batch.totalPages && (
                <div className="flex justify-center pt-2">
                  <Button size="lg" onClick={startGeneration}>
                    <Play className="mr-2 h-5 w-5" />
                    {batch.generatedPages > 0 ? "Resume Generation" : "Start Generation"}
                  </Button>
                </div>
              )}
              
              <Card className="p-4">
              </Card>
              
              {/* Books with page thumbnails */}
              <div className="space-y-4">
                {batch.books.map((book, bookIdx) => {
                  const generatedCount = book.pages.filter(p => p.imageBase64).length;
                  const failedCount = book.pages.filter(p => p.status === "failed").length;
                  
                  return (
                    <Card key={book.id}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {book.bookType === "coloring_scenes" ? (
                              <Palette className="h-5 w-5 text-primary" />
                            ) : (
                              <Quote className="h-5 w-5 text-purple-500" />
                            )}
                            <div>
                              <CardTitle className="text-base">{book.title || `Book ${bookIdx + 1}`}</CardTitle>
                              <CardDescription className="text-xs">
                                {generatedCount}/{book.pages.length} generated
                                {failedCount > 0 && <span className="text-red-500 ml-2">({failedCount} failed)</span>}
                              </CardDescription>
                            </div>
                          </div>
                          <Progress 
                            value={(generatedCount / book.pages.length) * 100} 
                            className="w-32 h-2" 
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                          {book.pages.map((page) => {
                            const isCurrentlyGenerating = currentGeneratingPage?.bookId === book.id && currentGeneratingPage?.pageId === page.id;
                            
                            return (
                              <div
                                key={page.id}
                                className={`
                                  aspect-[3/4] rounded-lg border-2 overflow-hidden relative
                                  ${page.imageBase64 ? "border-green-300 bg-white" : ""}
                                  ${page.status === "generating" || isCurrentlyGenerating ? "border-primary bg-primary/5" : ""}
                                  ${page.status === "failed" ? "border-red-300 bg-red-50" : ""}
                                  ${!page.imageBase64 && page.status !== "generating" && page.status !== "failed" ? "border-muted bg-muted/30" : ""}
                                `}
                              >
                                {page.imageBase64 ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={`data:image/png;base64,${page.imageBase64}`}
                                    alt={`Page ${page.index}`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : page.status === "generating" || isCurrentlyGenerating ? (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                  </div>
                                ) : page.status === "failed" ? (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  </div>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-xs text-muted-foreground">{page.index}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={goToPrevStep} disabled={isGeneratingImages}>
                  <ChevronLeft className="mr-2 h-5 w-5" />
                  Back to Prompts
                </Button>
                <Button onClick={goToNextStep} disabled={!canNavigateTo(5)} size="lg">
                  Review & Export
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
          
          {currentStep === 5 && batch && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Step 5: Review & Export</h2>
                  <p className="text-muted-foreground">
                    Review, enhance, and export your coloring books
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm py-1 px-3">
                    {batch.generatedPages} generated · {batch.enhancedPages} enhanced · {batch.approvedPages} approved
                  </Badge>
                  <Button 
                    variant="outline" 
                    onClick={enhanceAllPagesInBatch}
                    disabled={isEnhancing || batch.enhancedPages === batch.generatedPages}
                  >
                    {isEnhancing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Enhance All
                      </>
                    )}
                  </Button>
                  <Button onClick={downloadAllAsZip}>
                    <Download className="mr-2 h-4 w-4" />
                    Download All (ZIP)
                  </Button>
                </div>
              </div>
              
              {/* Books with page grids */}
              <div className="space-y-6">
                {batch.books.map((book, bookIdx) => {
                  const generatedCount = book.pages.filter(p => p.imageBase64).length;
                  const enhancedCount = book.pages.filter(p => p.enhancedImageBase64).length;
                  const approvedCount = book.pages.filter(p => p.approvedAt).length;
                  
                  return (
                    <Card key={book.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {book.bookType === "coloring_scenes" ? (
                              <Palette className="h-6 w-6 text-primary" />
                            ) : (
                              <Quote className="h-6 w-6 text-purple-500" />
                            )}
                            <div>
                              <CardTitle>{book.title || `Book ${bookIdx + 1}`}</CardTitle>
                              <CardDescription>
                                {generatedCount} pages · {enhancedCount} enhanced · {approvedCount} approved
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => enhanceAllPagesInBook(book)}
                              disabled={isEnhancing || enhancedCount === generatedCount}
                            >
                              <Sparkles className="mr-2 h-4 w-4" />
                              Enhance All
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => downloadBookAsPdf(book)}
                            >
                              <FileDown className="mr-2 h-4 w-4" />
                              Export PDF
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                          {book.pages.map((page) => {
                            const isPageEnhancing = enhancingPageIds.has(page.id);
                            const displayImage = page.finalLetterBase64 || page.enhancedImageBase64 || page.imageBase64;
                            
                            return (
                              <div
                                key={page.id}
                                className={`
                                  group relative aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all
                                  ${page.approvedAt ? "border-green-400 ring-2 ring-green-200" : "border-border"}
                                  ${isPageEnhancing ? "border-primary" : ""}
                                  hover:shadow-lg
                                `}
                              >
                                {displayImage ? (
                                  <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={`data:image/png;base64,${displayImage}`}
                                      alt={`Page ${page.index}`}
                                      className="w-full h-full object-cover bg-white"
                                    />
                                    
                                    {/* Status badges */}
                                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                                      {page.enhancedImageBase64 && (
                                        <Badge className="text-[10px] bg-purple-500">Enhanced</Badge>
                                      )}
                                      {page.approvedAt && (
                                        <Badge className="text-[10px] bg-green-500">Approved</Badge>
                                      )}
                                    </div>
                                    
                                    {/* Page number */}
                                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center">
                                      {page.index}
                                    </div>
                                    
                                    {/* Hover actions */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                      <Button 
                                        size="sm" 
                                        variant="secondary"
                                        onClick={() => setViewingPage({ bookId: book.id, page })}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="secondary"
                                        onClick={() => approvePage(book.id, page.id)}
                                      >
                                        <Check className={`h-4 w-4 ${page.approvedAt ? "text-green-500" : ""}`} />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="secondary"
                                        onClick={() => enhancePage(book, page)}
                                        disabled={isPageEnhancing || !!page.enhancedImageBase64}
                                      >
                                        {isPageEnhancing ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Sparkles className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="secondary"
                                        onClick={() => regeneratePage(book, page)}
                                      >
                                        <RefreshCw className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    
                                    {/* Enhancing overlay */}
                                    {isPageEnhancing && (
                                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30">
                                    <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                                    <span className="text-xs text-muted-foreground">Not generated</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={goToPrevStep}>
                  <ChevronLeft className="mr-2 h-5 w-5" />
                  Back to Generation
                </Button>
              </div>
            </div>
          )}
          
          {/* Image Preview Dialog */}
          <Dialog open={!!viewingPage} onOpenChange={() => setViewingPage(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Page {viewingPage?.page.index} Preview</DialogTitle>
              </DialogHeader>
              {viewingPage && (
                <div className="space-y-4">
                  <div className="aspect-[3/4] max-h-[60vh] rounded-lg overflow-hidden bg-white border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/png;base64,${
                        viewingPage.page.finalLetterBase64 || 
                        viewingPage.page.enhancedImageBase64 || 
                        viewingPage.page.imageBase64
                      }`}
                      alt={`Page ${viewingPage.page.index}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      {viewingPage.page.enhancedImageBase64 && (
                        <Badge variant="secondary">Enhanced</Badge>
                      )}
                      {viewingPage.page.finalLetterBase64 && (
                        <Badge variant="secondary">Letter Format</Badge>
                      )}
                      {viewingPage.page.approvedAt && (
                        <Badge className="bg-green-500">Approved</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => {
                          const book = batch?.books.find(b => b.id === viewingPage.bookId);
                          if (book) {
                            approvePage(book.id, viewingPage.page.id);
                          }
                        }}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        {viewingPage.page.approvedAt ? "Unapprove" : "Approve"}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          const book = batch?.books.find(b => b.id === viewingPage.bookId);
                          if (book && !viewingPage.page.enhancedImageBase64) {
                            enhancePage(book, viewingPage.page);
                          }
                        }}
                        disabled={!!viewingPage.page.enhancedImageBase64 || enhancingPageIds.has(viewingPage.page.id)}
                      >
                        {enhancingPageIds.has(viewingPage.page.id) ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enhancing...</>
                        ) : (
                          <><Sparkles className="mr-2 h-4 w-4" />Enhance</>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>
      
      {/* AI Idea Generator Dialog */}
      <Dialog open={showIdeaGenerator} onOpenChange={setShowIdeaGenerator}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Book Ideas with AI</DialogTitle>
            <DialogDescription>
              Let AI help you brainstorm unique coloring book concepts
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Number of Ideas</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={ideaCount}
                onChange={(e) => setIdeaCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Themes/Topics (optional)</label>
              <Input
                value={ideaThemes}
                onChange={(e) => setIdeaThemes(e.target.value)}
                placeholder="e.g., animals, fantasy, vehicles, nature..."
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated list</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Target Audience</label>
                <select
                  value={ideaAudience}
                  onChange={(e) => setIdeaAudience(e.target.value as AudienceType)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="kids">Kids (3-8)</option>
                  <option value="teens">Teens (9-16)</option>
                  <option value="adults">Adults</option>
                  <option value="all">All Ages</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Book Type</label>
                <select
                  value={ideaBookType}
                  onChange={(e) => setIdeaBookType(e.target.value as BookType | "both")}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="both">Both Types</option>
                  <option value="coloring_scenes">Coloring Scenes Only</option>
                  <option value="quote_text">Quote/Text Only</option>
                </select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIdeaGenerator(false)}>
              Cancel
            </Button>
            <Button onClick={generateBookIdeas} disabled={isGeneratingIdeas}>
              {isGeneratingIdeas ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
              ) : (
                <><Wand2 className="mr-2 h-4 w-4" />Generate Ideas</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

