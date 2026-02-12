"use client";

import { motion } from "framer-motion";
import { Boxes, Quote, Check, ArrowRight } from "lucide-react";
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

/**
 * NewFeaturesSection - Split into two separate major sections
 * 
 * Section 1: Bulk Book Creation -> /app/bulk
 * Section 2: Quote & Text Pages -> /app/quote-book
 */
export function NewFeaturesSection() {
  return (
    <div className="space-y-0">
      {/* SECTION 1: BULK BOOK CREATION */}
      <section className="py-24 bg-gradient-to-b from-transparent to-emerald-500/[0.03] dark:to-emerald-500/[0.02]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            {/* Left: Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-6">
                <Boxes className="h-4 w-4" />
                Production at Scale
              </div>
              
              {/* Title */}
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl mb-4">
                Bulk Book Creation
              </h2>
              
              {/* Description */}
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
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
                    className="flex items-center gap-3 text-[15px]"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 flex-shrink-0">
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    {feature}
                  </motion.li>
                ))}
              </ul>

              {/* CTA */}
              <Button asChild size="lg" className="h-12">
                <Link href="/app/bulk">
                  <Boxes className="mr-2 h-5 w-5" />
                  Start Bulk Creation
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </motion.div>

            {/* Right: Visual */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              {/* Stats cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-emerald-500/20 bg-card p-6 text-center">
                  <div className="text-4xl font-bold text-emerald-500 mb-1">10</div>
                  <div className="text-sm text-muted-foreground">Books per batch</div>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-card p-6 text-center">
                  <div className="text-4xl font-bold text-emerald-500 mb-1">80</div>
                  <div className="text-sm text-muted-foreground">Pages per book</div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-6 text-center col-span-2">
                  <div className="text-4xl font-bold text-foreground mb-1">800</div>
                  <div className="text-sm text-muted-foreground">Total pages in one session</div>
                </div>
              </div>
              
              {/* Decorative glow */}
              <div className="absolute -top-8 -right-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 2: QUOTE & TEXT PAGES */}
      <section className="py-24 bg-gradient-to-b from-transparent to-blue-500/[0.03] dark:to-blue-500/[0.02]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            {/* Left: Visual */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative order-2 lg:order-1"
            >
              {/* Sample quote card */}
              <div className="relative">
                <div className="rounded-2xl border border-blue-500/20 bg-white dark:bg-card p-8 shadow-xl">
                  {/* Paper-like quote preview */}
                  <div className="aspect-[3/4] rounded-xl border border-gray-200 dark:border-gray-700 bg-white flex items-center justify-center p-6 shadow-sm">
                    <div className="text-center">
                      <div className="text-3xl font-serif italic text-gray-700 mb-4">
                        &ldquo;Believe in yourself&rdquo;
                      </div>
                      <div className="text-sm text-gray-400 uppercase tracking-widest">
                        Typography Coloring Page
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating labels */}
                <div className="absolute -right-4 top-8 rounded-xl bg-blue-500 text-white px-4 py-2 text-sm font-medium shadow-lg">
                  Text Only
                </div>
                <div className="absolute -left-4 bottom-12 rounded-xl bg-amber-500 text-white px-4 py-2 text-sm font-medium shadow-lg">
                  No Mascots
                </div>
                
                {/* Decorative glow */}
                <div className="absolute -bottom-8 -left-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              </div>
            </motion.div>

            {/* Right: Content */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="order-1 lg:order-2"
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 mb-6">
                <Quote className="h-4 w-4" />
                Typography Focused
              </div>
              
              {/* Title */}
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl mb-4">
                Quote & Text Pages
              </h2>
              
              {/* Description */}
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                Create beautiful typography-based coloring pages with motivational quotes, 
                affirmations, and custom text designs. <strong>Text-only by default</strong> — no animals or characters.
              </p>

              {/* Features list */}
              <ul className="space-y-3 mb-8">
                {quoteFeatures.map((feature, i) => (
                  <motion.li 
                    key={feature}
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-3 text-[15px]"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/15 flex-shrink-0">
                      <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    {feature}
                  </motion.li>
                ))}
              </ul>

              {/* CTA */}
              <Button asChild variant="outline" size="lg" className="h-12">
                <Link href="/app/quote-book">
                  <Quote className="mr-2 h-5 w-5" />
                  Create Quote Book
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
