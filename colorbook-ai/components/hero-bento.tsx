"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, FileText, Image, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroBento() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 pt-28">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Left: Copy */}
        <div className="flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-2 text-sm font-semibold text-primary mb-6">
              <Sparkles className="h-4 w-4" />
              AI-Powered Generation
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Create KDP coloring books
            <span className="text-primary"> in minutes</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8 max-w-lg text-lg text-muted-foreground leading-relaxed"
          >
            Generate story-driven prompts, create consistent line art pages, 
            and export print-ready PDFs for Amazon KDP.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap gap-3"
          >
            <Button asChild size="lg">
              <Link href="/auth">
                Start Creating 
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#features">
                See Features
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Right: Bento Cards */}
        <div className="relative hidden min-h-[450px] lg:block">
          
          {/* Gradient blur background */}
          <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-transparent to-primary/10 blur-3xl" />
          
          {/* Card 1: Size Presets */}
          <motion.div
            initial={{ opacity: 0, y: 30, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="absolute left-0 top-8 z-10 w-56"
          >
            <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-lg backdrop-blur-md transition-all hover:border-primary/30">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Ruler className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-semibold">Size Presets</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["8.5×11", "8×10", "A4", "6×9"].map((size) => (
                  <span key={size} className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {size}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Card 2: Story Prompts */}
          <motion.div
            initial={{ opacity: 0, y: 30, rotate: 1 }}
            animate={{ opacity: 1, y: 0, rotate: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="absolute right-0 top-0 z-20 w-64"
          >
            <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-lg backdrop-blur-md transition-all hover:border-primary/30">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-semibold">Story Prompts</p>
              </div>
              <div className="space-y-2 text-xs">
                <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-muted-foreground">
                  1. Panda waking up in bamboo forest
                </div>
                <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-muted-foreground">
                  2. Playing with butterfly friends
                </div>
                <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-muted-foreground">
                  3. Finding a hidden waterfall
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Preview */}
          <motion.div
            initial={{ opacity: 0, y: 30, rotate: 2 }}
            animate={{ opacity: 1, y: 0, rotate: 2 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="absolute bottom-0 left-16 z-30 w-52"
          >
            <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-lg backdrop-blur-md transition-all hover:border-primary/30">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Image className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-semibold">Preview</p>
              </div>
              <div className="aspect-[8.5/11] overflow-hidden rounded-lg border border-border bg-white shadow-inner">
                <img 
                  src="/preview-coloring-page.png" 
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
