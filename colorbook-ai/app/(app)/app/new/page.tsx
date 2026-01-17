"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppTopbar } from "@/components/app/app-topbar";
import { WizardStepper } from "@/components/app/wizard-stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
  Lock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Eye,
  Users,
  BookOpen,
  Anchor,
  Cat,
} from "lucide-react";
import { toast } from "sonner";
import { MAX_PAGES } from "@/lib/schemas";
import type {
  ThemeSuggestionResponse,
  CharacterLock,
} from "@/lib/schemas";
import { TrendingPanel } from "@/components/app/trending-panel";
import { ImagePreviewModal } from "@/components/app/image-preview-modal";
import { GenerationDebugPanel } from "@/components/app/generation-debug-panel";
import type { TrendingSuggestionResponse } from "@/app/api/ai/suggest-trending/route";
import {
  type GenerationSpec,
  type Complexity,
  type LineThickness,
  type BookMode,
  type CharacterType,
  createSpec,
  TRIM_TO_PIXELS,
  CHARACTER_TYPES,
} from "@/lib/generationSpec";
import { getStyleContractSummary, PANDACORN_STYLE_CONTRACT } from "@/lib/styleContract";
import type { ThemePack } from "@/lib/themePack";

const steps = [
  { id: 1, label: "Setup" },
  { id: 2, label: "Theme" },
  { id: 3, label: "Style" },
  { id: 4, label: "Prompts" },
  { id: 5, label: "Generate" },
];

const sizes = [
  { value: "8.5×11", label: "8.5 × 11 in", desc: "US Letter (Most Popular)" },
  { value: "8×10", label: "8 × 10 in", desc: "Square-ish" },
  { value: "6×9", label: "6 × 9 in", desc: "Compact / Travel" },
  { value: "A4", label: "A4", desc: "International" },
];

const complexities: { value: Complexity; label: string; desc: string }[] = [
  { value: "simple", label: "Simple", desc: "1 subject + 2-4 props, ages 3-6" },
  { value: "medium", label: "Medium", desc: "1-2 subjects + 4-8 props, ages 6-12" },
  { value: "detailed", label: "Detailed", desc: "More intricate patterns, older kids/adults" },
];

const thicknesses: { value: LineThickness; label: string; desc: string }[] = [
  { value: "thin", label: "Thin", desc: "Delicate lines" },
  { value: "medium", label: "Medium", desc: "Standard weight" },
  { value: "bold", label: "Bold", desc: "Thick, forgiving lines" },
];

// Scene item with UI state
// scenePrompt = user-editable scene idea (short)
// finalPrompt = not stored here - built server-side with style contract
interface SceneItem {
  id: string;
  pageNumber: number;
  sceneTitle: string;
  scenePrompt: string; // Short scene idea, NOT full prompt
  isRegenerating?: boolean;
  lastError?: string;
}

// Import debug info type from component
import type { GenerationDebugInfo } from "@/components/app/generation-debug-panel";

// Image generation state per page - now uses base64 for binarized images
interface PageImageState {
  imageUrl?: string;
  imageBase64?: string; // Binarized B/W image
  isGenerating: boolean;
  error?: string;
  failedPrintSafe?: boolean;
  failureReason?: string;
  debug?: GenerationDebugInfo; // Debug info for troubleshooting
}

// Anchor state with base64 for reference
interface AnchorState {
  imageUrl: string;
  imageBase64: string;
  prompt: string;
  approvedAt: Date;
}

interface FormState {
  // Book type
  bookMode: BookMode;
  characterType: CharacterType;
  
  // Basic settings
  trimSize: string;
  theme: string;
  characterName: string;
  characterDescription: string;
  pageCount: number;
  complexity: Complexity;
  lineThickness: LineThickness;
  
  // Book options
  includeBlankBetween: boolean;
  includeBelongsTo: boolean;
  includePageNumbers: boolean;
  includeCopyrightPage: boolean;
  
  // Generated content
  scenes: SceneItem[];
  pageImages: Record<number, PageImageState>;
  
  // Advanced: allow editing style contract (off by default)
  advancedStyleEdit: boolean;
  
  // Character lock
  characterLock: CharacterLock | null;
  characterSheetUrl: string | null;
  
  // Theme Pack for consistent styling
  themePack: ThemePack | null;
  
  // Anchor image (style reference)
  anchor: AnchorState | null;
}

export default function NewBookPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(true);

  // Loading states
  const [suggestingTheme, setSuggestingTheme] = useState(false);
  const [lockingCharacter, setLockingCharacter] = useState(false);
  const [generatingSheet, setGeneratingSheet] = useState(false);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [generatingAnchor, setGeneratingAnchor] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [generatingThemePack, setGeneratingThemePack] = useState(false);
  const [improvingScene, setImprovingScene] = useState<number | null>(null);

  // AI suggestions
  const [themeSuggestion, setThemeSuggestion] = useState<ThemeSuggestionResponse | null>(null);
  const [trendingSuggestion, setTrendingSuggestion] = useState<TrendingSuggestionResponse | null>(null);
  const [suggestingTrending, setSuggestingTrending] = useState(false);

  // Preview modal
  const [previewPage, setPreviewPage] = useState<{ pageNumber: number; title: string; imageUrl: string } | null>(null);

  // Form state
  const [form, setForm] = useState<FormState>({
    bookMode: "series",
    characterType: "cat",
    trimSize: "8.5×11",
    theme: "",
    characterName: "",
    characterDescription: "",
    pageCount: 12,
    complexity: "simple",
    lineThickness: "bold",
    includeBlankBetween: false,
    includeBelongsTo: true,
    includePageNumbers: false,
    includeCopyrightPage: true,
    scenes: [],
    pageImages: {},
    characterLock: null,
    characterSheetUrl: null,
    themePack: null,
    anchor: null,
    advancedStyleEdit: false,
  });

  // Build GenerationSpec from form state
  const buildSpec = (): GenerationSpec => {
    return createSpec({
      bookMode: form.bookMode,
      trimSize: form.trimSize,
      complexity: form.complexity,
      lineThickness: form.lineThickness,
      pageCount: form.pageCount,
      includeBlankBetween: form.includeBlankBetween,
      includeBelongsTo: form.includeBelongsTo,
      includePageNumbers: form.includePageNumbers,
      includeCopyrightPage: form.includeCopyrightPage,
    });
  };

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setTimeout(() => setSaved(true), 500);
    
    // Reset character lock if theme/character changes
    if (key === "theme" || key === "characterName" || key === "characterDescription" || key === "characterType") {
      setForm((prev) => ({ ...prev, characterLock: null, characterSheetUrl: null }));
    }
    
    // Reset anchor if style changes
    if (key === "complexity" || key === "lineThickness" || key === "trimSize") {
      setForm((prev) => ({ ...prev, anchor: null, pageImages: {} }));
    }
  };

  // Get display URL for an image (prefer base64 binarized)
  const getImageDisplayUrl = (pageState: PageImageState | undefined): string | undefined => {
    if (!pageState) return undefined;
    // Prefer binarized base64 (guaranteed B/W)
    if (pageState.imageBase64) {
      return `data:image/png;base64,${pageState.imageBase64}`;
    }
    return pageState.imageUrl;
  };

  // =====================
  // AI: Suggest Theme
  // =====================
  const suggestTheme = async () => {
    setSuggestingTheme(true);
    try {
      const response = await fetch("/api/ai/suggest-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complexity: form.complexity,
          pageGoal: "book",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to suggest theme");
      }

      const data: ThemeSuggestionResponse = await response.json();
      setThemeSuggestion(data);
      updateForm("theme", data.theme);

      const mainChar = data.mainCharacter;
      const nameMatch = mainChar.match(/^([^,\-–]+)/);
      const name = nameMatch ? nameMatch[1].trim() : mainChar;
      updateForm("characterName", name);
      updateForm("characterDescription", mainChar);

      toast.success("Theme suggested!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to suggest theme");
    } finally {
      setSuggestingTheme(false);
    }
  };

  // =====================
  // AI: Suggest Trending
  // =====================
  const suggestTrending = async (region: string, periodDays: number, keyword?: string) => {
    setSuggestingTrending(true);
    try {
      const response = await fetch("/api/ai/suggest-trending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region,
          periodDays: periodDays.toString(),
          optionalKeyword: keyword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to suggest trending idea");
      }

      const data: TrendingSuggestionResponse = await response.json();
      setTrendingSuggestion(data);

      updateForm("theme", data.theme);
      updateForm("characterName", data.mainCharacterName);
      updateForm("characterDescription", data.mainCharacterDescription);

      toast.success(`Trending idea: ${data.bookIdeaTitle}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to suggest trending idea");
    } finally {
      setSuggestingTrending(false);
    }
  };

  // =====================
  // AI: Lock Character (Series Mode)
  // =====================
  const lockCharacter = async () => {
    if (!form.theme || !form.characterName || !form.characterDescription) {
      toast.error("Please fill in theme and character details first");
      return;
    }

    setLockingCharacter(true);
    try {
      const response = await fetch("/api/ai/lock-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: form.theme,
          mainCharacterName: form.characterName,
          mainCharacterDescription: form.characterDescription,
          stylePreset: form.complexity,
          lineThickness: form.lineThickness,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to lock character");
      }

      const data = await response.json();
      updateForm("characterLock", data.characterLock);
      toast.success("Character locked!");

      await generateCharacterSheet(data.characterLock);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to lock character");
    } finally {
      setLockingCharacter(false);
    }
  };

  // =====================
  // AI: Generate Character Sheet
  // =====================
  const generateCharacterSheet = async (lock: CharacterLock) => {
    setGeneratingSheet(true);
    try {
      const response = await fetch("/api/ai/generate-character-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterLock: lock,
          sizePreset: "portrait",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate character sheet");
      }

      const data = await response.json();
      updateForm("characterSheetUrl", data.imageUrl || null);
      toast.success("Character sheet generated!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate character sheet");
    } finally {
      setGeneratingSheet(false);
    }
  };

  // =====================
  // AI: Generate Theme Pack
  // =====================
  const generateThemePack = async () => {
    if (!form.theme) {
      toast.error("Please fill in theme first");
      return;
    }

    setGeneratingThemePack(true);
    try {
      const response = await fetch("/api/ai/generate-theme-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookMode: form.bookMode,
          theme: form.theme,
          subject: form.bookMode === "series" ? form.characterType : undefined,
          ageGroup: "3-8",
          complexity: form.complexity,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate theme pack");
      }

      const data = await response.json();
      updateForm("themePack", data.themePack);
      toast.success("Theme Pack generated! Your book now has a consistent world.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate theme pack");
    } finally {
      setGeneratingThemePack(false);
    }
  };

  // =====================
  // AI: Improve Scene Prompt
  // =====================
  const improveScenePrompt = async (pageNumber: number) => {
    const currentScene = form.scenes.find((p) => p.pageNumber === pageNumber);
    if (!currentScene) return;

    setImprovingScene(pageNumber);
    try {
      const response = await fetch("/api/ai/improve-scene-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenePrompt: currentScene.scenePrompt,
          sceneTitle: currentScene.sceneTitle,
          pageNumber,
          themePack: form.themePack,
          complexity: form.complexity,
          characterType: form.bookMode === "series" ? form.characterType : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to improve scene");
      }

      const data = await response.json();
      setForm((prev) => ({
        ...prev,
        scenes: prev.scenes.map((p) =>
          p.pageNumber === pageNumber
            ? { ...p, sceneTitle: data.sceneTitle, scenePrompt: data.scenePrompt }
            : p
        ),
      }));
      toast.success(`Scene ${pageNumber} improved!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to improve scene");
    } finally {
      setImprovingScene(null);
    }
  };

  // =====================
  // AI: Generate All Scenes
  // =====================
  const generateScenes = async () => {
    if (!form.theme) {
      toast.error("Please fill in theme first");
      return;
    }
    if (form.bookMode === "series" && (!form.characterName || !form.characterDescription)) {
      toast.error("Series mode requires character name and description");
      return;
    }

    // Auto-generate theme pack if not exists
    if (!form.themePack) {
      await generateThemePack();
    }

    setGeneratingPrompts(true);
    try {
      const spec = buildSpec();
      
      const response = await fetch("/api/ai/generate-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: form.theme,
          mainCharacter: form.bookMode === "series" 
            ? `${form.characterName} (${form.characterType}) - ${form.characterDescription}` 
            : undefined,
          characterType: form.bookMode === "series" ? form.characterType : undefined,
          characterLock: form.characterLock,
          themePack: form.themePack,
          spec,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate scenes");
      }

      const data = await response.json();
      // API now returns scenePrompt (short scene ideas, NOT full prompts)
      const sceneItems: SceneItem[] = data.pages.map((p: { pageNumber: number; sceneTitle: string; scenePrompt: string }) => ({
        id: `scene-${p.pageNumber}-${Date.now()}`,
        pageNumber: p.pageNumber,
        sceneTitle: p.sceneTitle,
        scenePrompt: p.scenePrompt,
        isRegenerating: false,
      }));
      updateForm("scenes", sceneItems);
      updateForm("anchor", null);
      updateForm("pageImages", {});
      toast.success(`Generated ${data.pages.length} scene ideas!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate scenes");
    } finally {
      setGeneratingPrompts(false);
    }
  };

  // =====================
  // AI: Regenerate ONE Scene
  // =====================
  const regenerateOneScene = async (pageNumber: number) => {
    const currentScene = form.scenes.find((p) => p.pageNumber === pageNumber);
    if (!currentScene) return;

    setForm((prev) => ({
      ...prev,
      scenes: prev.scenes.map((p) =>
        p.pageNumber === pageNumber ? { ...p, isRegenerating: true, lastError: undefined } : p
      ),
    }));

    try {
      const spec = buildSpec();
      
      const response = await fetch("/api/ai/regenerate-one-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageNumber,
          theme: form.theme,
          mainCharacter: form.bookMode === "series" 
            ? `${form.characterName} (${form.characterType})` 
            : undefined,
          characterType: form.bookMode === "series" ? form.characterType : undefined,
          themePack: form.themePack,
          spec,
          previousSceneTitle: currentScene.sceneTitle,
          previousScenePrompt: currentScene.scenePrompt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to regenerate scene");
      }

      const data = await response.json();

      setForm((prev) => ({
        ...prev,
        scenes: prev.scenes.map((p) =>
          p.pageNumber === pageNumber
            ? { ...p, sceneTitle: data.sceneTitle, scenePrompt: data.scenePrompt, isRegenerating: false }
            : p
        ),
      }));

      toast.success(`Page ${pageNumber} scene updated!`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to regenerate";
      setForm((prev) => ({
        ...prev,
        scenes: prev.scenes.map((p) =>
          p.pageNumber === pageNumber ? { ...p, isRegenerating: false, lastError: errorMsg } : p
        ),
      }));
      toast.error(errorMsg);
    }
  };

  // =====================
  // AI: Generate Anchor Image (Page 1)
  // =====================
  const generateAnchor = async () => {
    if (form.scenes.length === 0) {
      toast.error("Generate scene ideas first");
      return;
    }

    const firstScene = form.scenes[0];
    setGeneratingAnchor(true);
    updateForm("anchor", null);

    // Set loading state for page 1
    setForm((prev) => ({
      ...prev,
      pageImages: {
        ...prev.pageImages,
        [1]: { isGenerating: true },
      },
    }));

    try {
      // API builds finalPrompt server-side using scene + style contract + theme pack
      const response = await fetch("/api/ai/generate-page-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenePrompt: firstScene.scenePrompt, // Structured scene idea
          pageNumber: 1,
          bookMode: form.bookMode,
          characterType: form.bookMode === "series" ? form.characterType : null,
          characterName: form.bookMode === "series" ? form.characterName : null,
          complexity: form.complexity,
          lineThickness: form.lineThickness,
          trimSize: form.trimSize,
          themePack: form.themePack,
          isAnchorGeneration: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate anchor");
      }

      if (data.imageBase64) {
        // Store the binarized image
        setForm((prev) => ({
          ...prev,
          pageImages: {
            ...prev.pageImages,
            [1]: { 
              imageUrl: data.imageUrl,
              imageBase64: data.imageBase64,
              isGenerating: false 
            },
          },
        }));
        toast.success("Sample page generated! Review and approve the style.");
      } else if (data.failedPrintSafe) {
        setForm((prev) => ({
          ...prev,
          pageImages: {
            ...prev.pageImages,
            [1]: { 
              isGenerating: false,
              failedPrintSafe: true,
              failureReason: data.failureReason,
              error: data.suggestion || data.details || "Failed quality check"
            },
          },
        }));
        toast.error(`Quality check failed: ${data.failureReason}`);
      }
    } catch (error) {
      setForm((prev) => ({
        ...prev,
        pageImages: {
          ...prev.pageImages,
          [1]: { isGenerating: false, error: error instanceof Error ? error.message : "Failed" },
        },
      }));
      toast.error(error instanceof Error ? error.message : "Failed to generate anchor");
    } finally {
      setGeneratingAnchor(false);
    }
  };

  // =====================
  // Approve Anchor
  // =====================
  const approveAnchor = () => {
    const page1Image = form.pageImages[1];
    if (!page1Image?.imageBase64) {
      toast.error("Generate sample page first");
      return;
    }

    const firstScene = form.scenes[0];
    setForm((prev) => ({
      ...prev,
      anchor: {
        imageUrl: page1Image.imageUrl || `data:image/png;base64,${page1Image.imageBase64}`,
        imageBase64: page1Image.imageBase64!,
        prompt: firstScene?.scenePrompt || "",
        approvedAt: new Date(),
      },
    }));
    
    toast.success("Style approved! All pages will match this anchor.", {
      description: "Character type and style are now locked.",
    });
  };

  // =====================
  // AI: Generate Single Image (with anchor reference)
  // =====================
  const generateImage = async (pageNumber: number, scenePrompt: string) => {
    // For pages > 1, require anchor approval
    if (pageNumber > 1 && !form.anchor) {
      toast.error("Approve the sample page style first");
      return;
    }

    setForm((prev) => ({
      ...prev,
      pageImages: {
        ...prev.pageImages,
        [pageNumber]: { isGenerating: true },
      },
    }));

    try {
      // API builds finalPrompt server-side using scene + style contract + theme pack
      const response = await fetch("/api/ai/generate-page-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenePrompt, // Structured scene - style contract applied server-side
          pageNumber,
          bookMode: form.bookMode,
          characterType: form.bookMode === "series" ? form.characterType : null,
          characterName: form.bookMode === "series" ? form.characterName : null,
          complexity: form.complexity,
          lineThickness: form.lineThickness,
          trimSize: form.trimSize,
          themePack: form.themePack,
          anchorImageUrl: form.anchor?.imageUrl || null,
          anchorImageBase64: form.anchor?.imageBase64 || null,
          isAnchorGeneration: pageNumber === 1 && !form.anchor,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }

      if (data.imageBase64) {
        setForm((prev) => ({
          ...prev,
          pageImages: {
            ...prev.pageImages,
            [pageNumber]: { 
              imageUrl: data.imageUrl,
              imageBase64: data.imageBase64,
              isGenerating: false,
              debug: data.debug, // Store debug info
            },
          },
        }));
        toast.success(`Page ${pageNumber} generated!`);
      } else if (data.failedPrintSafe) {
        setForm((prev) => ({
          ...prev,
          pageImages: {
            ...prev.pageImages,
            [pageNumber]: { 
              isGenerating: false, 
              failedPrintSafe: true,
              failureReason: data.failureReason,
              error: data.suggestion || data.details || "Quality check failed",
              debug: data.debug, // Store debug info even on failure
            },
          },
        }));
        toast.error(`Page ${pageNumber} failed: ${data.failureReason}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to generate";
      setForm((prev) => ({
        ...prev,
        pageImages: {
          ...prev.pageImages,
          [pageNumber]: { isGenerating: false, error: errorMsg },
        },
      }));
      toast.error(errorMsg);
    }
  };

  // =====================
  // Bulk Generation
  // =====================
  const startBulkGeneration = async () => {
    if (form.scenes.length === 0) {
      toast.error("No scenes to generate.");
      return;
    }

    if (!form.anchor) {
      toast.error("Approve the sample page style first");
      return;
    }

    setBulkGenerating(true);
    const remainingScenes = form.scenes.slice(1).filter(
      (scene) => !form.pageImages[scene.pageNumber]?.imageBase64
    );
    
    toast.info(`Generating ${remainingScenes.length} pages... This may take a few minutes.`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < remainingScenes.length; i++) {
      const scene = remainingScenes[i];
      toast.info(`Generating page ${scene.pageNumber}... (${i + 1}/${remainingScenes.length})`);
      
      await generateImage(scene.pageNumber, scene.scenePrompt);
      
      // Check if it succeeded
      // Wait a bit to let state update
      await new Promise((r) => setTimeout(r, 500));
      
      // Wait between requests to avoid rate limits (DALL-E 3 has strict limits)
      if (i < remainingScenes.length - 1) {
        await new Promise((r) => setTimeout(r, 5000)); // 5 second delay
      }
    }

    setBulkGenerating(false);
    toast.success("Generation complete! Check each page for results.");
  };

  // =====================
  // Helpers
  // =====================
  const canProceed = () => {
    switch (step) {
      case 1:
        return !!form.trimSize && !!form.bookMode;
      case 2:
        if (form.bookMode === "series") {
          return !!form.theme && !!form.characterName && !!form.characterDescription && form.pageCount >= 1 && form.pageCount <= MAX_PAGES;
        }
        return !!form.theme && form.pageCount >= 1 && form.pageCount <= MAX_PAGES;
      case 3:
        return true;
      case 4:
        return form.scenes.length > 0;
      default:
        return true;
    }
  };

  const updateScenePrompt = (pageNumber: number, newScenePrompt: string) => {
    setForm((prev) => ({
      ...prev,
      scenes: prev.scenes.map((p) =>
        p.pageNumber === pageNumber ? { ...p, scenePrompt: newScenePrompt } : p
      ),
    }));
  };

  const updateSceneTitle = (pageNumber: number, newTitle: string) => {
    setForm((prev) => ({
      ...prev,
      scenes: prev.scenes.map((p) =>
        p.pageNumber === pageNumber ? { ...p, sceneTitle: newTitle } : p
      ),
    }));
  };

  const copyScene = (scenePrompt: string) => {
    navigator.clipboard.writeText(scenePrompt);
    toast.success("Scene copied!");
  };

  const openPreview = (pageNumber: number, title: string, imageUrl: string) => {
    setPreviewPage({ pageNumber, title, imageUrl });
  };

  const isCharacterLocked = !!form.characterLock;
  const isAnchorApproved = !!form.anchor;
  const page1Image = form.pageImages[1];
  const page1DisplayUrl = getImageDisplayUrl(page1Image);
  const generatedCount = Object.values(form.pageImages).filter((p) => p.imageBase64).length;
  
  // Style contract summary for display
  const styleContractSummary = getStyleContractSummary();

  // Get character type label
  const selectedCharacterType = CHARACTER_TYPES.find(c => c.value === form.characterType);

  return (
    <>
      <AppTopbar title="Create New Book" subtitle={saved ? "✓ Auto-saved" : "Saving..."} />

      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-3xl space-y-8">
          <WizardStepper steps={steps} currentStep={step} />

          <div className="min-h-[400px]">
            {/* =============== STEP 1: SETUP =============== */}
            {step === 1 && (
              <div className="space-y-8">
                {/* Book Mode Selection */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold">What kind of book? 📚</h2>
                    <p className="text-muted-foreground">Choose your book type</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Card
                      className={cn(
                        "cursor-pointer border-2 transition-all hover:border-primary",
                        form.bookMode === "series" ? "border-primary bg-primary/5" : "border-border/50"
                      )}
                      onClick={() => updateForm("bookMode", "series")}
                    >
                      <CardContent className="flex flex-col items-center p-6 text-center">
                        <Users className="mb-3 h-10 w-10 text-primary" />
                        <p className="font-semibold">Series Book</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Same main character on every page
                        </p>
                        {form.bookMode === "series" && <Check className="mt-3 h-5 w-5 text-primary" />}
                      </CardContent>
                    </Card>
                    <Card
                      className={cn(
                        "cursor-pointer border-2 transition-all hover:border-primary",
                        form.bookMode === "collection" ? "border-primary bg-primary/5" : "border-border/50"
                      )}
                      onClick={() => updateForm("bookMode", "collection")}
                    >
                      <CardContent className="flex flex-col items-center p-6 text-center">
                        <BookOpen className="mb-3 h-10 w-10 text-muted-foreground" />
                        <p className="font-semibold">Collection Book</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Varied pages within same theme
                        </p>
                        {form.bookMode === "collection" && <Check className="mt-3 h-5 w-5 text-primary" />}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Character Type Selection (Series Mode Only) */}
                {form.bookMode === "series" && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h2 className="text-2xl font-semibold">Character Type 🐱</h2>
                      <p className="text-muted-foreground">What animal is your main character?</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-4">
                      {CHARACTER_TYPES.map((type) => (
                        <Card
                          key={type.value}
                          className={cn(
                            "cursor-pointer border-2 transition-all hover:border-primary",
                            form.characterType === type.value ? "border-primary bg-primary/5" : "border-border/50"
                          )}
                          onClick={() => updateForm("characterType", type.value)}
                        >
                          <CardContent className="p-3 text-center">
                            <p className="font-semibold">{type.label}</p>
                            {form.characterType === type.value && (
                              <Check className="mx-auto mt-1 h-4 w-4 text-primary" />
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {selectedCharacterType && selectedCharacterType.traits && (
                      <p className="text-center text-xs text-muted-foreground">
                        Required features: {selectedCharacterType.traits}
                      </p>
                    )}
                  </div>
                )}

                {/* Trim Size Selection */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold">Trim Size 📐</h2>
                    <p className="text-muted-foreground">KDP-compliant page size</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {sizes.map((size) => (
                      <Card
                        key={size.value}
                        className={cn(
                          "cursor-pointer border-2 transition-all hover:border-primary",
                          form.trimSize === size.value ? "border-primary bg-primary/5" : "border-border/50"
                        )}
                        onClick={() => updateForm("trimSize", size.value)}
                      >
                        <CardContent className="flex items-center gap-4 p-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted font-mono text-xs">
                            {size.value.split("×")[0] || size.value.split("x")[0]}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{size.label}</p>
                            <p className="text-sm text-muted-foreground">{size.desc}</p>
                          </div>
                          {form.trimSize === size.value && <Check className="h-5 w-5 text-primary" />}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =============== STEP 2: THEME =============== */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">
                    {form.bookMode === "series" ? `Set your ${selectedCharacterType?.label} theme 🎨` : "Set your theme 🎨"}
                  </h2>
                </div>

                <TrendingPanel
                  onSelectKeyword={() => {}}
                  onSuggestTrending={suggestTrending}
                  isSuggesting={suggestingTrending}
                />

                <div className="flex justify-center">
                  <Button variant="outline" onClick={suggestTheme} disabled={suggestingTheme} className="gap-2 rounded-full">
                    {suggestingTheme ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Thinking...</>
                    ) : (
                      <><Wand2 className="h-4 w-4" /> 🎲 AI Suggest</>
                    )}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Theme / Setting</label>
                    <Input
                      placeholder="e.g., magical forest adventure"
                      value={form.theme}
                      onChange={(e) => updateForm("theme", e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  
                  {form.bookMode === "series" && (
                    <>
                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          {selectedCharacterType?.label} Name
                        </label>
                        <Input
                          placeholder={`e.g., Whiskers the ${selectedCharacterType?.label}`}
                          value={form.characterName}
                          onChange={(e) => updateForm("characterName", e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">Character Description</label>
                        <Textarea
                          placeholder={`Describe your ${selectedCharacterType?.label.toLowerCase()}'s appearance...`}
                          value={form.characterDescription}
                          onChange={(e) => updateForm("characterDescription", e.target.value)}
                          className="min-h-[80px] rounded-xl"
                        />
                      </div>
                    </>
                  )}
                  
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Number of Pages <span className="text-muted-foreground">(max {MAX_PAGES})</span>
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={MAX_PAGES}
                      value={form.pageCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        updateForm("pageCount", Math.min(Math.max(1, val), MAX_PAGES));
                      }}
                      className="w-32 rounded-xl"
                    />
                  </div>
                </div>

                {/* Character Lock (Series Mode) */}
                {form.bookMode === "series" && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          {isCharacterLocked ? (
                            <><CheckCircle2 className="h-5 w-5 text-green-500" /> Character Locked</>
                          ) : (
                            <><Lock className="h-5 w-5 text-muted-foreground" /> Lock Character (Optional)</>
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Lock for extra AI consistency
                        </p>
                      </div>
                      <Button
                        onClick={lockCharacter}
                        disabled={lockingCharacter || generatingSheet || !form.theme || !form.characterName || !form.characterDescription}
                        variant={isCharacterLocked ? "outline" : "secondary"}
                        size="sm"
                        className="rounded-xl"
                      >
                        {lockingCharacter || generatingSheet ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Locking...</>
                        ) : isCharacterLocked ? (
                          <><RefreshCw className="mr-2 h-4 w-4" /> Re-lock</>
                        ) : (
                          <><Lock className="mr-2 h-4 w-4" /> Lock</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =============== STEP 3: STYLE =============== */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Choose style ✍️</h2>
                  <p className="text-muted-foreground">Pandacorn Busy Day KDP style</p>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="mb-3 block text-sm font-medium">Complexity</label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {complexities.map((c) => (
                        <Card
                          key={c.value}
                          className={cn(
                            "cursor-pointer border-2 transition-all hover:border-primary",
                            form.complexity === c.value ? "border-primary bg-primary/5" : "border-border/50"
                          )}
                          onClick={() => updateForm("complexity", c.value)}
                        >
                          <CardContent className="p-4 text-center">
                            <p className="font-semibold">{c.label}</p>
                            <p className="text-xs text-muted-foreground">{c.desc}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-3 block text-sm font-medium">Line Thickness</label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {thicknesses.map((t) => (
                        <Card
                          key={t.value}
                          className={cn(
                            "cursor-pointer border-2 transition-all hover:border-primary",
                            form.lineThickness === t.value ? "border-primary bg-primary/5" : "border-border/50"
                          )}
                          onClick={() => updateForm("lineThickness", t.value)}
                        >
                          <CardContent className="p-4 text-center">
                            <p className="font-semibold">{t.label}</p>
                            <p className="text-xs text-muted-foreground">{t.desc}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Theme Pack Section */}
                  <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                          🌍 Theme Pack {form.themePack ? "✓" : "(optional)"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {form.themePack 
                            ? `Setting: ${form.themePack.setting}`
                            : "Generate a consistent world for all pages"
                          }
                        </p>
                      </div>
                      <Button
                        variant={form.themePack ? "outline" : "secondary"}
                        size="sm"
                        onClick={generateThemePack}
                        disabled={generatingThemePack || !form.theme}
                        className="rounded-xl"
                      >
                        {generatingThemePack ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                        ) : form.themePack ? (
                          <><RefreshCw className="mr-2 h-4 w-4" /> Regenerate</>
                        ) : (
                          <><Sparkles className="mr-2 h-4 w-4" /> Generate Theme Pack</>
                        )}
                      </Button>
                    </div>
                    {form.themePack && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        <p><strong>Props:</strong> {form.themePack.recurringProps.slice(0, 8).join(", ")}...</p>
                        <p><strong>Mood:</strong> {form.themePack.artMood}</p>
                      </div>
                    )}
                  </div>

                  {/* Style Info Box */}
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      🎨 Style: Pandacorn Busy Day KDP
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pure B/W line art • Thick clean outlines • Kawaii shapes • No shading • Outlined eyes only
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* =============== STEP 4: SCENE IDEAS =============== */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Scene Ideas 📝</h2>
                  <p className="text-muted-foreground">
                    {form.bookMode === "series" 
                      ? `${form.characterName} (${selectedCharacterType?.label}) adventures`
                      : "Themed scene ideas"}
                  </p>
                </div>

                {/* Theme Pack Info */}
                {form.themePack && (
                  <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      🌍 World: {form.themePack.setting}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <strong>Props to use:</strong> {form.themePack.recurringProps.slice(0, 6).join(", ")}...
                    </p>
                  </div>
                )}

                {/* Style Contract Info */}
                <details className="rounded-xl border border-blue-500/30 bg-blue-500/5">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400">
                    🔒 Locked Style: {PANDACORN_STYLE_CONTRACT.styleName}
                  </summary>
                  <div className="border-t border-blue-500/20 px-4 py-3">
                    <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono">
{styleContractSummary}
                    </pre>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Style rules are applied automatically when generating images. Edit only the <strong>scene idea</strong> (what to draw), not style instructions.
                    </p>
                  </div>
                </details>

                {form.scenes.length === 0 ? (
                  <Card className="border-dashed border-border/50 bg-muted/30">
                    <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                      <Sparkles className="mb-3 h-8 w-8 text-muted-foreground" />
                      <p className="mb-2 text-muted-foreground">
                        Generate {form.pageCount} scene ideas
                      </p>
                      <p className="mb-4 text-xs text-muted-foreground">
                        Short descriptions of what to draw on each page
                      </p>
                      <Button onClick={generateScenes} disabled={generatingPrompts} className="rounded-xl">
                        {generatingPrompts ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                        ) : (
                          <><Sparkles className="mr-2 h-4 w-4" /> Generate Scene Ideas</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Edit scene ideas below. Style rules are added automatically.
                      </p>
                      <Button variant="outline" onClick={generateScenes} disabled={generatingPrompts} className="rounded-xl">
                        {generatingPrompts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Regenerate All
                      </Button>
                    </div>
                    {form.scenes.map((scene) => (
                      <Card key={scene.id} className={cn(
                        "border-border/50 bg-card/60",
                        scene.lastError && "border-red-500/50"
                      )}>
                        <CardContent className="p-4">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{scene.pageNumber}</Badge>
                              <Input
                                value={scene.sceneTitle}
                                onChange={(e) => updateSceneTitle(scene.pageNumber, e.target.value)}
                                className="h-7 w-48 rounded-lg text-sm font-medium"
                                placeholder="Scene title"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 rounded-lg text-xs gap-1"
                                onClick={() => improveScenePrompt(scene.pageNumber)}
                                disabled={improvingScene === scene.pageNumber}
                                title="Make scene richer"
                              >
                                {improvingScene === scene.pageNumber ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <><Wand2 className="h-3 w-3" /> Improve</>
                                )}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyScene(scene.scenePrompt)}>
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 rounded-lg text-xs"
                                onClick={() => regenerateOneScene(scene.pageNumber)}
                                disabled={scene.isRegenerating}
                              >
                                {scene.isRegenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                              </Button>
                            </div>
                          </div>
                          <Textarea
                            value={scene.scenePrompt}
                            onChange={(e) => updateScenePrompt(scene.pageNumber, e.target.value)}
                            className="min-h-[60px] resize-none rounded-xl text-sm"
                            placeholder="Describe the scene: character + action + setting + 2-6 props"
                          />
                          {scene.lastError && (
                            <p className="mt-2 text-xs text-red-500">{scene.lastError}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* =============== STEP 5: GENERATE =============== */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Generate pages 🚀</h2>
                  <p className="text-muted-foreground">
                    Anchor-first • Binarized B/W • {form.bookMode === "series" ? `${selectedCharacterType?.label} locked` : "Style locked"}
                  </p>
                </div>

                {/* Anchor Generation */}
                <Card className={cn(
                  "border-2",
                  isAnchorApproved ? "border-green-500/50 bg-green-500/5" : "border-primary/50 bg-primary/5"
                )}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background">
                        <Anchor className={cn("h-6 w-6", isAnchorApproved ? "text-green-500" : "text-primary")} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold flex items-center gap-2">
                          {isAnchorApproved ? (
                            <><CheckCircle2 className="h-5 w-5 text-green-500" /> Style Approved</>
                          ) : (
                            <>Step 1: Generate & Approve Sample</>
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {isAnchorApproved
                            ? `All pages will match this ${selectedCharacterType?.label || "style"}`
                            : "Generate Page 1 to lock visual style"}
                        </p>
                        
                        {page1DisplayUrl && (
                          <div className="mt-4 flex gap-4">
                            <div 
                              className="aspect-[2/3] w-40 overflow-hidden rounded-xl border bg-white cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                              onClick={() => openPreview(1, form.scenes[0]?.sceneTitle || "Sample Page", page1DisplayUrl)}
                            >
                              <img
                                src={page1DisplayUrl}
                                alt="Sample"
                                className="h-full w-full object-contain"
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              {/* Preview button - always visible */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPreview(1, form.scenes[0]?.sceneTitle || "Sample Page", page1DisplayUrl)}
                                className="rounded-xl gap-2"
                              >
                                <Eye className="h-4 w-4" /> Preview Large
                              </Button>
                              
                              {!isAnchorApproved ? (
                                <>
                                  <Button onClick={approveAnchor} className="rounded-xl gap-2">
                                    <CheckCircle2 className="h-4 w-4" /> Approve Style
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={generateAnchor}
                                    disabled={generatingAnchor}
                                    className="rounded-xl gap-2"
                                  >
                                    <RefreshCw className="h-4 w-4" /> Regenerate Sample
                                  </Button>
                                </>
                              ) : (
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Sample approved ✓
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {page1Image?.failedPrintSafe && (
                          <div className="mt-4 rounded-lg bg-red-500/10 p-3">
                            <p className="text-sm font-medium text-red-600">Quality check failed</p>
                            <p className="text-xs text-muted-foreground">{page1Image.error}</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={generateAnchor}
                              disabled={generatingAnchor}
                              className="mt-2 rounded-xl"
                            >
                              <RefreshCw className="mr-1 h-3 w-3" /> Retry
                            </Button>
                          </div>
                        )}
                        
                        {/* Debug Panel for Sample/Anchor */}
                        {page1Image?.debug && (
                          <GenerationDebugPanel
                            title="Sample Generation Debug"
                            debug={page1Image.debug}
                            className="mt-4"
                          />
                        )}
                        
                        {!page1DisplayUrl && !generatingAnchor && !page1Image?.failedPrintSafe && (
                          <Button
                            onClick={generateAnchor}
                            disabled={form.scenes.length === 0}
                            className="mt-4 rounded-xl"
                          >
                            <Sparkles className="mr-2 h-4 w-4" /> Generate Sample
                          </Button>
                        )}
                        
                        {generatingAnchor && (
                          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating with quality gates...
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Warning if not approved */}
                {!isAnchorApproved && (
                  <div className="flex items-start gap-3 rounded-xl border border-yellow-500/50 bg-yellow-500/10 p-4">
                    <AlertCircle className="h-5 w-5 shrink-0 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-700 dark:text-yellow-400">Approve sample first</p>
                      <p className="text-sm text-muted-foreground">
                        Generate and approve Page 1 to lock the style.
                      </p>
                    </div>
                  </div>
                )}

                {/* Pages Grid */}
                {isAnchorApproved && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Generated: {generatedCount} / {form.scenes.length}
                      </p>
                      <Button
                        onClick={startBulkGeneration}
                        disabled={bulkGenerating || form.scenes.length === 0}
                        className="rounded-xl"
                      >
                        {bulkGenerating ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                        ) : (
                          <><ImageIcon className="mr-2 h-4 w-4" /> Generate Remaining</>
                        )}
                      </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {form.scenes.map((scene) => {
                        const pageState = form.pageImages[scene.pageNumber];
                        const displayUrl = getImageDisplayUrl(pageState);
                        const hasImage = !!displayUrl;
                        const isGenerating = pageState?.isGenerating;
                        const hasFailed = pageState?.failedPrintSafe;

                        return (
                          <Card key={scene.id} className={cn(
                            "overflow-hidden border-border/50",
                            hasFailed && "border-red-500/50"
                          )}>
                            <div className="aspect-[2/3] bg-white relative">
                              {hasImage ? (
                                <img
                                  src={displayUrl}
                                  alt={`Page ${scene.pageNumber}`}
                                  className="h-full w-full object-contain"
                                />
                              ) : isGenerating ? (
                                <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted">
                                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">Generating...</p>
                                </div>
                              ) : hasFailed ? (
                                <div className="flex h-full flex-col items-center justify-center p-4 text-center bg-red-50 dark:bg-red-900/10">
                                  <AlertCircle className="mb-2 h-8 w-8 text-red-500" />
                                  <p className="text-xs font-medium text-red-600">Failed</p>
                                  <p className="text-xs text-muted-foreground">{pageState?.failureReason}</p>
                                </div>
                              ) : (
                                <div className="flex h-full flex-col items-center justify-center p-4 text-center bg-muted">
                                  <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">Page {scene.pageNumber}</p>
                                </div>
                              )}
                              {scene.pageNumber === 1 && isAnchorApproved && (
                                <Badge className="absolute top-2 left-2 bg-green-500 text-white text-[10px]">
                                  <Anchor className="mr-1 h-3 w-3" /> Anchor
                                </Badge>
                              )}
                            </div>
                            <CardContent className="p-3 space-y-2">
                              <p className="truncate text-xs font-medium">{scene.sceneTitle}</p>
                              <div className="flex gap-2">
                                {hasImage && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="flex-1 rounded-lg text-xs"
                                    onClick={() => openPreview(scene.pageNumber, scene.sceneTitle, displayUrl)}
                                  >
                                    <Eye className="mr-1 h-3 w-3" /> Preview
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 rounded-lg text-xs"
                                  onClick={() => generateImage(scene.pageNumber, scene.scenePrompt)}
                                  disabled={isGenerating || bulkGenerating || (scene.pageNumber > 1 && !isAnchorApproved)}
                                >
                                  {hasImage || hasFailed ? (
                                    <><RefreshCw className="mr-1 h-3 w-3" /> Regen</>
                                  ) : (
                                    <><Sparkles className="mr-1 h-3 w-3" /> Generate</>
                                  )}
                                </Button>
                              </div>
                              {/* Debug Panel */}
                              {pageState?.debug && (
                                <GenerationDebugPanel
                                  title={`Page ${scene.pageNumber} Debug`}
                                  debug={pageState.debug}
                                />
                              )}
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
            <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1} className="rounded-xl">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {step < 5 ? (
              <Button onClick={() => setStep((s) => Math.min(5, s + 1))} disabled={!canProceed()} className="rounded-xl">
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => { toast.success("Project saved!"); router.push("/app"); }} className="rounded-xl">
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
