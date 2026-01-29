"use client";

import { motion } from "framer-motion";
import { 
  Sparkles, 
  Ruler, 
  PenTool, 
  SlidersHorizontal, 
  RefreshCw, 
  FileOutput,
  Wand2,
  Layers,
  BookOpen
} from "lucide-react";

const features = [
  {
    icon: Wand2,
    title: "Style Clone",
    description: "Upload any coloring page and generate unlimited pages matching that exact style and character.",
    color: "from-violet-500 to-purple-600",
    highlight: true,
  },
  {
    icon: BookOpen,
    title: "Storybook Mode",
    description: "Create cohesive stories with the same character across all pages. Perfect for children's books.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Ruler,
    title: "KDP Print Presets",
    description: "8.5×11, 8×10, A4, 6×9 — all with proper bleed and margins for Amazon KDP.",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: PenTool,
    title: "Line Art Quality",
    description: "Clean, crisp outlines optimized for coloring. No filled areas, perfect line weights.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Layers,
    title: "Batch Generation",
    description: "Generate 1-30 pages at once. Each with unique scenes while maintaining style consistency.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: RefreshCw,
    title: "Instant Regeneration",
    description: "Not happy with a page? Regenerate it instantly while keeping your prompt intact.",
    color: "from-teal-500 to-cyan-500",
  },
  {
    icon: SlidersHorizontal,
    title: "Full Control",
    description: "Adjust orientation, complexity, and edit every prompt. You're always in charge.",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: FileOutput,
    title: "Export Anywhere",
    description: "Download high-resolution PNGs ready for Amazon KDP, Etsy, or any print platform.",
    color: "from-slate-500 to-gray-600",
  },
];

export function FeatureBento() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-16 text-center"
      >
        <p className="mb-3 text-sm font-semibold text-primary">Features</p>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
          Everything you need to create
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Powerful tools designed specifically for coloring book creators
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className={`group rounded-2xl border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/20 ${
              feature.highlight ? "sm:col-span-2 lg:col-span-2 lg:row-span-1" : ""
            }`}
          >
            <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} shadow-lg`}>
              <feature.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
