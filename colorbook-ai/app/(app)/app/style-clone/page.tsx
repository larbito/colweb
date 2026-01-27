"use client";

import { useState, useCallback } from "react";
import { AppTopbar } from "@/components/app/app-topbar";
import { WizardStepper } from "@/components/app/wizard-stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Loader2,
  Wand2,
  RefreshCw,
  ImageIcon,
  Upload,
  X,
  Copy,
  Eye,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Download,
  Users,
  Palette,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { ImagePreviewModal } from "@/components/app/image-preview-modal";
import { KDP_SIZE_PRESETS, type StyleContract, type ThemePack, type StyleClonePrompt, type StyleCloneMode } from "@/lib/styleClone";
import type { Complexity, LineThickness } from "@/lib/generationSpec";

const steps = [
  { id: 1, label: "Upload" },
  { id: 2, label: "Configure" },
  { id: 3, label: "Prompts" },
  { id: 4, label: "Generate" },
];

const complexities: { value: Complexity; label: string; desc: string }[] = [
  { value: "simple", label: "Simple", desc: "Ages 3-6, 2-4 props" },
  { value: "medium", label: "Medium", desc: "Ages 6-12, 4-8 props" },
  { value: "detailed", label: "Detailed", desc: "Older kids/adults" },
];

const thicknesses: { value: LineThickness; label: string; desc: string }[] = [
  { value: "thin", label: "Thin", desc: "Delicate lines" },
  { value: "medium", label: "Medium", desc: "Standard weight" },
  { value: "bold", label: "Bold", desc: "Thick, forgiving" },
];

interface PageImageState {
  imageUrl?: string;
  imageBase64?: string;
  isGenerating: boolean;
  error?: string;
  failedPrintSafe?: boolean;
  debug?: Record<string, unknown>;
}

interface FormState {
  referenceImageBase64: string | null;
  referenceImagePreview: string | null;
  mode: StyleCloneMode;
  themeText: string;
  pagesCount: number;
  complexity: Complexity;
  lineThickness: LineThickness;
  sizePreset: string;
  styleContract: (StyleContract & { extractedThemeGuess?: string }) | null;
  themePack: ThemePack | null;
  prompts: StyleClonePrompt[];
  pageImages: Record<number, PageImageState>;
  anchorApproved: boolean;
  anchorImageBase64: string | null;
  // Series mode character info
  characterName: string;
  characterDescription: string;
}

export default function StyleClonePage() {
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(true);

  // Loading states
  const [extractingStyle, setExtractingStyle] = useState(false);
  const [generatingThemePack, setGeneratingThemePack] = useState(false);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [generatingSample, setGeneratingSample] = useState(false);
  const [generatingRemaining, setGeneratingRemaining] = useState(false);

  // Preview modal
  const [previewPage, setPreviewPage] = useState<{ pageNumber: number; title: string; imageUrl: string } | null>(null);

  // Debug panel
  const [showDebug, setShowDebug] = useState(false);
  const [lastDebug, setLastDebug] = useState<Record<string, unknown> | null>(null);

  // Form state
  const [form, setForm] = useState<FormState>({
    referenceImageBase64: null,
    referenceImagePreview: null,
    mode: "series",
    themeText: "",
    pagesCount: 12,
    complexity: "simple",
    lineThickness: "bold",
    sizePreset: "8.5x11",
    styleContract: null,
    themePack: null,
    prompts: [],
    pageImages: {},
    anchorApproved: false,
    anchorImageBase64: null,
    characterName: "",
    characterDescription: "",
  });

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setTimeout(() => setSaved(true), 500);
  };

  // =====================
  // File Upload Handler
  // =====================
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG or JPG)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      updateForm("referenceImageBase64", base64);
      updateForm("referenceImagePreview", dataUrl);
      toast.success("Reference image uploaded!");
    };
    reader.readAsDataURL(file);
  }, []);

  const removeReferenceImage = () => {
    updateForm("referenceImageBase64", null);
    updateForm("referenceImagePreview", null);
    updateForm("styleContract", null);
  };

  // =====================
  // Extract Style from Reference
  // =====================
  const extractStyle = async () => {
    if (!form.referenceImageBase64) {
      toast.error("Please upload a reference image first");
      return;
    }

    setExtractingStyle(true);
    try {
      const response = await fetch("/api/style-clone/extract-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceImageBase64: form.referenceImageBase64,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to extract style");
      }

      const data = await response.json();
      updateForm("styleContract", data.styleContract);
      setLastDebug(data.debug);
      
      // Apply recommended settings
      if (data.styleContract.recommendedComplexity) {
        updateForm("complexity", data.styleContract.recommendedComplexity);
      }
      if (data.styleContract.recommendedLineThickness) {
        updateForm("lineThickness", data.styleContract.recommendedLineThickness);
      }

      toast.success("Style extracted! Settings auto-adjusted based on reference.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to extract style");
    } finally {
      setExtractingStyle(false);
    }
  };

  // =====================
  // Generate Theme Pack
  // =====================
  const generateThemePack = async () => {
    setGeneratingThemePack(true);
    try {
      const response = await fetch("/api/style-clone/theme-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeText: form.themeText || undefined,
          mode: form.mode,
          referenceImageBase64: form.referenceImageBase64,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate theme pack");
      }

      const data = await response.json();
      updateForm("themePack", data.themePack);
      setLastDebug(data.debug);
      toast.success("Theme pack generated!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate theme pack");
    } finally {
      setGeneratingThemePack(false);
    }
  };

  // =====================
  // Generate Prompts
  // =====================
  const generatePrompts = async () => {
    // Can use either styleContract (with extractedThemeGuess) or themePack
    if (!form.styleContract?.extractedThemeGuess && !form.themePack) {
      toast.error("Please extract style first or generate a theme pack");
      return;
    }

    setGeneratingPrompts(true);
    try {
      const response = await fetch("/api/style-clone/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleContract: form.styleContract,
          themePack: form.themePack,
          userTheme: form.themeText || undefined,
          mode: form.mode,
          pagesCount: form.pagesCount,
          complexity: form.complexity,
          characterName: form.mode === "series" ? form.characterName : undefined,
          characterDescription: form.mode === "series" ? form.characterDescription : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate prompts");
      }

      const data = await response.json();
      updateForm("prompts", data.prompts);
      setLastDebug(data.debug);
      toast.success(`Generated ${data.prompts.length} prompts!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate prompts");
    } finally {
      setGeneratingPrompts(false);
    }
  };

  // =====================
  // Regenerate Single Prompt
  // =====================
  const regeneratePrompt = async (pageIndex: number) => {
    if (!form.styleContract?.extractedThemeGuess && !form.themePack) return;

    const currentPrompt = form.prompts.find(p => p.pageIndex === pageIndex);
    
    setForm(prev => ({
      ...prev,
      prompts: prev.prompts.map(p => 
        p.pageIndex === pageIndex ? { ...p, isRegenerating: true } as StyleClonePrompt & { isRegenerating: boolean } : p
      ),
    }));

    try {
      const response = await fetch(`/api/style-clone/prompts/${pageIndex}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleContract: form.styleContract,
          themePack: form.themePack,
          mode: form.mode,
          complexity: form.complexity,
          previousTitle: currentPrompt?.title,
          previousPrompt: currentPrompt?.scenePrompt,
          existingTitles: form.prompts.map(p => p.title),
          characterName: form.mode === "series" ? form.characterName : undefined,
          characterDescription: form.mode === "series" ? form.characterDescription : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to regenerate prompt");
      }

      const data = await response.json();
      updateForm("prompts", form.prompts.map(p => 
        p.pageIndex === pageIndex ? data.prompt : p
      ));
      toast.success(`Page ${pageIndex} prompt regenerated!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to regenerate prompt");
    }
  };

  // =====================
  // Improve Single Prompt
  // =====================
  const improvePrompt = async (pageIndex: number) => {
    if (!form.styleContract?.extractedThemeGuess && !form.themePack) return;

    const currentPrompt = form.prompts.find(p => p.pageIndex === pageIndex);
    if (!currentPrompt) return;

    try {
      const response = await fetch(`/api/style-clone/prompts/${pageIndex}/improve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleContract: form.styleContract,
          themePack: form.themePack,
          complexity: form.complexity,
          currentTitle: currentPrompt.title,
          currentPrompt: currentPrompt.scenePrompt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to improve prompt");
      }

      const data = await response.json();
      updateForm("prompts", form.prompts.map(p => 
        p.pageIndex === pageIndex ? data.prompt : p
      ));
      toast.success(`Page ${pageIndex} prompt improved!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to improve prompt");
    }
  };

  // =====================
  // Generate Sample (Page 1)
  // =====================
  const generateSample = async () => {
    if (form.prompts.length === 0) {
      toast.error("No prompts to generate from");
      return;
    }

    setGeneratingSample(true);
    setForm(prev => ({
      ...prev,
      pageImages: {
        ...prev.pageImages,
        [1]: { isGenerating: true },
      },
    }));

    try {
      const firstPrompt = form.prompts[0];
      const response = await fetch("/api/style-clone/generate-sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenePrompt: firstPrompt.scenePrompt,
          themePack: form.themePack,
          styleContract: form.styleContract,
          complexity: form.complexity,
          lineThickness: form.lineThickness,
          sizePreset: form.sizePreset,
          mode: form.mode,
          characterName: form.mode === "series" ? form.characterName : undefined,
          characterDescription: form.mode === "series" ? form.characterDescription : undefined,
          referenceImageBase64: form.referenceImageBase64,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setLastDebug(error.debug);
        throw new Error(error.error || "Failed to generate sample");
      }

      const data = await response.json();
      setLastDebug(data.debug);
      
      const imageUrl = data.imageBase64 
        ? `data:image/png;base64,${data.imageBase64}` 
        : data.imageUrl;

      setForm(prev => ({
        ...prev,
        pageImages: {
          ...prev.pageImages,
          [1]: { 
            imageUrl, 
            imageBase64: data.imageBase64,
            isGenerating: false,
            debug: data.debug,
          },
        },
      }));

      toast.success("Sample generated! Review and approve to continue.");
    } catch (error) {
      setForm(prev => ({
        ...prev,
        pageImages: {
          ...prev.pageImages,
          [1]: { 
            isGenerating: false, 
            error: error instanceof Error ? error.message : "Failed",
            failedPrintSafe: true,
          },
        },
      }));
      toast.error(error instanceof Error ? error.message : "Failed to generate sample");
    } finally {
      setGeneratingSample(false);
    }
  };

  // =====================
  // Approve Sample
  // =====================
  const approveSample = () => {
    const sampleImage = form.pageImages[1];
    if (!sampleImage?.imageBase64 && !sampleImage?.imageUrl) {
      toast.error("No sample image to approve");
      return;
    }

    updateForm("anchorApproved", true);
    updateForm("anchorImageBase64", sampleImage.imageBase64 || null);
    toast.success("Sample approved! You can now generate remaining pages.");
  };

  // =====================
  // Generate Remaining Pages
  // =====================
  const generateRemaining = async () => {
    if (!form.anchorApproved) {
      toast.error("Please approve the sample first");
      return;
    }

    setGeneratingRemaining(true);

    // Mark all remaining pages as generating
    const updates: Record<number, PageImageState> = {};
    form.prompts.slice(1).forEach(p => {
      if (!form.pageImages[p.pageIndex]?.imageUrl) {
        updates[p.pageIndex] = { isGenerating: true };
      }
    });
    setForm(prev => ({
      ...prev,
      pageImages: { ...prev.pageImages, ...updates },
    }));

    try {
      const response = await fetch("/api/style-clone/generate-remaining", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompts: form.prompts.slice(1),
          themePack: form.themePack,
          styleContract: form.styleContract,
          complexity: form.complexity,
          lineThickness: form.lineThickness,
          sizePreset: form.sizePreset,
          mode: form.mode,
          characterName: form.mode === "series" ? form.characterName : undefined,
          characterDescription: form.mode === "series" ? form.characterDescription : undefined,
          anchorImageBase64: form.anchorImageBase64,
          skipPageIndices: Object.entries(form.pageImages)
            .filter(([, state]) => state.imageUrl)
            .map(([idx]) => parseInt(idx)),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate remaining pages");
      }

      const data = await response.json();
      
      // Update page images with results
      const imageUpdates: Record<number, PageImageState> = {};
      for (const img of data.images) {
        const imageUrl = img.imageBase64 
          ? `data:image/png;base64,${img.imageBase64}` 
          : img.imageUrl;
        
        imageUpdates[img.pageIndex] = {
          imageUrl,
          imageBase64: img.imageBase64,
          isGenerating: false,
          failedPrintSafe: !img.passedGates,
          debug: img.debug,
        };
      }

      setForm(prev => ({
        ...prev,
        pageImages: { ...prev.pageImages, ...imageUpdates },
      }));

      toast.success(`Generated ${data.successCount}/${data.totalRequested} pages!`);
      if (data.failCount > 0) {
        toast.warning(`${data.failCount} pages failed quality checks. You can regenerate them.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate pages");
    } finally {
      setGeneratingRemaining(false);
    }
  };

  // =====================
  // Regenerate Single Page
  // =====================
  const regeneratePage = async (pageIndex: number) => {
    const prompt = form.prompts.find(p => p.pageIndex === pageIndex);
    if (!prompt) return;

    setForm(prev => ({
      ...prev,
      pageImages: {
        ...prev.pageImages,
        [pageIndex]: { isGenerating: true },
      },
    }));

    try {
      const response = await fetch("/api/style-clone/generate-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageIndex,
          scenePrompt: prompt.scenePrompt,
          themePack: form.themePack,
          styleContract: form.styleContract,
          complexity: form.complexity,
          lineThickness: form.lineThickness,
          sizePreset: form.sizePreset,
          mode: form.mode,
          characterName: form.mode === "series" ? form.characterName : undefined,
          characterDescription: form.mode === "series" ? form.characterDescription : undefined,
          anchorImageBase64: form.anchorImageBase64,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to regenerate page");
      }

      const data = await response.json();
      const imageUrl = data.imageBase64 
        ? `data:image/png;base64,${data.imageBase64}` 
        : data.imageUrl;

      setForm(prev => ({
        ...prev,
        pageImages: {
          ...prev.pageImages,
          [pageIndex]: {
            imageUrl,
            imageBase64: data.imageBase64,
            isGenerating: false,
            failedPrintSafe: !data.passedGates,
            debug: data.debug,
          },
        },
      }));

      toast.success(`Page ${pageIndex} regenerated!`);
    } catch (error) {
      setForm(prev => ({
        ...prev,
        pageImages: {
          ...prev.pageImages,
          [pageIndex]: { 
            isGenerating: false, 
            error: error instanceof Error ? error.message : "Failed",
            failedPrintSafe: true,
          },
        },
      }));
      toast.error(error instanceof Error ? error.message : "Failed to regenerate page");
    }
  };

  // =====================
  // Helpers
  // =====================
  const canProceed = () => {
    switch (step) {
      case 1:
        return !!form.referenceImageBase64 && !!form.styleContract;
      case 2:
        // Need either styleContract with extractedThemeGuess OR themePack
        const hasThemeInfo = !!form.styleContract?.extractedThemeGuess || !!form.themePack;
        // For Series mode, also need character name
        const hasSeriesInfo = form.mode === "collection" || (form.mode === "series" && form.characterName.trim().length > 0);
        return hasThemeInfo && hasSeriesInfo;
      case 3:
        return form.prompts.length > 0;
      case 4:
        return form.anchorApproved;
      default:
        return true;
    }
  };

  const updatePromptText = (pageIndex: number, newPrompt: string) => {
    setForm(prev => ({
      ...prev,
      prompts: prev.prompts.map(p => 
        p.pageIndex === pageIndex ? { ...p, scenePrompt: newPrompt } : p
      ),
    }));
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied!");
  };

  const openPreview = (pageNumber: number, title: string, imageUrl: string) => {
    setPreviewPage({ pageNumber, title, imageUrl });
  };

  const generatedCount = Object.values(form.pageImages).filter(p => p.imageUrl).length;

  return (
    <>
      <AppTopbar title="Style Clone Generator" subtitle={saved ? "✓ Auto-saved" : "Saving..."} />

      <main className="p-4 lg:p-6">
        {/* Demo Mode Banner */}
        <div className="mx-auto max-w-5xl mb-6">
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">Demo Mode</p>
              <p className="text-sm text-muted-foreground">
                Projects are temporary and will expire after 6 hours. Data is not permanently stored.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl space-y-8">
          <WizardStepper steps={steps} currentStep={step} />

          <div className="min-h-[500px]">
            {/* =============== STEP 1: UPLOAD =============== */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Upload Reference Image 📸</h2>
                  <p className="text-muted-foreground">
                    Upload a coloring page you love. We&apos;ll extract its style for your new pages.
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Upload Area */}
                  <Card className="border-dashed border-2 border-border/50 bg-muted/30">
                    <CardContent className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
                      {form.referenceImagePreview ? (
                        <div className="relative w-full max-w-xs">
                          <img 
                            src={form.referenceImagePreview} 
                            alt="Reference" 
                            className="rounded-xl border border-border bg-white w-full"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                            onClick={removeReferenceImage}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                          <p className="mb-2 font-medium">Drop your reference image here</p>
                          <p className="mb-4 text-sm text-muted-foreground">PNG or JPG, max 10MB</p>
                          <label>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                            <Button asChild variant="outline" className="rounded-xl cursor-pointer">
                              <span>
                                <Upload className="mr-2 h-4 w-4" />
                                Choose File
                              </span>
                            </Button>
                          </label>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Tips */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Info className="h-4 w-4" /> Tips for Best Results
                    </h3>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                        <span>Use a clean, high-quality coloring page image</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                        <span>Black line art on white background works best</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                        <span>Avoid pages with lots of solid black areas</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                        <span>Don&apos;t upload copyrighted artwork</span>
                      </div>
                    </div>

                    {form.referenceImageBase64 && !form.styleContract && (
                      <Button 
                        onClick={extractStyle} 
                        disabled={extractingStyle}
                        className="w-full rounded-xl mt-4"
                      >
                        {extractingStyle ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing Style...</>
                        ) : (
                          <><Wand2 className="mr-2 h-4 w-4" /> Extract Style from Reference</>
                        )}
                      </Button>
                    )}

                    {form.styleContract && (
                      <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <span className="font-semibold text-green-700 dark:text-green-400">Style Extracted!</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{form.styleContract.styleSummary}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {form.styleContract.recommendedComplexity}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {form.styleContract.recommendedLineThickness} lines
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* =============== STEP 2: CONFIGURE =============== */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Configure Generation ⚙️</h2>
                  <p className="text-muted-foreground">Set your preferences and generate a theme pack</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Left: Settings */}
                  <div className="space-y-6">
                    {/* Mode Selection */}
                    <div>
                      <label className="mb-3 block text-sm font-medium">Generation Mode</label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Card
                          className={cn(
                            "cursor-pointer border-2 transition-all hover:border-primary",
                            form.mode === "series" ? "border-primary bg-primary/5" : "border-border/50"
                          )}
                          onClick={() => updateForm("mode", "series")}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <Users className="h-5 w-5" />
                              <span className="font-semibold">Series</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Same main character across all pages</p>
                          </CardContent>
                        </Card>
                        <Card
                          className={cn(
                            "cursor-pointer border-2 transition-all hover:border-primary",
                            form.mode === "collection" ? "border-primary bg-primary/5" : "border-border/50"
                          )}
                          onClick={() => updateForm("mode", "collection")}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <Palette className="h-5 w-5" />
                              <span className="font-semibold">Collection</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Same style, different subjects</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Series Mode: Character Info */}
                    {form.mode === "series" && (
                      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Users className="h-4 w-4" /> Main Character (Series Mode)
                        </h4>
                        <div>
                          <label className="mb-2 block text-sm font-medium">Character Name</label>
                          <Input
                            placeholder="e.g., Luna the Unicorn, Captain Rex"
                            value={form.characterName}
                            onChange={(e) => updateForm("characterName", e.target.value)}
                            className="rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium">Character Description</label>
                          <Textarea
                            placeholder="e.g., A cute baby panda with big round eyes, wearing a red bowtie..."
                            value={form.characterDescription}
                            onChange={(e) => updateForm("characterDescription", e.target.value)}
                            className="rounded-xl min-h-[80px]"
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            This character will appear consistently on every page
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Theme Input */}
                    <div>
                      <label className="mb-2 block text-sm font-medium">Additional Theme (optional)</label>
                      <Input
                        placeholder="e.g., underwater adventure, farm animals, space exploration"
                        value={form.themeText}
                        onChange={(e) => updateForm("themeText", e.target.value)}
                        className="rounded-xl"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Add extra context, or leave empty to use the theme from your reference
                      </p>
                    </div>

                    {/* Show Extracted Theme from Reference */}
                    {form.styleContract?.extractedThemeGuess && (
                      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                        <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" /> Theme Detected from Reference
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {form.styleContract.extractedThemeGuess}
                        </p>
                      </div>
                    )}

                    {/* Page Count */}
                    <div>
                      <label className="mb-2 block text-sm font-medium">Number of Pages</label>
                      <Input
                        type="number"
                        min={1}
                        max={80}
                        value={form.pagesCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          updateForm("pagesCount", Math.min(Math.max(1, val), 80));
                        }}
                        className="w-32 rounded-xl"
                      />
                    </div>

                    {/* Size Preset */}
                    <div>
                      <label className="mb-2 block text-sm font-medium">Page Size</label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {Object.entries(KDP_SIZE_PRESETS).map(([key, preset]) => (
                          <Card
                            key={key}
                            className={cn(
                              "cursor-pointer border transition-all hover:border-primary",
                              form.sizePreset === key ? "border-primary bg-primary/5" : "border-border/50"
                            )}
                            onClick={() => updateForm("sizePreset", key)}
                          >
                            <CardContent className="p-3">
                              <p className="font-medium text-sm">{preset.label}</p>
                              <p className="text-xs text-muted-foreground">{preset.pixels}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Style settings + Theme Pack */}
                  <div className="space-y-6">
                    {/* Complexity */}
                    <div>
                      <label className="mb-3 block text-sm font-medium">Complexity</label>
                      <div className="grid gap-2">
                        {complexities.map((c) => (
                          <Card
                            key={c.value}
                            className={cn(
                              "cursor-pointer border transition-all hover:border-primary",
                              form.complexity === c.value ? "border-primary bg-primary/5" : "border-border/50"
                            )}
                            onClick={() => updateForm("complexity", c.value)}
                          >
                            <CardContent className="flex items-center justify-between p-3">
                              <div>
                                <p className="font-medium text-sm">{c.label}</p>
                                <p className="text-xs text-muted-foreground">{c.desc}</p>
                              </div>
                              {form.complexity === c.value && <Check className="h-4 w-4 text-primary" />}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Line Thickness */}
                    <div>
                      <label className="mb-3 block text-sm font-medium">Line Thickness</label>
                      <div className="grid gap-2">
                        {thicknesses.map((t) => (
                          <Card
                            key={t.value}
                            className={cn(
                              "cursor-pointer border transition-all hover:border-primary",
                              form.lineThickness === t.value ? "border-primary bg-primary/5" : "border-border/50"
                            )}
                            onClick={() => updateForm("lineThickness", t.value)}
                          >
                            <CardContent className="flex items-center justify-between p-3">
                              <div>
                                <p className="font-medium text-sm">{t.label}</p>
                                <p className="text-xs text-muted-foreground">{t.desc}</p>
                              </div>
                              {form.lineThickness === t.value && <Check className="h-4 w-4 text-primary" />}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Generate Theme Pack Button */}
                    <Button
                      onClick={generateThemePack}
                      disabled={generatingThemePack || !form.styleContract}
                      className="w-full rounded-xl"
                    >
                      {generatingThemePack ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Theme...</>
                      ) : (
                        <><Wand2 className="mr-2 h-4 w-4" /> Generate Theme Pack</>
                      )}
                    </Button>

                    {/* Theme Pack Preview */}
                    {form.themePack && (
                      <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <span className="font-semibold">Theme Pack Ready</span>
                        </div>
                        <p className="text-sm mb-2"><strong>Setting:</strong> {form.themePack.setting}</p>
                        {form.themePack.characterName && (
                          <p className="text-sm mb-2"><strong>Character:</strong> {form.themePack.characterName}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {form.themePack.recurringProps.slice(0, 6).map((prop, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{prop}</Badge>
                          ))}
                          {form.themePack.recurringProps.length > 6 && (
                            <Badge variant="outline" className="text-xs">
                              +{form.themePack.recurringProps.length - 6} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* =============== STEP 3: PROMPTS =============== */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Generate Prompts 📝</h2>
                  <p className="text-muted-foreground">
                    Create scene prompts for your {form.pagesCount} pages
                  </p>
                </div>

                {form.prompts.length === 0 ? (
                  <div className="space-y-4">
                    <Card className="border-dashed border-border/50 bg-muted/30">
                      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                        <Sparkles className="mb-3 h-8 w-8 text-muted-foreground" />
                        <p className="mb-4 text-muted-foreground">
                          Click below to generate {form.pagesCount} unique scene prompts
                        </p>
                        <Button onClick={generatePrompts} disabled={generatingPrompts} className="rounded-xl">
                          {generatingPrompts ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                          ) : (
                            <><Sparkles className="mr-2 h-4 w-4" /> Generate Prompts</>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                    {generatingPrompts && (
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-24 rounded-xl" />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {form.prompts.length} prompts generated
                      </p>
                      <Button variant="outline" onClick={generatePrompts} disabled={generatingPrompts} className="rounded-xl">
                        {generatingPrompts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Regenerate All
                      </Button>
                    </div>
                    
                    <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
                      {form.prompts.map((prompt) => (
                        <Card key={prompt.pageIndex} className="border-border/50 bg-card/60">
                          <CardContent className="p-4">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{prompt.pageIndex}</Badge>
                                <span className="font-medium text-sm">{prompt.title}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7" 
                                  onClick={() => copyPrompt(prompt.scenePrompt)} 
                                  title="Copy"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1 rounded-lg text-xs"
                                  onClick={() => improvePrompt(prompt.pageIndex)}
                                >
                                  <Wand2 className="h-3 w-3" />
                                  Improve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1 rounded-lg text-xs"
                                  onClick={() => regeneratePrompt(prompt.pageIndex)}
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  Regen
                                </Button>
                              </div>
                            </div>
                            <Textarea
                              value={prompt.scenePrompt}
                              onChange={(e) => updatePromptText(prompt.pageIndex, e.target.value)}
                              className="min-h-[80px] resize-none rounded-xl text-sm"
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =============== STEP 4: GENERATE =============== */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Generate Pages 🚀</h2>
                  <p className="text-muted-foreground">
                    First approve a sample, then generate all remaining pages
                  </p>
                </div>

                {/* Sample Generation Section */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Sample Preview */}
                  <Card className="border-border/50">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Sample (Page 1)
                      </h3>
                      
                      <div className="aspect-[2/3] bg-white rounded-xl border border-border overflow-hidden mb-3">
                        {form.pageImages[1]?.imageUrl ? (
                          <img
                            src={form.pageImages[1].imageUrl}
                            alt="Sample"
                            className="h-full w-full object-contain"
                          />
                        ) : form.pageImages[1]?.isGenerating ? (
                          <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Generating sample...</p>
                          </div>
                        ) : form.pageImages[1]?.failedPrintSafe ? (
                          <div className="flex h-full flex-col items-center justify-center p-4 text-center bg-red-50 dark:bg-red-900/10">
                            <AlertTriangle className="mb-2 h-8 w-8 text-red-500" />
                            <p className="text-xs font-medium text-red-600">Failed print-safe check</p>
                          </div>
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center p-4 text-center bg-muted">
                            <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Sample preview</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {!form.pageImages[1]?.imageUrl && (
                          <Button
                            onClick={generateSample}
                            disabled={generatingSample || form.prompts.length === 0}
                            className="flex-1 rounded-xl"
                          >
                            {generatingSample ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                            ) : (
                              <><Sparkles className="mr-2 h-4 w-4" /> Generate Sample</>
                            )}
                          </Button>
                        )}
                        {form.pageImages[1]?.imageUrl && !form.anchorApproved && (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => regeneratePage(1)}
                              disabled={form.pageImages[1]?.isGenerating}
                              className="rounded-xl"
                            >
                              <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                            </Button>
                            <Button onClick={approveSample} className="flex-1 rounded-xl">
                              <Check className="mr-2 h-4 w-4" /> Approve Sample
                            </Button>
                          </>
                        )}
                        {form.anchorApproved && (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-medium">Approved</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Generation Controls */}
                  <div className="space-y-4">
                    <Card className="border-border/50 bg-card/60">
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-3">Generation Summary</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Style</p>
                            <p className="font-medium">{form.complexity} / {form.lineThickness}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Size</p>
                            <p className="font-medium">{KDP_SIZE_PRESETS[form.sizePreset]?.label}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Mode</p>
                            <p className="font-medium capitalize">{form.mode}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Progress</p>
                            <p className="font-medium">{generatedCount} / {form.prompts.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {form.anchorApproved && form.prompts.length > 1 && (
                      <Button
                        onClick={generateRemaining}
                        disabled={generatingRemaining}
                        className="w-full rounded-xl"
                        size="lg"
                      >
                        {generatingRemaining ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating {form.prompts.length - 1} Pages...</>
                        ) : (
                          <><Sparkles className="mr-2 h-4 w-4" /> Generate Remaining {form.prompts.length - 1} Pages</>
                        )}
                      </Button>
                    )}

                    {/* Debug Toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDebug(!showDebug)}
                      className="text-xs text-muted-foreground"
                    >
                      {showDebug ? "Hide Debug Info" : "Show Debug Info"}
                    </Button>

                    {showDebug && lastDebug && (
                      <Card className="border-border/50 bg-muted/30">
                        <CardContent className="p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Debug Info</h4>
                            {(lastDebug as { finalPromptFull?: string }).finalPromptFull && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  navigator.clipboard.writeText((lastDebug as { finalPromptFull: string }).finalPromptFull);
                                  toast.success("Final prompt copied!");
                                }}
                              >
                                <Copy className="h-3 w-3 mr-1" /> Copy Final Prompt
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Model:</span>{" "}
                              <span className="font-mono">{(lastDebug as { imageModel?: string }).imageModel || "N/A"}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Retries:</span>{" "}
                              <span className="font-mono">{(lastDebug as { retries?: number }).retries || 0}</span>
                            </div>
                            {(lastDebug as { qualityMetrics?: { blackRatio?: number } }).qualityMetrics && (
                              <>
                                <div>
                                  <span className="text-muted-foreground">Black Ratio:</span>{" "}
                                  <span className="font-mono">
                                    {(((lastDebug as { qualityMetrics: { blackRatio: number } }).qualityMetrics.blackRatio || 0) * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Max Allowed:</span>{" "}
                                  <span className="font-mono">
                                    {(((lastDebug as { thresholds?: { maxBlackRatio?: number } }).thresholds?.maxBlackRatio || 0) * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                          {(lastDebug as { failureReason?: string }).failureReason && (
                            <div className="text-xs text-red-500 bg-red-500/10 rounded p-2">
                              <strong>Failure:</strong> {(lastDebug as { failureReason: string }).failureReason}
                            </div>
                          )}
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Full Debug JSON
                            </summary>
                            <pre className="mt-2 overflow-auto max-h-32 bg-muted p-2 rounded text-[10px]">
                              {JSON.stringify(lastDebug, null, 2)}
                            </pre>
                          </details>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                {/* Page Grid */}
                {form.prompts.length > 1 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">All Pages</h3>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {form.prompts.map((prompt) => {
                        const pageState = form.pageImages[prompt.pageIndex];
                        const hasImage = !!pageState?.imageUrl;
                        const isGenerating = pageState?.isGenerating;
                        const failedPrintSafe = pageState?.failedPrintSafe;

                        return (
                          <Card key={prompt.pageIndex} className={cn("overflow-hidden border-border/50", failedPrintSafe && "border-red-500/50")}>
                            <div className="aspect-[2/3] bg-white relative">
                              {hasImage ? (
                                <img
                                  src={pageState.imageUrl}
                                  alt={`Page ${prompt.pageIndex}`}
                                  className="h-full w-full object-contain"
                                />
                              ) : isGenerating ? (
                                <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted">
                                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                              ) : failedPrintSafe ? (
                                <div className="flex h-full flex-col items-center justify-center p-4 text-center bg-red-50 dark:bg-red-900/10">
                                  <AlertTriangle className="mb-1 h-6 w-6 text-red-500" />
                                  <p className="text-xs text-red-600">Failed</p>
                                </div>
                              ) : (
                                <div className="flex h-full flex-col items-center justify-center p-2 text-center bg-muted">
                                  <ImageIcon className="mb-1 h-6 w-6 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">Page {prompt.pageIndex}</p>
                                </div>
                              )}
                              {prompt.pageIndex === 1 && form.anchorApproved && (
                                <Badge className="absolute top-2 left-2 text-xs" variant="default">
                                  Anchor
                                </Badge>
                              )}
                            </div>
                            <CardContent className="p-2">
                              <p className="mb-2 truncate text-xs font-medium">{prompt.title}</p>
                              <div className="flex gap-1">
                                {hasImage && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="flex-1 h-7 rounded-lg text-xs"
                                      onClick={() => openPreview(prompt.pageIndex, prompt.title, pageState.imageUrl!)}
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="flex-1 h-7 rounded-lg text-xs"
                                      onClick={() => {
                                        const link = document.createElement("a");
                                        link.href = pageState.imageUrl!;
                                        link.download = `page-${prompt.pageIndex}.png`;
                                        link.click();
                                      }}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 h-7 rounded-lg text-xs"
                                  onClick={() => regeneratePage(prompt.pageIndex)}
                                  disabled={isGenerating || generatingRemaining || (prompt.pageIndex !== 1 && !form.anchorApproved)}
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between border-t border-border pt-6">
            <Button 
              variant="outline" 
              onClick={() => setStep((s) => Math.max(1, s - 1))} 
              disabled={step === 1} 
              className="rounded-xl"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {step < 4 ? (
              <Button 
                onClick={() => setStep((s) => Math.min(4, s + 1))} 
                disabled={!canProceed()} 
                className="rounded-xl"
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => toast.success("Project ready! Export feature coming soon.")}
                disabled={generatedCount < form.prompts.length}
                className="rounded-xl"
              >
                <Check className="mr-2 h-4 w-4" /> Finish
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      {previewPage && (
        <ImagePreviewModal
          isOpen={!!previewPage}
          onClose={() => setPreviewPage(null)}
          imageUrl={previewPage.imageUrl}
          title={previewPage.title}
          pageNumber={previewPage.pageNumber}
        />
      )}
    </>
  );
}

