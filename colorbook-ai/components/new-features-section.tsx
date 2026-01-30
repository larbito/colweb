"use client";

import { motion } from "framer-motion";
import { Boxes, Quote, Zap, Type, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const bulkFeatures = [
  "Create up to 10 books in one batch",
  "Up to 40 pages per book",
  "Background generation - leave and come back",
  "Per-page review and regeneration",
  "Batch enhance for print quality",
  "Download all as ZIP",
];

const quoteFeatures = [
  "Text-only mode for clean typography",
  "Decorative borders and icons",
  "AI-powered quote generation",
  "Multiple typography styles",
  "Full background patterns",
  "Perfect for motivational books",
];

export function NewFeaturesSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4"
        >
          <Sparkles className="h-4 w-4" />
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
          className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/5 via-background to-background p-8"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                <Boxes className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold">Bulk Book Creation</h3>
                <p className="text-sm text-muted-foreground">Production at scale</p>
              </div>
            </div>

            <p className="text-muted-foreground mb-6">
              Create multiple complete coloring books in a single session. Perfect for publishers, 
              teachers, and creators who need volume.
            </p>

            <ul className="space-y-3 mb-8">
              {bulkFeatures.map((feature, i) => (
                <motion.li 
                  key={feature}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 text-sm"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20">
                    <Zap className="h-3 w-3 text-primary" />
                  </div>
                  {feature}
                </motion.li>
              ))}
            </ul>

            <Link href="/app/bulk">
              <Button className="w-full sm:w-auto">
                <Boxes className="mr-2 h-4 w-4" />
                Start Bulk Creation
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Quote & Text Coloring Pages */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-purple-500/5 via-background to-background p-8"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20">
                <Quote className="h-7 w-7 text-purple-500" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold">Quote & Text Pages</h3>
                <p className="text-sm text-muted-foreground">Typography coloring books</p>
              </div>
            </div>

            {/* Quote Page Example Image */}
            <div className="mb-6 relative group">
              <div className="aspect-[4/5] rounded-xl overflow-hidden border border-purple-500/20 bg-white shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/examples/quote-page-example.svg" 
                  alt="Quote coloring page example - Be brave, be kind, be you with floral decorations"
                  className="w-full h-full object-contain p-4"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-purple-100 text-purple-700 text-[10px] font-medium px-2 py-1 rounded-full border border-purple-200 shadow-sm">
                Sample Output
              </div>
            </div>

            <p className="text-muted-foreground mb-6">
              Create beautiful typography-based coloring pages with motivational quotes, 
              affirmations, and custom text designs.
            </p>

            <ul className="space-y-3 mb-8">
              {quoteFeatures.map((feature, i) => (
                <motion.li 
                  key={feature}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 text-sm"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20">
                    <Type className="h-3 w-3 text-purple-500" />
                  </div>
                  {feature}
                </motion.li>
              ))}
            </ul>

            <Link href="/app/quote-book">
              <Button variant="outline" className="w-full sm:w-auto border-purple-500/30 hover:bg-purple-500/10">
                <Quote className="mr-2 h-4 w-4" />
                Create Quote Book
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 p-6 rounded-2xl bg-muted/30 border border-border/50"
      >
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">10</div>
          <div className="text-sm text-muted-foreground">Books per batch</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">40</div>
          <div className="text-sm text-muted-foreground">Pages per book</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-500">4</div>
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

