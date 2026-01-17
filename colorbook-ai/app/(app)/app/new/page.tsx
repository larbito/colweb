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

// Prompt item with UI state
interface PromptItem {
  id: string;
  pageNumber: number;
  sceneTitle: string;
  prompt: string;
  isRegenerating?: boolean;
  lastError?: string;
}

// Image generation state per page - now uses base64 for binarized images
interface PageImageState {
  imageUrl?: string;
  imageBase64?: string; // Binarized B/W image
  isGenerating: boolean;
  error?: string;
  failedPrintSafe?: boolean;
  failureReason?: string;
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
  prompts: PromptItem[];
  pageImages: Record<number, PageImageState>;
  
  // Character lock
  characterLock: CharacterLock | null;
  characterSheetUrl: string | null;
  
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
    prompts: [],
    pageImages: {},
    characterLock: null,
    characterSheetUrl: null,
    anchor: null,
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
  // AI: Generate All Prompts
  // =====================
  const generatePrompts = async () => {
    if (!form.theme) {
      toast.error("Please fill in theme first");
      return;
    }
    if (form.bookMode === "series" && (!form.characterName || !form.characterDescription)) {
      toast.error("Series mode requires character name and description");
      return;
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
          characterLock: form.characterLock,
          spec,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate prompts");
      }

      const data = await response.json();
      const promptItems: PromptItem[] = data.pages.map((p: { pageNumber: number; sceneTitle: string; prompt: string }) => ({
        id: `prompt-${p.pageNumber}-${Date.now()}`,
        pageNumber: p.pageNumber,
        sceneTitle: p.sceneTitle,
        prompt: p.prompt,
        isRegenerating: false,
      }));
      updateForm("prompts", promptItems);
      updateForm("anchor", null);
      updateForm("pageImages", {});
      toast.success(`Generated ${data.pages.length} prompts!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate prompts");
    } finally {
      setGeneratingPrompts(false);
    }
  };

  // =====================
  // AI: Regenerate ONE Prompt
  // =====================
  const regenerateOnePrompt = async (pageNumber: number) => {
    const currentPrompt = form.prompts.find((p) => p.pageNumber === pageNumber);
    if (!currentPrompt) return;

    setForm((prev) => ({
      ...prev,
      prompts: prev.prompts.map((p) =>
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
          characterLock: form.characterLock,
          spec,
          previousSceneTitle: currentPrompt.sceneTitle,
          previousPrompt: currentPrompt.prompt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to regenerate prompt");
      }

      const data = await response.json();

      setForm((prev) => ({
        ...prev,
        prompts: prev.prompts.map((p) =>
          p.pageNumber === pageNumber
            ? { ...p, sceneTitle: data.sceneTitle, prompt: data.prompt, isRegenerating: false }
            : p
        ),
      }));

      toast.success(`Page ${pageNumber} prompt updated!`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to regenerate";
      setForm((prev) => ({
        ...prev,
        prompts: prev.prompts.map((p) =>
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
    if (form.prompts.length === 0) {
      toast.error("Generate prompts first");
      return;
    }

    const firstPrompt = form.prompts[0];
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
      const spec = buildSpec();

      const response = await fetch("/api/ai/generate-page-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: firstPrompt.prompt,
          pageNumber: 1,
          characterLock: form.characterLock,
          characterType: form.bookMode === "series" ? form.characterType : null,
          characterName: form.bookMode === "series" ? form.characterName : null,
          characterSheetImageUrl: form.characterSheetUrl,
          spec,
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
        toast.success("Sample page generated (B/W binarized)! Review and approve the style.");
      } else if (data.failedPrintSafe) {
        setForm((prev) => ({
          ...prev,
          pageImages: {
            ...prev.pageImages,
            [1]: { 
              isGenerating: false,
              failedPrintSafe: true,
              failureReason: data.failureReason,
              error: data.details || "Failed quality check"
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

    const firstPrompt = form.prompts[0];
    setForm((prev) => ({
      ...prev,
      anchor: {
        imageUrl: page1Image.imageUrl || `data:image/png;base64,${page1Image.imageBase64}`,
        imageBase64: page1Image.imageBase64!,
        prompt: firstPrompt?.prompt || "",
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
  const generateImage = async (pageNumber: number, prompt: string) => {
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
      const spec = buildSpec();

      const response = await fetch("/api/ai/generate-page-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          pageNumber,
          characterLock: form.characterLock,
          characterType: form.bookMode === "series" ? form.characterType : null,
          characterName: form.bookMode === "series" ? form.characterName : null,
          characterSheetImageUrl: form.characterSheetUrl,
          spec,
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
              isGenerating: false 
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
              error: data.details || "Quality check failed"
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
    if (form.prompts.length === 0) {
      toast.error("No prompts to generate.");
      return;
    }

    if (!form.anchor) {
      toast.error("Approve the sample page style first");
      return;
    }

    setBulkGenerating(true);
    toast.info(`Generating ${form.prompts.length - 1} remaining pages...`);

    for (const page of form.prompts.slice(1)) {
      if (!form.pageImages[page.pageNumber]?.imageBase64) {
        await generateImage(page.pageNumber, page.prompt);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    setBulkGenerating(false);
    toast.success("Generation complete!");
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
        return form.prompts.length > 0;
      default:
        return true;
    }
  };

  const updatePrompt = (pageNumber: number, newPrompt: string) => {
    setForm((prev) => ({
      ...prev,
      prompts: prev.prompts.map((p) =>
        p.pageNumber === pageNumber ? { ...p, prompt: newPrompt } : p
      ),
    }));
  };

  const updateSceneTitle = (pageNumber: number, newTitle: string) => {
    setForm((prev) => ({
      ...prev,
      prompts: prev.prompts.map((p) =>
        p.pageNumber === pageNumber ? { ...p, sceneTitle: newTitle } : p
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

  const isCharacterLocked = !!form.characterLock;
  const isAnchorApproved = !!form.anchor;
  const page1Image = form.pageImages[1];
  const page1DisplayUrl = getImageDisplayUrl(page1Image);
  const generatedCount = Object.values(form.pageImages).filter((p) => p.imageBase64).length;

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

                  {/* Info Box */}
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

            {/* =============== STEP 4: PROMPTS =============== */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Generate prompts 📝</h2>
                  <p className="text-muted-foreground">
                    {form.bookMode === "series" 
                      ? `${form.characterName} (${selectedCharacterType?.label}) adventures`
                      : "Themed prompts"}
                  </p>
                </div>

                {form.prompts.length === 0 ? (
                  <Card className="border-dashed border-border/50 bg-muted/30">
                    <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                      <Sparkles className="mb-3 h-8 w-8 text-muted-foreground" />
                      <p className="mb-4 text-muted-foreground">
                        Generate {form.pageCount} prompts
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
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <Button variant="outline" onClick={generatePrompts} disabled={generatingPrompts} className="rounded-xl">
                        {generatingPrompts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Regenerate All
                      </Button>
                    </div>
                    {form.prompts.map((page) => (
                      <Card key={page.id} className="border-border/50 bg-card/60">
                        <CardContent className="p-4">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{page.pageNumber}</Badge>
                              <Input
                                value={page.sceneTitle}
                                onChange={(e) => updateSceneTitle(page.pageNumber, e.target.value)}
                                className="h-7 w-48 rounded-lg text-sm font-medium"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyPrompt(page.prompt)}>
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 rounded-lg text-xs"
                                onClick={() => regenerateOnePrompt(page.pageNumber)}
                                disabled={page.isRegenerating}
                              >
                                {page.isRegenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                              </Button>
                            </div>
                          </div>
                          <Textarea
                            value={page.prompt}
                            onChange={(e) => updatePrompt(page.pageNumber, e.target.value)}
                            className="min-h-[60px] resize-none rounded-xl text-sm"
                          />
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
                            <div className="aspect-[2/3] w-32 overflow-hidden rounded-xl border bg-white">
                              <img
                                src={page1DisplayUrl}
                                alt="Sample"
                                className="h-full w-full object-contain"
                              />
                            </div>
                            <div className="flex flex-col gap-2">
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
                                    <RefreshCw className="h-4 w-4" /> Regenerate
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openPreview(1, form.prompts[0]?.sceneTitle || "Page 1", page1DisplayUrl)}
                                  className="rounded-xl"
                                >
                                  <Eye className="mr-1 h-3 w-3" /> Preview
                                </Button>
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
                        
                        {!page1DisplayUrl && !generatingAnchor && !page1Image?.failedPrintSafe && (
                          <Button
                            onClick={generateAnchor}
                            disabled={form.prompts.length === 0}
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
                        Generated: {generatedCount} / {form.prompts.length}
                      </p>
                      <Button
                        onClick={startBulkGeneration}
                        disabled={bulkGenerating || form.prompts.length === 0}
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
                      {form.prompts.map((page) => {
                        const pageState = form.pageImages[page.pageNumber];
                        const displayUrl = getImageDisplayUrl(pageState);
                        const hasImage = !!displayUrl;
                        const isGenerating = pageState?.isGenerating;
                        const hasFailed = pageState?.failedPrintSafe;

                        return (
                          <Card key={page.id} className={cn(
                            "overflow-hidden border-border/50",
                            hasFailed && "border-red-500/50"
                          )}>
                            <div className="aspect-[2/3] bg-white relative">
                              {hasImage ? (
                                <img
                                  src={displayUrl}
                                  alt={`Page ${page.pageNumber}`}
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
                                  <p className="text-xs text-muted-foreground">Page {page.pageNumber}</p>
                                </div>
                              )}
                              {page.pageNumber === 1 && isAnchorApproved && (
                                <Badge className="absolute top-2 left-2 bg-green-500 text-white text-[10px]">
                                  <Anchor className="mr-1 h-3 w-3" /> Anchor
                                </Badge>
                              )}
                            </div>
                            <CardContent className="p-3">
                              <p className="mb-2 truncate text-xs font-medium">{page.sceneTitle}</p>
                              <div className="flex gap-2">
                                {hasImage && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="flex-1 rounded-lg text-xs"
                                    onClick={() => openPreview(page.pageNumber, page.sceneTitle, displayUrl)}
                                  >
                                    <Eye className="mr-1 h-3 w-3" /> Preview
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 rounded-lg text-xs"
                                  onClick={() => generateImage(page.pageNumber, page.prompt)}
                                  disabled={isGenerating || bulkGenerating || (page.pageNumber > 1 && !isAnchorApproved)}
                                >
                                  {hasImage || hasFailed ? (
                                    <><RefreshCw className="mr-1 h-3 w-3" /> Regen</>
                                  ) : (
                                    <><Sparkles className="mr-1 h-3 w-3" /> Generate</>
                                  )}
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
