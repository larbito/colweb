"use client";

import { useState, useCallback } from "react";
import { AppTopbar } from "@/components/app/app-topbar";
import { WizardStepper } from "@/components/app/wizard-stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Info,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { ImagePreviewModal } from "@/components/app/image-preview-modal";
import { SCENE_PRESETS } from "@/lib/coloringPageTypes";
import type { ImageAnalysis, GeneratedPrompt, GenerationResult } from "@/lib/coloringPageTypes";

const steps = [
  { id: 1, label: "Upload" },
  { id: 2, label: "Analyze" },
  { id: 3, label: "Configure" },
  { id: 4, label: "Generate" },
];

interface PageState {
  imageUrl?: string;
  imageBase64?: string;
  isGenerating: boolean;
  validation?: {
    isValid: boolean;
    hasColor: boolean;
    hasShading: boolean;
    blackRatio: number;
    failureReasons: string[];
  };
  retryCount?: number;
}

export default function StyleClonePage() {
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(true);

  // Image states
  const [referenceImageBase64, setReferenceImageBase64] = useState<string | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);

  // Analysis state
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Configuration state
  const [pageCount, setPageCount] = useState(5);
  const [selectedScenes, setSelectedScenes] = useState<string[]>([]);

  // Prompts state
  const [prompts, setPrompts] = useState<GeneratedPrompt[]>([]);

  // Generation state
  const [pageStates, setPageStates] = useState<Record<number, PageState>>({});
  const [generating, setGenerating] = useState(false);

  // Preview modal
  const [previewPage, setPreviewPage] = useState<{ pageNumber: number; title: string; imageUrl: string } | null>(null);

  // Debug state
  const [showDebug, setShowDebug] = useState(false);
  const [lastDebug, setLastDebug] = useState<Record<string, unknown> | null>(null);

  // ==================== Helpers ====================

  const safeJsonParse = async (response: Response) => {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(text.slice(0, 200) || "Unknown error");
    }
  };

  // ==================== File Upload ====================

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
      setReferenceImageBase64(base64);
      setReferenceImagePreview(dataUrl);
      setAnalysis(null); // Reset analysis when new image uploaded
      setPrompts([]);
      setPageStates({});
      toast.success("Reference image uploaded!");
    };
    reader.readAsDataURL(file);
  }, []);

  const removeReferenceImage = () => {
    setReferenceImageBase64(null);
    setReferenceImagePreview(null);
    setAnalysis(null);
    setPrompts([]);
    setPageStates({});
  };

  // ==================== Image Analysis ====================

  const analyzeImage = async () => {
    if (!referenceImageBase64) {
      toast.error("Please upload a reference image first");
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: referenceImageBase64 }),
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze image");
      }

      setAnalysis(data.analysis);
      setLastDebug(data.debug);
      toast.success("Image analyzed successfully!");
      
      // Auto-advance to next step
      setStep(3);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to analyze image");
    } finally {
      setAnalyzing(false);
    }
  };

  // ==================== Scene Selection ====================

  const toggleScene = (sceneId: string) => {
    setSelectedScenes(prev => {
      if (prev.includes(sceneId)) {
        return prev.filter(s => s !== sceneId);
      }
      if (prev.length >= pageCount) {
        toast.error(`Maximum ${pageCount} scenes selected`);
        return prev;
      }
      return [...prev, sceneId];
    });
  };

  // ==================== Generation ====================

  const generatePages = async () => {
    if (!analysis) {
      toast.error("Please analyze the image first");
      return;
    }

    setGenerating(true);
    
    // Initialize page states
    const initialStates: Record<number, PageState> = {};
    for (let i = 1; i <= pageCount; i++) {
      initialStates[i] = { isGenerating: true };
    }
    setPageStates(initialStates);

    try {
      const response = await fetch("/api/generate-coloring-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis,
          count: pageCount,
          scenes: selectedScenes.length > 0 ? selectedScenes : undefined,
          size: "1024x1792",
        }),
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate pages");
      }

      // Update prompts
      setPrompts(data.prompts);
      setLastDebug(data.debug);

      // Update page states with results
      const newStates: Record<number, PageState> = {};
      for (const result of data.results as GenerationResult[]) {
        const imageUrl = result.imageBase64
          ? `data:image/png;base64,${result.imageBase64}`
          : undefined;

        newStates[result.pageIndex] = {
          imageUrl,
          imageBase64: result.imageBase64,
          isGenerating: false,
          validation: result.validation,
          retryCount: result.retryCount,
        };
      }
      setPageStates(newStates);

      toast.success(`Generated ${data.summary.success}/${data.summary.total} pages!`);
      if (data.summary.failed > 0) {
        toast.warning(`${data.summary.failed} pages had validation issues`);
      }
    } catch (error) {
      // Mark all as failed
      const failedStates: Record<number, PageState> = {};
      for (let i = 1; i <= pageCount; i++) {
        failedStates[i] = { isGenerating: false };
      }
      setPageStates(failedStates);
      toast.error(error instanceof Error ? error.message : "Failed to generate pages");
    } finally {
      setGenerating(false);
    }
  };

  // ==================== Regenerate Single Page ====================

  const regeneratePage = async (pageIndex: number) => {
    if (!analysis) return;

    setPageStates(prev => ({
      ...prev,
      [pageIndex]: { isGenerating: true },
    }));

    try {
      const response = await fetch("/api/generate-coloring-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis,
          count: 1,
          scenes: selectedScenes[pageIndex - 1] ? [selectedScenes[pageIndex - 1]] : undefined,
          size: "1024x1792",
        }),
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to regenerate page");
      }

      const result = data.results[0] as GenerationResult;
      const imageUrl = result.imageBase64
        ? `data:image/png;base64,${result.imageBase64}`
        : undefined;

      setPageStates(prev => ({
        ...prev,
        [pageIndex]: {
          imageUrl,
          imageBase64: result.imageBase64,
          isGenerating: false,
          validation: result.validation,
          retryCount: result.retryCount,
        },
      }));

      // Update the prompt
      if (data.prompts[0]) {
        setPrompts(prev => prev.map(p => 
          p.pageIndex === pageIndex ? { ...data.prompts[0], pageIndex } : p
        ));
      }

      toast.success(`Page ${pageIndex} regenerated!`);
    } catch (error) {
      setPageStates(prev => ({
        ...prev,
        [pageIndex]: { isGenerating: false },
      }));
      toast.error(error instanceof Error ? error.message : "Failed to regenerate");
    }
  };

  // ==================== Navigation ====================

  const canProceed = () => {
    switch (step) {
      case 1: return !!referenceImageBase64;
      case 2: return !!analysis;
      case 3: return pageCount >= 1;
      case 4: return Object.values(pageStates).some(p => p.imageUrl);
      default: return true;
    }
  };

  const generatedCount = Object.values(pageStates).filter(p => p.imageUrl).length;

  // ==================== Render ====================

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
                Projects are temporary and will expire after 6 hours.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl space-y-8">
          <WizardStepper steps={steps} currentStep={step} />

          <div className="min-h-[500px]">
            {/* ==================== STEP 1: UPLOAD ==================== */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Upload Reference Image 📸</h2>
                  <p className="text-muted-foreground">
                    Upload a coloring page you love. We&apos;ll analyze its style and generate matching pages.
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Upload Area */}
                  <Card className="border-dashed border-2 border-border/50 bg-muted/30">
                    <CardContent className="flex flex-col items-center justify-center p-8 text-center min-h-[350px]">
                      {referenceImagePreview ? (
                        <div className="relative w-full max-w-xs">
                          <img
                            src={referenceImagePreview}
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
                        <span>Clear character design (face, body) is ideal</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                        <span>Don&apos;t upload copyrighted artwork</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 mt-4">
                      <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">
                        What happens next?
                      </h4>
                      <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>We analyze your image using AI vision</li>
                        <li>Extract character, style, and scene details</li>
                        <li>Generate matching coloring pages</li>
                        <li>Validate output for print quality</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== STEP 2: ANALYZE ==================== */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Analyze Reference Image 🔍</h2>
                  <p className="text-muted-foreground">
                    Our AI will extract character, style, and scene information from your image.
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Reference Preview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" /> Reference Image
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {referenceImagePreview && (
                        <img
                          src={referenceImagePreview}
                          alt="Reference"
                          className="rounded-xl border border-border bg-white w-full max-w-xs mx-auto"
                        />
                      )}
                      
                      {!analysis && (
                        <Button
                          onClick={analyzeImage}
                          disabled={analyzing}
                          className="w-full mt-4 rounded-xl"
                        >
                          {analyzing ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                          ) : (
                            <><Wand2 className="mr-2 h-4 w-4" /> Analyze Image</>
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  {/* Analysis Results */}
                  <div className="space-y-4">
                    {analyzing && (
                      <div className="space-y-3">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-24 w-full rounded-xl" />
                        <Skeleton className="h-24 w-full rounded-xl" />
                      </div>
                    )}

                    {analysis && (
                      <>
                        <Card className="border-green-500/30 bg-green-500/10">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                              <span className="font-semibold text-green-700 dark:text-green-400">
                                Analysis Complete!
                              </span>
                            </div>
                            
                            <div className="grid gap-4 text-sm">
                              <div>
                                <span className="font-medium">Character:</span>
                                <p className="text-muted-foreground">
                                  {analysis.character.species}
                                  {analysis.character.special_features.length > 0 && (
                                    <> with {analysis.character.special_features.join(", ")}</>
                                  )}
                                </p>
                              </div>
                              
                              <div>
                                <span className="font-medium">Style:</span>
                                <p className="text-muted-foreground">
                                  {analysis.line_art.outer_line_weight} outer lines, {analysis.line_art.style}
                                </p>
                              </div>
                              
                              <div>
                                <span className="font-medium">Scene:</span>
                                <p className="text-muted-foreground">
                                  {analysis.scene.location}
                                </p>
                              </div>
                              
                              <div>
                                <span className="font-medium">Character Signature:</span>
                                <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded mt-1">
                                  {analysis.character_signature}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <div className="flex flex-wrap gap-2">
                          {analysis.constraints.slice(0, 6).map((c, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== STEP 3: CONFIGURE ==================== */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Configure Generation ⚙️</h2>
                  <p className="text-muted-foreground">
                    Choose how many pages and which scenes you want
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Settings */}
                  <div className="space-y-6">
                    {/* Character Summary */}
                    {analysis && (
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Palette className="h-4 w-4" /> Style Lock
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            All generated pages will maintain this consistent style:
                          </p>
                          <p className="text-xs font-mono bg-muted p-2 rounded mt-2">
                            {analysis.style_lock}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Page Count */}
                    <div>
                      <label className="mb-2 block text-sm font-medium">Number of Pages</label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={pageCount}
                        onChange={(e) => setPageCount(Math.min(Math.max(1, parseInt(e.target.value) || 1), 20))}
                        className="w-32 rounded-xl"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Generate 1-20 matching coloring pages
                      </p>
                    </div>
                  </div>

                  {/* Scene Selection */}
                  <div>
                    <label className="mb-3 block text-sm font-medium">
                      Select Scenes (optional)
                    </label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Choose specific scenes or leave empty for automatic variation
                    </p>
                    <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                      {SCENE_PRESETS.map((scene) => (
                        <Card
                          key={scene.id}
                          className={cn(
                            "cursor-pointer border transition-all hover:border-primary",
                            selectedScenes.includes(scene.id) 
                              ? "border-primary bg-primary/5" 
                              : "border-border/50"
                          )}
                          onClick={() => toggleScene(scene.id)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{scene.label}</span>
                              {selectedScenes.includes(scene.id) && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {scene.props.slice(0, 3).join(", ")}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {selectedScenes.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {selectedScenes.length} scene(s) selected
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== STEP 4: GENERATE ==================== */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Generate Pages 🎨</h2>
                  <p className="text-muted-foreground">
                    Generate {pageCount} matching coloring pages
                  </p>
                </div>

                {/* Generate Button */}
                {generatedCount === 0 && (
                  <div className="flex justify-center">
                    <Button
                      onClick={generatePages}
                      disabled={generating}
                      size="lg"
                      className="rounded-xl"
                    >
                      {generating ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating {pageCount} Pages...</>
                      ) : (
                        <><Sparkles className="mr-2 h-5 w-5" /> Generate {pageCount} Pages</>
                      )}
                    </Button>
                  </div>
                )}

                {/* Progress Info */}
                {generating && (
                  <div className="text-center text-sm text-muted-foreground">
                    This may take a few minutes. Each page is validated for print quality.
                  </div>
                )}

                {/* Results Summary */}
                {generatedCount > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="text-sm">
                        {generatedCount}/{pageCount} Generated
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDebug(!showDebug)}
                        className="text-xs"
                      >
                        {showDebug ? "Hide" : "Show"} Debug
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      onClick={generatePages}
                      disabled={generating}
                      className="rounded-xl"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate All
                    </Button>
                  </div>
                )}

                {/* Debug Panel */}
                {showDebug && lastDebug && (
                  <Card className="border-border/50 bg-muted/30">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-sm mb-2">Debug Info</h4>
                      <pre className="text-xs overflow-auto max-h-40 bg-muted p-2 rounded">
                        {JSON.stringify(lastDebug, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {/* Page Grid */}
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageIndex) => {
                    const state = pageStates[pageIndex];
                    const prompt = prompts.find(p => p.pageIndex === pageIndex);
                    const hasImage = !!state?.imageUrl;
                    const isLoading = state?.isGenerating;
                    const hasIssues = state?.validation && !state.validation.isValid;

                    return (
                      <Card
                        key={pageIndex}
                        className={cn(
                          "overflow-hidden border-border/50",
                          hasIssues && "border-amber-500/50"
                        )}
                      >
                        <div className="aspect-[2/3] bg-white relative">
                          {hasImage ? (
                            <img
                              src={state.imageUrl}
                              alt={`Page ${pageIndex}`}
                              className="h-full w-full object-contain"
                            />
                          ) : isLoading ? (
                            <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">Generating...</p>
                            </div>
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center p-2 text-center bg-muted">
                              <ImageIcon className="mb-1 h-6 w-6 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">Page {pageIndex}</p>
                            </div>
                          )}

                          {/* Validation Badge */}
                          {state?.validation && (
                            <Badge
                              className={cn(
                                "absolute top-2 left-2 text-xs",
                                state.validation.isValid 
                                  ? "bg-green-500" 
                                  : "bg-amber-500"
                              )}
                            >
                              {state.validation.isValid ? "Valid" : "Warning"}
                            </Badge>
                          )}

                          {/* Retry Count */}
                          {(state?.retryCount ?? 0) > 0 && (
                            <Badge
                              variant="outline"
                              className="absolute top-2 right-2 text-xs"
                            >
                              {state?.retryCount} retries
                            </Badge>
                          )}
                        </div>

                        <CardContent className="p-2">
                          <p className="mb-2 truncate text-xs font-medium">
                            {prompt?.title || `Page ${pageIndex}`}
                          </p>
                          <div className="flex gap-1">
                            {hasImage && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="flex-1 h-7 rounded-lg text-xs"
                                  onClick={() => setPreviewPage({
                                    pageNumber: pageIndex,
                                    title: prompt?.title || `Page ${pageIndex}`,
                                    imageUrl: state.imageUrl!,
                                  })}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="flex-1 h-7 rounded-lg text-xs"
                                  onClick={() => {
                                    const link = document.createElement("a");
                                    link.href = state.imageUrl!;
                                    link.download = `coloring-page-${pageIndex}.png`;
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
                              onClick={() => regeneratePage(pageIndex)}
                              disabled={isLoading || generating}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Validation Issues */}
                          {hasIssues && state?.validation && (
                            <div className="mt-2 p-2 bg-amber-500/10 rounded text-xs">
                              <p className="text-amber-600 font-medium">Issues:</p>
                              <ul className="text-muted-foreground">
                                {state.validation.failureReasons.slice(0, 2).map((r, i) => (
                                  <li key={i}>• {r}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Prompts Section */}
                {prompts.length > 0 && (
                  <div className="space-y-4 mt-8">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> Generated Prompts
                    </h3>
                    <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
                      {prompts.map((prompt) => (
                        <Card key={prompt.pageIndex} className="border-border/50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{prompt.pageIndex}</Badge>
                                <span className="font-medium text-sm">{prompt.title}</span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  navigator.clipboard.writeText(prompt.fullPrompt);
                                  toast.success("Prompt copied!");
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {prompt.mainPrompt}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
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
                onClick={() => toast.success("Pages ready! Download or export.")}
                disabled={generatedCount === 0}
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
