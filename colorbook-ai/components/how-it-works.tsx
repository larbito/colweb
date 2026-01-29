"use client";

import { motion } from "framer-motion";
import { Settings, FileText, Download } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Settings,
    title: "Configure your book",
    description: "Choose KDP trim size, line thickness, and complexity level.",
  },
  {
    step: "02",
    icon: FileText,
    title: "Generate prompts",
    description: "Create story-driven prompts in an editable table. Refine as needed.",
  },
  {
    step: "03",
    icon: Download,
    title: "Review & export",
    description: "Preview pages, regenerate if needed, then export print-ready PDF.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <div className="mb-16 text-center">
        <p className="mb-2 text-sm font-medium text-muted-foreground">How it works</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Three steps to your book
        </h2>
      </div>

      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-6 top-0 hidden h-full w-px bg-gradient-to-b from-border via-border to-transparent md:left-1/2 md:block" />

        <div className="space-y-12">
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.15 }}
              className="flex items-start gap-6"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold shadow-sm">
                {item.step}
              </div>
              <div className="pt-2">
                <div className="mb-2 flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">{item.title}</h3>
                </div>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

