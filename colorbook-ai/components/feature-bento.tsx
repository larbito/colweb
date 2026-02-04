"use client";

import { motion } from "framer-motion";
import { Sparkles, Ruler, PenTool, SlidersHorizontal, RefreshCw, FileOutput } from "lucide-react";

/**
 * Feature cards - symmetric design with consistent styling
 * Uses only 4 tint colors: emerald, blue, amber, neutral (gray)
 */
const features = [
  {
    icon: Sparkles,
    title: "Story Mode Prompts",
    description: "Generate cohesive page-by-page prompts that tell a unified story throughout your book.",
    tint: "emerald",
  },
  {
    icon: Ruler,
    title: "KDP Trim Presets",
    description: "8.5×11, 8×10, A4 and more — all with proper bleed and margins for print-on-demand.",
    tint: "blue",
  },
  {
    icon: PenTool,
    title: "Line Thickness",
    description: "Choose thin, medium, or bold outlines to match your audience's coloring preferences.",
    tint: "neutral",
  },
  {
    icon: SlidersHorizontal,
    title: "Complexity Control",
    description: "Simple designs for kids to intricate patterns for adults — adjust with one slider.",
    tint: "amber",
  },
  {
    icon: RefreshCw,
    title: "Instant Regeneration",
    description: "Not happy with a page? Regenerate it instantly while keeping your prompt intact.",
    tint: "emerald",
  },
  {
    icon: FileOutput,
    title: "Print-Ready Export",
    description: "Export PDFs with page numbers, blank backs, and copyright page included.",
    tint: "blue",
  },
];

// Tint color mappings (max 4 colors)
const tintStyles = {
  emerald: {
    bg: "bg-emerald-500/[0.06] dark:bg-emerald-500/[0.08]",
    border: "border-emerald-500/10 dark:border-emerald-500/15",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  blue: {
    bg: "bg-blue-500/[0.06] dark:bg-blue-500/[0.08]",
    border: "border-blue-500/10 dark:border-blue-500/15",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  amber: {
    bg: "bg-amber-500/[0.06] dark:bg-amber-500/[0.08]",
    border: "border-amber-500/10 dark:border-amber-500/15",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  neutral: {
    bg: "bg-gray-500/[0.04] dark:bg-gray-500/[0.06]",
    border: "border-gray-500/10 dark:border-gray-500/15",
    iconBg: "bg-gray-500/10",
    iconColor: "text-gray-600 dark:text-gray-400",
  },
};

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

      {/* Symmetric grid - all cards same height */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => {
          const tint = tintStyles[feature.tint as keyof typeof tintStyles];
          
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={`
                group relative rounded-2xl p-6 border transition-all duration-200
                hover:-translate-y-1 hover:shadow-lg
                ${tint.bg} ${tint.border}
                min-h-[200px] flex flex-col
              `}
            >
              {/* Icon - consistent 48x48 */}
              <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${tint.iconBg}`}>
                <feature.icon className={`h-6 w-6 ${tint.iconColor}`} />
              </div>
              
              {/* Content */}
              <h3 className="mb-2 text-lg font-semibold">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground flex-1">
                {feature.description}
              </p>
            </motion.div>
          );
        })}
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
        <div className="flex items-center justify-center gap-8 opacity-30">
          {/* Placeholder logos */}
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
