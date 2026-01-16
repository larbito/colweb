import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Ruler, PenTool, SlidersHorizontal, RefreshCw, FileOutput } from "lucide-react";

const features = [
  {
    emoji: "🧠",
    icon: Sparkles,
    title: "Story Mode Prompt Builder",
    description: "Generate cohesive page-by-page prompts that tell a story.",
    detail: "Keep your book unified with guided themes.",
  },
  {
    emoji: "📏",
    icon: Ruler,
    title: "KDP Trim Presets",
    description: "Common KDP sizes with safe margins built in.",
    detail: "8.5×11, 8×10, A4, and more.",
  },
  {
    emoji: "✍️",
    icon: PenTool,
    title: "Line Thickness Presets",
    description: "Choose thin, medium, or bold outlines for consistency.",
    detail: "Perfect for different coloring styles.",
  },
  {
    emoji: "🎚",
    icon: SlidersHorizontal,
    title: "Complexity Control",
    description: "Go from kids-simple to detailed with one toggle.",
    detail: "Match your audience's skill level.",
  },
  {
    emoji: "🔁",
    icon: RefreshCw,
    title: "Regenerate & Versions",
    description: "Retry individual pages without losing your workflow.",
    detail: "Version history keeps your edits safe.",
  },
  {
    emoji: "📄",
    icon: FileOutput,
    title: "Export Options",
    description: "Add numbering, blank pages, and copyright pages.",
    detail: "Print-ready PDF on demand.",
  },
];

export function FeatureBento() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => (
        <Card key={feature.title} className="group overflow-hidden rounded-2xl border-border bg-card/50 backdrop-blur transition-all hover:shadow-lg">
          <CardHeader className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 transition-transform group-hover:scale-110">
              <span className="text-2xl">{feature.emoji}</span>
            </div>
            <CardTitle className="text-base">{feature.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-foreground">{feature.description}</p>
            <p className="text-xs text-muted-foreground">{feature.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

