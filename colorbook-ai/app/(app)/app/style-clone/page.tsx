"use client";

import { useState, useCallback } from "react";
import { AppTopbar } from "@/components/app/app-topbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Loader2,
  Wand2,
  ImageIcon,
  Upload,
  X,
  Lightbulb,
  ArrowRight,
  Download,
  RefreshCw,
  Eye,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { ImagePreviewModal } from "@/components/app/image-preview-modal";

type InputMode = "image" | "prompt";

export default function StyleClonePage() {
  // Input mode
  const [inputMode, setInputMode] = useState<InputMode>("prompt");

  // Image upload state
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

  // Prompt state - THIS IS THE SOURCE OF TRUTH
  const [prompt, setPrompt] = useState("");
  const [themeInput, setThemeInput] = useState("");

  // Loading states
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [improvingPrompt, setImprovingPrompt] = useState(false);
  const [suggestingIdeas, setSuggestingIdeas] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Ideas state
  const [ideas, setIdeas] = useState<string[]>([]);

  // Generated images
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  // Preview modal
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
      toast.success("Image uploaded!");
    };
    reader.readAsDataURL(file);
  }, []);

  const removeUploadedImage = () => {
    setUploadedImageBase64(null);
    setUploadedImagePreview(null);
  };

  // ==================== Analyze Image → Prompt ====================

  const analyzeImage = async () => {
    if (!uploadedImageBase64) {
      toast.error("Please upload an image first");
      return;
    }

    setAnalyzingImage(true);
    try {
      const response = await fetch("/api/prompt/from-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: uploadedImageBase64 }),
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze image");
      }

      // Put the returned prompt into the textarea
      setPrompt(data.prompt);
      toast.success("Image analyzed! Edit the prompt if needed, then generate.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to analyze image");
    } finally {
      setAnalyzingImage(false);
    }
  };

  // ==================== Improve Prompt ====================

  const improvePrompt = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt first");
      return;
    }

    setImprovingPrompt(true);
    try {
      const response = await fetch("/api/prompt/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to improve prompt");
      }

      setPrompt(data.prompt);
      toast.success("Prompt improved!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to improve prompt");
    } finally {
      setImprovingPrompt(false);
    }
  };

  // ==================== Suggest Ideas ====================

  const suggestIdeas = async () => {
    setSuggestingIdeas(true);
    setIdeas([]);
    try {
      const response = await fetch("/api/prompt/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: themeInput || undefined }),
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to get suggestions");
      }

      setIdeas(data.ideas || []);
      toast.success(`Got ${data.ideas?.length || 0} ideas!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to get suggestions");
    } finally {
      setSuggestingIdeas(false);
    }
  };

  const useIdea = (idea: string) => {
    setPrompt(idea);
    toast.success("Idea added to prompt!");
  };

  // ==================== Generate Image ====================

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setGenerating(true);
    setGeneratedImages([]);
    try {
      const response = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt, // EXACT prompt from textarea
          n: 1,
          size: "1024x1536",
        }),
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }

      if (data.images && data.images.length > 0) {
        setGeneratedImages(data.images);
        toast.success("Image generated!");
      } else {
        throw new Error("No images returned");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate image");
    } finally {
      setGenerating(false);
    }
  };

  // ==================== Render ====================

  return (
    <>
      <AppTopbar title="Coloring Page Generator" subtitle="No hidden prompts" />

      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          
          {/* Input Mode Selector */}
          <div className="flex gap-2">
            <Button
              variant={inputMode === "image" ? "default" : "outline"}
              onClick={() => setInputMode("image")}
              className="rounded-xl"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </Button>
            <Button
              variant={inputMode === "prompt" ? "default" : "outline"}
              onClick={() => setInputMode("prompt")}
              className="rounded-xl"
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Write Prompt
            </Button>
          </div>

          {/* Image Upload Section (when mode = image) */}
          {inputMode === "image" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Upload Reference Image
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {uploadedImagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={uploadedImagePreview}
                      alt="Uploaded"
                      className="max-w-xs rounded-xl border border-border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                      onClick={removeUploadedImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Click to upload PNG/JPG</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}

                {uploadedImageBase64 && (
                  <Button
                    onClick={analyzeImage}
                    disabled={analyzingImage}
                    className="rounded-xl"
                  >
                    {analyzingImage ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Wand2 className="mr-2 h-4 w-4" /> Analyze Image → Get Prompt</>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Ideas Suggestion Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Get Ideas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Optional theme (e.g., animals, fantasy, vehicles)"
                  value={themeInput}
                  onChange={(e) => setThemeInput(e.target.value)}
                  className="rounded-xl"
                />
                <Button
                  onClick={suggestIdeas}
                  disabled={suggestingIdeas}
                  variant="outline"
                  className="rounded-xl shrink-0"
                >
                  {suggestingIdeas ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>Suggest Ideas</>
                  )}
                </Button>
              </div>

              {ideas.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {ideas.map((idea, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-2 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <p className="text-sm flex-1">{idea}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => useIdea(idea)}
                        className="shrink-0"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prompt Editor - THE SOURCE OF TRUTH */}
          <Card className="border-2 border-primary/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Your Prompt
                <Badge variant="secondary" className="ml-2 text-xs">
                  Source of Truth
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe your coloring page... (e.g., 'A cute unicorn in a meadow with flowers, black line art on white background, coloring book style')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[150px] rounded-xl text-sm"
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={improvePrompt}
                  disabled={improvingPrompt || !prompt.trim()}
                  className="rounded-xl"
                >
                  {improvingPrompt ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Improving...</>
                  ) : (
                    <><Wand2 className="mr-2 h-4 w-4" /> Improve Prompt</>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(prompt);
                    toast.success("Copied!");
                  }}
                  disabled={!prompt.trim()}
                  className="rounded-xl"
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setPrompt("")}
                  disabled={!prompt.trim()}
                  className="rounded-xl"
                >
                  <X className="mr-2 h-4 w-4" /> Clear
                </Button>
              </div>

              <div className="pt-4 border-t border-border">
                <Button
                  onClick={generateImage}
                  disabled={generating || !prompt.trim()}
                  size="lg"
                  className="w-full rounded-xl"
                >
                  {generating ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="mr-2 h-5 w-5" /> Generate Coloring Page</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Uses your prompt exactly as written. No hidden modifications.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Generated Images */}
          {generatedImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Generated Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {generatedImages.map((img, i) => {
                    const imageUrl = `data:image/png;base64,${img}`;
                    return (
                      <div key={i} className="space-y-2">
                        <div className="aspect-[2/3] bg-white rounded-xl border border-border overflow-hidden">
                          <img
                            src={imageUrl}
                            alt={`Generated ${i + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 rounded-lg"
                            onClick={() => setPreviewImage(imageUrl)}
                          >
                            <Eye className="mr-1 h-3 w-3" /> Preview
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 rounded-lg"
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = imageUrl;
                              link.download = `coloring-page-${Date.now()}.png`;
                              link.click();
                            }}
                          >
                            <Download className="mr-1 h-3 w-3" /> Download
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={generateImage}
                    disabled={generating}
                    className="rounded-xl"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transparency Notice */}
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">No Hidden Prompts</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The prompt you see in the text box is exactly what gets sent to the image generator.
                    No system prompts, no style presets, no automatic modifications.
                  </p>
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
