"use client";

import { useState, useCallback, useEffect } from "react";
import { AppTopbar } from "@/components/app/app-topbar";
import { PageHeader } from "@/components/app/page-header";
import { SectionCard, SubSection } from "@/components/app/section-card";
import { OptionCard, OptionChip, OptionGrid, ChipGroup } from "@/components/app/option-card";
import { ProgressPanel, type JobProgress } from "@/components/app/progress-panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
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
  Edit3,
  Image as ImageIcon,
  FileText,
  X,
  ArrowLeft,
  ArrowRight,
  Keyboard,
  ZoomIn,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  BatchPromptsResponse,
  PagePromptItem,
  GenerationMode,
  StoryConfig,
  StyleProfile,
  CharacterProfile,
} from "@/lib/batchGenerationTypes";

// ============================================================
// TYPES
// ============================================================

type BookType = "storybook" | "theme";
type PageStatus = "pending" | "generating" | "done" | "failed";
type EnhanceStatus = "none" | "enhancing" | "enhanced" | "failed";
type ProcessingStatus = "none" | "processing" | "done" | "failed";
type CreateStep = 0 | 1 | 2 | 3 | 4 | 5;

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

// Theme-specific examples based on mode and theme
const THEME_EXAMPLES: Record<string, string[]> = {
  valentine: [
    "Valentine's Day nature scenes with hearts and love birds (no text)",
    "Cute animals exchanging Valentine gifts and cards",
    "Kids friendship day with heart decorations and balloons",
    "Romantic picnic scene with roses and butterflies",
    "Cupid spreading love with hearts and arrows",
  ],
  christmas: [
    "Santa's workshop with elves making toys",
    "Christmas tree decorating scene",
    "Reindeer in a snowy winter wonderland",
    "Cozy fireplace with stockings and gifts",
  ],
  halloween: [
    "Friendly ghosts in a haunted house",
    "Cute witches brewing potions",
    "Jack-o-lanterns in a pumpkin patch",
    "Trick-or-treaters in costumes",
  ],
  default: [
    "A magical unicorn exploring enchanted kingdoms",
    "Ocean adventure with friendly sea creatures",
    "Space explorer discovering new planets",
    "Jungle animals having a fun party",
  ],
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CreateColoringBookPage() {
  // Step tracking
  const [currentStep, setCurrentStep] = useState<CreateStep>(0);
  
  // Step 0: Book Type
  const [bookType, setBookType] = useState<BookType | null>(null);
  
  // Step 1: Idea
  const [userIdea, setUserIdea] = useState("");
  const [generatedIdea, setGeneratedIdea] = useState<GeneratedIdea | null>(null);
  const [generatingIdea, setGeneratingIdea] = useState(false);
  const [previousIdeas, setPreviousIdeas] = useState<Array<{ title?: string; theme?: string; mainCharacter?: string }>>([]);
  
  // Step 2: Prompts
  const [improvedPrompt, setImprovedPrompt] = useState("");
  const [isPromptImproved, setIsPromptImproved] = useState(false);
  const [improvingPrompt, setImprovingPrompt] = useState(false);
  const [pages, setPages] = useState<PageState[]>([]);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [regeneratingPage, setRegeneratingPage] = useState<number | null>(null);
  
  // Step 3: Generation
  const [isGenerating, setIsGenerating] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [characterIdentityProfile, setCharacterIdentityProfile] = useState<any>(null);
  
  // Step 4: Export
  const [isExporting, setIsExporting] = useState(false);
  
  // Settings
  const [pageCount, setPageCount] = useState(10);
  const [orientation, setOrientation] = useState<"portrait" | "landscape" | "square">("portrait");
  const [storyConfig, setStoryConfig] = useState<StoryConfig>({
    title: "",
    outline: "",
    targetAge: "all-ages",
    sceneVariety: "medium",
    settingConstraint: "mixed",
  });
  const [expandedSettings, setExpandedSettings] = useState(false);
  
  // Image Viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  
  // Processing
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Progress
  const [jobProgress, setJobProgress] = useState<JobProgress>({
    totalItems: 0,
    completedItems: 0,
    phase: "idle",
  });

  // ============================================================
  // HELPERS
  // ============================================================

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

  // Get theme-specific examples
  const getExamples = () => {
    const ideaLower = userIdea.toLowerCase();
    if (ideaLower.includes("valentine")) return THEME_EXAMPLES.valentine;
    if (ideaLower.includes("christmas")) return THEME_EXAMPLES.christmas;
    if (ideaLower.includes("halloween")) return THEME_EXAMPLES.halloween;
    return THEME_EXAMPLES.default;
  };

  // Computed values
  const doneCount = pages.filter(p => p.status === "done").length;
  const pendingCount = pages.filter(p => p.status === "pending" || p.status === "failed").length;
  const enhancedCount = pages.filter(p => p.enhanceStatus === "enhanced").length;
  const processedCount = pages.filter(p => p.finalLetterStatus === "done").length;
  const imagesWithData = pages.filter(p => p.imageBase64);

  // ============================================================
  // KEYBOARD NAVIGATION FOR VIEWER
  // ============================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!viewerOpen) return;
      
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setViewerIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setViewerIndex(prev => Math.min(imagesWithData.length - 1, prev + 1));
      } else if (e.key === "Escape") {
        setViewerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewerOpen, imagesWithData.length]);

  // ============================================================
  // STEP 0: BOOK TYPE SELECTION
  // ============================================================

  const selectBookType = (type: BookType) => {
    setBookType(type);
    setCurrentStep(1);
    // Reset downstream state
    setUserIdea("");
    setGeneratedIdea(null);
    setImprovedPrompt("");
    setIsPromptImproved(false);
    setPages([]);
  };

  // ============================================================
  // STEP 1: IDEA INPUT
  // ============================================================

  const generateIdea = async (isRegenerate = false) => {
    if (!bookType) return;
    
    setGeneratingIdea(true);
    const newSeed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    try {
      const excludeThemes = previousIdeas.map(p => p.theme).filter(Boolean) as string[];
      const excludeCharacterTypes = previousIdeas.map(p => p.mainCharacter?.split(" ").pop()).filter(Boolean) as string[];

      const response = await fetch("/api/idea/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeHint: userIdea.trim() || undefined,
          age: storyConfig.targetAge,
          mode: bookType,
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
      
      toast.success(isRegenerate ? "New idea generated!" : "Idea generated!");
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
      toast.success("Idea applied!");
    }
  };

  const clearIdea = () => {
    setUserIdea("");
    setGeneratedIdea(null);
    setImprovedPrompt("");
    setIsPromptImproved(false);
    setPages([]);
  };

  // ============================================================
  // STEP 2: PROMPTS GENERATION
  // ============================================================

  const improvePrompt = async () => {
    if (!userIdea.trim() || !bookType) {
      toast.error("Please enter an idea first");
      return;
    }

    setImprovingPrompt(true);
    try {
      const response = await fetch("/api/prompt/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: userIdea,
          mode: bookType,
          age: storyConfig.targetAge,
          characterHint: generatedIdea?.mainCharacter,
        }),
      });

      const data = await safeJsonParse(response);
      if (!response.ok) throw new Error(data.error || "Failed to improve prompt");

      setImprovedPrompt(data.prompt);
      setIsPromptImproved(true);
      setPages([]);
      toast.success("Prompt improved!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to improve prompt");
    } finally {
      setImprovingPrompt(false);
    }
  };

  const generatePagePrompts = async () => {
    if (!isPromptImproved || !improvedPrompt.trim() || !bookType) {
      toast.error("Please improve your prompt first");
      return;
    }

    setGeneratingPrompts(true);
    setCurrentStep(2);
    
    try {
      const styleProfile: StyleProfile = {
        lineStyle: "Clean, smooth black outlines suitable for coloring",
        compositionRules: "Subject fills 70-85% of page height, foreground touches bottom margin, no empty bottom space",
        environmentStyle: "Simple backgrounds appropriate to the scene",
        colorScheme: "black and white line art",
        mustAvoid: ["solid black fills", "filled shapes", "shading", "grayscale", "gradients", "border", "frame", "empty bottom area"],
      };

      let characterProfile: CharacterProfile | undefined;
      if (bookType === "storybook") {
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
          mode: bookType,
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
      toast.success(`Generated ${pageStates.length} prompts! Review and edit them below.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate prompts");
    } finally {
      setGeneratingPrompts(false);
    }
  };

  const regeneratePagePrompt = async (pageNumber: number) => {
    const page = pages.find(p => p.page === pageNumber);
    if (!page || !bookType) return;

    setRegeneratingPage(pageNumber);
    
    try {
      const response = await fetch("/api/ai/regenerate-one-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageNumber,
          currentPrompt: page.prompt,
          basePrompt: improvedPrompt,
          mode: bookType,
          characterProfile: bookType === "storybook" ? characterIdentityProfile : undefined,
        }),
      });

      const data = await safeJsonParse(response);
      if (!response.ok) throw new Error(data.error || "Failed to regenerate");

      setPages(prev => prev.map(p =>
        p.page === pageNumber 
          ? { ...p, prompt: data.prompt, title: data.title || p.title, status: "pending" as PageStatus }
          : p
      ));
      toast.success(`Page ${pageNumber} prompt regenerated!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to regenerate");
    } finally {
      setRegeneratingPage(null);
    }
  };

  const updatePagePrompt = (pageNumber: number, newPrompt: string) => {
    setPages(prev => prev.map(p =>
      p.page === pageNumber 
        ? { ...p, prompt: newPrompt, isEditing: false, status: "pending" as PageStatus }
        : p
    ));
  };

  const toggleEditPage = (pageNumber: number) => {
    setPages(prev => prev.map(p =>
      p.page === pageNumber ? { ...p, isEditing: !p.isEditing } : p
    ));
  };

  // ============================================================
  // STEP 3: IMAGE GENERATION
  // ============================================================

  const generateAllImages = async () => {
    if (pages.length === 0) {
      toast.error("No prompts to generate");
      return;
    }

    const pagesToGenerate = pages.filter(p => p.status === "pending" || p.status === "failed");
    if (pagesToGenerate.length === 0) {
      toast.info("All pages already generated!");
      return;
    }

    setIsGenerating(true);
    setCurrentStep(3);
    setJobProgress({
      totalItems: pagesToGenerate.length,
      completedItems: 0,
      phase: "generating",
      startedAt: Date.now(),
    });

    let successCount = 0;
    let failCount = 0;

    for (const pageItem of pagesToGenerate) {
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
            isStorybookMode: bookType === "storybook",
            characterProfile: bookType === "storybook" ? characterIdentityProfile : undefined,
            validateOutline: true,
            validateCharacter: bookType === "storybook",
            validateComposition: true, // New: check for empty bottom
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
        estimatedSecondsRemaining: ((Date.now() - (prev.startedAt || Date.now())) / (successCount + failCount)) * (pagesToGenerate.length - successCount - failCount) / 1000,
      }));

      await new Promise(r => setTimeout(r, 300));
    }

    setIsGenerating(false);
    setJobProgress(prev => ({ ...prev, phase: "complete" }));

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
          size: getImageSize(),
          isStorybookMode: bookType === "storybook",
          characterProfile: bookType === "storybook" ? characterIdentityProfile : undefined,
          validateOutline: true,
          validateCharacter: bookType === "storybook",
          validateComposition: true,
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

  // ============================================================
  // ENHANCEMENT & PROCESSING
  // ============================================================

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
      }));

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsEnhancing(false);
    setJobProgress(prev => ({ ...prev, phase: "complete" }));
    toast.success(`Enhanced ${successCount} pages!`);
  };

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
      }));

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsProcessing(false);
    setJobProgress(prev => ({ ...prev, phase: "complete" }));
    toast.success(`Processed ${successCount} pages!`);
  };

  // ============================================================
  // DOWNLOAD & EXPORT
  // ============================================================

  const downloadAll = () => {
    const donePages = pages.filter(p => p.status === "done" && p.imageBase64);
    if (donePages.length === 0) {
      toast.error("No images to download");
      return;
    }

    donePages.forEach((page, i) => {
      setTimeout(() => {
        const link = document.createElement("a");
        const img = page.activeVersion === "finalLetter" && page.finalLetterBase64 
          ? page.finalLetterBase64 
          : page.activeVersion === "enhanced" && page.enhancedImageBase64 
            ? page.enhancedImageBase64 
            : page.imageBase64;
        link.href = `data:image/png;base64,${img}`;
        link.download = `coloring-page-${page.page}.png`;
        link.click();
      }, i * 500);
    });

    toast.success(`Downloading ${donePages.length} images...`);
  };

  const exportPDF = async () => {
    const donePages = pages.filter(p => p.status === "done" && p.imageBase64);
    if (donePages.length === 0) {
      toast.error("No pages to export");
      return;
    }

    setIsExporting(true);
    
    try {
      const bookTitle = storyConfig.title || generatedIdea?.title || "My Coloring Book";
      
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bookTitle,
          coloringPages: donePages.map(p => ({
            page: p.page,
            imageBase64: p.finalLetterBase64 || p.enhancedImageBase64 || p.imageBase64,
          })),
          pageSize: orientation === "landscape" ? "letter" : "letter",
          orientation: orientation === "landscape" ? "landscape" : "portrait",
          margin: 0.25, // 0.25 inch margins
          returnBinary: true,
          insertBlankPages: false, // Don't insert blank pages
          includeBelongsTo: false,
          includeCopyright: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate PDF");
      }

      // Response is binary PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${bookTitle.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("PDF exported successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // ============================================================
  // IMAGE VIEWER
  // ============================================================

  const openViewer = (pageNumber: number) => {
    const idx = imagesWithData.findIndex(p => p.page === pageNumber);
    if (idx >= 0) {
      setViewerIndex(idx);
      setViewerOpen(true);
    }
  };

  const getCurrentViewerImage = () => {
    const page = imagesWithData[viewerIndex];
    if (!page) return null;
    
    if (page.activeVersion === "finalLetter" && page.finalLetterBase64) {
      return page.finalLetterBase64;
    }
    if (page.activeVersion === "enhanced" && page.enhancedImageBase64) {
      return page.enhancedImageBase64;
    }
    return page.imageBase64;
  };

  const scrollToPrompt = (pageNumber: number) => {
    setViewerOpen(false);
    setCurrentStep(2);
    setTimeout(() => {
      const el = document.getElementById(`prompt-${pageNumber}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary");
        setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2000);
      }
    }, 100);
  };

  // ============================================================
  // RENDER
  // ============================================================

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
                <Button onClick={() => setCurrentStep(5)}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Preview & Export
                </Button>
              )
            }
          />

          {/* Step Indicator */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {[
              { step: 0, label: "Book Type", icon: Book },
              { step: 1, label: "Idea", icon: Lightbulb },
              { step: 2, label: "Prompts", icon: FileText },
              { step: 3, label: "Generate", icon: ImageIcon },
              { step: 4, label: "Review", icon: Eye },
              { step: 5, label: "Export", icon: FileDown },
            ].map(({ step, label, icon: Icon }, idx) => (
              <button
                key={step}
                onClick={() => {
                  // Only allow going back or to completed steps
                  if (step <= currentStep || (step === 2 && pages.length > 0) || (step >= 3 && doneCount > 0)) {
                    setCurrentStep(step as CreateStep);
                  }
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                  currentStep === step
                    ? "bg-primary text-primary-foreground"
                    : step < currentStep || (step === 2 && pages.length > 0) || (step >= 3 && doneCount > 0)
                      ? "bg-muted hover:bg-muted/80 cursor-pointer"
                      : "bg-muted/50 text-muted-foreground cursor-not-allowed"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {step === 2 && pages.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{pages.length}</Badge>
                )}
                {step === 3 && doneCount > 0 && (
                  <Badge variant="secondary" className="ml-1">{doneCount}/{pages.length}</Badge>
                )}
              </button>
            ))}
          </div>

          {/* Progress Panel */}
          {(isGenerating || isEnhancing || isProcessing) && (
            <ProgressPanel progress={jobProgress} />
          )}

          {/* ==================== STEP 0: BOOK TYPE ==================== */}
          {currentStep === 0 && (
          <SectionCard
              title="Choose Book Type"
              description="This determines how prompts are generated and how consistent characters will be"
              icon={Book}
              iconColor="text-primary"
              iconBg="bg-primary/10"
            >
              <OptionGrid columns={2}>
                <OptionCard
                  title="Storybook"
                  description="Same main character throughout all pages with story progression. Perfect for character-focused books."
                  icon={Book}
                  selected={bookType === "storybook"}
                  onClick={() => selectBookType("storybook")}
                />
                <OptionCard
                  title="Theme Collection"
                  description="Consistent style with varied scenes and subjects. Great for themed collections like holidays or animals."
                  icon={Palette}
                  selected={bookType === "theme"}
                  onClick={() => selectBookType("theme")}
                />
              </OptionGrid>
              
              <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border/50">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Tips for choosing:</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li><strong>Storybook:</strong> "Luna the unicorn's adventures" - same character, different scenes</li>
                      <li><strong>Theme Collection:</strong> "Valentine's Day coloring pages" - varied subjects, same theme</li>
                    </ul>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ==================== STEP 1: IDEA ==================== */}
          {currentStep === 1 && bookType && (
            <SectionCard
              title="Your Book Idea"
              description={bookType === "storybook" 
                ? "Describe your main character and their story/adventures"
                : "Describe the theme for your coloring book collection"}
            icon={Lightbulb}
            iconColor="text-amber-500"
            iconBg="bg-amber-500/10"
          >
            <div className="space-y-4">
              <Textarea
                  placeholder={bookType === "storybook"
                    ? "Describe your main character and their adventures... e.g., 'A magical unicorn named Luna who explores enchanted kingdoms'"
                    : "Describe your theme... e.g., 'Valentine's Day coloring pages with hearts, love, and friendship'"
                  }
                value={userIdea}
                onChange={(e) => {
                  setUserIdea(e.target.value);
                  if (isPromptImproved) {
                    setIsPromptImproved(false);
                    setImprovedPrompt("");
                    setPages([]);
                  }
                }}
                  className="min-h-[120px]"
                />

                {/* Theme-specific examples */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Quick examples:</p>
                  <div className="flex flex-wrap gap-2">
                    {getExamples().slice(0, 4).map((example, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => setUserIdea(example)}
                      >
                        {example.length > 40 ? example.slice(0, 40) + "..." : example}
                      </Button>
                    ))}
                  </div>
                </div>

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
                    <Button variant="ghost" onClick={clearIdea}>
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

                {/* Settings */}
                <div className="border rounded-xl">
                  <button
                    onClick={() => setExpandedSettings(!expandedSettings)}
                    className="w-full p-3 flex items-center justify-between text-sm font-medium hover:bg-muted/50 rounded-xl"
                  >
                    <span className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      Settings
                    </span>
                    {expandedSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {expandedSettings && (
                    <div className="p-4 pt-0 space-y-4 border-t">
              {/* Page Count */}
              <SubSection title="Number of Pages">
                        <div className="space-y-2">
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

                      {/* Age Group */}
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
                    </div>
                  )}
                </div>

                {/* Continue Button */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep(0)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button 
                    onClick={async () => {
                      if (!userIdea.trim()) {
                        toast.error("Please enter an idea first");
                        return;
                      }
                      await improvePrompt();
                      if (isPromptImproved) {
                        await generatePagePrompts();
                      }
                    }}
                    disabled={!userIdea.trim() || improvingPrompt || generatingPrompts}
                    className="flex-1"
                    size="lg"
                  >
                    {improvingPrompt || generatingPrompts ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                    ) : (
                      <><Sparkles className="mr-2 h-5 w-5" /> Generate {pageCount} Page Prompts</>
                    )}
                  </Button>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ==================== STEP 2: PROMPTS REVIEW ==================== */}
          {currentStep === 2 && pages.length > 0 && (
            <SectionCard
              title="Review Page Prompts"
              description="Edit any prompt before generating images. Click on a prompt to edit it."
              icon={FileText}
              iconColor="text-blue-500"
              iconBg="bg-blue-500/10"
              headerActions={
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{pages.length} prompts</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generatePagePrompts}
                    disabled={generatingPrompts}
                  >
                    <RefreshCw className={cn("mr-2 h-4 w-4", generatingPrompts && "animate-spin")} />
                    Regenerate All
                  </Button>
                </div>
              }
            >
              <div className="space-y-4">
                {/* Prompt Cards Grid */}
                <div className="grid gap-3">
                  {pages.map((page) => (
                    <Card
                      key={page.page}
                      id={`prompt-${page.page}`}
                      className={cn(
                        "transition-all",
                        page.isEditing && "ring-2 ring-primary",
                        page.status === "done" && "border-green-500/30 bg-green-50/30 dark:bg-green-950/10"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Page Number */}
                          <div className="flex flex-col items-center gap-2">
                            <div className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                              page.status === "done" 
                                ? "bg-green-500 text-white" 
                                : "bg-muted text-muted-foreground"
                            )}>
                              {page.page}
                            </div>
                            {page.imageBase64 && (
                              <img
                                src={`data:image/png;base64,${page.imageBase64}`}
                                alt={`Page ${page.page}`}
                                className="w-10 h-14 object-cover rounded cursor-pointer hover:ring-2 ring-primary"
                                onClick={() => openViewer(page.page)}
                              />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{page.title || `Page ${page.page}`}</span>
                              <div className="flex items-center gap-1">
                                {page.status === "done" && (
                                  <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                                    <CheckCircle2 className="mr-1 h-3 w-3" /> Generated
                                  </Badge>
                                )}
                                {page.status === "failed" && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertCircle className="mr-1 h-3 w-3" /> Failed
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {page.isEditing ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={page.prompt}
                                  onChange={(e) => setPages(prev => prev.map(p =>
                                    p.page === page.page ? { ...p, prompt: e.target.value } : p
                                  ))}
                                  className="min-h-[100px] text-sm"
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => updatePagePrompt(page.page, page.prompt)}>
                                    <Check className="mr-1 h-3 w-3" /> Save
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => toggleEditPage(page.page)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p 
                                className="text-sm text-muted-foreground line-clamp-3 cursor-pointer hover:text-foreground"
                                onClick={() => toggleEditPage(page.page)}
                              >
                                {page.prompt}
                              </p>
                            )}

                            {/* Actions */}
                            {!page.isEditing && (
                              <div className="flex items-center gap-2 mt-3">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => toggleEditPage(page.page)}
                                >
                                  <Edit3 className="mr-1 h-3 w-3" /> Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => regeneratePagePrompt(page.page)}
                                  disabled={regeneratingPage === page.page}
                                >
                                  {regeneratingPage === page.page ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="mr-1 h-3 w-3" />
                                  )}
                                  Regenerate
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => navigator.clipboard.writeText(page.prompt)}
                                >
                                  <Copy className="mr-1 h-3 w-3" /> Copy
                                </Button>
                                {page.imageBase64 && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => openViewer(page.page)}
                                  >
                                    <Eye className="mr-1 h-3 w-3" /> View Image
                                  </Button>
                                )}
                  </div>
                )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Idea
                  </Button>
                  <Button 
                    onClick={generateAllImages}
                    disabled={isGenerating || pages.length === 0}
                    className="flex-1"
                    size="lg"
                  >
                    {isGenerating ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Images...</>
                    ) : (
                      <><Play className="mr-2 h-5 w-5" /> Generate {pendingCount} Images</>
                )}
              </Button>
                </div>
            </div>
          </SectionCard>
          )}

          {/* ==================== STEP 3 & 4: IMAGES REVIEW ==================== */}
          {(currentStep === 3 || currentStep === 4) && pages.length > 0 && (
            <SectionCard
              title="Generated Images"
              description="Click any image to view full-size with navigation"
              icon={ImageIcon}
              iconColor="text-emerald-500"
              iconBg="bg-emerald-500/10"
              headerActions={
                <Badge variant="outline" className="text-sm py-1 px-3">
                  {doneCount} / {pages.length} generated
                </Badge>
              }
            >
              <div className="space-y-4">
                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {pendingCount > 0 && (
                    <Button onClick={generateAllImages} disabled={isGenerating}>
                    {isGenerating ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                    ) : (
                        <><Play className="mr-2 h-4 w-4" /> Generate {pendingCount} Remaining</>
                    )}
                  </Button>
                  )}

                  {doneCount > 0 && (
                    <>
                      <Button variant="outline" onClick={enhanceAllPages} disabled={isEnhancing || enhancedCount === doneCount}>
                        {isEnhancing ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enhancing...</>
                        ) : enhancedCount === doneCount ? (
                          <><Check className="mr-2 h-4 w-4 text-green-500" /> All Enhanced</>
                        ) : (
                          <><Sparkles className="mr-2 h-4 w-4" /> Enhance All</>
                        )}
                      </Button>
                      <Button variant="outline" onClick={downloadAll}>
                        <Download className="mr-2 h-4 w-4" /> Download All
                      </Button>
                      <Button onClick={() => setCurrentStep(5)}>
                        <FileDown className="mr-2 h-4 w-4" /> Export PDF
                      </Button>
                    </>
                  )}
                </div>

                {/* Images Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {pages.map((page) => (
                    <Card
                      key={page.page}
                      className={cn(
                        "group overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary",
                        page.status === "done" && "border-green-500/30",
                        page.status === "failed" && "border-red-500/30"
                      )}
                      onClick={() => page.imageBase64 && openViewer(page.page)}
                    >
                      <div className="aspect-[3/4] bg-muted relative">
                        {page.imageBase64 ? (
                          <img
                            src={`data:image/png;base64,${
                              page.activeVersion === "finalLetter" && page.finalLetterBase64
                                ? page.finalLetterBase64
                                : page.activeVersion === "enhanced" && page.enhancedImageBase64
                                  ? page.enhancedImageBase64
                                  : page.imageBase64
                            }`}
                            alt={`Page ${page.page}`}
                            className="w-full h-full object-contain"
                          />
                        ) : page.status === "generating" ? (
                          <div className="flex flex-col items-center justify-center h-full gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">Generating...</span>
                          </div>
                        ) : page.status === "failed" ? (
                          <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
                            <AlertCircle className="h-8 w-8 text-red-500" />
                            <span className="text-xs text-red-500 text-center">{page.error || "Failed"}</span>
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); generateSinglePage(page.page); }}>
                              Retry
                  </Button>
                </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full gap-2">
                            <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); generateSinglePage(page.page); }}>
                              Generate
                            </Button>
                          </div>
                        )}

                        {/* Status badges */}
                        {page.enhanceStatus === "enhanced" && (
                          <Badge className="absolute top-2 right-2 text-[10px]" variant="secondary">
                            <Sparkles className="mr-1 h-3 w-3" /> Enhanced
                          </Badge>
                        )}
                      </div>

                      <CardContent className="p-3 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">Page {page.page}</span>
                          {page.status === "done" && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-1">
                          {page.title}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Prompts
                  </Button>
                  {doneCount === pages.length && (
                    <Button onClick={() => setCurrentStep(5)} className="flex-1" size="lg">
                      <FileDown className="mr-2 h-5 w-5" /> Continue to Export
                    </Button>
                  )}
                </div>
              </div>
            </SectionCard>
          )}

          {/* ==================== STEP 5: EXPORT ==================== */}
          {currentStep === 5 && doneCount > 0 && (
            <SectionCard
              title="Preview & Export"
              description="Review your coloring book and export as PDF"
              icon={FileDown}
              iconColor="text-purple-500"
              iconBg="bg-purple-500/10"
            >
              <div className="space-y-6">
                {/* Book Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Book Title</label>
                    <Input
                      value={storyConfig.title}
                      onChange={(e) => setStoryConfig({ ...storyConfig, title: e.target.value })}
                      placeholder="My Coloring Book"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Pages</label>
                    <div className="flex items-center gap-4 h-10">
                      <Badge variant="outline" className="text-lg px-4 py-2">
                        {doneCount} pages ready
                      </Badge>
                      {enhancedCount > 0 && (
                        <Badge variant="secondary">
                          <Sparkles className="mr-1 h-3 w-3" /> {enhancedCount} enhanced
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Page Preview Strip */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Page Preview</label>
                  <div className="flex gap-3 overflow-x-auto pb-3">
                    {pages.filter(p => p.imageBase64).map((page) => (
                      <div
                      key={page.page}
                        className="shrink-0 cursor-pointer group"
                        onClick={() => openViewer(page.page)}
                      >
                        <div className="w-20 h-28 rounded-lg overflow-hidden border-2 border-transparent group-hover:border-primary transition-all">
                          <img
                            src={`data:image/png;base64,${page.finalLetterBase64 || page.enhancedImageBase64 || page.imageBase64}`}
                            alt={`Page ${page.page}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-xs text-center mt-1 text-muted-foreground">Page {page.page}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Export Options */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <ZoomIn className="h-4 w-4" />
                      Enhancement
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Upscale images for better print quality
                    </p>
                    <Button
                      variant="outline"
                      onClick={enhanceAllPages}
                      disabled={isEnhancing || enhancedCount === doneCount}
                      className="w-full"
                    >
                      {isEnhancing ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enhancing...</>
                      ) : enhancedCount === doneCount ? (
                        <><Check className="mr-2 h-4 w-4 text-green-500" /> All Enhanced</>
                      ) : (
                        <><Sparkles className="mr-2 h-4 w-4" /> Enhance {doneCount - enhancedCount} Pages</>
                      )}
                    </Button>
                  </Card>

                  <Card className="p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Letter Format
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Reframe images to US Letter size (8.5×11)
                    </p>
                    <Button
                      variant="outline"
                      onClick={processAllPages}
                      disabled={isProcessing || processedCount === doneCount}
                      className="w-full"
                    >
                      {isProcessing ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                      ) : processedCount === doneCount ? (
                        <><Check className="mr-2 h-4 w-4 text-green-500" /> All Processed</>
                      ) : (
                        <><FileText className="mr-2 h-4 w-4" /> Process {doneCount - processedCount} Pages</>
                      )}
                    </Button>
                  </Card>
                </div>

                {/* Export Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setCurrentStep(4)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Review
                  </Button>
                  <Button variant="outline" onClick={downloadAll}>
                    <Download className="mr-2 h-4 w-4" /> Download PNGs
                  </Button>
                  <Button onClick={exportPDF} disabled={isExporting} className="flex-1" size="lg">
                    {isExporting ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating PDF...</>
                    ) : (
                      <><FileDown className="mr-2 h-5 w-5" /> Export PDF ({doneCount} pages)</>
                    )}
                  </Button>
                </div>
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
                  <li>Choose Storybook (same character) or Theme Collection (varied subjects)</li>
                  <li>Enter your idea and generate page prompts</li>
                  <li>Review and edit each prompt before generating</li>
                  <li>Generate images and use the viewer to navigate through them</li>
                  <li>Export as PDF with your chosen settings</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ==================== IMAGE VIEWER MODAL ==================== */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3">
                Page {imagesWithData[viewerIndex]?.page || 1} of {imagesWithData.length}
                {imagesWithData[viewerIndex]?.enhanceStatus === "enhanced" && (
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="mr-1 h-3 w-3" /> Enhanced
                  </Badge>
                )}
              </DialogTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Keyboard className="h-4 w-4" />
                <span>Use ← → arrows to navigate, ESC to close</span>
              </div>
            </div>
          </DialogHeader>

          {/* Main Image */}
          <div className="flex-1 flex items-center justify-center bg-muted/30 p-4 overflow-hidden relative">
            {getCurrentViewerImage() ? (
              <img
                src={`data:image/png;base64,${getCurrentViewerImage()}`}
                alt={`Page ${imagesWithData[viewerIndex]?.page}`}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            ) : (
              <div className="text-muted-foreground">No image</div>
            )}

            {/* Navigation Arrows */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full shadow-lg"
              onClick={() => setViewerIndex(prev => Math.max(0, prev - 1))}
              disabled={viewerIndex === 0}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full shadow-lg"
              onClick={() => setViewerIndex(prev => Math.min(imagesWithData.length - 1, prev + 1))}
              disabled={viewerIndex === imagesWithData.length - 1}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          {/* Thumbnail Strip */}
          <div className="p-3 border-t bg-background shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {imagesWithData.map((page, idx) => (
                <button
                  key={page.page}
                  onClick={() => setViewerIndex(idx)}
                  className={cn(
                    "shrink-0 w-12 h-16 rounded overflow-hidden border-2 transition-all",
                    idx === viewerIndex ? "border-primary" : "border-transparent hover:border-muted-foreground/50"
                  )}
                >
                  <img
                    src={`data:image/png;base64,${page.imageBase64}`}
                    alt={`Page ${page.page}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-3 border-t flex items-center justify-between shrink-0">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => scrollToPrompt(imagesWithData[viewerIndex]?.page || 1)}
              >
                <Edit3 className="mr-2 h-4 w-4" /> Edit Prompt
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateSinglePage(imagesWithData[viewerIndex]?.page || 1)}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const img = getCurrentViewerImage();
                  if (img) {
                    const link = document.createElement("a");
                    link.href = `data:image/png;base64,${img}`;
                    link.download = `coloring-page-${imagesWithData[viewerIndex]?.page}.png`;
                    link.click();
                  }
                }}
              >
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
