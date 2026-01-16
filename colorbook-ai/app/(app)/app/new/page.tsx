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
} from "lucide-react";
import { toast } from "sonner";
import { MAX_PAGES } from "@/lib/schemas";
import type {
  ThemeSuggestionResponse,
  PromptListResponse,
  CharacterLock,
} from "@/lib/schemas";
import { TrendingPanel } from "@/components/app/trending-panel";
import type { TrendingSuggestionResponse } from "@/app/api/ai/suggest-trending/route";

const steps = [
  { id: 1, label: "Size" },
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

const complexities = [
  { value: "kids" as const, label: "Simple", desc: "Large shapes, easy for kids (ages 3-6)" },
  { value: "medium" as const, label: "Medium", desc: "Balanced detail (ages 6-12)" },
  { value: "detailed" as const, label: "Detailed", desc: "Intricate patterns for adults" },
];

const thicknesses = [
  { value: "thin" as const, label: "Thin", desc: "Delicate lines" },
  { value: "medium" as const, label: "Medium", desc: "Standard weight" },
  { value: "bold" as const, label: "Bold", desc: "Thick, forgiving lines" },
];

type Complexity = "kids" | "medium" | "detailed";
type Thickness = "thin" | "medium" | "bold";

// Extended PagePrompt with UI state
interface PromptItem {
  id: string;
  pageNumber: number;
  sceneTitle: string;
  prompt: string;
  isRegenerating?: boolean;
  lastError?: string;
}

interface FormState {
  size: string;
  theme: string;
  characterName: string;
  characterDescription: string;
  pageCount: number;
  complexity: Complexity;
  thickness: Thickness;
  prompts: PromptItem[];
  generatedImages: Record<number, string>;
  imageErrors: Record<number, string>;
  characterLock: CharacterLock | null;
  characterSheetUrl: string | null;
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
  const [generatingImage, setGeneratingImage] = useState<number | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  // Suggestions from AI
  const [themeSuggestion, setThemeSuggestion] = useState<ThemeSuggestionResponse | null>(null);
  const [trendingSuggestion, setTrendingSuggestion] = useState<TrendingSuggestionResponse | null>(null);
  const [suggestingTrending, setSuggestingTrending] = useState(false);
  const [selectedTrendKeyword, setSelectedTrendKeyword] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<FormState>({
    size: "8.5×11",
    theme: "",
    characterName: "",
    characterDescription: "",
    pageCount: 12,
    complexity: "kids",
    thickness: "bold",
    prompts: [],
    generatedImages: {},
    imageErrors: {},
    characterLock: null,
    characterSheetUrl: null,
  });

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setTimeout(() => setSaved(true), 500);
    // Reset character lock if theme/character changes
    if (key === "theme" || key === "characterName" || key === "characterDescription") {
      setForm((prev) => ({ ...prev, characterLock: null, characterSheetUrl: null }));
    }
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

      toast.success("Theme suggested! You can customize it.");
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

      toast.success(`Trending idea: ${data.bookIdeaTitle}`, {
        description: "Form has been filled with the suggested idea!",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to suggest trending idea");
    } finally {
      setSuggestingTrending(false);
    }
  };

  // =====================
  // AI: Lock Character
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
          lineThickness: form.thickness,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to lock character");
      }

      const data = await response.json();
      updateForm("characterLock", data.characterLock);
      toast.success("Character locked! Now generating reference sheet...");

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
    if (!form.theme || !form.characterName) {
      toast.error("Please fill in theme and character first");
      return;
    }

    setGeneratingPrompts(true);
    try {
      const response = await fetch("/api/ai/generate-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: form.theme,
          mainCharacter: `${form.characterName} - ${form.characterDescription}`,
          pageCount: form.pageCount,
          complexity: form.complexity,
          lineThickness: form.thickness,
          trimSize: form.size,
          characterLock: form.characterLock,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate prompts");
      }

      const data: PromptListResponse = await response.json();
      // Convert to PromptItem with unique IDs
      const promptItems: PromptItem[] = data.pages.map((p) => ({
        id: `prompt-${p.pageNumber}-${Date.now()}`,
        pageNumber: p.pageNumber,
        sceneTitle: p.sceneTitle,
        prompt: p.prompt,
        isRegenerating: false,
      }));
      updateForm("prompts", promptItems);
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

    // Set loading state for this row
    setForm((prev) => ({
      ...prev,
      prompts: prev.prompts.map((p) =>
        p.pageNumber === pageNumber ? { ...p, isRegenerating: true, lastError: undefined } : p
      ),
    }));

    try {
      const response = await fetch("/api/ai/regenerate-one-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageNumber,
          theme: form.theme,
          mainCharacter: `${form.characterName} - ${form.characterDescription}`,
          characterLock: form.characterLock,
          stylePreset: form.complexity,
          lineThickness: form.thickness,
          trimSize: form.size,
          previousSceneTitle: currentPrompt.sceneTitle,
          previousPrompt: currentPrompt.prompt,
          totalPages: form.pageCount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to regenerate prompt");
      }

      const data = await response.json();
      
      // Update just this prompt
      setForm((prev) => ({
        ...prev,
        prompts: prev.prompts.map((p) =>
          p.pageNumber === pageNumber
            ? {
                ...p,
                sceneTitle: data.sceneTitle,
                prompt: data.prompt,
                isRegenerating: false,
                lastError: undefined,
              }
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
  // AI: Generate Single Image (using new endpoint)
  // =====================
  const generateImage = async (pageNumber: number, prompt: string) => {
    // Require character lock for quality generation
    if (!form.characterLock) {
      toast.error("Please lock your character first for consistent results", {
        description: "Go back to Theme step and click 'Lock Character'",
      });
      return;
    }

    setGeneratingImage(pageNumber);
    // Clear any previous error
    setForm((prev) => ({
      ...prev,
      imageErrors: { ...prev.imageErrors, [pageNumber]: "" },
    }));

    try {
      const response = await fetch("/api/ai/generate-page-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          characterLock: form.characterLock,
          characterSheetImageUrl: form.characterSheetUrl,
          stylePreset: form.complexity,
          lineThickness: form.thickness,
          trimSize: form.size,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate image");
      }

      const data = await response.json();
      if (data.imageUrl) {
        setForm((prev) => ({
          ...prev,
          generatedImages: { ...prev.generatedImages, [pageNumber]: data.imageUrl },
          imageErrors: { ...prev.imageErrors, [pageNumber]: "" },
        }));
        toast.success(`Page ${pageNumber} generated!`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : `Failed to generate page ${pageNumber}`;
      setForm((prev) => ({
        ...prev,
        imageErrors: { ...prev.imageErrors, [pageNumber]: errorMsg },
      }));
      toast.error(errorMsg);
    } finally {
      setGeneratingImage(null);
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

    if (!form.characterLock) {
      toast.error("Please lock your character first", {
        description: "Go back to Theme step and click 'Lock Character'",
      });
      return;
    }

    setBulkGenerating(true);
    toast.info(`Starting generation of ${form.prompts.length} pages...`);

    for (const page of form.prompts) {
      if (!form.generatedImages[page.pageNumber]) {
        await generateImage(page.pageNumber, page.prompt);
        await new Promise((r) => setTimeout(r, 2000)); // Rate limit delay
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
        return !!form.size;
      case 2:
        return !!form.theme && !!form.characterName && !!form.characterDescription && form.pageCount >= 1 && form.pageCount <= MAX_PAGES;
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
    toast.success("Prompt copied to clipboard!");
  };

  const isCharacterLocked = !!form.characterLock;

  return (
    <>
      <AppTopbar title="Create New Book" subtitle={saved ? "✓ Auto-saved" : "Saving..."} />

      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-3xl space-y-8">
          <WizardStepper steps={steps} currentStep={step} />

          <div className="min-h-[400px]">
            {/* =============== STEP 1: SIZE =============== */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Choose your trim size 📐</h2>
                  <p className="text-muted-foreground">Select a KDP-compliant page size</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {sizes.map((size) => (
                    <Card
                      key={size.value}
                      className={cn(
                        "cursor-pointer border-2 transition-all hover:border-primary",
                        form.size === size.value ? "border-primary bg-primary/5" : "border-border/50"
                      )}
                      onClick={() => updateForm("size", size.value)}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted font-mono text-xs">
                          {size.value.split("×")[0]}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{size.label}</p>
                          <p className="text-sm text-muted-foreground">{size.desc}</p>
                        </div>
                        {form.size === size.value && <Check className="h-5 w-5 text-primary" />}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* =============== STEP 2: THEME =============== */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Set your theme 🎨</h2>
                  <p className="text-muted-foreground">Define theme, character, and lock the style</p>
                </div>

                <TrendingPanel
                  onSelectKeyword={setSelectedTrendKeyword}
                  onSuggestTrending={suggestTrending}
                  isSuggesting={suggestingTrending}
                />

                {trendingSuggestion && (
                  <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                    <p className="mb-2 text-sm font-semibold text-green-600 dark:text-green-400">
                      💡 {trendingSuggestion.bookIdeaTitle}
                    </p>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {trendingSuggestion.tags?.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs border-green-500/30">{tag}</Badge>
                      ))}
                    </div>
                    {trendingSuggestion.exampleScenes && trendingSuggestion.exampleScenes.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Example Scenes:</p>
                        <ul className="list-inside list-disc text-xs text-muted-foreground">
                          {trendingSuggestion.exampleScenes.slice(0, 4).map((scene, i) => (
                            <li key={i}>{scene}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={suggestTheme}
                    disabled={suggestingTheme}
                    className="gap-2 rounded-full"
                  >
                    {suggestingTheme ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Thinking...</>
                    ) : (
                      <><Wand2 className="h-4 w-4" /> 🎲 Random AI Suggest</>
                    )}
                  </Button>
                </div>

                {themeSuggestion?.supportingDetails && themeSuggestion.supportingDetails.length > 0 && (
                  <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Scene Ideas:</p>
                    <div className="flex flex-wrap gap-2">
                      {themeSuggestion.supportingDetails.map((detail, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{detail}</Badge>
                      ))}
                    </div>
                  </div>
                )}

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
                  <div>
                    <label className="mb-2 block text-sm font-medium">Character Name</label>
                    <Input
                      placeholder="e.g., Bamboo the Panda"
                      value={form.characterName}
                      onChange={(e) => updateForm("characterName", e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Character Description</label>
                    <Textarea
                      placeholder="e.g., A curious baby panda with big round eyes, fluffy ears, and a red bowtie"
                      value={form.characterDescription}
                      onChange={(e) => updateForm("characterDescription", e.target.value)}
                      className="min-h-[80px] rounded-xl"
                    />
                  </div>
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

                {/* Character Lock Section */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {isCharacterLocked ? (
                          <><CheckCircle2 className="h-5 w-5 text-green-500" /> Character Locked</>
                        ) : (
                          <><Lock className="h-5 w-5 text-muted-foreground" /> Lock Character Style</>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {isCharacterLocked
                          ? "Your character will look consistent across all pages"
                          : "Required for consistent black & white pages"}
                      </p>
                    </div>
                    <Button
                      onClick={lockCharacter}
                      disabled={lockingCharacter || generatingSheet || !form.theme || !form.characterName || !form.characterDescription}
                      variant={isCharacterLocked ? "outline" : "default"}
                      className="rounded-xl"
                    >
                      {lockingCharacter || generatingSheet ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Locking...</>
                      ) : isCharacterLocked ? (
                        <><RefreshCw className="mr-2 h-4 w-4" /> Re-lock</>
                      ) : (
                        <><Lock className="mr-2 h-4 w-4" /> 🔒 Lock Character</>
                      )}
                    </Button>
                  </div>

                  {form.characterSheetUrl && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Character Reference Sheet:</p>
                      <div className="aspect-[2/3] max-w-xs overflow-hidden rounded-xl border border-border bg-white">
                        <img
                          src={form.characterSheetUrl}
                          alt="Character Sheet"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {form.characterLock && (
                    <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs">
                      <p className="font-medium">{form.characterLock.canonicalName}</p>
                      <p className="text-muted-foreground">{form.characterLock.visualRules.proportions}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {form.characterLock.visualRules.uniqueFeatures.slice(0, 3).map((f, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{f}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =============== STEP 3: STYLE =============== */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Choose your style ✍️</h2>
                  <p className="text-muted-foreground">Set complexity and line thickness</p>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="mb-3 block text-sm font-medium">Complexity Level</label>
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
                            form.thickness === t.value ? "border-primary bg-primary/5" : "border-border/50"
                          )}
                          onClick={() => updateForm("thickness", t.value)}
                        >
                          <CardContent className="p-4 text-center">
                            <p className="font-semibold">{t.label}</p>
                            <p className="text-xs text-muted-foreground">{t.desc}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {!isCharacterLocked && (
                    <div className="flex items-start gap-3 rounded-xl border border-yellow-500/50 bg-yellow-500/10 p-4">
                      <AlertCircle className="h-5 w-5 shrink-0 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-700 dark:text-yellow-400">Character not locked</p>
                        <p className="text-sm text-muted-foreground">
                          Go back to Theme step and lock your character for consistent black & white results.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =============== STEP 4: PROMPTS =============== */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Generate prompts 📝</h2>
                  <p className="text-muted-foreground">AI will create story-driven prompts for each page</p>
                </div>

                {form.prompts.length === 0 ? (
                  <div className="space-y-4">
                    <Card className="border-dashed border-border/50 bg-muted/30">
                      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                        <Sparkles className="mb-3 h-8 w-8 text-muted-foreground" />
                        <p className="mb-4 text-muted-foreground">
                          Click below to generate {form.pageCount} story prompts
                        </p>
                        <Button onClick={generatePrompts} disabled={generatingPrompts} className="rounded-xl">
                          {generatingPrompts ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                          ) : (
                            <><Sparkles className="mr-2 h-4 w-4" /> Generate Prompts with AI</>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                    {generatingPrompts && (
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-20 rounded-xl" />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={generatePrompts}
                        disabled={generatingPrompts}
                        className="rounded-xl"
                      >
                        {generatingPrompts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Regenerate All
                      </Button>
                    </div>
                    {form.prompts.map((page) => (
                      <Card key={page.id} className={cn(
                        "border-border/50 bg-card/60",
                        page.lastError && "border-red-500/50"
                      )}>
                        <CardContent className="p-4">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{page.pageNumber}</Badge>
                              <Input
                                value={page.sceneTitle}
                                onChange={(e) => updateSceneTitle(page.pageNumber, e.target.value)}
                                className="h-7 w-48 rounded-lg text-sm font-medium"
                                placeholder="Scene title..."
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => copyPrompt(page.prompt)}
                                title="Copy prompt"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 rounded-lg text-xs"
                                onClick={() => regenerateOnePrompt(page.pageNumber)}
                                disabled={page.isRegenerating}
                              >
                                {page.isRegenerating ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3" />
                                )}
                                Regenerate
                              </Button>
                            </div>
                          </div>
                          <Textarea
                            value={page.prompt}
                            onChange={(e) => updatePrompt(page.pageNumber, e.target.value)}
                            className="min-h-[80px] resize-none rounded-xl text-sm"
                            disabled={page.isRegenerating}
                          />
                          {page.lastError && (
                            <p className="mt-2 text-xs text-red-500">{page.lastError}</p>
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
                  <p className="text-muted-foreground">Generate black & white coloring pages</p>
                </div>

                {/* Character lock warning */}
                {!isCharacterLocked && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-500/50 bg-red-500/10 p-4">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                    <div>
                      <p className="font-medium text-red-700 dark:text-red-400">Character Lock Required</p>
                      <p className="text-sm text-muted-foreground">
                        You must lock your character before generating images. This ensures consistent black & white line art across all pages.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setStep(2)}
                      >
                        Go to Theme Step
                      </Button>
                    </div>
                  </div>
                )}

                <Card className="border-border/50 bg-card/60">
                  <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Size</p>
                      <p className="font-medium">{form.size}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pages</p>
                      <p className="font-medium">{form.prompts.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Theme</p>
                      <p className="font-medium">{form.theme}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Character</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{form.characterName}</p>
                        {isCharacterLocked && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Generated: {Object.keys(form.generatedImages).length} / {form.prompts.length}
                    </p>
                    <Button
                      onClick={startBulkGeneration}
                      disabled={bulkGenerating || form.prompts.length === 0 || !isCharacterLocked}
                      className="rounded-xl"
                    >
                      {bulkGenerating ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                      ) : (
                        <><ImageIcon className="mr-2 h-4 w-4" /> Generate All Pages</>
                      )}
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {form.prompts.map((page) => (
                      <Card key={page.id} className={cn(
                        "overflow-hidden border-border/50",
                        form.imageErrors[page.pageNumber] && "border-red-500/50"
                      )}>
                        <div className="aspect-[8.5/11] bg-white">
                          {form.generatedImages[page.pageNumber] ? (
                            <img
                              src={form.generatedImages[page.pageNumber]}
                              alt={`Page ${page.pageNumber}`}
                              className="h-full w-full object-contain"
                            />
                          ) : generatingImage === page.pageNumber ? (
                            <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted">
                              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">Generating B&W line art...</p>
                            </div>
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center p-4 text-center bg-muted">
                              <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">Page {page.pageNumber}</p>
                              {form.imageErrors[page.pageNumber] && (
                                <p className="mt-2 text-xs text-red-500">{form.imageErrors[page.pageNumber]}</p>
                              )}
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <p className="mb-2 truncate text-xs font-medium">{page.sceneTitle}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full rounded-lg text-xs"
                            onClick={() => generateImage(page.pageNumber, page.prompt)}
                            disabled={generatingImage === page.pageNumber || bulkGenerating || !isCharacterLocked}
                          >
                            {form.generatedImages[page.pageNumber] ? (
                              <><RefreshCw className="mr-1 h-3 w-3" /> Regenerate</>
                            ) : (
                              <><Sparkles className="mr-1 h-3 w-3" /> Generate</>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
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
            {step < 5 ? (
              <Button
                onClick={() => setStep((s) => Math.min(5, s + 1))}
                disabled={!canProceed()}
                className="rounded-xl"
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => {
                  toast.success("Project saved!");
                  router.push("/app");
                }}
                className="rounded-xl"
              >
                <Check className="mr-2 h-4 w-4" /> Finish
              </Button>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
