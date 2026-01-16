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
import { ArrowLeft, ArrowRight, Check, Sparkles, Loader2, Wand2, RefreshCw, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { MAX_PAGES } from "@/lib/schemas";
import type { ThemeSuggestionResponse, PromptListResponse, PagePrompt } from "@/lib/schemas";

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
  { value: "kids" as const, label: "Simple", desc: "Large shapes, easy for kids" },
  { value: "medium" as const, label: "Medium", desc: "Balanced detail level" },
  { value: "detailed" as const, label: "Detailed", desc: "Intricate patterns for adults" },
];

const thicknesses = [
  { value: "thin" as const, label: "Thin", desc: "Delicate lines" },
  { value: "medium" as const, label: "Medium", desc: "Standard weight" },
  { value: "bold" as const, label: "Bold", desc: "Thick, forgiving lines" },
];

type Complexity = "kids" | "medium" | "detailed";
type Thickness = "thin" | "medium" | "bold";

interface FormState {
  size: string;
  theme: string;
  character: string;
  pageCount: number;
  complexity: Complexity;
  thickness: Thickness;
  prompts: PagePrompt[];
  generatedImages: Record<number, string>; // pageNumber -> imageUrl
}

export default function NewBookPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [suggestingTheme, setSuggestingTheme] = useState(false);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [generatingImage, setGeneratingImage] = useState<number | null>(null);
  const [saved, setSaved] = useState(true);

  // Form state
  const [form, setForm] = useState<FormState>({
    size: "8.5×11",
    theme: "",
    character: "",
    pageCount: 12,
    complexity: "medium",
    thickness: "medium",
    prompts: [],
    generatedImages: {},
  });

  // Suggestions from AI
  const [themeSuggestion, setThemeSuggestion] = useState<ThemeSuggestionResponse | null>(null);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setTimeout(() => setSaved(true), 500);
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
      updateForm("character", data.mainCharacter);
      toast.success("Theme suggested! You can edit it if you like.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to suggest theme");
    } finally {
      setSuggestingTheme(false);
    }
  };

  // =====================
  // AI: Generate Prompts
  // =====================
  const generatePrompts = async () => {
    if (!form.theme || !form.character) {
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
          mainCharacter: form.character,
          pageCount: form.pageCount,
          complexity: form.complexity,
          lineThickness: form.thickness,
          trimSize: form.size,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate prompts");
      }

      const data: PromptListResponse = await response.json();
      updateForm("prompts", data.pages);
      toast.success(`Generated ${data.pages.length} prompts!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate prompts");
    } finally {
      setGeneratingPrompts(false);
    }
  };

  // =====================
  // AI: Generate Image
  // =====================
  const generateImage = async (pageNumber: number, prompt: string) => {
    setGeneratingImage(pageNumber);
    try {
      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          complexity: form.complexity,
          lineThickness: form.thickness,
          aspect: "portrait",
          sizePreset: form.size,
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
        }));
        toast.success(`Page ${pageNumber} generated!`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate image");
    } finally {
      setGeneratingImage(null);
    }
  };

  // =====================
  // Start bulk generation
  // =====================
  const startGeneration = async () => {
    if (form.prompts.length === 0) {
      toast.error("No prompts to generate. Go back and generate prompts first.");
      return;
    }

    setLoading(true);
    toast.info("Starting generation... This may take a while.");

    // Generate one at a time to avoid rate limits
    for (const page of form.prompts) {
      if (!form.generatedImages[page.pageNumber]) {
        await generateImage(page.pageNumber, page.prompt);
        // Small delay between requests
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    setLoading(false);
    toast.success("Generation complete!");
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!form.size;
      case 2:
        return !!form.theme && !!form.character && form.pageCount >= 1 && form.pageCount <= MAX_PAGES;
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

  return (
    <>
      <AppTopbar title="Create New Book" subtitle={saved ? "✓ Auto-saved" : "Saving..."} />

      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Stepper */}
          <WizardStepper steps={steps} currentStep={step} />

          {/* Step Content */}
          <div className="min-h-[400px]">
            {/* Step 1: Size */}
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

            {/* Step 2: Theme */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Set your theme 🎨</h2>
                  <p className="text-muted-foreground">Describe the world and main character</p>
                </div>

                {/* AI Suggest Button */}
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={suggestTheme}
                    disabled={suggestingTheme}
                    className="gap-2 rounded-full"
                  >
                    {suggestingTheme ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Thinking...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" />
                        ✨ AI Suggest Theme
                      </>
                    )}
                  </Button>
                </div>

                {/* Suggestion chips */}
                {themeSuggestion?.supportingDetails && themeSuggestion.supportingDetails.length > 0 && (
                  <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">AI Suggestions:</p>
                    <div className="flex flex-wrap gap-2">
                      {themeSuggestion.supportingDetails.map((detail, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {detail}
                        </Badge>
                      ))}
                    </div>
                    {themeSuggestion.settings && (
                      <div className="mt-3">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Settings:</p>
                        <div className="flex flex-wrap gap-2">
                          {themeSuggestion.settings.map((setting, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {setting}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Theme / Setting</label>
                    <Input
                      placeholder="e.g., magical forest adventure, underwater kingdom"
                      value={form.theme}
                      onChange={(e) => updateForm("theme", e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Main Character</label>
                    <Input
                      placeholder="e.g., curious panda cub named Bamboo"
                      value={form.character}
                      onChange={(e) => updateForm("character", e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Number of Pages{" "}
                      <span className="text-muted-foreground">(max {MAX_PAGES})</span>
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
                    {form.pageCount > MAX_PAGES && (
                      <p className="mt-1 text-sm text-destructive">Maximum {MAX_PAGES} pages</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Style */}
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
                            form.complexity === c.value
                              ? "border-primary bg-primary/5"
                              : "border-border/50"
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
                            form.thickness === t.value
                              ? "border-primary bg-primary/5"
                              : "border-border/50"
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
                </div>
              </div>
            )}

            {/* Step 4: Prompts */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Generate prompts 📝</h2>
                  <p className="text-muted-foreground">
                    AI will create story-driven prompts for each page
                  </p>
                </div>

                {form.prompts.length === 0 ? (
                  <div className="space-y-4">
                    <Card className="border-dashed border-border/50 bg-muted/30">
                      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                        <Sparkles className="mb-3 h-8 w-8 text-muted-foreground" />
                        <p className="mb-4 text-muted-foreground">
                          Click below to generate {form.pageCount} story prompts
                        </p>
                        <Button
                          onClick={generatePrompts}
                          disabled={generatingPrompts}
                          className="rounded-xl"
                        >
                          {generatingPrompts ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Generate Prompts with AI
                            </>
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
                        {generatingPrompts ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Regenerate All Prompts
                      </Button>
                    </div>
                    {form.prompts.map((page) => (
                      <Card key={page.pageNumber} className="border-border/50 bg-card/60">
                        <CardContent className="p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <Badge variant="secondary">{page.pageNumber}</Badge>
                            <span className="text-sm font-medium">{page.sceneTitle}</span>
                          </div>
                          <Textarea
                            value={page.prompt}
                            onChange={(e) => updatePrompt(page.pageNumber, e.target.value)}
                            className="min-h-[80px] resize-none rounded-xl"
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Generate */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Generate pages 🚀</h2>
                  <p className="text-muted-foreground">
                    Generate coloring pages from your prompts
                  </p>
                </div>

                {/* Summary */}
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
                      <p className="font-medium">{form.character}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Generation Progress */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Generated: {Object.keys(form.generatedImages).length} / {form.prompts.length}
                    </p>
                    <Button
                      onClick={startGeneration}
                      disabled={loading || form.prompts.length === 0}
                      className="rounded-xl"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="mr-2 h-4 w-4" />
                          Start Generation
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Page previews */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {form.prompts.map((page) => (
                      <Card key={page.pageNumber} className="overflow-hidden border-border/50">
                        <div className="aspect-[8.5/11] bg-muted">
                          {form.generatedImages[page.pageNumber] ? (
                            <img
                              src={form.generatedImages[page.pageNumber]}
                              alt={`Page ${page.pageNumber}`}
                              className="h-full w-full object-cover"
                            />
                          ) : generatingImage === page.pageNumber ? (
                            <div className="flex h-full items-center justify-center">
                              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                              <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">Page {page.pageNumber}</p>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <p className="mb-2 text-xs font-medium">{page.sceneTitle}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full rounded-lg text-xs"
                            onClick={() => generateImage(page.pageNumber, page.prompt)}
                            disabled={generatingImage === page.pageNumber}
                          >
                            {form.generatedImages[page.pageNumber] ? (
                              <>
                                <RefreshCw className="mr-1 h-3 w-3" />
                                Regenerate
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-1 h-3 w-3" />
                                Generate
                              </>
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
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {step < 5 ? (
              <Button
                onClick={() => setStep((s) => Math.min(5, s + 1))}
                disabled={!canProceed()}
                className="rounded-xl"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => {
                  toast.success("Project saved! Redirecting to dashboard...");
                  router.push("/app");
                }}
                className="rounded-xl"
              >
                <Check className="mr-2 h-4 w-4" />
                Finish
              </Button>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
