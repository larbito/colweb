"use client";

import { useState, useCallback } from "react";
import { AppTopbar } from "@/components/app/app-topbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
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
  Edit3,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Check,
  X,
  FileDown,
  Flower2,
  Star,
  Heart,
  Leaf,
  Hexagon,
  Smile,
  Type,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { ImagePreviewModal } from "@/components/app/image-preview-modal";
import { ExportPDFModal } from "@/components/app/export-pdf-modal";

// Types
type PageStatus = "pending" | "generating" | "done" | "failed";
type EnhanceStatus = "none" | "enhancing" | "enhanced" | "failed";
type ProcessingStatus = "none" | "processing" | "done" | "failed";

type DecorationTheme = "floral" | "stars" | "mandala" | "hearts" | "nature" | "geometric" | "doodles" | "mixed";
type TypographyStyle = "bubble" | "script" | "block" | "mixed";
type DecorationDensity = "low" | "medium" | "high";
type BookType = "different_quotes" | "same_quote_variations";

interface PageState {
  page: number;
  quote: string;
  title: string;
  prompt: string;
  decorationTheme: DecorationTheme;
  status: PageStatus;
  imageBase64?: string;
  error?: string;
  isEditing?: boolean;
  enhancedImageBase64?: string;
  enhanceStatus: EnhanceStatus;
  finalLetterBase64?: string;
  finalLetterStatus: ProcessingStatus;
  activeVersion: "original" | "enhanced" | "finalLetter";
}

interface GeneratedQuotes {
  quotes: string[];
  theme: string;
  tone: string;
}

// Theme icons
const THEME_ICONS: Record<DecorationTheme, React.ReactNode> = {
  floral: <Flower2 className="h-4 w-4" />,
  stars: <Star className="h-4 w-4" />,
  mandala: <Hexagon className="h-4 w-4" />,
  hearts: <Heart className="h-4 w-4" />,
  nature: <Leaf className="h-4 w-4" />,
  geometric: <Hexagon className="h-4 w-4" />,
  doodles: <Smile className="h-4 w-4" />,
  mixed: <Layers className="h-4 w-4" />,
};

export default function QuoteBookPage() {
  // ==================== State ====================
  
  // Step 1: Quote input
  const [quotesText, setQuotesText] = useState("");
  const [generatedQuotes, setGeneratedQuotes] = useState<GeneratedQuotes | null>(null);
  const [generatingQuotes, setGeneratingQuotes] = useState(false);
  
  // Quote generation settings
  const [quoteTheme, setQuoteTheme] = useState("self-love");
  const [quoteTone, setQuoteTone] = useState<"cute" | "elegant" | "bold" | "minimalist" | "inspirational">("inspirational");
  const [quoteAudience, setQuoteAudience] = useState<"kids" | "teens" | "adults" | "all">("all");
  const [quoteCount, setQuoteCount] = useState(10);
  const [previousQuotes, setPreviousQuotes] = useState<string[]>([]);

  // Step 2: Style settings
  const [bookType, setBookType] = useState<BookType>("different_quotes");
  const [decorationTheme, setDecorationTheme] = useState<DecorationTheme>("floral");
  const [typographyStyle, setTypographyStyle] = useState<TypographyStyle>("bubble");
  const [density, setDensity] = useState<DecorationDensity>("medium");
  const [pageCount, setPageCount] = useState(10);
  const [expandedSettings, setExpandedSettings] = useState(false);

  // Step 3: Generated prompts and images
  const [pages, setPages] = useState<PageState[]>([]);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Enhancement
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancingPageId, setEnhancingPageId] = useState<number | null>(null);
  
  // Processing
  const [isProcessing, setIsProcessing] = useState(false);

  // Preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Export PDF modal
  const [showExportModal, setShowExportModal] = useState(false);

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
      const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      
      const response = await fetch("/api/quote/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: quoteTheme,
          tone: quoteTone,
          audience: quoteAudience,
          count: quoteCount,
          previousQuotes: previousQuotes.slice(-20),
          seed,
        }),
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate quotes");
      }

      setGeneratedQuotes(data);
      setQuotesText(data.quotes.join("\n"));
      setPreviousQuotes(prev => [...prev, ...data.quotes].slice(-50));
      setPages([]);
      
      toast.success(`Generated ${data.quotes.length} quotes!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate quotes");
    } finally {
      setGeneratingQuotes(false);
    }
  };

  const useGeneratedQuotes = () => {
    if (generatedQuotes) {
      setQuotesText(generatedQuotes.quotes.join("\n"));
      setPages([]);
      toast.success("Quotes applied!");
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
          decorationTheme,
          typographyStyle,
          density,
          frameStyle: "none",
          variationCount: bookType === "same_quote_variations" ? pageCount : undefined,
        }),
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate prompts");
      }

      // Convert to page state
      const pageStates: PageState[] = data.pages.map((p: {
        page: number;
        quote: string;
        title: string;
        prompt: string;
        decorationTheme: DecorationTheme;
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
        toast.success(`Generated ${pageStates.length} page prompts!`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate prompts");
    } finally {
      setGeneratingPrompts(false);
    }
  };

  // ==================== Step 3: Generate Images ====================

  const generateAllImages = async () => {
    if (pages.length === 0) {
      toast.error("No prompts to generate");
      return;
    }

    const pendingPages = pages.filter(p => p.status === "pending" || p.status === "failed");
    if (pendingPages.length === 0) {
      toast.info("All pages already generated!");
      return;
    }

    setIsGenerating(true);
    let successCount = 0;
    let failCount = 0;

    toast.info(`Starting generation of ${pendingPages.length} images...`);

    for (const pageItem of pendingPages) {
      setPages(prev => prev.map(p =>
        p.page === pageItem.page ? { ...p, status: "generating" as PageStatus } : p
      ));

      try {
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

        if (response.ok && data.status === "done" && data.imageBase64) {
          setPages(prev => prev.map(p =>
            p.page === pageItem.page
              ? { ...p, status: "done" as PageStatus, imageBase64: data.imageBase64 }
              : p
          ));
          successCount++;
          toast.success(`Page ${pageItem.page} generated!`);
        } else {
          setPages(prev => prev.map(p =>
            p.page === pageItem.page
              ? { ...p, status: "failed" as PageStatus, error: data.error || "Generation failed" }
              : p
          ));
          failCount++;
        }
      } catch (error) {
        setPages(prev => prev.map(p =>
          p.page === pageItem.page
            ? { ...p, status: "failed" as PageStatus, error: error instanceof Error ? error.message : "Generation failed" }
            : p
        ));
        failCount++;
      }

      await new Promise(r => setTimeout(r, 300));
    }

    setIsGenerating(false);

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
    }
  };

  // ==================== Enhancement ====================

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

    for (const page of pagesToEnhance) {
      setEnhancingPageId(page.page);
      setPages(prev => prev.map(p =>
        p.page === page.page ? { ...p, enhanceStatus: "enhancing" as EnhanceStatus } : p
      ));

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
          successCount++;
        } else {
          setPages(prev => prev.map(p =>
            p.page === page.page ? { ...p, enhanceStatus: "failed" as EnhanceStatus } : p
          ));
        }
      } catch {
        setPages(prev => prev.map(p =>
          p.page === page.page ? { ...p, enhanceStatus: "failed" as EnhanceStatus } : p
        ));
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsEnhancing(false);
    setEnhancingPageId(null);

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

    toast.info(`Processing ${pagesToProcess.length} pages...`);

    for (const page of pagesToProcess) {
      setPages(prev => prev.map(p =>
        p.page === page.page ? { ...p, finalLetterStatus: "processing" as ProcessingStatus } : p
      ));

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
          successCount++;
        } else {
          setPages(prev => prev.map(p =>
            p.page === page.page ? { ...p, finalLetterStatus: "failed" as ProcessingStatus } : p
          ));
        }
      } catch {
        setPages(prev => prev.map(p =>
          p.page === page.page ? { ...p, finalLetterStatus: "failed" as ProcessingStatus } : p
        ));
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsProcessing(false);

    if (successCount === pagesToProcess.length) {
      toast.success(`All ${successCount} pages processed!`);
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
        const link = document.createElement("a");
        link.href = `data:image/png;base64,${page.imageBase64}`;
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
      case "generating": return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "done": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: PageStatus) => {
    const variants: Record<PageStatus, "secondary" | "default" | "destructive" | "outline"> = {
      pending: "secondary",
      generating: "default",
      done: "default",
      failed: "destructive",
    };
    return (
      <Badge variant={variants[status]} className="text-xs">
        {status}
      </Badge>
    );
  };

  const doneCount = pages.filter(p => p.status === "done").length;
  const pendingCount = pages.filter(p => p.status === "pending" || p.status === "failed").length;
  const processedCount = pages.filter(p => p.finalLetterStatus === "done").length;

  // ==================== Render ====================

  return (
    <>
      <AppTopbar
        title="Quote Coloring Book"
        subtitle="Create beautiful typography coloring pages"
      />

      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-6xl space-y-6">

          {/* Step 1: Quote Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Quote className="h-5 w-5" />
                Step 1: Your Quotes
              </CardTitle>
              <CardDescription>
                Enter quotes manually or generate them with AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quote Generation */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  AI Quote Generator
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Theme</label>
                    <Input
                      value={quoteTheme}
                      onChange={(e) => setQuoteTheme(e.target.value)}
                      placeholder="e.g. self-love, gratitude"
                      className="mt-1 h-9"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Tone</label>
                    <select
                      value={quoteTone}
                      onChange={(e) => setQuoteTone(e.target.value as typeof quoteTone)}
                      className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="inspirational">Inspirational</option>
                      <option value="cute">Cute</option>
                      <option value="elegant">Elegant</option>
                      <option value="bold">Bold</option>
                      <option value="minimalist">Minimalist</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Audience</label>
                    <select
                      value={quoteAudience}
                      onChange={(e) => setQuoteAudience(e.target.value as typeof quoteAudience)}
                      className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="all">All Ages</option>
                      <option value="kids">Kids</option>
                      <option value="teens">Teens</option>
                      <option value="adults">Adults</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Count</label>
                    <Input
                      type="number"
                      value={quoteCount}
                      onChange={(e) => setQuoteCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 10)))}
                      min={1}
                      max={50}
                      className="mt-1 h-9"
                    />
                  </div>
                </div>

                <Button
                  onClick={generateQuotes}
                  disabled={generatingQuotes}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {generatingQuotes ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Quotes...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Quotes
                    </>
                  )}
                </Button>
              </div>

              {/* Manual Quote Input */}
              <div>
                <label className="text-sm font-medium">Your Quotes (one per line)</label>
                <Textarea
                  value={quotesText}
                  onChange={(e) => {
                    setQuotesText(e.target.value);
                    setPages([]);
                  }}
                  placeholder="Enter your quotes here, one per line...&#10;&#10;Example:&#10;Believe in yourself&#10;You are enough&#10;Dream big, shine bright"
                  className="mt-1 min-h-[150px] font-medium"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {quotesText.split("\n").filter(q => q.trim().length > 0).length} quotes entered
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Style Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Step 2: Style Settings
              </CardTitle>
              <CardDescription>
                Configure the visual style for your quote pages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Book Type */}
              <div>
                <label className="text-sm font-medium">Book Type</label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setBookType("different_quotes")}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      bookType === "different_quotes"
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium text-sm">Different Quotes</div>
                    <div className="text-xs text-muted-foreground">Each page has a unique quote</div>
                  </button>
                  <button
                    onClick={() => setBookType("same_quote_variations")}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      bookType === "same_quote_variations"
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium text-sm">Quote Variations</div>
                    <div className="text-xs text-muted-foreground">Same quote, different designs</div>
                  </button>
                </div>
              </div>

              {/* Decoration Theme */}
              <div>
                <label className="text-sm font-medium">Decoration Theme</label>
                <div className="mt-2 grid grid-cols-4 md:grid-cols-8 gap-2">
                  {(["floral", "stars", "mandala", "hearts", "nature", "geometric", "doodles", "mixed"] as DecorationTheme[]).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => setDecorationTheme(theme)}
                      className={`p-2 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                        decorationTheme === theme
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {THEME_ICONS[theme]}
                      <span className="text-xs capitalize">{theme}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Typography Style */}
              <div>
                <label className="text-sm font-medium">Typography Style</label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {(["bubble", "script", "block", "mixed"] as TypographyStyle[]).map((style) => (
                    <button
                      key={style}
                      onClick={() => setTypographyStyle(style)}
                      className={`p-2 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                        typographyStyle === style
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Type className="h-4 w-4" />
                      <span className="text-sm capitalize">{style}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Settings */}
              <button
                onClick={() => setExpandedSettings(!expandedSettings)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                {expandedSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Advanced Settings
              </button>

              {expandedSettings && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-sm font-medium">Decoration Density</label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(["low", "medium", "high"] as DecorationDensity[]).map((d) => (
                        <button
                          key={d}
                          onClick={() => setDensity(d)}
                          className={`p-2 rounded-lg border-2 text-sm capitalize transition-all ${
                            density === d
                              ? "border-purple-500 bg-purple-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Page Count */}
              <div>
                <label className="text-sm font-medium">
                  Number of Pages: {pageCount}
                </label>
                <Slider
                  value={[pageCount]}
                  onValueChange={([value]) => setPageCount(value)}
                  min={1}
                  max={30}
                  step={1}
                  className="mt-2"
                />
              </div>

              {/* Generate Prompts Button */}
              <Button
                onClick={generatePagePrompts}
                disabled={generatingPrompts || quotesText.trim().length === 0}
                className="w-full"
                size="lg"
              >
                {generatingPrompts ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Prompts...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Page Prompts
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Step 3: Generated Pages */}
          {pages.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Quote className="h-5 w-5" />
                      Step 3: Review & Generate
                    </CardTitle>
                    <CardDescription>
                      {doneCount} done / {pages.length} total
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={generateAllImages}
                      disabled={isGenerating || pendingCount === 0}
                      size="sm"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Generate {pendingCount} Images
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Action buttons */}
                {doneCount > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={enhanceAllPages}
                      disabled={isEnhancing}
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={processAllPages}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Layers className="mr-2 h-4 w-4" />
                          Process to Letter ({processedCount}/{doneCount})
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadAll}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download All
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowExportModal(true)}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Export PDF
                    </Button>
                  </div>
                )}

                {/* Pages Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pages.map((page) => (
                    <div
                      key={page.page}
                      className="border rounded-lg overflow-hidden bg-white"
                    >
                      {/* Page Header */}
                      <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(page.status)}
                          <span className="font-medium text-sm">Page {page.page}</span>
                          {getStatusBadge(page.status)}
                        </div>
                        <div className="flex items-center gap-1">
                          {THEME_ICONS[page.decorationTheme]}
                        </div>
                      </div>

                      {/* Quote Preview */}
                      <div className="p-3 border-b bg-purple-50">
                        <p className="text-sm font-medium text-purple-900 line-clamp-2">
                          &ldquo;{page.quote}&rdquo;
                        </p>
                      </div>

                      {/* Image Preview */}
                      <div className="aspect-[3/4] bg-gray-100 relative">
                        {page.imageBase64 ? (
                          <>
                            <img
                              src={`data:image/png;base64,${page.finalLetterBase64 || page.enhancedImageBase64 || page.imageBase64}`}
                              alt={`Page ${page.page}`}
                              className="w-full h-full object-contain cursor-pointer"
                              onClick={() => setPreviewImage(`data:image/png;base64,${page.finalLetterBase64 || page.enhancedImageBase64 || page.imageBase64}`)}
                            />
                            {page.enhanceStatus === "enhanced" && (
                              <Badge className="absolute top-2 left-2 bg-green-500 text-xs">
                                Enhanced
                              </Badge>
                            )}
                            {page.finalLetterStatus === "done" && (
                              <Badge className="absolute top-2 right-2 bg-blue-500 text-xs">
                                Letter
                              </Badge>
                            )}
                          </>
                        ) : page.status === "generating" ? (
                          <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <Quote className="h-12 w-12 opacity-20" />
                          </div>
                        )}
                      </div>

                      {/* Page Actions */}
                      <div className="p-2 flex gap-2">
                        {page.status === "done" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1"
                              onClick={() => setPreviewImage(`data:image/png;base64,${page.imageBase64}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1"
                              onClick={() => generateSinglePage(page.page)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {(page.status === "pending" || page.status === "failed") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => generateSinglePage(page.page)}
                          >
                            <Play className="mr-1 h-4 w-4" />
                            Generate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

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
    </>
  );
}

