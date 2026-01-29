"use client";

import { useState, useCallback } from "react";
import { AppTopbar } from "@/components/app/app-topbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Sparkles,
  Loader2,
  Wand2,
  ImageIcon,
  Book,
  Palette,
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
  Lightbulb,
  ArrowRight,
  Check,
  X,
  Copy,
  Trash2,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { ImagePreviewModal } from "@/components/app/image-preview-modal";
import { ExportPDFModal } from "@/components/app/export-pdf-modal";
import type {
  BatchPromptsResponse,
  PagePromptItem,
  PageResult,
  GenerationMode,
  StoryConfig,
  StyleProfile,
  CharacterProfile,
} from "@/lib/batchGenerationTypes";

type PageStatus = "pending" | "generating" | "done" | "failed";

interface PageState extends PagePromptItem {
  status: PageStatus;
  imageBase64?: string;
  error?: string;
  isEditing?: boolean;
}

interface GeneratedIdea {
  idea: string;
  title?: string;
  theme?: string;
  mainCharacter?: string;
  characterType?: string;
  exampleScenes?: string[];
  themeBucket?: string;
}

export default function CreateColoringBookPage() {
  // ==================== State ====================

  // Step 1: Idea input
  const [userIdea, setUserIdea] = useState("");
  const [generatedIdea, setGeneratedIdea] = useState<GeneratedIdea | null>(null);
  const [generatingIdea, setGeneratingIdea] = useState(false);
  
  // Diversity tracking for idea regeneration
  const [previousIdeas, setPreviousIdeas] = useState<Array<{
    title?: string;
    theme?: string;
    mainCharacter?: string;
  }>>([]);
  const [ideaSeed, setIdeaSeed] = useState<string>("");

  // Step 2: Improved prompt (MANDATORY)
  const [improvedPrompt, setImprovedPrompt] = useState("");
  const [isPromptImproved, setIsPromptImproved] = useState(false);
  const [improvingPrompt, setImprovingPrompt] = useState(false);

  // Step 3: Book configuration
  const [mode, setMode] = useState<GenerationMode>("storybook");
  const [pageCount, setPageCount] = useState(8);
  const [orientation, setOrientation] = useState<"portrait" | "landscape" | "square">("portrait");
  const [storyConfig, setStoryConfig] = useState<StoryConfig>({
    title: "",
    outline: "",
    targetAge: "all-ages",
    sceneVariety: "medium",
    settingConstraint: "mixed",
  });
  const [expandedSettings, setExpandedSettings] = useState(false);

  // Step 4: Generated prompts and images
  const [pages, setPages] = useState<PageState[]>([]);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Character Identity Profile (from batch/prompts response, for validation)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [characterIdentityProfile, setCharacterIdentityProfile] = useState<any>(null);

  // Preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Export PDF modal
  const [showExportModal, setShowExportModal] = useState(false);

  // ==================== Helpers ====================

  const getImageSize = () => {
    if (orientation === "landscape") return "1536x1024";
    if (orientation === "portrait") return "1024x1536";
    return "1024x1024";
  };

  const safeJsonParse = async (response: Response) => {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(text.slice(0, 200) || "Unknown error");
    }
  };

  // ==================== Step 1: Idea Generation ====================

  const generateIdea = async (isRegenerate = false) => {
    setGeneratingIdea(true);
    
    // Generate a new unique seed for each call
    const newSeed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setIdeaSeed(newSeed);
    
    try {
      // Build excluded themes based on previous ideas
      const excludeThemes = previousIdeas
        .map(p => p.theme)
        .filter(Boolean) as string[];
      
      // Build excluded character types  
      const excludeCharacterTypes = previousIdeas
        .map(p => p.mainCharacter?.split(" ").pop())
        .filter(Boolean) as string[];

      const response = await fetch("/api/idea/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeHint: userIdea.trim() || undefined,
          age: storyConfig.targetAge,
          mode,
          // Diversity parameters
          ideaSeed: newSeed,
          previousIdeas: previousIdeas.slice(-5), // Last 5 ideas
          excludeThemes: excludeThemes.slice(-5),
          excludeCharacterTypes: excludeCharacterTypes.slice(-5),
        }),
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate idea");
      }

      const newIdea = data as GeneratedIdea;
      setGeneratedIdea(newIdea);
      
      // Track this idea for future diversity
      setPreviousIdeas(prev => [...prev.slice(-4), {
        title: newIdea.title,
        theme: newIdea.theme || newIdea.themeBucket,
        mainCharacter: newIdea.mainCharacter,
      }]);
      
      toast.success(isRegenerate 
        ? "New idea generated! This one is different from before." 
        : "Idea generated! Review and click 'Use This Idea' to continue."
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate idea");
    } finally {
      setGeneratingIdea(false);
    }
  };

  const useGeneratedIdea = () => {
    if (generatedIdea) {
      setUserIdea(generatedIdea.idea);
      // Reset improved prompt when idea changes
      setImprovedPrompt("");
      setIsPromptImproved(false);
      setPages([]);
      toast.success("Idea applied! Now click 'Improve Prompt' to continue.");
    }
  };

  const clearIdea = (resetHistory = false) => {
    setUserIdea("");
    setGeneratedIdea(null);
    setImprovedPrompt("");
    setIsPromptImproved(false);
    setPages([]);
    if (resetHistory) {
      setPreviousIdeas([]);
      setIdeaSeed("");
    }
  };

  // ==================== Step 2: Improve Prompt (MANDATORY) ====================

  const improvePrompt = async () => {
    if (!userIdea.trim()) {
      toast.error("Please enter or generate an idea first");
      return;
    }

    setImprovingPrompt(true);
    try {
      const response = await fetch("/api/prompt/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: userIdea,
          mode,
          age: storyConfig.targetAge,
          characterHint: generatedIdea?.mainCharacter,
        }),
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to improve prompt");
      }

      setImprovedPrompt(data.prompt);
      setIsPromptImproved(true);
      setPages([]); // Reset pages when prompt changes
      toast.success("Prompt improved! You can edit it, then generate page prompts.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to improve prompt");
    } finally {
      setImprovingPrompt(false);
    }
  };

  const handlePromptChange = (newPrompt: string) => {
    setImprovedPrompt(newPrompt);
    // Don't reset isPromptImproved - user is just editing
  };

  // ==================== Step 3: Generate Page Prompts ====================

  const generatePagePrompts = async () => {
    if (!isPromptImproved || !improvedPrompt.trim()) {
      toast.error("Please improve your prompt first");
      return;
    }

    setGeneratingPrompts(true);
    try {
      // Build a minimal style profile from the improved prompt
      const styleProfile: StyleProfile = {
        lineStyle: "Clean, smooth black outlines suitable for coloring",
        compositionRules: "Subject centered and fills 85-95% of the frame",
        environmentStyle: "Simple backgrounds appropriate to the scene",
        colorScheme: "black and white line art",
        mustAvoid: [
          "solid black fills",
          "filled shapes",
          "shading",
          "grayscale",
          "gradients",
          "border",
          "frame",
        ],
      };

      // Extract character profile hint if in storybook mode
      let characterProfile: CharacterProfile | undefined;
      if (mode === "storybook") {
        // Create a basic character profile from the prompt
        // The batch/prompts endpoint will use this for consistency
        characterProfile = {
          species: "main character from the prompt",
          keyFeatures: ["as described in the base prompt"],
          proportions: "as described in the base prompt",
          faceStyle: "as described in the base prompt",
          poseVibe: "varies by scene",
          doNotChange: ["character design", "proportions", "face style"],
        };
      }

      const response = await fetch("/api/batch/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          count: pageCount,
          story: storyConfig,
          styleProfile,
          characterProfile,
          basePrompt: improvedPrompt,
          size: getImageSize(),
        }),
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate prompts");
      }

      // Extended response includes characterIdentityProfile
      const batchResponse = data as BatchPromptsResponse & { 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        characterIdentityProfile?: any 
      };

      // Store character identity profile for validation (storybook mode)
      if (batchResponse.characterIdentityProfile) {
        setCharacterIdentityProfile(batchResponse.characterIdentityProfile);
        console.log("[create] Received character identity profile for:", batchResponse.characterIdentityProfile.species);
      }

      // Convert to page state
      const pageStates: PageState[] = batchResponse.pages.map((p) => ({
        ...p,
        status: "pending" as PageStatus,
      }));

      setPages(pageStates);
      toast.success(`Generated ${pageStates.length} prompts! Review and generate images.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate prompts");
    } finally {
      setGeneratingPrompts(false);
    }
  };

  // ==================== Step 4: Generate Images (One-by-One) ====================

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
    let successCount = 0;
    let failCount = 0;

    toast.info(`Starting generation of ${pendingPages.length} images...`);

    // Generate images one-by-one for real-time preview
    for (const pageItem of pendingPages) {
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
            // Storybook mode parameters for validation
            isStorybookMode: mode === "storybook",
            characterProfile: mode === "storybook" ? characterIdentityProfile : undefined,
            validateOutline: true,
            validateCharacter: mode === "storybook",
          }),
        });

        const data = await safeJsonParse(response);

        if (response.ok && data.status === "done" && data.imageBase64) {
          // Success - update with image immediately
          const hasWarning = data.warning || (data.validation && !data.validation.passed);
          setPages(prev => prev.map(p =>
            p.page === pageItem.page
              ? { ...p, status: "done" as PageStatus, imageBase64: data.imageBase64, error: hasWarning ? data.warning : undefined }
              : p
          ));
          successCount++;
          if (hasWarning) {
            toast.warning(`Page ${pageItem.page} generated with warnings`);
          } else {
            toast.success(`Page ${pageItem.page} generated!`);
          }
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

      // Small delay between requests to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));
    }

    setIsGenerating(false);

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
          // Storybook mode parameters for validation
          isStorybookMode: mode === "storybook",
          characterProfile: mode === "storybook" ? characterIdentityProfile : undefined,
          validateOutline: true,
          validateCharacter: mode === "storybook",
        }),
      });

      const data = await safeJsonParse(response);

      if (response.ok && data.status === "done" && data.imageBase64) {
        const hasWarning = data.warning || (data.validation && !data.validation.passed);
        setPages(prev => prev.map(p =>
          p.page === pageNumber
            ? { ...p, status: "done" as PageStatus, imageBase64: data.imageBase64, error: hasWarning ? data.warning : undefined }
            : p
        ));
        if (hasWarning) {
          toast.warning(`Page ${pageNumber} generated with warnings: ${data.warning}`);
        } else {
          toast.success(`Page ${pageNumber} generated!`);
        }
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

  // ==================== Prompt Editing ====================

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
        title="Create Coloring Book"
        subtitle="Generate professional coloring pages from your idea"
      />

      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-6xl space-y-6">

          {/* Step 1: Idea Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Step 1: Your Book Idea
              </CardTitle>
              <CardDescription>
                Describe your coloring book idea or let AI generate one for you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe your coloring book idea... e.g., 'A magical unicorn named Luna who explores different enchanted kingdoms' or 'Ocean animals doing fun activities at the beach'"
                value={userIdea}
                onChange={(e) => {
                  setUserIdea(e.target.value);
                  // Reset downstream state when idea changes
                  if (isPromptImproved) {
                    setIsPromptImproved(false);
                    setImprovedPrompt("");
                    setPages([]);
                  }
                }}
                className="min-h-[100px] rounded-xl"
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => generateIdea(false)}
                  disabled={generatingIdea}
                  className="rounded-xl"
                >
                  {generatingIdea ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Wand2 className="mr-2 h-4 w-4" /> Generate Idea with AI</>
                  )}
                </Button>

                {generatedIdea && (
                  <Button
                    variant="outline"
                    onClick={() => generateIdea(true)}
                    disabled={generatingIdea}
                    className="rounded-xl"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Regenerate (Different)
                  </Button>
                )}

                {userIdea.trim() && (
                  <Button
                    variant="ghost"
                    onClick={() => clearIdea(false)}
                    className="rounded-xl"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Clear
                  </Button>
                )}
              </div>

              {/* Generated Idea Preview */}
              {generatedIdea && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-700 dark:text-green-400">
                        AI Suggestion
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={useGeneratedIdea}
                      className="rounded-lg"
                    >
                      <Check className="mr-1 h-3 w-3" /> Use This Idea
                    </Button>
                  </div>

                  {generatedIdea.title && (
                    <p className="font-semibold">{generatedIdea.title}</p>
                  )}

                  <p className="text-sm text-muted-foreground">{generatedIdea.idea}</p>

                  {generatedIdea.exampleScenes && generatedIdea.exampleScenes.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Example scenes:</p>
                      <div className="flex flex-wrap gap-1">
                        {generatedIdea.exampleScenes.slice(0, 6).map((scene, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {scene.length > 40 ? scene.slice(0, 40) + "..." : scene}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Improve Prompt (MANDATORY) */}
          <Card className={!userIdea.trim() ? "opacity-50 pointer-events-none" : ""}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Step 2: Improve Prompt
                {isPromptImproved && (
                  <Badge variant="default" className="bg-green-500 ml-2">
                    <Check className="mr-1 h-3 w-3" /> Improved
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {isPromptImproved
                  ? "Your prompt has been converted to a detailed, structured format. You can edit it below."
                  : "Required: Convert your idea into a detailed prompt optimized for coloring page generation"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isPromptImproved ? (
                <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-xl bg-muted/30">
                  <Wand2 className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                    Click the button below to convert your idea into a professional, structured prompt
                    with all the necessary coloring page constraints.
                  </p>
                  <Button
                    onClick={improvePrompt}
                    disabled={improvingPrompt || !userIdea.trim()}
                    size="lg"
                    className="rounded-xl"
                  >
                    {improvingPrompt ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Improving...</>
                    ) : (
                      <><Sparkles className="mr-2 h-5 w-5" /> Improve Prompt</>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    value={improvedPrompt}
                    onChange={(e) => handlePromptChange(e.target.value)}
                    className="min-h-[200px] rounded-xl font-mono text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={improvePrompt}
                      disabled={improvingPrompt}
                      className="rounded-xl"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" /> Re-improve
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => navigator.clipboard.writeText(improvedPrompt)}
                      className="rounded-xl"
                    >
                      <Copy className="mr-2 h-4 w-4" /> Copy
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Configure Book */}
          <Card className={!isPromptImproved ? "opacity-50 pointer-events-none" : ""}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Step 3: Configure Book
              </CardTitle>
              <CardDescription>
                Choose mode, page count, and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mode Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Book Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode("storybook")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      mode === "storybook"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Book className="h-5 w-5" />
                      <span className="font-medium">Storybook</span>
                      {mode === "storybook" && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Same character on every page, story progression
                    </p>
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
                      <span className="font-medium">Theme Collection</span>
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

              {/* Orientation */}
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
                    </div>
                  </button>
                </div>
              </div>

              {/* Advanced Settings */}
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

                    {/* Setting */}
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
                onClick={generatePagePrompts}
                disabled={generatingPrompts || !isPromptImproved}
                size="lg"
                className="w-full rounded-xl"
              >
                {generatingPrompts ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Prompts...</>
                ) : (
                  <><Sparkles className="mr-2 h-5 w-5" /> Generate {pageCount} Page Prompts</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Step 4: Review & Generate */}
          {pages.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Step 4: Review & Generate
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
                    <>
                      <Button
                        variant="outline"
                        onClick={downloadAll}
                        className="rounded-xl"
                      >
                        <Download className="mr-2 h-4 w-4" /> Download All ({doneCount})
                      </Button>

                      <Button
                        variant="default"
                        onClick={() => setShowExportModal(true)}
                        className="rounded-xl"
                      >
                        <FileDown className="mr-2 h-4 w-4" /> Export PDF
                      </Button>
                    </>
                  )}

                  <Button
                    variant="outline"
                    onClick={generatePagePrompts}
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
                    <li>Enter your book idea or generate one with AI</li>
                    <li>Click "Improve Prompt" to create a detailed, structured prompt (required)</li>
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

      {/* Export PDF Modal */}
      <ExportPDFModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        coloringPages={pages
          .filter(p => p.status === "done" && p.imageBase64)
          .map(p => ({ page: p.page, imageBase64: p.imageBase64! }))}
        characterProfile={characterIdentityProfile ? {
          species: characterIdentityProfile.species,
          faceShape: characterIdentityProfile.faceShape,
          eyeStyle: characterIdentityProfile.eyeStyle,
          proportions: characterIdentityProfile.proportions,
        } : undefined}
        defaultTitle={storyConfig.title || generatedIdea?.title || "My Coloring Book"}
      />
    </>
  );
}

