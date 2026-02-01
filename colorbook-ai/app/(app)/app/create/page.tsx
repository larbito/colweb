"use client";

import { useState, useCallback } from "react";
import { AppTopbar } from "@/components/app/app-topbar";
import { PageHeader } from "@/components/app/page-header";
import { SectionCard, SubSection } from "@/components/app/section-card";
import { OptionCard, OptionChip, OptionGrid, ChipGroup } from "@/components/app/option-card";
import { PreviewGrid, PreviewCard, PreviewStatusBadge, type PreviewStatus } from "@/components/app/preview-grid";
import { ProgressPanel, type JobProgress, type JobPhase } from "@/components/app/progress-panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Sparkles,
  Loader2,
  Wand2,
  Book,
  Palette,
  Download,
  RefreshCw,
  Eye,
  Play,
  Settings2,
  Edit3,
  ChevronDown,
  ChevronUp,
  Users,
  Home,
  TreePine,
  Shuffle,
  Lightbulb,
  Check,
  Copy,
  Trash2,
  FileDown,
  PenTool,
} from "lucide-react";
import { toast } from "sonner";
import { ImagePreviewModal } from "@/components/app/image-preview-modal";
import { ExportPDFModal } from "@/components/app/export-pdf-modal";
import type {
  BatchPromptsResponse,
  PagePromptItem,
  GenerationMode,
  StoryConfig,
  StyleProfile,
  CharacterProfile,
} from "@/lib/batchGenerationTypes";

type PageStatus = "pending" | "generating" | "done" | "failed";
type EnhanceStatus = "none" | "enhancing" | "enhanced" | "failed";
type ProcessingStatus = "none" | "processing" | "done" | "failed";

interface PageState extends PagePromptItem {
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
  // State
  const [userIdea, setUserIdea] = useState("");
  const [generatedIdea, setGeneratedIdea] = useState<GeneratedIdea | null>(null);
  const [generatingIdea, setGeneratingIdea] = useState(false);
  const [previousIdeas, setPreviousIdeas] = useState<Array<{ title?: string; theme?: string; mainCharacter?: string }>>([]);
  const [ideaSeed, setIdeaSeed] = useState<string>("");
  const [improvedPrompt, setImprovedPrompt] = useState("");
  const [isPromptImproved, setIsPromptImproved] = useState(false);
  const [improvingPrompt, setImprovingPrompt] = useState(false);
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
  const [pages, setPages] = useState<PageState[]>([]);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [characterIdentityProfile, setCharacterIdentityProfile] = useState<any>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancingPageId, setEnhancingPageId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingPageId, setProcessingPageId] = useState<number | null>(null);

  // Progress tracking
  const [jobProgress, setJobProgress] = useState<JobProgress>({
    totalItems: 0,
    completedItems: 0,
    phase: "idle",
  });

  // Helpers
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

  // Step 1: Idea Generation
  const generateIdea = async (isRegenerate = false) => {
    setGeneratingIdea(true);
    const newSeed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setIdeaSeed(newSeed);
    
    try {
      const excludeThemes = previousIdeas.map(p => p.theme).filter(Boolean) as string[];
      const excludeCharacterTypes = previousIdeas.map(p => p.mainCharacter?.split(" ").pop()).filter(Boolean) as string[];

      const response = await fetch("/api/idea/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeHint: userIdea.trim() || undefined,
          age: storyConfig.targetAge,
          mode,
          ideaSeed: newSeed,
          previousIdeas: previousIdeas.slice(-5),
          excludeThemes: excludeThemes.slice(-5),
          excludeCharacterTypes: excludeCharacterTypes.slice(-5),
        }),
      });

      const data = await safeJsonParse(response);
      if (!response.ok) throw new Error(data.error || "Failed to generate idea");

      const newIdea = data as GeneratedIdea;
      setGeneratedIdea(newIdea);
      setPreviousIdeas(prev => [...prev.slice(-4), {
        title: newIdea.title,
        theme: newIdea.theme || newIdea.themeBucket,
        mainCharacter: newIdea.mainCharacter,
      }]);
      
      toast.success(isRegenerate 
        ? "New idea generated!" 
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

  // Step 2: Improve Prompt
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
      if (!response.ok) throw new Error(data.error || "Failed to improve prompt");

      setImprovedPrompt(data.prompt);
      setIsPromptImproved(true);
      setPages([]);
      toast.success("Prompt improved! You can edit it, then generate page prompts.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to improve prompt");
    } finally {
      setImprovingPrompt(false);
    }
  };

  // Step 3: Generate Page Prompts
  const generatePagePrompts = async () => {
    if (!isPromptImproved || !improvedPrompt.trim()) {
      toast.error("Please improve your prompt first");
      return;
    }

    setGeneratingPrompts(true);
    try {
      const styleProfile: StyleProfile = {
        lineStyle: "Clean, smooth black outlines suitable for coloring",
        compositionRules: "Subject centered and fills 85-95% of the frame",
        environmentStyle: "Simple backgrounds appropriate to the scene",
        colorScheme: "black and white line art",
        mustAvoid: ["solid black fills", "filled shapes", "shading", "grayscale", "gradients", "border", "frame"],
      };

      let characterProfile: CharacterProfile | undefined;
      if (mode === "storybook") {
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
      if (!response.ok) throw new Error(data.error || "Failed to generate prompts");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchResponse = data as BatchPromptsResponse & { characterIdentityProfile?: any };

      if (batchResponse.characterIdentityProfile) {
        setCharacterIdentityProfile(batchResponse.characterIdentityProfile);
      }

      const pageStates: PageState[] = batchResponse.pages.map((p) => ({
        ...p,
        status: "pending" as PageStatus,
        enhanceStatus: "none" as EnhanceStatus,
        finalLetterStatus: "none" as ProcessingStatus,
        activeVersion: "original" as const,
      }));

      setPages(pageStates);
      toast.success(`Generated ${pageStates.length} prompts! Review and generate images.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate prompts");
    } finally {
      setGeneratingPrompts(false);
    }
  };

  // Step 4: Generate Images
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
    setJobProgress({
      totalItems: pendingPages.length,
      completedItems: 0,
      phase: "generating",
      startedAt: Date.now(),
    });

    let successCount = 0;
    let failCount = 0;

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
            size: getImageSize(),
            isStorybookMode: mode === "storybook",
            characterProfile: mode === "storybook" ? characterIdentityProfile : undefined,
            validateOutline: true,
            validateCharacter: mode === "storybook",
          }),
        });

        const data = await safeJsonParse(response);

        if (response.ok && data.status === "done" && data.imageBase64) {
          setPages(prev => prev.map(p =>
            p.page === pageItem.page
              ? { ...p, status: "done" as PageStatus, imageBase64: data.imageBase64, error: data.warning }
              : p
          ));
          successCount++;
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

      setJobProgress(prev => ({
        ...prev,
        completedItems: successCount + failCount,
        failedCount: failCount,
        estimatedSecondsRemaining: ((Date.now() - (prev.startedAt || Date.now())) / (successCount + failCount)) * (pendingPages.length - successCount - failCount) / 1000,
      }));

      await new Promise(r => setTimeout(r, 300));
    }

    setIsGenerating(false);
    setJobProgress(prev => ({ ...prev, phase: "complete" }));

    if (failCount === 0) {
      toast.success(`All ${successCount} images generated successfully!`);
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
          size: getImageSize(),
          isStorybookMode: mode === "storybook",
          characterProfile: mode === "storybook" ? characterIdentityProfile : undefined,
          validateOutline: true,
          validateCharacter: mode === "storybook",
        }),
      });

      const data = await safeJsonParse(response);

      if (response.ok && data.status === "done" && data.imageBase64) {
        setPages(prev => prev.map(p =>
          p.page === pageNumber
            ? { ...p, status: "done" as PageStatus, imageBase64: data.imageBase64, error: data.warning }
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

  // Prompt Editing
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

  // Enhance Images
  const enhanceSinglePage = async (pageNumber: number) => {
    const page = pages.find(p => p.page === pageNumber);
    if (!page || !page.imageBase64 || page.enhanceStatus === "enhancing") return;

    setEnhancingPageId(pageNumber);
    setPages(prev => prev.map(p =>
      p.page === pageNumber ? { ...p, enhanceStatus: "enhancing" as EnhanceStatus } : p
    ));

    try {
      const response = await fetch("/api/image/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: page.imageBase64, scale: 2 }),
      });

      const data = await response.json();

      if (response.ok && data.enhancedImageBase64) {
        setPages(prev => prev.map(p =>
          p.page === pageNumber
            ? { ...p, enhancedImageBase64: data.enhancedImageBase64, enhanceStatus: "enhanced" as EnhanceStatus, activeVersion: "enhanced" as const }
            : p
        ));
        toast.success(`Page ${pageNumber} enhanced!`);
      } else {
        setPages(prev => prev.map(p =>
          p.page === pageNumber ? { ...p, enhanceStatus: "failed" as EnhanceStatus } : p
        ));
        toast.error(`Failed to enhance page ${pageNumber}`);
      }
    } catch (error) {
      setPages(prev => prev.map(p =>
        p.page === pageNumber ? { ...p, enhanceStatus: "failed" as EnhanceStatus } : p
      ));
      toast.error(error instanceof Error ? error.message : "Enhancement failed");
    } finally {
      setEnhancingPageId(null);
    }
  };

  const enhanceAllPages = async () => {
    const pagesToEnhance = pages.filter(p => p.status === "done" && p.imageBase64 && p.enhanceStatus !== "enhanced");
    if (pagesToEnhance.length === 0) {
      toast.info("All pages are already enhanced!");
      return;
    }

    setIsEnhancing(true);
    setJobProgress({
      totalItems: pagesToEnhance.length,
      completedItems: 0,
      phase: "enhancing",
      startedAt: Date.now(),
    });

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
          body: JSON.stringify({ imageBase64: page.imageBase64, scale: 2 }),
        });

        const data = await response.json();

        if (response.ok && data.enhancedImageBase64) {
          setPages(prev => prev.map(p =>
            p.page === page.page
              ? { ...p, enhancedImageBase64: data.enhancedImageBase64, enhanceStatus: "enhanced" as EnhanceStatus, activeVersion: "enhanced" as const }
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

      setJobProgress(prev => ({
        ...prev,
        completedItems: successCount,
        estimatedSecondsRemaining: ((Date.now() - (prev.startedAt || Date.now())) / (successCount || 1)) * (pagesToEnhance.length - successCount) / 1000,
      }));

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsEnhancing(false);
    setEnhancingPageId(null);
    setJobProgress(prev => ({ ...prev, phase: "complete" }));

    if (successCount === pagesToEnhance.length) {
      toast.success(`All ${successCount} pages enhanced!`);
    } else {
      toast.warning(`Enhanced ${successCount}/${pagesToEnhance.length} pages`);
    }
  };

  const togglePageVersion = (pageNumber: number) => {
    setPages(prev => prev.map(p => {
      if (p.page !== pageNumber) return p;
      if (p.activeVersion === "original" && p.enhancedImageBase64) {
        return { ...p, activeVersion: "enhanced" as const };
      } else if (p.activeVersion === "enhanced" && p.finalLetterBase64) {
        return { ...p, activeVersion: "finalLetter" as const };
      } else if (p.activeVersion === "finalLetter") {
        return { ...p, activeVersion: "original" as const };
      } else if (p.activeVersion === "original" && p.finalLetterBase64) {
        return { ...p, activeVersion: "finalLetter" as const };
      }
      return { ...p, activeVersion: "original" as const };
    }));
  };

  // Process to Letter Format
  const processAllPages = async () => {
    const pagesToProcess = pages.filter(p => p.status === "done" && p.imageBase64 && p.finalLetterStatus !== "done");
    if (pagesToProcess.length === 0) {
      toast.info("All pages are already processed!");
      return;
    }

    setIsProcessing(true);
    setJobProgress({
      totalItems: pagesToProcess.length,
      completedItems: 0,
      phase: "processing",
      startedAt: Date.now(),
    });

    let successCount = 0;

    for (const page of pagesToProcess) {
      setProcessingPageId(page.page);
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

      setJobProgress(prev => ({
        ...prev,
        completedItems: successCount,
        estimatedSecondsRemaining: ((Date.now() - (prev.startedAt || Date.now())) / (successCount || 1)) * (pagesToProcess.length - successCount) / 1000,
      }));

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsProcessing(false);
    setProcessingPageId(null);
    setJobProgress(prev => ({ ...prev, phase: "complete" }));

    if (successCount === pagesToProcess.length) {
      toast.success(`All ${successCount} pages processed!`);
    } else {
      toast.warning(`Processed ${successCount}/${pagesToProcess.length} pages`);
    }
  };

  // Download
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

  // Computed values
  const doneCount = pages.filter(p => p.status === "done").length;
  const pendingCount = pages.filter(p => p.status === "pending" || p.status === "failed").length;
  const enhancedCount = pages.filter(p => p.enhanceStatus === "enhanced").length;
  const processedCount = pages.filter(p => p.finalLetterStatus === "done").length;

  const getPreviewStatus = (page: PageState): PreviewStatus => {
    if (page.status === "generating") return "generating";
    if (page.enhanceStatus === "enhancing") return "enhancing";
    if (page.finalLetterStatus === "processing") return "processing";
    if (page.status === "failed") return "failed";
    if (page.status === "done") return "done";
    return "pending";
  };

  return (
    <>
      <AppTopbar title="Create Coloring Book" />

      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <PageHeader
            title="Create Coloring Book"
            subtitle="Generate professional coloring pages from your idea"
            icon={PenTool}
            actions={
              doneCount > 0 && (
                <Button onClick={() => setShowExportModal(true)}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              )
            }
          />

          {/* Progress Panel - Show when any operation is running */}
          {(isGenerating || isEnhancing || isProcessing) && (
            <ProgressPanel progress={jobProgress} />
          )}

          {/* Step 1: Idea Input */}
          <SectionCard
            title="Step 1: Your Book Idea"
            description="Describe your coloring book idea or let AI generate one for you"
            icon={Lightbulb}
            iconColor="text-amber-500"
            iconBg="bg-amber-500/10"
          >
            <div className="space-y-4">
              <Textarea
                placeholder="Describe your coloring book idea... e.g., 'A magical unicorn named Luna who explores different enchanted kingdoms'"
                value={userIdea}
                onChange={(e) => {
                  setUserIdea(e.target.value);
                  if (isPromptImproved) {
                    setIsPromptImproved(false);
                    setImprovedPrompt("");
                    setPages([]);
                  }
                }}
                className="min-h-[100px]"
              />

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => generateIdea(false)} disabled={generatingIdea}>
                  {generatingIdea ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Wand2 className="mr-2 h-4 w-4" /> Generate Idea with AI</>
                  )}
                </Button>

                {generatedIdea && (
                  <Button variant="outline" onClick={() => generateIdea(true)} disabled={generatingIdea}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Different Idea
                  </Button>
                )}

                {userIdea.trim() && (
                  <Button variant="ghost" onClick={() => clearIdea(false)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Clear
                  </Button>
                )}
              </div>

              {/* Generated Idea Preview */}
              {generatedIdea && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">AI Suggestion</span>
                    </div>
                    <Button size="sm" onClick={useGeneratedIdea}>
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
            </div>
          </SectionCard>

          {/* Step 2: Improve Prompt */}
          <SectionCard
            title="Step 2: Improve Prompt"
            description={isPromptImproved
              ? "Your prompt has been converted to a detailed, structured format"
              : "Convert your idea into a detailed prompt optimized for coloring pages"}
            icon={Wand2}
            iconColor="text-purple-500"
            iconBg="bg-purple-500/10"
            badge={isPromptImproved ? "Done" : undefined}
            badgeVariant={isPromptImproved ? "default" : undefined}
            className={!userIdea.trim() ? "opacity-50 pointer-events-none" : ""}
          >
            {!isPromptImproved ? (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl bg-muted/30">
                <Wand2 className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                  Convert your idea into a professional prompt with coloring page constraints
                </p>
                <Button onClick={improvePrompt} disabled={improvingPrompt || !userIdea.trim()} size="lg">
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
                  onChange={(e) => setImprovedPrompt(e.target.value)}
                  className="min-h-[180px] font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={improvePrompt} disabled={improvingPrompt}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Re-improve
                  </Button>
                  <Button variant="ghost" onClick={() => navigator.clipboard.writeText(improvedPrompt)}>
                    <Copy className="mr-2 h-4 w-4" /> Copy
                  </Button>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Step 3: Configure Book */}
          <SectionCard
            title="Step 3: Configure Book"
            description="Choose mode, page count, and settings"
            icon={Settings2}
            iconColor="text-blue-500"
            iconBg="bg-blue-500/10"
            className={!isPromptImproved ? "opacity-50 pointer-events-none" : ""}
          >
            <div className="space-y-6">
              {/* Mode Selection */}
              <SubSection title="Book Type">
                <OptionGrid columns={2}>
                  <OptionCard
                    title="Storybook"
                    description="Same character on every page, story progression"
                    icon={Book}
                    selected={mode === "storybook"}
                    onClick={() => setMode("storybook")}
                  />
                  <OptionCard
                    title="Theme Collection"
                    description="Same style, varied scenes and characters"
                    icon={Palette}
                    selected={mode === "theme"}
                    onClick={() => setMode("theme")}
                  />
                </OptionGrid>
              </SubSection>

              {/* Page Count */}
              <SubSection title="Number of Pages">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pages</span>
                    <span className="text-sm font-mono bg-muted px-2 rounded">{pageCount}</span>
                  </div>
                  <Slider
                    value={[pageCount]}
                    onValueChange={(v) => setPageCount(v[0])}
                    min={1}
                    max={80}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 page</span>
                    <span>80 pages</span>
                  </div>
                </div>
              </SubSection>

              {/* Orientation */}
              <SubSection title="Page Orientation">
                <ChipGroup>
                  <OptionChip label="Portrait" selected={orientation === "portrait"} onClick={() => setOrientation("portrait")} />
                  <OptionChip label="Landscape" selected={orientation === "landscape"} onClick={() => setOrientation("landscape")} />
                  <OptionChip label="Square" selected={orientation === "square"} onClick={() => setOrientation("square")} />
                </ChipGroup>
              </SubSection>

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
                    <SubSection title="Target Age Group">
                      <ChipGroup>
                        {(["3-6", "6-9", "9-12", "all-ages"] as const).map((age) => (
                          <OptionChip
                            key={age}
                            label={age === "all-ages" ? "All Ages" : `Ages ${age}`}
                            selected={storyConfig.targetAge === age}
                            onClick={() => setStoryConfig({ ...storyConfig, targetAge: age })}
                            icon={Users}
                          />
                        ))}
                      </ChipGroup>
                    </SubSection>

                    <SubSection title="Scene Variety">
                      <ChipGroup>
                        {(["low", "medium", "high"] as const).map((level) => (
                          <OptionChip
                            key={level}
                            label={level.charAt(0).toUpperCase() + level.slice(1)}
                            selected={storyConfig.sceneVariety === level}
                            onClick={() => setStoryConfig({ ...storyConfig, sceneVariety: level })}
                            icon={Shuffle}
                          />
                        ))}
                      </ChipGroup>
                    </SubSection>

                    <SubSection title="Setting">
                      <ChipGroup>
                        <OptionChip label="Indoors" icon={Home} selected={storyConfig.settingConstraint === "indoors"} onClick={() => setStoryConfig({ ...storyConfig, settingConstraint: "indoors" })} />
                        <OptionChip label="Outdoors" icon={TreePine} selected={storyConfig.settingConstraint === "outdoors"} onClick={() => setStoryConfig({ ...storyConfig, settingConstraint: "outdoors" })} />
                        <OptionChip label="Mixed" icon={Shuffle} selected={storyConfig.settingConstraint === "mixed"} onClick={() => setStoryConfig({ ...storyConfig, settingConstraint: "mixed" })} />
                      </ChipGroup>
                    </SubSection>
                  </div>
                )}
              </div>

              {/* Generate Prompts Button */}
              <Button onClick={generatePagePrompts} disabled={generatingPrompts || !isPromptImproved} size="lg" className="w-full">
                {generatingPrompts ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Prompts...</>
                ) : (
                  <><Sparkles className="mr-2 h-5 w-5" /> Generate {pageCount} Page Prompts</>
                )}
              </Button>
            </div>
          </SectionCard>

          {/* Step 4: Review & Generate */}
          {pages.length > 0 && (
            <SectionCard
              title="Step 4: Review & Generate"
              description="Edit prompts if needed, then generate images"
              icon={Play}
              iconColor="text-emerald-500"
              iconBg="bg-emerald-500/10"
              headerActions={
                <Badge variant="outline" className="text-sm py-1 px-3">
                  {doneCount} done / {pages.length} total
                </Badge>
              }
            >
              <div className="space-y-4">
                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={generateAllImages} disabled={isGenerating || pendingCount === 0}>
                    {isGenerating ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                    ) : (
                      <><Play className="mr-2 h-4 w-4" /> Generate {pendingCount} Images</>
                    )}
                  </Button>

                  {doneCount > 0 && (
                    <>
                      <Button variant="outline" onClick={enhanceAllPages} disabled={isEnhancing || enhancedCount === doneCount}>
                        {isEnhancing ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enhancing...</>
                        ) : enhancedCount === doneCount ? (
                          <><Sparkles className="mr-2 h-4 w-4 text-amber-500" /> All Enhanced</>
                        ) : (
                          <><Sparkles className="mr-2 h-4 w-4" /> Enhance All</>
                        )}
                      </Button>
                      <Button variant="outline" onClick={downloadAll}>
                        <Download className="mr-2 h-4 w-4" /> Download All
                      </Button>
                    </>
                  )}

                  <Button variant="outline" onClick={generatePagePrompts} disabled={generatingPrompts}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Regenerate Prompts
                  </Button>
                </div>

                {/* Pages Grid */}
                <PreviewGrid columns={3}>
                  {pages.map((page) => (
                    <PreviewCard
                      key={page.page}
                      index={page.page}
                      label={`Page ${page.page}`}
                      imageUrl={page.imageBase64 
                        ? `data:image/png;base64,${page.activeVersion === "enhanced" && page.enhancedImageBase64 ? page.enhancedImageBase64 : page.imageBase64}`
                        : undefined}
                      status={getPreviewStatus(page)}
                      isEnhanced={page.enhanceStatus === "enhanced"}
                      error={page.error}
                      onView={() => {
                        const img = page.activeVersion === "enhanced" && page.enhancedImageBase64 ? page.enhancedImageBase64 : page.imageBase64;
                        if (img) setPreviewImage(`data:image/png;base64,${img}`);
                      }}
                      onRegenerate={() => generateSinglePage(page.page)}
                      onEnhance={page.status === "done" && page.enhanceStatus !== "enhanced" ? () => enhanceSinglePage(page.page) : undefined}
                    />
                  ))}
                </PreviewGrid>
              </div>
            </SectionCard>
          )}

          {/* Info Card */}
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">How it works</p>
                <ol className="text-xs text-muted-foreground mt-1 space-y-1 list-decimal list-inside">
                  <li>Enter your book idea or generate one with AI</li>
                  <li>Click "Improve Prompt" to create a detailed, structured prompt</li>
                  <li>Choose Storybook or Theme Collection mode</li>
                  <li>Generate prompts and review them</li>
                  <li>Generate all images or one by one</li>
                </ol>
              </div>
            </div>
          </div>
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
          .map(p => ({
            page: p.page,
            imageBase64: p.imageBase64!,
            enhancedImageBase64: p.enhancedImageBase64,
            finalLetterBase64: p.finalLetterBase64,
            activeVersion: p.activeVersion,
            finalLetterStatus: p.finalLetterStatus,
          }))}
        characterProfile={characterIdentityProfile ? {
          species: characterIdentityProfile.species,
          faceShape: characterIdentityProfile.faceShape,
          eyeStyle: characterIdentityProfile.eyeStyle,
          proportions: characterIdentityProfile.proportions,
          keyFeatures: characterIdentityProfile.keyFeatures,
        } : undefined}
        defaultTitle={storyConfig.title || generatedIdea?.title || "My Coloring Book"}
        onProcessPages={processAllPages}
      />
    </>
  );
}
