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
  ImageIcon,
  Upload,
  X,
  Book,
  Palette,
  ArrowRight,
  Download,
  RefreshCw,
  Eye,
  Play,
  Settings2,
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

export default function BatchGenerationPage() {
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
      toast.success("Profile extracted! Configure your batch and generate prompts.");
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

  // ==================== Generate Images (One-by-One) ====================

  /**
   * Generate all images one-by-one with real-time preview updates.
   * This avoids timeout issues by making separate API calls per image.
   */
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
    let successCount = 0;
    let failCount = 0;

    toast.info(`Starting generation of ${pendingPages.length} images...`);

    // Generate images one-by-one for real-time preview
    for (let i = 0; i < pendingPages.length; i++) {
      const pageItem = pendingPages[i];
      
      // Update progress
      setGenerationProgress(Math.round((i / pendingPages.length) * 100));

      // Mark this page as generating
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
            size: getImageSize(),
          }),
        });

        const data = await response.json();

        if (response.ok && data.status === "done" && data.imageBase64) {
          // Success - update with image immediately
          setPages(prev => prev.map(p => 
            p.page === pageItem.page 
              ? { ...p, status: "done" as PageStatus, imageBase64: data.imageBase64, error: undefined }
              : p
          ));
          successCount++;
          toast.success(`Page ${pageItem.page} generated!`);
        } else {
          // Failed
          setPages(prev => prev.map(p => 
            p.page === pageItem.page 
              ? { ...p, status: "failed" as PageStatus, error: data.error || "Generation failed" }
              : p
          ));
          failCount++;
        }
      } catch (error) {
        // Error
        setPages(prev => prev.map(p => 
          p.page === pageItem.page 
            ? { ...p, status: "failed" as PageStatus, error: error instanceof Error ? error.message : "Generation failed" }
            : p
        ));
        failCount++;
      }

      // Small delay between requests
      await new Promise(r => setTimeout(r, 300));
    }

    setIsGenerating(false);
    setGenerationProgress(100);

    if (failCount === 0) {
      toast.success(`All ${successCount} images generated successfully!`);
    } else {
      toast.info(`Generated ${successCount} images, ${failCount} failed.`);
    }
  };

  /**
   * Generate a single page image using the one-by-one endpoint.
   */
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
          size: getImageSize(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === "done" && data.imageBase64) {
        setPages(prev => prev.map(p => 
          p.page === pageNumber 
            ? { ...p, status: "done" as PageStatus, imageBase64: data.imageBase64, error: undefined }
            : p
        ));
        toast.success(`Page ${pageNumber} generated!`);
      } else {
        setPages(prev => prev.map(p => 
          p.page === pageNumber 
            ? { ...p, status: "failed" as PageStatus, error: data.error || "Generation failed" }
            : p
        ));
        toast.error(`Page ${pageNumber} failed: ${data.error || "Unknown error"}`);
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

  // ==================== Render ====================

  return (
    <>
      <AppTopbar 
        title="Style Clone" 
        subtitle="Generate multiple coloring pages from one reference" 
      />

      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          
          {/* Step 1: Upload Reference Image */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Step 1: Upload Reference Image
              </CardTitle>
              <CardDescription>
                Upload a coloring page to use as a style and character reference
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-start">
                {uploadedImagePreview ? (
                  <div className="relative shrink-0">
                    <img
                      src={uploadedImagePreview}
                      alt="Reference"
                      className="w-40 h-52 object-contain rounded-xl border border-border bg-white"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                      onClick={removeUploadedImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-40 h-52 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors bg-muted/30">
                    <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground text-center px-2">Click to upload</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}

                <div className="flex-1 space-y-3">
                  {profile ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="font-medium">Profile Extracted</span>
                      </div>
                      {profile.characterProfile && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Character:</span>{" "}
                          <span className="font-medium">{profile.characterProfile.species}</span>
                          <span className="text-muted-foreground ml-2">
                            ({profile.characterProfile.keyFeatures.slice(0, 3).join(", ")})
                          </span>
                        </div>
                      )}
                      {profile.extractedTheme && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Theme:</span>{" "}
                          <span>{profile.extractedTheme}</span>
                        </div>
                      )}
                      <div className="text-sm">
                        <span className="text-muted-foreground">Scene elements:</span>{" "}
                        <span>{profile.sceneInventory.slice(0, 5).join(", ")}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Upload an image, then click "Extract Profile" to analyze the style and character.
                    </p>
                  )}

                  {uploadedImageBase64 && !profile && (
                    <Button
                      onClick={extractProfile}
                      disabled={extractingProfile}
                      className="rounded-xl"
                    >
                      {extractingProfile ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                      ) : (
                        <><Wand2 className="mr-2 h-4 w-4" /> Extract Profile</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Configure Batch */}
          {profile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Step 2: Configure Batch
                </CardTitle>
                <CardDescription>
                  Choose mode, page count, and story settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mode Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Generation Mode</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setMode("storybook")}
                      disabled={!profile.characterProfile}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        mode === "storybook" 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      } ${!profile.characterProfile ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Book className="h-5 w-5" />
                        <span className="font-medium">Storybook</span>
                        {mode === "storybook" && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Same character on every page, story progression
                      </p>
                      {!profile.characterProfile && (
                        <p className="text-xs text-amber-600 mt-1">
                          No character detected in image
                        </p>
                      )}
                    </button>

                    <button
                      onClick={() => setMode("theme")}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        mode === "theme" 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Palette className="h-5 w-5" />
                        <span className="font-medium">Theme Scenes</span>
                        {mode === "theme" && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Same style, varied scenes and characters
                      </p>
                    </button>
                  </div>
                </div>

                {/* Page Count */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Number of Pages</label>
                    <span className="text-sm font-mono bg-muted px-2 rounded">{pageCount}</span>
                  </div>
                  <Slider
                    value={[pageCount]}
                    onValueChange={(v) => setPageCount(v[0])}
                    min={1}
                    max={30}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 page</span>
                    <span>30 pages</span>
                  </div>
                </div>

                {/* Orientation / Size */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Page Orientation</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setOrientation("portrait")}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        orientation === "portrait"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-6 h-8 border-2 border-current rounded-sm" />
                        <span className="text-xs font-medium">Portrait</span>
                        <span className="text-[10px] text-muted-foreground">1024×1536</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setOrientation("landscape")}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        orientation === "landscape"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-6 border-2 border-current rounded-sm" />
                        <span className="text-xs font-medium">Landscape</span>
                        <span className="text-[10px] text-muted-foreground">1536×1024</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setOrientation("square")}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        orientation === "square"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-6 h-6 border-2 border-current rounded-sm" />
                        <span className="text-xs font-medium">Square</span>
                        <span className="text-[10px] text-muted-foreground">1024×1024</span>
                      </div>
                    </button>
                  </div>
                  {orientation === "landscape" && (
                    <p className="text-xs text-amber-600">
                      Landscape mode includes special framing to fill the wide canvas
                    </p>
                  )}
                </div>

                {/* Expandable Settings */}
                <div className="border rounded-xl">
                  <button
                    onClick={() => setExpandedSettings(!expandedSettings)}
                    className="w-full p-3 flex items-center justify-between text-sm font-medium hover:bg-muted/50 rounded-xl"
                  >
                    <span>Advanced Settings</span>
                    {expandedSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {expandedSettings && (
                    <div className="p-4 pt-0 space-y-4 border-t">
                      {/* Story Title */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Story/Theme Title (optional)</label>
                        <Input
                          placeholder="e.g., 'Luna's Magical Day'"
                          value={storyConfig.title || ""}
                          onChange={(e) => setStoryConfig({ ...storyConfig, title: e.target.value })}
                          className="rounded-xl"
                        />
                      </div>

                      {/* Target Age */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Target Age Group</label>
                        <div className="flex gap-2 flex-wrap">
                          {(["3-6", "6-9", "9-12", "all-ages"] as const).map((age) => (
                            <Button
                              key={age}
                              variant={storyConfig.targetAge === age ? "default" : "outline"}
                              size="sm"
                              onClick={() => setStoryConfig({ ...storyConfig, targetAge: age })}
                              className="rounded-lg"
                            >
                              <Users className="mr-1 h-3 w-3" />
                              {age === "all-ages" ? "All Ages" : `Ages ${age}`}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Scene Variety */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Scene Variety</label>
                        <div className="flex gap-2">
                          {(["low", "medium", "high"] as const).map((level) => (
                            <Button
                              key={level}
                              variant={storyConfig.sceneVariety === level ? "default" : "outline"}
                              size="sm"
                              onClick={() => setStoryConfig({ ...storyConfig, sceneVariety: level })}
                              className="rounded-lg capitalize"
                            >
                              <Shuffle className="mr-1 h-3 w-3" />
                              {level}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Setting Constraint */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Setting</label>
                        <div className="flex gap-2">
                          <Button
                            variant={storyConfig.settingConstraint === "indoors" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStoryConfig({ ...storyConfig, settingConstraint: "indoors" })}
                            className="rounded-lg"
                          >
                            <Home className="mr-1 h-3 w-3" /> Indoors
                          </Button>
                          <Button
                            variant={storyConfig.settingConstraint === "outdoors" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStoryConfig({ ...storyConfig, settingConstraint: "outdoors" })}
                            className="rounded-lg"
                          >
                            <TreePine className="mr-1 h-3 w-3" /> Outdoors
                          </Button>
                          <Button
                            variant={storyConfig.settingConstraint === "mixed" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStoryConfig({ ...storyConfig, settingConstraint: "mixed" })}
                            className="rounded-lg"
                          >
                            <Shuffle className="mr-1 h-3 w-3" /> Mixed
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Generate Prompts Button */}
                <Button
                  onClick={generatePrompts}
                  disabled={generatingPrompts}
                  size="lg"
                  className="w-full rounded-xl"
                >
                  {generatingPrompts ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Prompts...</>
                  ) : (
                    <><Sparkles className="mr-2 h-5 w-5" /> Generate {pageCount} Prompts</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Review & Generate */}
          {pages.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Step 3: Review & Generate
                    </CardTitle>
                    <CardDescription>
                      Edit prompts if needed, then generate images
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm">
                      <span className="text-green-600 font-medium">{doneCount}</span>
                      <span className="text-muted-foreground"> done</span>
                      <span className="mx-1 text-muted-foreground">/</span>
                      <span className="font-medium">{pages.length}</span>
                      <span className="text-muted-foreground"> total</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={generateAllImages}
                    disabled={isGenerating || pendingCount === 0}
                    className="rounded-xl"
                  >
                    {isGenerating ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                    ) : (
                      <><Play className="mr-2 h-4 w-4" /> Generate {pendingCount} Images</>
                    )}
                  </Button>

                  {doneCount > 0 && (
                    <Button
                      variant="outline"
                      onClick={downloadAll}
                      className="rounded-xl"
                    >
                      <Download className="mr-2 h-4 w-4" /> Download All ({doneCount})
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={generatePrompts}
                    disabled={generatingPrompts}
                    className="rounded-xl"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Regenerate Prompts
                  </Button>
                </div>

                {/* Pages Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pages.map((page) => (
                    <div
                      key={page.page}
                      className="border rounded-xl overflow-hidden bg-card"
                    >
                      {/* Page Header */}
                      <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(page.status)}
                          <span className="font-medium text-sm">Page {page.page}</span>
                          {getStatusBadge(page.status)}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleEditPage(page.page)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          {(page.status === "pending" || page.status === "failed") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => generateSinglePage(page.page)}
                              disabled={isGenerating}
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-3">
                        {page.status === "done" && page.imageBase64 ? (
                          <div className="space-y-2">
                            <div 
                              className="aspect-[2/3] bg-white rounded-lg border overflow-hidden cursor-pointer"
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
                                className="flex-1 rounded-lg text-xs"
                                onClick={() => setPreviewImage(`data:image/png;base64,${page.imageBase64}`)}
                              >
                                <Eye className="mr-1 h-3 w-3" /> View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 rounded-lg text-xs"
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
                                className="rounded-lg text-xs"
                                onClick={() => generateSinglePage(page.page)}
                                disabled={isGenerating}
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-muted-foreground">
                              {page.title}
                            </div>
                            {page.isEditing ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={page.prompt}
                                  onChange={(e) => setPages(prev => prev.map(p => 
                                    p.page === page.page ? { ...p, prompt: e.target.value } : p
                                  ))}
                                  className="text-xs min-h-[100px] rounded-lg"
                                />
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    onClick={() => updatePagePrompt(page.page, page.prompt)}
                                    className="flex-1 rounded-lg text-xs"
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => toggleEditPage(page.page)}
                                    className="rounded-lg text-xs"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground line-clamp-4">
                                {page.sceneDescription || page.prompt.slice(0, 150)}...
                              </div>
                            )}
                            {page.error && (
                              <div className="text-xs text-red-500">
                                Error: {page.error}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">How it works</p>
                  <ol className="text-xs text-muted-foreground mt-1 space-y-1 list-decimal list-inside">
                    <li>Upload a reference coloring page image</li>
                    <li>Extract the style and character profile</li>
                    <li>Choose Storybook (same character) or Theme (varied scenes) mode</li>
                    <li>Generate prompts and review/edit them</li>
                    <li>Generate all images at once or one by one</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
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

