"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Sparkles,
  Loader2,
  Wand2,
  ImageIcon,
  Upload,
  X,
  Book,
  Palette,
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
  Users,
  Home,
  TreePine,
  Shuffle,
  Settings2,
  Layers,
  Zap,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ImagePreviewModal } from "@/components/app/image-preview-modal";
import type {
  ProfileFromImageResponse,
  BatchPromptsResponse,
  PagePromptItem,
  PageResult,
  GenerationMode,
  StoryConfig,
} from "@/lib/batchGenerationTypes";

type PageStatus = "pending" | "generating" | "done" | "failed";

interface PageState extends PagePromptItem {
  status: PageStatus;
  imageBase64?: string;
  error?: string;
  isEditing?: boolean;
}

export default function StyleClonePage() {
  // ==================== State ====================
  
  // Image upload
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

  // Profile extraction
  const [profile, setProfile] = useState<ProfileFromImageResponse | null>(null);
  const [extractingProfile, setExtractingProfile] = useState(false);

  // Batch configuration
  const [mode, setMode] = useState<GenerationMode>("storybook");
  const [pageCount, setPageCount] = useState(6);
  const [orientation, setOrientation] = useState<"portrait" | "landscape" | "square">("portrait");
  const [storyConfig, setStoryConfig] = useState<StoryConfig>({
    title: "",
    outline: "",
    targetAge: "all-ages",
    sceneVariety: "medium",
    settingConstraint: "mixed",
  });

  // Helper to get image size from orientation
  const getImageSize = () => {
    if (orientation === "landscape") return "1536x1024";
    if (orientation === "portrait") return "1024x1536";
    return "1024x1024";
  };

  // Pages and prompts
  const [pages, setPages] = useState<PageState[]>([]);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [expandedSettings, setExpandedSettings] = useState(false);

  // Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
      setUploadedImageBase64(base64);
      setUploadedImagePreview(dataUrl);
      setProfile(null);
      setPages([]);
      toast.success("Image uploaded!");
    };
    reader.readAsDataURL(file);
  }, []);

  const removeUploadedImage = () => {
    setUploadedImageBase64(null);
    setUploadedImagePreview(null);
    setProfile(null);
    setPages([]);
  };

  // ==================== Extract Profile ====================

  const extractProfile = async () => {
    if (!uploadedImageBase64) {
      toast.error("Please upload an image first");
      return;
    }

    setExtractingProfile(true);
    try {
      const response = await fetch("/api/profile/from-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: uploadedImageBase64 }),
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract profile");
      }

      setProfile(data as ProfileFromImageResponse);
      toast.success("Style extracted! Configure your batch and generate prompts.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to extract profile");
    } finally {
      setExtractingProfile(false);
    }
  };

  // ==================== Generate Prompts ====================

  const generatePrompts = async () => {
    if (!profile) {
      toast.error("Please extract a profile first");
      return;
    }

    if (mode === "storybook" && !profile.characterProfile) {
      toast.error("No character detected in image. Please use Theme mode or upload an image with a clear character.");
      return;
    }

    setGeneratingPrompts(true);
    try {
      const response = await fetch("/api/batch/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          count: pageCount,
          story: storyConfig,
          styleProfile: profile.styleProfile,
          characterProfile: profile.characterProfile,
          sceneInventory: profile.sceneInventory,
          basePrompt: profile.basePrompt,
          size: getImageSize(),
        }),
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate prompts");
      }

      const batchResponse = data as BatchPromptsResponse;
      
      // Convert to page state
      const pageStates: PageState[] = batchResponse.pages.map((p) => ({
        ...p,
        status: "pending" as PageStatus,
      }));

      setPages(pageStates);
      toast.success(`Generated ${pageStates.length} prompts! Review and edit, then generate images.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate prompts");
    } finally {
      setGeneratingPrompts(false);
    }
  };

  // ==================== Generate Images ====================

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
    setGenerationProgress(0);

    try {
      // Mark pages as generating
      setPages(prev => prev.map(p => 
        pendingPages.some(pp => pp.page === p.page) 
          ? { ...p, status: "generating" as PageStatus } 
          : p
      ));

      const response = await fetch("/api/batch/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages: pendingPages.map(p => ({ page: p.page, prompt: p.prompt })),
          size: getImageSize(),
          concurrency: 1,
        }),
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      // Update pages with results
      const results = data.results as PageResult[];
      setPages(prev => prev.map(p => {
        const result = results.find(r => r.page === p.page);
        if (result) {
          return {
            ...p,
            status: result.status,
            imageBase64: result.imageBase64,
            error: result.error,
          };
        }
        return p;
      }));

      toast.success(`Generated ${data.successCount} images! ${data.failCount > 0 ? `${data.failCount} failed.` : ""}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
      // Reset generating status to failed
      setPages(prev => prev.map(p => 
        p.status === "generating" ? { ...p, status: "failed" as PageStatus } : p
      ));
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const generateSinglePage = async (pageNumber: number) => {
    const page = pages.find(p => p.page === pageNumber);
    if (!page) return;

    setPages(prev => prev.map(p => 
      p.page === pageNumber ? { ...p, status: "generating" as PageStatus } : p
    ));

    try {
      const response = await fetch("/api/batch/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages: [{ page: page.page, prompt: page.prompt }],
          size: getImageSize(),
          concurrency: 1,
        }),
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      const result = data.results[0] as PageResult;
      setPages(prev => prev.map(p => 
        p.page === pageNumber 
          ? { ...p, status: result.status, imageBase64: result.imageBase64, error: result.error }
          : p
      ));

      if (result.status === "done") {
        toast.success(`Page ${pageNumber} generated!`);
      } else {
        toast.error(`Page ${pageNumber} failed: ${result.error}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
      setPages(prev => prev.map(p => 
        p.page === pageNumber ? { ...p, status: "failed" as PageStatus } : p
      ));
    }
  };

  // ==================== Edit Prompt ====================

  const updatePagePrompt = (pageNumber: number, newPrompt: string) => {
    setPages(prev => prev.map(p => 
      p.page === pageNumber ? { ...p, prompt: newPrompt, isEditing: false, status: "pending" as PageStatus } : p
    ));
  };

  const toggleEditPage = (pageNumber: number) => {
    setPages(prev => prev.map(p => 
      p.page === pageNumber ? { ...p, isEditing: !p.isEditing } : p
    ));
  };

  // ==================== Download All ====================

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
        link.download = `coloring-page-${page.page}.png`;
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
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: PageStatus) => {
    const config: Record<PageStatus, { variant: "secondary" | "default" | "destructive" | "outline"; className: string }> = {
      pending: { variant: "secondary", className: "bg-muted text-muted-foreground" },
      generating: { variant: "default", className: "bg-primary/10 text-primary border-primary/20" },
      done: { variant: "default", className: "bg-green-500/10 text-green-600 border-green-500/20" },
      failed: { variant: "destructive", className: "" },
    };
    return (
      <Badge variant={config[status].variant} className={`text-[10px] font-medium ${config[status].className}`}>
        {status}
      </Badge>
    );
  };

  const doneCount = pages.filter(p => p.status === "done").length;
  const pendingCount = pages.filter(p => p.status === "pending" || p.status === "failed").length;

  // ==================== Render ====================

  return (
    <>
      {/* Page Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Wand2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Style Clone</h1>
                  <p className="text-sm text-muted-foreground">
                    Generate multiple coloring pages from one reference image
                  </p>
                </div>
              </div>
            </div>
            {pages.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="text-right mr-4">
                  <p className="text-2xl font-semibold tabular-nums">
                    {doneCount}<span className="text-muted-foreground text-base">/{pages.length}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Pages complete</p>
                </div>
                {doneCount > 0 && (
                  <Button onClick={downloadAll} variant="outline" className="rounded-xl gap-2">
                    <Download className="h-4 w-4" />
                    Download All
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="py-8 px-6">
        <div className="mx-auto max-w-6xl">
          {/* Workflow Steps */}
          <div className="grid gap-6 lg:grid-cols-3 mb-8">
            {/* Step 1 */}
            <div className={`relative rounded-2xl border-2 transition-all duration-300 ${
              !profile ? "border-primary bg-primary/5" : "border-green-500/50 bg-green-500/5"
            }`}>
              <div className="absolute -top-3 left-4">
                <Badge className={`rounded-full px-3 ${!profile ? "bg-primary" : "bg-green-500"}`}>
                  {!profile ? "Step 1" : <CheckCircle2 className="h-3 w-3" />}
                </Badge>
              </div>
              <div className="p-5 pt-6">
                <h3 className="font-semibold mb-1">Upload Reference</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Upload a coloring page to extract its style
                </p>
                
                {uploadedImagePreview ? (
                  <div className="flex gap-4">
                    <div className="relative shrink-0 group">
                      <img
                        src={uploadedImagePreview}
                        alt="Reference"
                        className="w-24 h-32 object-contain rounded-xl border bg-white shadow-sm"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={removeUploadedImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      {profile ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm font-medium">Style Extracted</span>
                          </div>
                          {profile.characterProfile && (
                            <p className="text-xs text-muted-foreground truncate">
                              Character: <span className="text-foreground">{profile.characterProfile.species}</span>
                            </p>
                          )}
                          {profile.extractedTheme && (
                            <p className="text-xs text-muted-foreground truncate">
                              Theme: <span className="text-foreground">{profile.extractedTheme}</span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <Button
                          onClick={extractProfile}
                          disabled={extractingProfile}
                          size="sm"
                          className="rounded-xl w-full gradient-primary border-0"
                        >
                          {extractingProfile ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                          ) : (
                            <><Sparkles className="mr-2 h-4 w-4" /> Extract Style</>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all bg-background/50">
                    <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Click to upload</span>
                    <span className="text-[10px] text-muted-foreground/60 mt-1">PNG, JPG up to 10MB</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Step 2 */}
            <div className={`relative rounded-2xl border-2 transition-all duration-300 ${
              !profile ? "border-muted opacity-60" : 
              pages.length === 0 ? "border-primary bg-primary/5" : "border-green-500/50 bg-green-500/5"
            }`}>
              <div className="absolute -top-3 left-4">
                <Badge className={`rounded-full px-3 ${
                  !profile ? "bg-muted text-muted-foreground" : 
                  pages.length === 0 ? "bg-primary" : "bg-green-500"
                }`}>
                  {pages.length > 0 ? <CheckCircle2 className="h-3 w-3" /> : "Step 2"}
                </Badge>
              </div>
              <div className="p-5 pt-6">
                <h3 className="font-semibold mb-1">Configure Pages</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Choose mode, page count, and settings
                </p>
                
                {profile ? (
                  <div className="space-y-4">
                    {/* Mode Toggle */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setMode("storybook")}
                        disabled={!profile.characterProfile}
                        className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                          mode === "storybook" 
                            ? "border-primary bg-primary/10" 
                            : "border-border hover:border-primary/50"
                        } ${!profile.characterProfile ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          <Book className="h-4 w-4" />
                          <span className="text-xs font-medium">Storybook</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setMode("theme")}
                        className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                          mode === "theme" 
                            ? "border-primary bg-primary/10" 
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          <span className="text-xs font-medium">Theme</span>
                        </div>
                      </button>
                    </div>

                    {/* Page Count */}
                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-muted-foreground">Pages</span>
                        <span className="font-mono font-semibold">{pageCount}</span>
                      </div>
                      <Slider
                        value={[pageCount]}
                        onValueChange={(v) => setPageCount(v[0])}
                        min={1}
                        max={30}
                        step={1}
                      />
                    </div>

                    {/* Orientation Quick Select */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["portrait", "landscape", "square"] as const).map((o) => (
                        <button
                          key={o}
                          onClick={() => setOrientation(o)}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            orientation === o ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className={`mx-auto mb-1 border-2 border-current rounded-sm ${
                            o === "portrait" ? "w-3 h-4" : o === "landscape" ? "w-4 h-3" : "w-3 h-3"
                          }`} />
                          <span className="text-[10px] capitalize">{o}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-muted-foreground text-xs">
                    Upload an image first
                  </div>
                )}
              </div>
            </div>

            {/* Step 3 */}
            <div className={`relative rounded-2xl border-2 transition-all duration-300 ${
              pages.length === 0 ? "border-muted opacity-60" : "border-primary bg-primary/5"
            }`}>
              <div className="absolute -top-3 left-4">
                <Badge className={`rounded-full px-3 ${pages.length === 0 ? "bg-muted text-muted-foreground" : "bg-primary"}`}>
                  Step 3
                </Badge>
              </div>
              <div className="p-5 pt-6">
                <h3 className="font-semibold mb-1">Generate Pages</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Review prompts and generate images
                </p>
                
                {pages.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        onClick={generateAllImages}
                        disabled={isGenerating || pendingCount === 0}
                        size="sm"
                        className="flex-1 rounded-xl gradient-primary border-0"
                      >
                        {isGenerating ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                        ) : (
                          <><Zap className="mr-2 h-4 w-4" /> Generate ({pendingCount})</>
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generatePrompts}
                      disabled={generatingPrompts}
                      className="w-full rounded-xl"
                    >
                      <RefreshCw className="mr-2 h-3 w-3" /> Regenerate Prompts
                    </Button>
                  </div>
                ) : profile ? (
                  <Button
                    onClick={generatePrompts}
                    disabled={generatingPrompts}
                    size="sm"
                    className="w-full rounded-xl gradient-primary border-0"
                  >
                    {generatingPrompts ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" /> Create {pageCount} Prompts</>
                    )}
                  </Button>
                ) : (
                  <div className="h-20 flex items-center justify-center text-muted-foreground text-xs">
                    Configure pages first
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Settings (Collapsible) */}
          {profile && (
            <Card className="mb-8 border-dashed">
              <button
                onClick={() => setExpandedSettings(!expandedSettings)}
                className="w-full p-4 flex items-center justify-between text-sm font-medium hover:bg-muted/50 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <span>Advanced Settings</span>
                </div>
                {expandedSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {expandedSettings && (
                <CardContent className="pt-0 pb-4 space-y-4 border-t">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-4">
                    {/* Story Title */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Story/Theme Title</label>
                      <Input
                        placeholder="e.g., Luna's Adventure"
                        value={storyConfig.title || ""}
                        onChange={(e) => setStoryConfig({ ...storyConfig, title: e.target.value })}
                        className="rounded-xl h-9 text-sm"
                      />
                    </div>

                    {/* Target Age */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Target Age</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {(["3-6", "6-9", "9-12", "all-ages"] as const).map((age) => (
                          <Button
                            key={age}
                            variant={storyConfig.targetAge === age ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStoryConfig({ ...storyConfig, targetAge: age })}
                            className="rounded-lg h-7 text-xs px-2"
                          >
                            {age === "all-ages" ? "All" : age}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Scene Variety */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Scene Variety</label>
                      <div className="flex gap-1.5">
                        {(["low", "medium", "high"] as const).map((level) => (
                          <Button
                            key={level}
                            variant={storyConfig.sceneVariety === level ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStoryConfig({ ...storyConfig, sceneVariety: level })}
                            className="rounded-lg h-7 text-xs px-2 capitalize"
                          >
                            {level}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Setting */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Setting</label>
                      <div className="flex gap-1.5">
                        <Button
                          variant={storyConfig.settingConstraint === "indoors" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStoryConfig({ ...storyConfig, settingConstraint: "indoors" })}
                          className="rounded-lg h-7 text-xs px-2"
                        >
                          <Home className="mr-1 h-3 w-3" /> In
                        </Button>
                        <Button
                          variant={storyConfig.settingConstraint === "outdoors" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStoryConfig({ ...storyConfig, settingConstraint: "outdoors" })}
                          className="rounded-lg h-7 text-xs px-2"
                        >
                          <TreePine className="mr-1 h-3 w-3" /> Out
                        </Button>
                        <Button
                          variant={storyConfig.settingConstraint === "mixed" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStoryConfig({ ...storyConfig, settingConstraint: "mixed" })}
                          className="rounded-lg h-7 text-xs px-2"
                        >
                          <Shuffle className="mr-1 h-3 w-3" /> Mix
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Pages Grid */}
          {pages.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Generated Pages
                </h2>
                <p className="text-sm text-muted-foreground">
                  {mode === "storybook" ? "Same character, different scenes" : "Same theme, varied content"}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pages.map((page) => (
                  <Card
                    key={page.page}
                    className={`overflow-hidden transition-all hover:shadow-lg ${
                      page.status === "done" ? "border-green-500/30" : ""
                    }`}
                  >
                    {/* Page Header */}
                    <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(page.status)}
                        <span className="font-medium text-sm">Page {page.page}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusBadge(page.status)}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleEditPage(page.page)}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Content */}
                    <CardContent className="p-3">
                      {page.status === "done" && page.imageBase64 ? (
                        <div className="space-y-2">
                          <div 
                            className={`bg-white rounded-xl border overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${
                              orientation === "landscape" ? "aspect-[3/2]" : 
                              orientation === "square" ? "aspect-square" : "aspect-[2/3]"
                            }`}
                            onClick={() => setPreviewImage(`data:image/png;base64,${page.imageBase64}`)}
                          >
                            <img
                              src={`data:image/png;base64,${page.imageBase64}`}
                              alt={`Page ${page.page}`}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 rounded-lg text-xs h-7"
                              onClick={() => setPreviewImage(`data:image/png;base64,${page.imageBase64}`)}
                            >
                              <Eye className="mr-1 h-3 w-3" /> View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 rounded-lg text-xs h-7"
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = `data:image/png;base64,${page.imageBase64}`;
                                link.download = `coloring-page-${page.page}.png`;
                                link.click();
                              }}
                            >
                              <Download className="mr-1 h-3 w-3" /> Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-xs h-7 px-2"
                              onClick={() => generateSinglePage(page.page)}
                              disabled={isGenerating}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {page.title && (
                            <p className="text-xs font-medium">{page.title}</p>
                          )}
                          {page.isEditing ? (
                            <div className="space-y-2">
                              <Textarea
                                value={page.prompt}
                                onChange={(e) => setPages(prev => prev.map(p => 
                                  p.page === page.page ? { ...p, prompt: e.target.value } : p
                                ))}
                                className="text-xs min-h-[100px] rounded-lg resize-none"
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => updatePagePrompt(page.page, page.prompt)}
                                  className="flex-1 rounded-lg text-xs h-7"
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleEditPage(page.page)}
                                  className="rounded-lg text-xs h-7"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className={`bg-muted/50 rounded-lg flex items-center justify-center text-muted-foreground ${
                                orientation === "landscape" ? "aspect-[3/2]" : 
                                orientation === "square" ? "aspect-square" : "aspect-[2/3]"
                              }`}>
                                {page.status === "generating" ? (
                                  <div className="text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                    <span className="text-xs">Generating...</span>
                                  </div>
                                ) : (
                                  <ImageIcon className="h-8 w-8 opacity-30" />
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground line-clamp-2">
                                {page.sceneDescription || page.prompt.slice(0, 100)}...
                              </p>
                            </>
                          )}
                          {page.error && (
                            <p className="text-[10px] text-red-500 bg-red-500/10 rounded px-2 py-1">
                              {page.error}
                            </p>
                          )}
                          {(page.status === "pending" || page.status === "failed") && !page.isEditing && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full rounded-lg text-xs h-7"
                              onClick={() => generateSinglePage(page.page)}
                              disabled={isGenerating}
                            >
                              <Play className="mr-1 h-3 w-3" /> Generate
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State / Help */}
          {!profile && (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="py-12 text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-4">
                  <Wand2 className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Clone Any Coloring Style</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                  Upload a reference coloring page and our AI will extract its style to generate 
                  multiple consistent pages. Perfect for creating coloring books with unified aesthetics.
                </p>
                <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Consistent style</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Story progression</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>KDP ready</span>
                  </div>
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
          title="Generated Image"
          pageNumber={1}
        />
      )}
    </>
  );
}
