"use client";

import { useState, useCallback } from "react";
import { AppTopbar } from "@/components/app/app-topbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { PageHeader } from "@/components/app/page-header";
import { SectionCard, SubSection } from "@/components/app/section-card";
import { StepIndicator, type Step } from "@/components/app/step-indicator";
import { OptionCard, OptionChip } from "@/components/app/option-card";
import { ProgressPanel, StatusBadge, formatEta } from "@/components/app/progress-panel";
import { EmptyState } from "@/components/app/empty-state";
import {
  Wand2,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Download,
  RefreshCw,
  Play,
  FileDown,
  Lightbulb,
  Palette,
  Layers,
  ArrowRight,
  Info,
  Copy,
  X,
  Plus,
  HelpCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ImagePreviewModal } from "@/components/app/image-preview-modal";

// Types
type StyleCloneStep = 1 | 2 | 3 | 4;

interface ExtractedStyle {
  artStyle: string;
  lineWeight: string;
  detailLevel: string;
  composition: string;
  mood: string;
  colorPalette: string;
  uniqueElements: string[];
  summary: string;
}

interface PageIdea {
  id: string;
  description: string;
  prompt?: string;
  status: "pending" | "generating" | "done" | "failed";
  imageBase64?: string;
  enhancedImageBase64?: string;
}

const STEPS = [
  { step: 1 as const, label: "Upload Reference", description: "Provide a style sample" },
  { step: 2 as const, label: "Extract Style", description: "AI analyzes your image" },
  { step: 3 as const, label: "Plan Pages", description: "Describe your pages" },
  { step: 4 as const, label: "Generate", description: "Create your book" },
];

const EXAMPLE_IDEAS = [
  "A unicorn flying through clouds",
  "A mermaid sitting on a rock",
  "A dragon guarding treasure",
  "A fairy garden with mushroom houses",
  "A princess in a magical castle",
  "An underwater adventure with fish",
];

export default function StyleClonePage() {
  // Step state
  const [currentStep, setCurrentStep] = useState<StyleCloneStep>(1);
  
  // Step 1: Reference image
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceFileName, setReferenceFileName] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  
  // Step 2: Style extraction
  const [extractedStyle, setExtractedStyle] = useState<ExtractedStyle | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [styleNotes, setStyleNotes] = useState("");
  
  // Step 3: Page planning
  const [pageIdeas, setPageIdeas] = useState<PageIdea[]>([]);
  const [pageCount, setPageCount] = useState(10);
  const [customTheme, setCustomTheme] = useState("");
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  
  // Step 4: Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [avgGenerateTime, setAvgGenerateTime] = useState(30);
  
  // Preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showStyleDetails, setShowStyleDetails] = useState(false);

  // ==================== STEP NAVIGATION ====================
  
  const canNavigateTo = useCallback((step: StyleCloneStep): boolean => {
    if (step === 1) return true;
    if (step === 2) return !!referenceImage;
    if (step === 3) return !!extractedStyle;
    if (step === 4) return pageIdeas.some(p => p.prompt);
    return false;
  }, [referenceImage, extractedStyle, pageIdeas]);

  // ==================== STEP 1: UPLOAD ====================

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }

    setIsUploading(true);
    setReferenceFileName(file.name);

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string)?.split(",")[1];
        setReferenceImage(base64);
        setIsUploading(false);
        toast.success("Image uploaded!");
      };
      reader.onerror = () => {
        toast.error("Failed to read image");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to upload image");
      setIsUploading(false);
    }
  };

  const clearReference = () => {
    setReferenceImage(null);
    setReferenceFileName("");
    setExtractedStyle(null);
    setPageIdeas([]);
  };

  // ==================== STEP 2: EXTRACT STYLE ====================

  const extractStyle = async () => {
    if (!referenceImage) return;

    setIsExtracting(true);

    try {
      const response = await fetch("/api/style-clone/extract-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: referenceImage }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract style");
      }

      setExtractedStyle(data.style);
      setCurrentStep(3);
      toast.success("Style extracted successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to extract style");
    } finally {
      setIsExtracting(false);
    }
  };

  // ==================== STEP 3: PAGE PLANNING ====================

  const generatePageIdeas = async () => {
    if (!extractedStyle) return;

    setIsGeneratingIdeas(true);

    try {
      const response = await fetch("/api/style-clone/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style: extractedStyle,
          styleNotes,
          theme: customTheme,
          pageCount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate ideas");
      }

      setPageIdeas(data.pages.map((p: { description: string; prompt: string }, idx: number) => ({
        id: `page-${idx + 1}`,
        description: p.description,
        prompt: p.prompt,
        status: "pending" as const,
      })));
      
      toast.success(`Generated ${data.pages.length} page ideas!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate ideas");
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  const addCustomPage = () => {
    setPageIdeas([
      ...pageIdeas,
      {
        id: `page-${Date.now()}`,
        description: "",
        status: "pending",
      },
    ]);
  };

  const updatePageIdea = (id: string, description: string) => {
    setPageIdeas(pageIdeas.map(p => 
      p.id === id ? { ...p, description } : p
    ));
  };

  const removePage = (id: string) => {
    setPageIdeas(pageIdeas.filter(p => p.id !== id));
  };

  // ==================== STEP 4: GENERATION ====================

  const generateAllPages = async () => {
    if (!extractedStyle || pageIdeas.length === 0) return;

    setIsGenerating(true);
    setCurrentStep(4);
    setGenerationProgress({ current: 0, total: pageIdeas.length });

    const startTime = Date.now();
    let successCount = 0;

    for (let i = 0; i < pageIdeas.length; i++) {
      const page = pageIdeas[i];
      const pageStartTime = Date.now();

      // Update status
      setPageIdeas(prev => prev.map(p => 
        p.id === page.id ? { ...p, status: "generating" } : p
      ));

      try {
        const response = await fetch("/api/style-clone/generate-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: page.prompt || page.description,
            style: extractedStyle,
            pageNumber: i + 1,
          }),
        });

        const data = await response.json();

        if (response.ok && data.imageBase64) {
          setPageIdeas(prev => prev.map(p => 
            p.id === page.id 
              ? { ...p, status: "done", imageBase64: data.imageBase64 }
              : p
          ));
          successCount++;

          // Update average time
          const duration = (Date.now() - pageStartTime) / 1000;
          setAvgGenerateTime(prev => (prev + duration) / 2);
        } else {
          setPageIdeas(prev => prev.map(p => 
            p.id === page.id ? { ...p, status: "failed" } : p
          ));
        }
      } catch {
        setPageIdeas(prev => prev.map(p => 
          p.id === page.id ? { ...p, status: "failed" } : p
        ));
      }

      setGenerationProgress({ current: i + 1, total: pageIdeas.length });
    }

    setIsGenerating(false);
    
    if (successCount === pageIdeas.length) {
      toast.success("All pages generated!");
    } else {
      toast.warning(`Generated ${successCount}/${pageIdeas.length} pages`);
    }
  };

  const regeneratePage = async (pageId: string) => {
    const page = pageIdeas.find(p => p.id === pageId);
    if (!page || !extractedStyle) return;

    setPageIdeas(prev => prev.map(p => 
      p.id === pageId ? { ...p, status: "generating" } : p
    ));

    try {
      const response = await fetch("/api/style-clone/generate-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: page.prompt || page.description,
          style: extractedStyle,
          pageNumber: pageIdeas.indexOf(page) + 1,
        }),
      });

      const data = await response.json();

      if (response.ok && data.imageBase64) {
        setPageIdeas(prev => prev.map(p => 
          p.id === pageId 
            ? { ...p, status: "done", imageBase64: data.imageBase64 }
            : p
        ));
        toast.success("Page regenerated!");
      } else {
        setPageIdeas(prev => prev.map(p => 
          p.id === pageId ? { ...p, status: "failed" } : p
        ));
        toast.error("Failed to regenerate page");
      }
    } catch {
      setPageIdeas(prev => prev.map(p => 
        p.id === pageId ? { ...p, status: "failed" } : p
      ));
      toast.error("Failed to regenerate page");
    }
  };

  // ==================== COMPUTED VALUES ====================

  const doneCount = pageIdeas.filter(p => p.status === "done").length;
  const remainingSeconds = isGenerating 
    ? (pageIdeas.length - generationProgress.current) * avgGenerateTime 
    : 0;

  // ==================== RENDER ====================

  return (
    <>
      <AppTopbar
        title="Style Clone"
        subtitle="Create pages that match your reference style"
      />

      <main className="flex-1 overflow-auto">
        <div className="container max-w-4xl py-6 space-y-6">
          {/* Page Header */}
          <PageHeader
            title="Style Clone"
            subtitle="Upload a reference image and generate pages that match its unique art style"
            icon={Palette}
            badge="Beta"
            actions={
              doneCount > 0 && (
                <Button size="sm">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export PDF
            </Button>
              )
            }
          />

          {/* Step Indicator */}
          <StepIndicator
            steps={STEPS}
            currentStep={currentStep}
            onStepClick={(step) => canNavigateTo(step as StyleCloneStep) && setCurrentStep(step as StyleCloneStep)}
            canNavigateTo={(step) => canNavigateTo(step as StyleCloneStep)}
            className="pb-2"
          />

          {/* Step 1: Upload Reference */}
          {currentStep === 1 && (
            <SectionCard
              title="Upload Reference Image"
              description="Provide a coloring page sample whose style you want to replicate"
              icon={Upload}
            >
              <div className="space-y-4">
                {!referenceImage ? (
                  <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all">
                    <div className="flex flex-col items-center justify-center py-6">
                      <div className="p-4 rounded-full bg-muted mb-4">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="mb-2 text-sm font-medium">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG or WEBP (max 10MB)
                      </p>
          </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                ) : (
                  <div className="relative">
                    <div className="aspect-[3/4] max-w-xs mx-auto rounded-lg overflow-hidden border bg-muted">
                      <img
                        src={`data:image/png;base64,${referenceImage}`}
                        alt="Reference"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={clearReference}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <p className="text-center text-sm text-muted-foreground mt-2">
                      {referenceFileName}
                    </p>
                  </div>
                )}

                {/* Tips */}
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Tips for best results
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Use a clear, high-quality coloring page image</li>
                    <li>• Black and white line art works best</li>
                    <li>• Avoid photos or colored images</li>
                    <li>• The AI will analyze line weight, detail level, and composition</li>
                  </ul>
                </div>

                {referenceImage && (
                  <Button onClick={() => setCurrentStep(2)} className="w-full" size="lg">
                    Continue to Style Extraction
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </SectionCard>
          )}

          {/* Step 2: Extract Style */}
          {currentStep === 2 && (
            <SectionCard
              title="Extract Art Style"
              description="Our AI will analyze the visual characteristics of your reference"
              icon={Sparkles}
            >
              <div className="space-y-4">
                {/* Reference preview */}
                <div className="flex gap-4">
                  <div className="w-32 h-40 rounded-lg overflow-hidden border bg-muted shrink-0">
                    {referenceImage && (
                      <img
                        src={`data:image/png;base64,${referenceImage}`}
                        alt="Reference"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    {!extractedStyle ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Click the button below to analyze your reference image. The AI will identify:
                        </p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          <li>Line weight and stroke style</li>
                          <li>Level of detail and complexity</li>
                          <li>Composition and layout patterns</li>
                          <li>Unique artistic elements</li>
                        </ul>
                <Button
                          onClick={extractStyle} 
                          disabled={isExtracting}
                          className="w-full"
                        >
                          {isExtracting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Analyzing Style...
                            </>
                          ) : (
                            <>
                              <Wand2 className="mr-2 h-4 w-4" />
                              Extract Style
                            </>
                  )}
                </Button>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <span className="font-medium">Style Extracted Successfully</span>
              </div>
                        <p className="text-sm text-muted-foreground">
                          {extractedStyle.summary}
                        </p>
                      <Button
                          variant="outline" 
                        size="sm"
                          onClick={() => setShowStyleDetails(!showStyleDetails)}
                        >
                          {showStyleDetails ? "Hide Details" : "View Details"}
                          {showStyleDetails ? (
                            <ChevronUp className="ml-2 h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-2 h-4 w-4" />
                          )}
                      </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Style details */}
                {showStyleDetails && extractedStyle && (
                  <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                    <h4 className="font-medium text-sm">Extracted Style Profile</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Art Style:</span>
                        <span className="ml-2 font-medium">{extractedStyle.artStyle}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Line Weight:</span>
                        <span className="ml-2 font-medium">{extractedStyle.lineWeight}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Detail Level:</span>
                        <span className="ml-2 font-medium">{extractedStyle.detailLevel}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Composition:</span>
                        <span className="ml-2 font-medium">{extractedStyle.composition}</span>
                      </div>
                    </div>
                    {extractedStyle.uniqueElements.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground">Unique Elements:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {extractedStyle.uniqueElements.map((el, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {el}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}

                {/* Style notes */}
                {extractedStyle && (
                  <>
                    <SubSection title="Additional Style Notes (Optional)">
              <Textarea
                        value={styleNotes}
                        onChange={(e) => setStyleNotes(e.target.value)}
                        placeholder="Add any specific style instructions or modifications..."
                        className="min-h-[80px]"
                      />
                    </SubSection>

                    <Button onClick={() => setCurrentStep(3)} className="w-full" size="lg">
                      Continue to Page Planning
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </SectionCard>
          )}

          {/* Step 3: Plan Pages */}
          {currentStep === 3 && (
            <SectionCard
              title="Plan Your Pages"
              description="Describe what you want on each page, or let AI generate ideas"
              icon={Layers}
              headerActions={
                pageIdeas.length > 0 && (
                  <Button size="sm" onClick={() => setCurrentStep(4)}>
                    <Play className="mr-2 h-4 w-4" />
                    Generate Pages
                </Button>
                )
              }
            >
              <div className="space-y-4">
                {/* AI Generator */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Wand2 className="h-4 w-4 text-primary" />
                    AI Page Generator
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Theme (optional)</label>
                      <Input
                        value={customTheme}
                        onChange={(e) => setCustomTheme(e.target.value)}
                        placeholder="e.g., Magical forest adventure"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Number of Pages</label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[pageCount]}
                          onValueChange={([v]) => setPageCount(v)}
                          min={5}
                          max={30}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-8 text-right">{pageCount}</span>
                      </div>
                    </div>
                  </div>

                <Button
                    onClick={generatePageIdeas}
                    disabled={isGeneratingIdeas || !extractedStyle}
                    className="w-full"
                  >
                    {isGeneratingIdeas ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Ideas...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate {pageCount} Page Ideas
                      </>
                    )}
                </Button>
                </div>

                {/* Page ideas list */}
                {pageIdeas.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Pages ({pageIdeas.length})</span>
                      <Button variant="ghost" size="sm" onClick={addCustomPage}>
                        <Plus className="mr-1 h-3 w-3" />
                        Add Page
                </Button>
              </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {pageIdeas.map((page, idx) => (
                        <div 
                          key={page.id}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium">
                            {idx + 1}
              </div>
                          <div className="flex-1 min-w-0">
                            <Input
                              value={page.description}
                              onChange={(e) => updatePageIdea(page.id, e.target.value)}
                              placeholder="Describe this page..."
                              className="border-0 p-0 h-auto text-sm focus-visible:ring-0 bg-transparent"
                          />
                        </div>
                          <StatusBadge stage={page.status as any} />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removePage(page.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                        </div>
                      </div>
                ) : (
                  <div className="py-8">
                    <EmptyState
                      icon={ImageIcon}
                      title="No pages yet"
                      description="Generate page ideas with AI or add them manually"
                      actionLabel="Add Page Manually"
                      onAction={addCustomPage}
                    />
                </div>
                )}

                {/* Example ideas */}
                {pageIdeas.length === 0 && (
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Example page ideas
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLE_IDEAS.map((idea, i) => (
                  <Button
                          key={i}
                    variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => setPageIdeas([
                            ...pageIdeas,
                            { id: `page-${Date.now()}`, description: idea, status: "pending" }
                          ])}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          {idea}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {pageIdeas.length > 0 && (
                  <Button onClick={() => { setCurrentStep(4); generateAllPages(); }} className="w-full" size="lg">
                    <Play className="mr-2 h-4 w-4" />
                    Generate {pageIdeas.length} Pages
                  </Button>
                )}
                </div>
            </SectionCard>
          )}

          {/* Step 4: Generation */}
          {currentStep === 4 && (
            <SectionCard
              title="Generate Pages"
              description={`Creating ${pageIdeas.length} pages in your extracted style`}
              icon={ImageIcon}
              headerActions={
                doneCount === pageIdeas.length && (
                  <Button size="sm">
                    <FileDown className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                )
              }
            >
              <div className="space-y-4">
                {/* Progress */}
                {(isGenerating || doneCount > 0) && (
                  <ProgressPanel
                    progress={{
                      totalItems: generationProgress.total,
                      completedItems: generationProgress.current,
                      phase: isGenerating ? "generating" : doneCount === pageIdeas.length ? "complete" : "idle",
                      estimatedSecondsRemaining: remainingSeconds,
                    }}
                  />
                )}

                {/* Pages grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {pageIdeas.map((page, idx) => (
                    <div
                      key={page.id}
                      className="group rounded-lg border bg-card overflow-hidden"
                    >
                      <div className="aspect-[3/4] bg-muted relative">
                        {page.imageBase64 ? (
                          <img
                            src={`data:image/png;base64,${page.imageBase64}`}
                            alt={`Page ${idx + 1}`}
                            className="w-full h-full object-contain cursor-pointer"
                            onClick={() => setPreviewImage(`data:image/png;base64,${page.imageBase64}`)}
                          />
                        ) : page.status === "generating" ? (
                          <div className="flex flex-col items-center justify-center h-full gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">Generating...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <ImageIcon className="h-10 w-10 opacity-20" />
                          </div>
                        )}
                        
                        {/* Overlay actions on hover */}
                        {page.status === "done" && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setPreviewImage(`data:image/png;base64,${page.imageBase64}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => regeneratePage(page.id)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">Page {idx + 1}</span>
                          <StatusBadge stage={page.status as any} />
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-1">
                          {page.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                {doneCount > 0 && !isGenerating && (
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      Download All
                    </Button>
                    <Button className="flex-1">
                      <FileDown className="mr-2 h-4 w-4" />
                      Export as PDF
                    </Button>
                  </div>
                )}
              </div>
            </SectionCard>
          )}
        </div>
      </main>

      {/* Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage}
          title="Page Preview"
          pageNumber={1}
        />
      )}
    </>
  );
}

