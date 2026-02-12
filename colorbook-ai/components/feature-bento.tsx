"use client";

import { motion } from "framer-motion";
import { Sparkles, Ruler, PenTool, SlidersHorizontal, RefreshCw, FileOutput } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Story Mode Prompts",
    description: "Generate cohesive page-by-page prompts that tell a unified story throughout your book.",
  },
  {
    icon: Ruler,
    title: "KDP Trim Presets",
    description: "8.5x11, 8x10, A4 and more -- all with proper bleed and margins for print-on-demand.",
  },
  {
    icon: PenTool,
    title: "Line Thickness",
    description: "Choose thin, medium, or bold outlines to match your audience's coloring preferences.",
  },
  {
    icon: SlidersHorizontal,
    title: "Complexity Control",
    description: "Simple designs for kids to intricate patterns for adults -- adjust with one slider.",
  },
  {
    icon: RefreshCw,
    title: "Instant Regeneration",
    description: "Not happy with a page? Regenerate it instantly while keeping your prompt intact.",
  },
  {
    icon: FileOutput,
    title: "Print-Ready Export",
    description: "Export PDFs with page numbers, blank backs, and copyright page included.",
  },
];

export function FeatureBento() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-32">
      <div className="mb-20 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground/70"
        >
          Features
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl font-bold tracking-tight sm:text-5xl"
        >
          Everything you need to ship
        </motion.h2>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="group rounded-[20px] bg-card p-10 border border-border/50 dark:border-transparent transition-all duration-300 hover:shadow-xl dark:hover:bg-card/80"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <feature.icon className="h-7 w-7 text-foreground" />
            </div>
            <h3 className="mb-3 text-xl font-semibold tracking-tight">{feature.title}</h3>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
