"use client";

import { motion } from "framer-motion";
import { Boxes, Quote, Zap, Type, Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const bulkFeatures = [
  "Create up to 10 books in one batch",
  "Up to 80 pages per book",
  "Background generation - leave and come back",
  "Per-page review and regeneration",
  "Batch enhance for print quality",
  "Download all as ZIP or PDF",
];

const quoteFeatures = [
  "Text-only mode for clean typography",
  "Decorative borders and flourishes",
  "AI-powered quote generation",
  "Multiple typography styles",
  "Full background patterns",
  "Perfect for motivational books",
];

// Sample quote categories
const quoteCategories = [
  { label: "Love Quotes", color: "bg-pink-500/15 text-pink-600 dark:text-pink-400" },
  { label: "Motivation", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  { label: "Kids Learning", color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
];

export function NewFeaturesSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      {/* Section Header */}
      <div className="mb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/20 px-4 py-1.5 text-sm font-medium mb-4"
        >
          <Zap className="h-4 w-4 text-accent" />
          New Features
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-semibold tracking-tight sm:text-4xl mb-4"
        >
          Create more, faster
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground max-w-2xl mx-auto"
        >
          Scale your coloring book production with bulk creation and explore new genres with text & quote coloring pages.
        </motion.p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Bulk Book Creation */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-card p-8 card-glow-green"
        >
          {/* Glow effect */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <Boxes className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold">Bulk Book Creation</h3>
                <p className="text-sm text-muted-foreground">Production at scale</p>
              </div>
            </div>

            <p className="text-muted-foreground mb-6 leading-relaxed">
              Create multiple complete coloring books in a single session. Perfect for publishers, 
              teachers, and creators who need volume.
            </p>

            {/* Features list */}
            <ul className="space-y-3 mb-8">
              {bulkFeatures.map((feature, i) => (
                <motion.li 
                  key={feature}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 text-sm"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                    <Check className="h-3 w-3 text-emerald-500" />
                  </div>
                  {feature}
                </motion.li>
              ))}
            </ul>

            {/* CTA */}
            <Button asChild>
              <Link href="/app/bulk">
                <Boxes className="mr-2 h-4 w-4" />
                Start Bulk Creation
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Quote & Text Coloring Pages */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-card p-8 card-glow-purple"
        >
          {/* Glow effect */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20">
                <Quote className="h-7 w-7 text-purple-500" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold">Quote & Text Pages</h3>
                <p className="text-sm text-muted-foreground">Typography coloring books</p>
              </div>
            </div>

            {/* Sample categories */}
            <div className="flex flex-wrap gap-2 mb-6">
              {quoteCategories.map((cat) => (
                <span 
                  key={cat.label}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${cat.color}`}
                >
                  {cat.label}
                </span>
              ))}
            </div>

            <p className="text-muted-foreground mb-6 leading-relaxed">
              Create beautiful typography-based coloring pages with motivational quotes, 
              affirmations, and custom text designs.
            </p>

            {/* Features list */}
            <ul className="space-y-3 mb-8">
              {quoteFeatures.map((feature, i) => (
                <motion.li 
                  key={feature}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 text-sm"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20">
                    <Type className="h-3 w-3 text-purple-500" />
                  </div>
                  {feature}
                </motion.li>
              ))}
            </ul>

            {/* CTA */}
            <Button asChild variant="outline">
              <Link href="/app/quote-book">
                <Quote className="mr-2 h-4 w-4" />
                Create Quote Book
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 p-6 rounded-2xl bg-muted/30 border border-border"
      >
        <div className="text-center">
          <div className="text-3xl font-bold text-emerald-500">10</div>
          <div className="text-sm text-muted-foreground">Books per batch</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-emerald-500">80</div>
          <div className="text-sm text-muted-foreground">Pages per book</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-500">4+</div>
          <div className="text-sm text-muted-foreground">Typography styles</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-500">∞</div>
          <div className="text-sm text-muted-foreground">Quote topics</div>
        </div>
      </motion.div>
    </section>
  );
}
