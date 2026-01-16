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
      {features.map((feature, idx) => (
        <Card 
          key={feature.title} 
          className="group glass-card overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-2xl"
        >
          <CardHeader className="space-y-4 pb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 ring-1 ring-primary/20 transition-transform group-hover:scale-105 group-hover:ring-primary/30">
              <span className="text-3xl">{feature.emoji}</span>
            </div>
            <CardTitle className="text-lg font-semibold leading-tight">{feature.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-relaxed text-foreground/90">{feature.description}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{feature.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

