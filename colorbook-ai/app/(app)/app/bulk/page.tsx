"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AppTopbar } from "@/components/app/app-topbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
    if (step === 3) return batch !== null && batch.books.every(b => b.pages.every(p => p.isIdeaApproved));
    if (step === 4) return batch !== null && batch.books.every(b => b.pages.every(p => p.isPromptApproved));
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
                <Button>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Improve All Prompts
                </Button>
              </div>
              
              <Card className="p-8 text-center text-muted-foreground">
                <Wand2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Prompt improvement UI coming soon...</p>
                <p className="text-sm mt-2">Use "Improve All Prompts" to generate detailed prompts</p>
              </Card>
              
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
              </div>
              
              {/* Progress */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isGeneratingImages ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">
                        {isGeneratingImages ? "Generating..." : "Ready to start"}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {batch.generatedPages} / {batch.totalPages} pages
                    </span>
                  </div>
                  <Progress value={(batch.generatedPages / batch.totalPages) * 100} className="h-3" />
                  
                  {!isGeneratingImages && (
                    <div className="flex justify-center pt-4">
                      <Button size="lg" onClick={() => setIsGeneratingImages(true)}>
                        <Play className="mr-2 h-5 w-5" />
                        Start Generation
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
              
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={goToPrevStep}>
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
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Enhance All
                  </Button>
                  <Button>
                    <Download className="mr-2 h-4 w-4" />
                    Download All (ZIP)
                  </Button>
                </div>
              </div>
              
              <Card className="p-8 text-center text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Review & Export UI coming soon...</p>
                <p className="text-sm mt-2">Your generated books will appear here</p>
              </Card>
              
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={goToPrevStep}>
                  <ChevronLeft className="mr-2 h-5 w-5" />
                  Back to Generation
                </Button>
              </div>
            </div>
          )}
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

