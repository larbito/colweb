"use client";

import { motion } from "framer-motion";
import { Settings, FileText, Download } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Settings,
    title: "Configure your book",
    description: "Choose KDP trim size, line thickness, and complexity level. Set your idea and let AI plan the book structure.",
  },
  {
    step: "02",
    icon: FileText,
    title: "Generate prompts",
    description: "Create story-driven prompts in an editable table. Refine, reorder, and customize each page individually.",
  },
  {
    step: "03",
    icon: Download,
    title: "Review & export",
    description: "Preview every page, regenerate if needed, then export a print-ready PDF with front matter included.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-32">
      <div className="mb-20 text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground/70">
          How it works
        </p>
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Three steps to your book
        </h2>
      </div>

      <div className="space-y-16">
        {steps.map((item, i) => (
          <motion.div
            key={item.step}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: i * 0.12 }}
            className="flex items-start gap-8"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-card border border-border/50 dark:border-transparent text-lg font-bold">
              {item.step}
            </div>
            <div className="pt-2">
              <div className="mb-3 flex items-center gap-3">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-xl font-semibold tracking-tight">{item.title}</h3>
              </div>
              <p className="text-[15px] leading-relaxed text-muted-foreground max-w-lg">
                {item.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
