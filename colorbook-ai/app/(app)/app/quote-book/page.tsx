"use client";

import { useState, useCallback, useRef } from "react";
import { PageContainer } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { SectionCard, SubSection } from "@/components/app/section-card";
import { ProgressPanel, StatusBadge } from "@/components/app/progress-panel";
import {
  Sparkles,
  Loader2,
  Wand2,
  Quote,
  Download,
  RefreshCw,
  Eye,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  FileDown,
  Flower2,
  Star,
  Heart,
  Leaf,
  Hexagon,
  Smile,
  Type,
  Layers,
  Zap,
  Circle,
  Square,
  Frame,
  PanelTop,
  Trophy,
  Palette,
  Settings2,
  Code,
  X,
  Info,
  Tag,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ImagePreviewModal } from "@/components/app/image-preview-modal";
import { ExportPDFModal } from "@/components/app/export-pdf-modal";
import { 
  type JobProgress,
  type PageStage,
  updatePageStage,
} from "@/components/app/generation-progress";
import { cn } from "@/lib/utils";

// Types
type PageStatus = "pending" | "generating" | "done" | "failed";
type EnhanceStatus = "none" | "enhancing" | "enhanced" | "failed";
type ProcessingStatus = "none" | "processing" | "done" | "failed";

type DecorationLevel = "text_only" | "minimal_icons" | "border_only" | "full_background";
type IconSet = "stars" | "hearts" | "doodles" | "sports" | "kids";
type DecorationTheme = "floral" | "stars" | "mandala" | "hearts" | "nature" | "geometric" | "doodles" | "mixed";
type TypographyStyle = "bubble" | "script" | "block" | "mixed";
type DecorationDensity = "low" | "medium" | "high";
type BookType = "different_quotes" | "same_quote_variations";
type ToneType = "cute" | "bold" | "calm" | "funny" | "motivational" | "romantic" | "faith" | "sports" | "kids" | "inspirational";
type AudienceType = "kids" | "teens" | "adults" | "all";

type QuoteTopic = "ambition" | "self_love" | "confidence" | "family" | "friendship" | "love" | "gratitude" | "calm" | "sports" | "study" | "health" | "humor" | "faith" | "travel" | "creativity" | "nature_wonder" | "general";

interface PageState {
  page: number;
  quote: string;
  title: string;
  prompt: string;
  decorationTheme: DecorationTheme;
  decorationLevel: DecorationLevel;
  iconSet?: IconSet;
  topic?: QuoteTopic;
  keywords?: string[];
  motifPack?: string[];
  appliedSettings?: {
    decorationLevel: DecorationLevel;
    typographyStyle: TypographyStyle;
    iconSet?: IconSet;
    decorationTheme?: DecorationTheme;
    density: DecorationDensity;
    frameStyle: string;
  };
  status: PageStatus;
  imageBase64?: string;
  error?: string;
  enhancedImageBase64?: string;
  enhanceStatus: EnhanceStatus;
  finalLetterBase64?: string;
  finalLetterStatus: ProcessingStatus;
  activeVersion: "original" | "enhanced" | "finalLetter";
}

// Decoration level options with icons
const DECORATION_LEVEL_OPTIONS: {
  value: DecorationLevel;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "text_only",
    label: "Text Only",
    description: "Clean typography, no decorations",
    icon: <Type className="h-5 w-5" />,
  },
  {
    value: "minimal_icons",
    label: "Minimal Icons",
    description: "Text + small icons (fast)",
    icon: <Star className="h-5 w-5" />,
  },
  {
    value: "border_only",
    label: "Border Only",
    description: "Text + decorative border",
    icon: <Frame className="h-5 w-5" />,
  },
  {
    value: "full_background",
    label: "Full Background",
    description: "Text + detailed background",
    icon: <Flower2 className="h-5 w-5" />,
  },
];

// Icon set options
const ICON_SET_OPTIONS: { value: IconSet; label: string; icon: React.ReactNode }[] = [
  { value: "stars", label: "Stars & Sparkles", icon: <Star className="h-4 w-4" /> },
  { value: "hearts", label: "Hearts", icon: <Heart className="h-4 w-4" /> },
  { value: "doodles", label: "Simple Doodles", icon: <Circle className="h-4 w-4" /> },
  { value: "sports", label: "Sports Icons", icon: <Trophy className="h-4 w-4" /> },
  { value: "kids", label: "Kid-Friendly", icon: <Smile className="h-4 w-4" /> },
];

// Theme icons for full_background mode
const THEME_ICONS: Record<DecorationTheme, React.ReactNode> = {
  floral: <Flower2 className="h-4 w-4" />,
  stars: <Star className="h-4 w-4" />,
  mandala: <Hexagon className="h-4 w-4" />,
  hearts: <Heart className="h-4 w-4" />,
  nature: <Leaf className="h-4 w-4" />,
  geometric: <Square className="h-4 w-4" />,
  doodles: <Smile className="h-4 w-4" />,
  mixed: <Layers className="h-4 w-4" />,
};

// Tone options
const TONE_OPTIONS: { value: ToneType; label: string }[] = [
  { value: "motivational", label: "Motivational" },
  { value: "inspirational", label: "Inspirational" },
  { value: "cute", label: "Cute" },
  { value: "bold", label: "Bold" },
  { value: "calm", label: "Calm" },
  { value: "funny", label: "Funny" },
  { value: "romantic", label: "Romantic" },
  { value: "faith", label: "Faith" },
  { value: "sports", label: "Sports" },
  { value: "kids", label: "Kids" },
];

export default function QuoteBookPage() {
  // ==================== State ====================
  
  // Step 1: Quote input
  const [quotesText, setQuotesText] = useState("");
  const [generatingQuotes, setGeneratingQuotes] = useState(false);
  
  // Quote generation settings
  const [quoteTone, setQuoteTone] = useState<ToneType>("motivational");
  const [quoteAudience, setQuoteAudience] = useState<AudienceType>("all");
  const [quoteCount, setQuoteCount] = useState(10);
  const [customTheme, setCustomTheme] = useState(""); // Custom theme for AI generation
  
  // Anti-repetition: track all generated quotes
  const previousQuotesRef = useRef<string[]>([]);

  // Step 2: Style settings
  const [bookType, setBookType] = useState<BookType>("different_quotes");
  const [decorationLevel, setDecorationLevel] = useState<DecorationLevel>("minimal_icons");
  const [iconSet, setIconSet] = useState<IconSet>("stars");
  const [decorationTheme, setDecorationTheme] = useState<DecorationTheme>("floral");
  const [typographyStyle, setTypographyStyle] = useState<TypographyStyle>("bubble");
  const [density, setDensity] = useState<DecorationDensity>("medium");
  const [pageCount, setPageCount] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Step 3: Generated prompts and images
  const [pages, setPages] = useState<PageState[]>([]);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneratingPage, setCurrentGeneratingPage] = useState<number | null>(null);

  // Enhancement (deferred - not auto-run)
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Processing
  const [isProcessing, setIsProcessing] = useState(false);

  // Progress tracking with ETA
  const [jobProgress, setJobProgress] = useState<JobProgress>({
    totalPages: 0,
    pages: [],
    phase: "idle",
    avgGenerateSec: 30,
    avgEnhanceSec: 15,
    avgProcessSec: 5,
    generateDurations: [],
    enhanceDurations: [],
    processDurations: [],
  });

  // Preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Export PDF modal
  const [showExportModal, setShowExportModal] = useState(false);

  // View Prompt modal
  const [viewPromptPage, setViewPromptPage] = useState<PageState | null>(null);

  // ==================== Helpers ====================

  const safeJsonParse = async (response: Response) => {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(text.slice(0, 200) || "Unknown error");
    }
  };

  // ==================== Step 1: Quote Generation ====================

  const generateQuotes = async () => {
    setGeneratingQuotes(true);
    
    try {
      const response = await fetch("/api/quote/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicMode: customTheme.trim() ? "selected" : "any",
          tone: quoteTone,
          audience: quoteAudience,
          count: quoteCount,
          theme: customTheme.trim() || undefined, // Pass custom theme if provided
          excludeQuotes: previousQuotesRef.current.slice(-50),
        }),
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate quotes");
      }

      previousQuotesRef.current = [
        ...previousQuotesRef.current,
        ...data.quotes,
      ].slice(-100);

      setQuotesText(data.quotes.join("\n"));
      setPages([]);
      
      toast.success(`Generated ${data.quotes.length} unique quotes!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate quotes");
    } finally {
      setGeneratingQuotes(false);
    }
  };

  // ==================== Step 2: Generate Page Prompts ====================

  const generatePagePrompts = async () => {
    const quotes = quotesText
      .split("\n")
      .map(q => q.trim())
      .filter(q => q.length > 0);

    if (quotes.length === 0) {
      toast.error("Please enter at least one quote");
      return;
    }

    setGeneratingPrompts(true);
    
    try {
      const response = await fetch("/api/quote/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotes: bookType === "same_quote_variations" ? [quotes[0]] : quotes.slice(0, pageCount),
          bookType,
          decorationLevel,
          iconSet,
          decorationTheme,
          typographyStyle,
          density,
          frameStyle: decorationLevel === "border_only" ? "thin" : "none",
          variationCount: bookType === "same_quote_variations" ? pageCount : undefined,
        }),
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate prompts");
      }

      const pageStates: PageState[] = data.pages.map((p: {
        page: number;
        quote: string;
        title: string;
        prompt: string;
        decorationTheme: DecorationTheme;
        decorationLevel: DecorationLevel;
        iconSet?: IconSet;
        topic?: QuoteTopic;
        keywords?: string[];
        motifPack?: string[];
        appliedSettings?: {
          decorationLevel: DecorationLevel;
          typographyStyle: TypographyStyle;
          iconSet?: IconSet;
          decorationTheme?: DecorationTheme;
          density: DecorationDensity;
          frameStyle: string;
        };
      }) => ({
        ...p,
        status: "pending" as PageStatus,
        enhanceStatus: "none" as EnhanceStatus,
        finalLetterStatus: "none" as ProcessingStatus,
        activeVersion: "original" as const,
      }));

      setPages(pageStates);
      
      if (data.warnings?.length > 0) {
        toast.warning(`${data.warnings.length} quotes may be too long`);
      } else {
        toast.success(`Ready to generate ${pageStates.length} pages!`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate prompts");
    } finally {
      setGeneratingPrompts(false);
    }
  };

  // ==================== Step 3: Generate Images ====================

  const generatePreview = async () => {
    const pendingPages = pages.filter(p => p.status === "pending" || p.status === "failed").slice(0, 2);
    if (pendingPages.length === 0) {
      toast.info("Preview pages already generated!");
      return;
    }

    await generatePages(pendingPages);
  };

  const generateAllImages = async () => {
    const pendingPages = pages.filter(p => p.status === "pending" || p.status === "failed");
    if (pendingPages.length === 0) {
      toast.info("All pages already generated!");
      return;
    }

    await generatePages(pendingPages);
  };

  const toPageStage = (status: PageStatus, enhanceStatus: EnhanceStatus, processStatus: ProcessingStatus): PageStage => {
    if (processStatus === "done") return "done";
    if (processStatus === "processing") return "processing";
    if (enhanceStatus === "enhanced") return "enhanced";
    if (enhanceStatus === "enhancing") return "enhancing";
    if (status === "done") return "generated";
    if (status === "generating") return "generating";
    if (status === "failed") return "failed";
    return "queued";
  };

  const generatePages = async (pagesToGenerate: PageState[]) => {
    setIsGenerating(true);
    let successCount = 0;
    let failCount = 0;

    const totalPages = pages.length;
    setJobProgress(prev => ({
      ...prev,
      totalPages,
      pages: pages.map(p => ({
        page: p.page,
        stage: toPageStage(p.status, p.enhanceStatus, p.finalLetterStatus),
      })),
      phase: "generating",
      startedAt: Date.now(),
    }));

    toast.info(`Starting generation of ${pagesToGenerate.length} images...`);

    const concurrency = 2;
    const chunks: PageState[][] = [];
    for (let i = 0; i < pagesToGenerate.length; i += concurrency) {
      chunks.push(pagesToGenerate.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      setPages(prev => prev.map(p =>
        chunk.some(c => c.page === p.page) ? { ...p, status: "generating" as PageStatus } : p
      ));
      
      setJobProgress(prev => {
        let updated = prev;
        for (const pageItem of chunk) {
          updated = updatePageStage(updated, pageItem.page, "generating");
        }
        return updated;
      });

      const results = await Promise.allSettled(
        chunk.map(async (pageItem) => {
          const pageStartTime = Date.now();
          setCurrentGeneratingPage(pageItem.page);
          
          const response = await fetch("/api/batch/generate-one", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              page: pageItem.page,
              prompt: pageItem.prompt,
              size: "1024x1536",
              validateOutline: true,
            }),
          });

          const data = await safeJsonParse(response);
          const duration = (Date.now() - pageStartTime) / 1000;
          return { pageItem, response, data, duration };
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          const { pageItem, response, data, duration } = result.value;
          
          if (response.ok && data.status === "done" && data.imageBase64) {
            setPages(prev => prev.map(p =>
              p.page === pageItem.page
                ? { ...p, status: "done" as PageStatus, imageBase64: data.imageBase64 }
                : p
            ));
            
            setJobProgress(prev => updatePageStage(prev, pageItem.page, "generated", duration));
            successCount++;
          } else {
            setPages(prev => prev.map(p =>
              p.page === pageItem.page
                ? { ...p, status: "failed" as PageStatus, error: data.error || "Generation failed" }
                : p
            ));
            
            setJobProgress(prev => updatePageStage(prev, pageItem.page, "failed"));
            failCount++;
          }
        } else {
          failCount++;
        }
      }

      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    setIsGenerating(false);
    setCurrentGeneratingPage(null);
    
    setJobProgress(prev => ({
      ...prev,
      phase: failCount === pagesToGenerate.length ? "idle" : 
             pages.every(p => p.status === "done" || p.status === "failed") ? "complete" : "idle"
    }));

    if (failCount === 0) {
      toast.success(`All ${successCount} images generated!`);
    } else {
      toast.info(`Generated ${successCount} images, ${failCount} failed.`);
    }
  };

  const generateSinglePage = async (pageNumber: number) => {
    const page = pages.find(p => p.page === pageNumber);
    if (!page) return;

    setPages(prev => prev.map(p =>
      p.page === pageNumber ? { ...p, status: "generating" as PageStatus } : p
    ));
    setCurrentGeneratingPage(pageNumber);

    try {
      const response = await fetch("/api/batch/generate-one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: page.page,
          prompt: page.prompt,
          size: "1024x1536",
          validateOutline: true,
        }),
      });

      const data = await safeJsonParse(response);

      if (response.ok && data.status === "done" && data.imageBase64) {
        setPages(prev => prev.map(p =>
          p.page === pageNumber
            ? { ...p, status: "done" as PageStatus, imageBase64: data.imageBase64 }
            : p
        ));
        toast.success(`Page ${pageNumber} generated!`);
      } else {
        setPages(prev => prev.map(p =>
          p.page === pageNumber
            ? { ...p, status: "failed" as PageStatus, error: data.error || "Generation failed" }
            : p
        ));
        toast.error(`Page ${pageNumber} failed`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
      setPages(prev => prev.map(p =>
        p.page === pageNumber ? { ...p, status: "failed" as PageStatus } : p
      ));
    } finally {
      setCurrentGeneratingPage(null);
    }
  };

  // ==================== Enhancement (Deferred) ====================

  const enhanceAllPages = async () => {
    const pagesToEnhance = pages.filter(
      p => p.status === "done" && p.imageBase64 && p.enhanceStatus !== "enhanced"
    );

    if (pagesToEnhance.length === 0) {
      toast.info("All pages are already enhanced!");
      return;
    }

    setIsEnhancing(true);
    let successCount = 0;

    setJobProgress(prev => ({ ...prev, phase: "enhancing" }));

    toast.info(`Enhancing ${pagesToEnhance.length} pages for print quality...`);

    for (const page of pagesToEnhance) {
      const startTime = Date.now();
      
      setPages(prev => prev.map(p =>
        p.page === page.page ? { ...p, enhanceStatus: "enhancing" as EnhanceStatus } : p
      ));
      
      setJobProgress(prev => updatePageStage(prev, page.page, "enhancing"));

      try {
        const response = await fetch("/api/image/enhance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: page.imageBase64,
            scale: 2,
          }),
        });

        const data = await response.json();
        const duration = (Date.now() - startTime) / 1000;

        if (response.ok && data.enhancedImageBase64) {
          setPages(prev => prev.map(p =>
            p.page === page.page
              ? {
                  ...p,
                  enhancedImageBase64: data.enhancedImageBase64,
                  enhanceStatus: "enhanced" as EnhanceStatus,
                  activeVersion: "enhanced" as const,
                }
              : p
          ));
          
          setJobProgress(prev => updatePageStage(prev, page.page, "enhanced", duration));
          successCount++;
        } else {
          setPages(prev => prev.map(p =>
            p.page === page.page ? { ...p, enhanceStatus: "failed" as EnhanceStatus } : p
          ));
          
          setJobProgress(prev => updatePageStage(prev, page.page, "failed"));
        }
      } catch {
        setPages(prev => prev.map(p =>
          p.page === page.page ? { ...p, enhanceStatus: "failed" as EnhanceStatus } : p
        ));
        
        setJobProgress(prev => updatePageStage(prev, page.page, "failed"));
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsEnhancing(false);
    setJobProgress(prev => ({ ...prev, phase: "idle" }));

    if (successCount === pagesToEnhance.length) {
      toast.success(`All ${successCount} pages enhanced!`);
    } else {
      toast.warning(`Enhanced ${successCount}/${pagesToEnhance.length} pages`);
    }
  };

  // ==================== Processing ====================

  const processAllPages = async () => {
    const pagesToProcess = pages.filter(
      p => p.status === "done" && p.imageBase64 && p.finalLetterStatus !== "done"
    );

    if (pagesToProcess.length === 0) {
      toast.info("All pages are already processed!");
      return;
    }

    setIsProcessing(true);
    let successCount = 0;

    setJobProgress(prev => ({ ...prev, phase: "processing" }));

    toast.info(`Processing ${pagesToProcess.length} pages to print-ready format...`);

    for (const page of pagesToProcess) {
      const startTime = Date.now();
      
      setPages(prev => prev.map(p =>
        p.page === page.page ? { ...p, finalLetterStatus: "processing" as ProcessingStatus } : p
      ));
      
      setJobProgress(prev => updatePageStage(prev, page.page, "processing"));

      try {
        const response = await fetch("/api/image/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: page.imageBase64,
            enhance: true,
            enhanceScale: 2,
            marginPercent: 3,
            pageId: String(page.page),
          }),
        });

        const data = await response.json();
        const duration = (Date.now() - startTime) / 1000;

        if (response.ok && data.finalLetterBase64) {
          setPages(prev => prev.map(p =>
            p.page === page.page
              ? {
                  ...p,
                  enhancedImageBase64: data.enhancedBase64 || p.enhancedImageBase64,
                  enhanceStatus: data.wasEnhanced ? "enhanced" as EnhanceStatus : p.enhanceStatus,
                  finalLetterBase64: data.finalLetterBase64,
                  finalLetterStatus: "done" as ProcessingStatus,
                  activeVersion: "finalLetter" as const,
                }
              : p
          ));
          
          setJobProgress(prev => updatePageStage(prev, page.page, "done", duration));
          successCount++;
        } else {
          setPages(prev => prev.map(p =>
            p.page === page.page ? { ...p, finalLetterStatus: "failed" as ProcessingStatus } : p
          ));
          
          setJobProgress(prev => updatePageStage(prev, page.page, "failed"));
        }
      } catch {
        setPages(prev => prev.map(p =>
          p.page === page.page ? { ...p, finalLetterStatus: "failed" as ProcessingStatus } : p
        ));
        
        setJobProgress(prev => updatePageStage(prev, page.page, "failed"));
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsProcessing(false);
    setJobProgress(prev => ({ ...prev, phase: pages.every(p => p.finalLetterStatus === "done") ? "complete" : "idle" }));

    if (successCount === pagesToProcess.length) {
      toast.success(`All ${successCount} pages ready for print!`);
    } else {
      toast.warning(`Processed ${successCount}/${pagesToProcess.length} pages`);
    }
  };

  // ==================== Download ====================

  const downloadAll = () => {
    const donePages = pages.filter(p => p.status === "done" && p.imageBase64);
    if (donePages.length === 0) {
      toast.error("No images to download");
      return;
    }

    donePages.forEach((page, i) => {
      setTimeout(() => {
        const imageData = page.finalLetterBase64 || page.enhancedImageBase64 || page.imageBase64;
        const link = document.createElement("a");
        link.href = `data:image/png;base64,${imageData}`;
        link.download = `quote-page-${page.page}.png`;
        link.click();
      }, i * 500);
    });

    toast.success(`Downloading ${donePages.length} images...`);
  };

  // ==================== Render Helpers ====================

  const getStatusIcon = (status: PageStatus) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "generating": return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "done": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const doneCount = pages.filter(p => p.status === "done").length;
  const pendingCount = pages.filter(p => p.status === "pending" || p.status === "failed").length;
  const processedCount = pages.filter(p => p.finalLetterStatus === "done").length;
  const enhancedCount = pages.filter(p => p.enhanceStatus === "enhanced").length;

  // ==================== Render ====================

  return (
    <main className="flex-1 pt-16 lg:pt-0">
      <PageContainer maxWidth="lg">
        <div className="space-y-6">
          {/* Page Header */}
          <PageHeader
            title="Quote Coloring Book"
            subtitle="Transform inspiring quotes into beautiful typography coloring pages"
            icon={Quote}
            actions={
              doneCount > 0 && (
                <Button onClick={() => setShowExportModal(true)}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              )
            }
          />

          {/* Step 1: Quote Input */}
          <SectionCard
            title="Step 1: Your Quotes"
            description="Generate fresh quotes with AI or enter your own"
            icon={Quote}
            badge={quotesText.split("\n").filter(q => q.trim().length > 0).length > 0 
              ? `${quotesText.split("\n").filter(q => q.trim().length > 0).length} quotes` 
              : undefined}
          >
            <div className="space-y-5">
              {/* AI Quote Generator */}
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <span>AI Quote Generator</span>
                  </div>
                  
                  {/* Custom Theme Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Custom Theme (describe what kind of quotes you want)
                    </label>
                    <Input
                      value={customTheme}
                      onChange={(e) => setCustomTheme(e.target.value)}
                      placeholder="e.g., quotes about ocean adventures, beach life and surfing... or leave empty for general quotes"
                      className="h-10 rounded-xl"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Enter a specific theme and the AI will generate quotes that match it
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Tone</label>
                      <select
                        value={quoteTone}
                        onChange={(e) => setQuoteTone(e.target.value as ToneType)}
                        className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      >
                        {TONE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Audience</label>
                      <select
                        value={quoteAudience}
                        onChange={(e) => setQuoteAudience(e.target.value as AudienceType)}
                        className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      >
                        <option value="all">All Ages</option>
                        <option value="kids">Kids</option>
                        <option value="teens">Teens</option>
                        <option value="adults">Adults</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Count</label>
                      <Input
                        type="number"
                        value={quoteCount}
                        onChange={(e) => setQuoteCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 10)))}
                        min={1}
                        max={50}
                        className="h-10 rounded-xl"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={generateQuotes}
                        disabled={generatingQuotes}
                        className="w-full h-10 rounded-xl"
                      >
                        {generatingQuotes ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Wand2 className="mr-2 h-4 w-4" />
                        )}
                        {generatingQuotes ? "Generating..." : "Generate"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Manual Quote Input */}
              <SubSection title="Your Quotes" description="Enter one quote per line">
                <Textarea
                  value={quotesText}
                  onChange={(e) => {
                    setQuotesText(e.target.value);
                    setPages([]);
                  }}
                  placeholder="Enter your quotes here, one per line...&#10;&#10;Example:&#10;Believe in yourself&#10;You are enough&#10;Dream big, shine bright"
                  className="min-h-[140px] font-medium resize-none rounded-xl"
                />
              </SubSection>
            </div>
          </SectionCard>

          {/* Step 2: Style Settings */}
          <SectionCard
            title="Step 2: Style Settings"
            description="Choose the visual style for your quote pages"
            icon={Palette}
          >
            <div className="space-y-6">
              {/* Decoration Level - Primary Choice */}
              <SubSection 
                title="Decoration Level" 
                description="Controls how much decoration appears around your quotes"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {DECORATION_LEVEL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setDecorationLevel(option.value)}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all duration-150",
                        decorationLevel === option.value
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                          : "border-border hover:border-primary/40 hover:bg-muted/50"
                      )}
                    >
                      <div className={cn(
                        "mb-3 transition-colors",
                        decorationLevel === option.value ? "text-primary" : "text-muted-foreground"
                      )}>
                        {option.icon}
                      </div>
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{option.description}</div>
                    </button>
                  ))}
                </div>
                
                {decorationLevel === "text_only" && (
                  <Card className="mt-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Text Only Mode:</strong> Pages will contain ONLY the quote text with no decorations, 
                          icons, or borders. Perfect for clean, minimalist designs.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </SubSection>

              {/* Icon Set - Only show for minimal_icons */}
              {decorationLevel === "minimal_icons" && (
                <SubSection title="Icon Style" description="Choose the type of decorative icons">
                  <div className="flex flex-wrap gap-2">
                    {ICON_SET_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setIconSet(option.value)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all",
                          iconSet === option.value
                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        {option.icon}
                        <span className="text-sm font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </SubSection>
              )}

              {/* Theme - Only show for full_background */}
              {decorationLevel === "full_background" && (
                <SubSection title="Background Theme" description="Choose the decorative theme">
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                    {(["floral", "stars", "mandala", "hearts", "nature", "geometric", "doodles", "mixed"] as DecorationTheme[]).map((theme) => (
                      <button
                        key={theme}
                        onClick={() => setDecorationTheme(theme)}
                        className={cn(
                          "p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                          decorationTheme === theme
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        {THEME_ICONS[theme]}
                        <span className="text-xs capitalize font-medium">{theme}</span>
                      </button>
                    ))}
                  </div>
                </SubSection>
              )}

              {/* Book Type */}
              <SubSection title="Book Type">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setBookType("different_quotes")}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      bookType === "different_quotes"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className="font-medium text-sm">Different Quotes</div>
                    <div className="text-xs text-muted-foreground mt-1">Each page has a unique quote</div>
                  </button>
                  <button
                    onClick={() => setBookType("same_quote_variations")}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      bookType === "same_quote_variations"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className="font-medium text-sm">Quote Variations</div>
                    <div className="text-xs text-muted-foreground mt-1">Same quote, different designs</div>
                  </button>
                </div>
              </SubSection>

              {/* Typography Style */}
              <SubSection title="Typography Style">
                <div className="flex flex-wrap gap-2">
                  {(["bubble", "script", "block", "mixed"] as TypographyStyle[]).map((style) => (
                    <button
                      key={style}
                      onClick={() => setTypographyStyle(style)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all",
                        typographyStyle === style
                          ? "border-primary bg-primary/5 text-primary shadow-sm"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <Type className="h-4 w-4" />
                      <span className="text-sm font-medium capitalize">{style}</span>
                    </button>
                  ))}
                </div>
              </SubSection>

              {/* Advanced Settings Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <Settings2 className="h-4 w-4" />
                Advanced Settings
              </button>

              {showAdvanced && (
                <div className="space-y-4 pt-4 border-t">
                  {decorationLevel === "full_background" && (
                    <SubSection title="Decoration Density">
                      <div className="flex gap-2">
                        {(["low", "medium", "high"] as DecorationDensity[]).map((d) => (
                          <button
                            key={d}
                            onClick={() => setDensity(d)}
                            className={cn(
                              "px-4 py-2.5 rounded-xl border-2 transition-all",
                              density === d
                                ? "border-primary bg-primary/5 text-primary shadow-sm"
                                : "border-border hover:border-primary/40"
                            )}
                          >
                            <span className="text-sm font-medium capitalize">{d}</span>
                          </button>
                        ))}
                      </div>
                    </SubSection>
                  )}
                </div>
              )}

              {/* Page Count */}
              <SubSection title="Number of Pages">
                <div className="flex items-center gap-4">
                  <Slider
                    value={[pageCount]}
                    onValueChange={([value]) => setPageCount(value)}
                    min={1}
                    max={80}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-lg font-bold text-primary w-10 text-right">{pageCount}</span>
                </div>
              </SubSection>

              {/* Generate Prompts Button */}
              <Button
                onClick={generatePagePrompts}
                disabled={generatingPrompts || quotesText.trim().length === 0}
                className="w-full h-12 rounded-xl text-base"
                size="lg"
              >
                {generatingPrompts ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Preparing Pages...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-5 w-5" />
                    Prepare {pageCount} Pages
                  </>
                )}
              </Button>
            </div>
          </SectionCard>

          {/* Step 3: Generated Pages */}
          {pages.length > 0 && (
            <SectionCard
              title="Step 3: Generate & Export"
              description={`${doneCount} of ${pages.length} generated${processedCount > 0 ? ` • ${processedCount} print-ready` : ""}`}
              icon={Layers}
              headerActions={
                <div className="flex gap-2">
                  {doneCount === 0 && (
                    <Button
                      onClick={generatePreview}
                      disabled={isGenerating}
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      Quick Preview
                    </Button>
                  )}
                  <Button
                    onClick={generateAllImages}
                    disabled={isGenerating || pendingCount === 0}
                    size="sm"
                    className="rounded-xl"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Generate {pendingCount > 0 ? pendingCount : "All"}
                      </>
                    )}
                  </Button>
                </div>
              }
            >
              <div className="space-y-5">
                {/* Progress Bar */}
                {(isGenerating || isEnhancing || isProcessing) && (
                  <ProgressPanel
                    progress={{
                      totalItems: pages.length,
                      completedItems: isGenerating ? doneCount : isEnhancing ? enhancedCount : processedCount,
                      phase: isGenerating ? "generating" : isEnhancing ? "enhancing" : "processing",
                      message: isGenerating ? "Generating images..." : isEnhancing ? "Enhancing for print..." : "Processing...",
                      estimatedSecondsRemaining: (pages.length - (isGenerating ? doneCount : isEnhancing ? enhancedCount : processedCount)) * (isGenerating ? 30 : isEnhancing ? 15 : 5),
                    }}
                  />
                )}

                {/* Action buttons */}
                {doneCount > 0 && (
                  <Card className="border-border/50 bg-muted/30">
                    <CardContent className="p-4 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={enhanceAllPages}
                        disabled={isEnhancing || enhancedCount === doneCount}
                      >
                        {isEnhancing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        {isEnhancing ? "Enhancing..." : `Enhance (${enhancedCount}/${doneCount})`}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={processAllPages}
                        disabled={isProcessing || processedCount === doneCount}
                      >
                        {isProcessing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <PanelTop className="mr-2 h-4 w-4" />
                        )}
                        {isProcessing ? "Processing..." : `Print-Ready (${processedCount}/${doneCount})`}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={downloadAll}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download All
                      </Button>
                      <Button
                        size="sm"
                        className="ml-auto rounded-xl"
                        onClick={() => setShowExportModal(true)}
                      >
                        <FileDown className="mr-2 h-4 w-4" />
                        Export PDF
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Pages Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {pages.map((page) => (
                    <Card
                      key={page.page}
                      className="group overflow-hidden border-border/50 hover:shadow-lg transition-all duration-200"
                    >
                      {/* Image Preview */}
                      <div className="aspect-[3/4] bg-muted relative">
                        {page.imageBase64 ? (
                          <>
                            <img
                              src={`data:image/png;base64,${page.finalLetterBase64 || page.enhancedImageBase64 || page.imageBase64}`}
                              alt={`Page ${page.page}`}
                              className="w-full h-full object-contain cursor-pointer"
                              onClick={() => setPreviewImage(`data:image/png;base64,${page.finalLetterBase64 || page.enhancedImageBase64 || page.imageBase64}`)}
                            />
                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                              {page.enhanceStatus === "enhanced" && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-purple-500/90">
                                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                                  HD
                                </Badge>
                              )}
                              {page.finalLetterStatus === "done" && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-green-500">
                                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                  Print
                                </Badge>
                              )}
                            </div>
                          </>
                        ) : page.status === "generating" ? (
                          <div className="flex flex-col items-center justify-center h-full gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">Generating...</span>
                            <StatusBadge stage="generating" />
                          </div>
                        ) : page.enhanceStatus === "enhancing" ? (
                          <div className="flex flex-col items-center justify-center h-full gap-2">
                            <Sparkles className="h-8 w-8 animate-pulse text-purple-500" />
                            <span className="text-xs text-muted-foreground">Enhancing...</span>
                            <StatusBadge stage="enhancing" />
                          </div>
                        ) : page.finalLetterStatus === "processing" ? (
                          <div className="flex flex-col items-center justify-center h-full gap-2">
                            <PanelTop className="h-8 w-8 animate-pulse text-orange-500" />
                            <span className="text-xs text-muted-foreground">Processing...</span>
                            <StatusBadge stage="processing" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Quote className="h-10 w-10 opacity-20" />
                            <StatusBadge stage="queued" />
                          </div>
                        )}
                      </div>

                      {/* Page Info */}
                      <CardContent className="p-3 border-t">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            {getStatusIcon(page.status)}
                            <span className="text-xs font-medium">Page {page.page}</span>
                          </div>
                          {page.topic && page.topic !== "general" && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0">
                              {page.topic.replace("_", " ")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1" title={page.quote}>
                          {page.quote}
                        </p>
                        
                        {/* Actions */}
                        <div className="flex gap-1 mt-2">
                          {page.status === "done" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1 h-7 text-xs"
                                onClick={() => setPreviewImage(`data:image/png;base64,${page.imageBase64}`)}
                                title="View image"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1 h-7 text-xs"
                                onClick={() => generateSinglePage(page.page)}
                                title="Regenerate"
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1 h-7 text-xs"
                                onClick={() => setViewPromptPage(page)}
                                title="View prompt"
                              >
                                <Code className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {(page.status === "pending" || page.status === "failed") && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-7 text-xs"
                                onClick={() => generateSinglePage(page.page)}
                                disabled={isGenerating}
                              >
                                <Play className="mr-1 h-3 w-3" />
                                Generate
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={() => setViewPromptPage(page)}
                                title="View prompt"
                              >
                                <Code className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      </PageContainer>

      {/* Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage}
          title="Quote Page Preview"
          pageNumber={1}
        />
      )}

      {/* Export PDF Modal */}
      <ExportPDFModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        coloringPages={pages
          .filter(p => p.status === "done" && p.imageBase64)
          .map(p => ({
            page: p.page,
            imageBase64: p.imageBase64!,
            enhancedImageBase64: p.enhancedImageBase64,
            finalLetterBase64: p.finalLetterBase64,
            activeVersion: p.activeVersion,
            finalLetterStatus: p.finalLetterStatus,
          }))}
        defaultTitle="My Quote Coloring Book"
        onProcessPages={processAllPages}
      />

      {/* View Prompt Modal */}
      <Dialog open={!!viewPromptPage} onOpenChange={(open) => !open && setViewPromptPage(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Prompt for Page {viewPromptPage?.page}
            </DialogTitle>
          </DialogHeader>
          
          {viewPromptPage && (
            <div className="flex-1 overflow-auto space-y-4">
              {/* Quote */}
              <Card className="border-border/50 bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Quote className="h-4 w-4" />
                    Quote
                  </div>
                  <p className="text-sm">&ldquo;{viewPromptPage.quote}&rdquo;</p>
                </CardContent>
              </Card>

              {/* Applied Settings */}
              {viewPromptPage.appliedSettings && (
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-3">
                      <Settings2 className="h-4 w-4" />
                      Applied Settings
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Decoration Level:</span>{" "}
                        <span className="font-medium">{viewPromptPage.appliedSettings.decorationLevel.replace("_", " ")}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Typography:</span>{" "}
                        <span className="font-medium">{viewPromptPage.appliedSettings.typographyStyle}</span>
                      </div>
                      {viewPromptPage.appliedSettings.iconSet && (
                        <div>
                          <span className="text-muted-foreground">Icons:</span>{" "}
                          <span className="font-medium">{viewPromptPage.appliedSettings.iconSet}</span>
                        </div>
                      )}
                      {viewPromptPage.appliedSettings.decorationTheme && (
                        <div>
                          <span className="text-muted-foreground">Theme:</span>{" "}
                          <span className="font-medium">{viewPromptPage.appliedSettings.decorationTheme}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Density:</span>{" "}
                        <span className="font-medium">{viewPromptPage.appliedSettings.density}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Topic & Motifs */}
              {(viewPromptPage.topic || viewPromptPage.motifPack) && (
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-3">
                      <Tag className="h-4 w-4" />
                      Topic & Motifs (Auto-detected)
                    </div>
                    {viewPromptPage.topic && (
                      <div className="text-xs mb-2">
                        <span className="text-muted-foreground">Topic:</span>{" "}
                        <Badge variant="secondary" className="text-xs">
                          {viewPromptPage.topic.replace("_", " ")}
                        </Badge>
                      </div>
                    )}
                    {viewPromptPage.motifPack && viewPromptPage.motifPack.length > 0 && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Allowed Motifs:</span>{" "}
                        <span className="font-medium">{viewPromptPage.motifPack.slice(0, 8).join(", ")}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Full Prompt */}
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm font-medium mb-3">
                    <Info className="h-4 w-4" />
                    Full Prompt Sent to AI
                  </div>
                  <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/50 p-4 rounded-xl max-h-[300px] overflow-auto">
                    {viewPromptPage.prompt}
                  </pre>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
