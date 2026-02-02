"use client";

import { motion } from "framer-motion";
import { Sparkles, Ruler, PenTool, SlidersHorizontal, RefreshCw, FileOutput } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Story Mode Prompts",
    description: "Generate cohesive page-by-page prompts that tell a unified story throughout your book.",
    glowClass: "card-glow-cyan",
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-500",
  },
  {
    icon: Ruler,
    title: "KDP Trim Presets",
    description: "8.5×11, 8×10, A4 and more — all with proper bleed and margins for print-on-demand.",
    glowClass: "card-glow-blue",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  {
    icon: PenTool,
    title: "Line Thickness",
    description: "Choose thin, medium, or bold outlines to match your audience's coloring preferences.",
    glowClass: "card-glow-green",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
  },
  {
    icon: SlidersHorizontal,
    title: "Complexity Control",
    description: "Simple designs for kids to intricate patterns for adults — adjust with one slider.",
    glowClass: "card-glow-orange",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
  },
  {
    icon: RefreshCw,
    title: "Instant Regeneration",
    description: "Not happy with a page? Regenerate it instantly while keeping your prompt intact.",
    glowClass: "card-glow-pink",
    iconBg: "bg-pink-500/10",
    iconColor: "text-pink-500",
  },
  {
    icon: FileOutput,
    title: "Print-Ready Export",
    description: "Export PDFs with page numbers, blank backs, and copyright page included.",
    glowClass: "card-glow-purple",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
  },
];

export function FeatureBento() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-16 text-center">
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider"
        >
          Features
        </motion.p>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Everything you need to ship
        </motion.h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className={`group relative rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 ${feature.glowClass}`}
          >
            {/* Icon */}
            <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${feature.iconBg}`}>
              <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
            </div>
            
            {/* Content */}
            <h3 className="mb-2 text-lg font-semibold">
              {feature.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Trusted by creators row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
        className="mt-16 text-center"
      >
        <p className="text-sm text-muted-foreground mb-6">Trusted by creators worldwide</p>
        <div className="flex items-center justify-center gap-8 opacity-40">
          {/* Placeholder logos - you can replace with actual logos */}
          <div className="h-6 w-20 rounded bg-foreground/20" />
          <div className="h-6 w-24 rounded bg-foreground/20" />
          <div className="h-6 w-16 rounded bg-foreground/20" />
          <div className="h-6 w-20 rounded bg-foreground/20" />
          <div className="h-6 w-18 rounded bg-foreground/20" />
        </div>
      </motion.div>
    </section>
  );
}
