"use client";

import { motion } from "framer-motion";
import { Sparkles, Ruler, PenTool, SlidersHorizontal, RefreshCw, FileOutput } from "lucide-react";

const features = [
  {
    emoji: "🧠",
    icon: Sparkles,
    title: "Story Mode Prompts",
    description: "Generate cohesive page-by-page prompts that tell a unified story throughout your book.",
  },
  {
    emoji: "📏",
    icon: Ruler,
    title: "KDP Trim Presets",
    description: "8.5×11, 8×10, A4 and more — all with proper bleed and margins for print-on-demand.",
  },
  {
    emoji: "✍️",
    icon: PenTool,
    title: "Line Thickness",
    description: "Choose thin, medium, or bold outlines to match your audience's coloring preferences.",
  },
  {
    emoji: "🎚️",
    icon: SlidersHorizontal,
    title: "Complexity Control",
    description: "Simple designs for kids to intricate patterns for adults — adjust with one slider.",
  },
  {
    emoji: "🔁",
    icon: RefreshCw,
    title: "Instant Regeneration",
    description: "Not happy with a page? Regenerate it instantly while keeping your prompt intact.",
  },
  {
    emoji: "📄",
    icon: FileOutput,
    title: "Print-Ready Export",
    description: "Export PDFs with page numbers, blank backs, and copyright page included.",
  },
];

export function FeatureBento() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-16 text-center">
        <p className="mb-2 text-sm font-medium text-muted-foreground">Features</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything you need to ship
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="group rounded-2xl border border-border/50 bg-card/50 p-6 transition-all hover:border-border hover:bg-card"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="text-2xl">{feature.emoji}</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/50 transition-colors group-hover:bg-muted">
                <feature.icon className="h-5 w-5 text-foreground/70" />
              </div>
            </div>
            <h3 className="mb-2 font-semibold">{feature.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

