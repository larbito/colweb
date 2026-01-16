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
import { ArrowLeft, ArrowRight, Check, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  { value: "simple", label: "Simple", desc: "Large shapes, easy for kids" },
  { value: "medium", label: "Medium", desc: "Balanced detail level" },
  { value: "detailed", label: "Detailed", desc: "Intricate patterns for adults" },
];

const thicknesses = [
  { value: "thin", label: "Thin", desc: "Delicate lines" },
  { value: "medium", label: "Medium", desc: "Standard weight" },
  { value: "bold", label: "Bold", desc: "Thick, forgiving lines" },
];

export default function NewBookPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(true);

  // Form state
  const [form, setForm] = useState({
    size: "8.5×11",
    theme: "",
    character: "",
    pageCount: 12,
    complexity: "medium",
    thickness: "medium",
    prompts: [] as string[],
  });

  const updateForm = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setTimeout(() => setSaved(true), 500);
  };

  const generatePrompts = async () => {
    if (!form.theme || !form.character) {
      toast.error("Please fill in theme and character first");
      return;
    }
    setLoading(true);
    // Mock prompt generation
    await new Promise((r) => setTimeout(r, 2000));
    const mockPrompts = Array.from({ length: form.pageCount }, (_, i) => 
      `Page ${i + 1}: ${form.character} ${["waking up", "exploring", "meeting a friend", "having an adventure", "solving a problem", "celebrating", "learning something new", "helping others", "discovering treasure", "making art", "playing games", "going home"][i % 12]} in a ${form.theme} setting.`
    );
    setForm((prev) => ({ ...prev, prompts: mockPrompts }));
    setLoading(false);
    toast.success("Prompts generated successfully!");
  };

  const startGeneration = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 3000));
    setGenerating(false);
    toast.success("Project created! Redirecting...");
    router.push("/app/projects/proj_1");
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!form.size;
      case 2: return !!form.theme && !!form.character;
      case 3: return true;
      case 4: return form.prompts.length > 0;
      default: return true;
    }
  };

  return (
    <>
      <AppTopbar 
        title="Create New Book" 
        subtitle={saved ? "✓ Auto-saved" : "Saving..."} 
      />

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
                        {form.size === size.value && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
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
                    <label className="mb-2 block text-sm font-medium">Number of Pages</label>
                    <Input
                      type="number"
                      min={6}
                      max={50}
                      value={form.pageCount}
                      onChange={(e) => updateForm("pageCount", parseInt(e.target.value) || 12)}
                      className="w-32 rounded-xl"
                    />
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
                </div>
              </div>
            )}

            {/* Step 4: Prompts */}
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
                        <Button onClick={generatePrompts} disabled={loading} className="rounded-xl">
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Generate Prompts
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                    {loading && (
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-20 rounded-xl" />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.prompts.map((prompt, i) => (
                      <Card key={i} className="border-border/50 bg-card/60">
                        <CardContent className="flex items-start gap-3 p-4">
                          <Badge variant="secondary" className="shrink-0">
                            {i + 1}
                          </Badge>
                          <Textarea
                            value={prompt}
                            onChange={(e) => {
                              const newPrompts = [...form.prompts];
                              newPrompts[i] = e.target.value;
                              updateForm("prompts", newPrompts);
                            }}
                            className="min-h-[60px] resize-none rounded-xl"
                          />
                        </CardContent>
                      </Card>
                    ))}
                    <Button variant="outline" onClick={generatePrompts} className="w-full rounded-xl">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Regenerate All Prompts
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Generate */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Ready to generate! 🚀</h2>
                  <p className="text-muted-foreground">Review your settings and start generating</p>
                </div>

                <Card className="border-border/50 bg-card/60">
                  <CardContent className="space-y-4 p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Size</p>
                        <p className="font-medium">{form.size}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pages</p>
                        <p className="font-medium">{form.pageCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Theme</p>
                        <p className="font-medium">{form.theme}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Character</p>
                        <p className="font-medium">{form.character}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Complexity</p>
                        <p className="font-medium capitalize">{form.complexity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Line Thickness</p>
                        <p className="font-medium capitalize">{form.thickness}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {generating ? (
                  <Card className="border-primary/50 bg-primary/5">
                    <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                      <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
                      <p className="font-semibold">Generating your coloring book...</p>
                      <p className="text-sm text-muted-foreground">This may take a few minutes</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Button onClick={startGeneration} size="lg" className="w-full rounded-xl">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create Project & Start Generating
                  </Button>
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
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}
