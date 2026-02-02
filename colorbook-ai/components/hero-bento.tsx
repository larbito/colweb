"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, FileText, Image, Ruler } from "lucide-react";

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
            <span className="inline-flex items-center gap-2 rounded-full bg-[hsl(0,0%,100%,0.06)] border border-[hsl(0,0%,100%,0.1)] px-4 py-1.5 text-sm font-medium text-[hsl(0,0%,90%)] mb-6">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              AI-Powered Generation
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl text-[hsl(0,0%,95%)]"
          >
            Create KDP coloring books
            <span className="text-[hsl(0,0%,55%)]"> in minutes</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8 max-w-lg text-lg text-[hsl(0,0%,60%)] leading-relaxed"
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
            <Link href="/auth">
              <button className="btn btn-lg btn-primary group">
                Start Creating 
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </Link>
            <Link href="#features">
              <button className="btn btn-lg btn-secondary">
                See Features
              </button>
            </Link>
          </motion.div>
        </div>

        {/* Right: Bento Cards */}
        <div className="relative hidden min-h-[450px] lg:block">
          
          {/* Gradient blur background - subtle teal */}
          <div className="absolute -inset-4 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent blur-3xl" />
          
          {/* Card 1: Size Presets */}
          <motion.div
            initial={{ opacity: 0, y: 30, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="absolute left-0 top-8 z-10 w-56"
          >
            <div className="rounded-2xl border border-[hsl(0,0%,100%,0.1)] bg-[hsl(var(--card))]/80 p-5 shadow-lg backdrop-blur-md transition-all hover:border-[hsl(0,0%,100%,0.2)]">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10">
                  <Ruler className="h-4 w-4 text-cyan-400" />
                </div>
                <p className="text-sm font-semibold text-[hsl(0,0%,90%)]">Size Presets</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["8.5×11", "8×10", "A4", "6×9"].map((size) => (
                  <span key={size} className="rounded-full border border-[hsl(0,0%,100%,0.08)] bg-[hsl(0,0%,100%,0.04)] px-2.5 py-1 text-xs font-medium text-[hsl(0,0%,70%)]">
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
            <div className="rounded-2xl border border-[hsl(0,0%,100%,0.1)] bg-[hsl(var(--card))]/80 p-5 shadow-lg backdrop-blur-md transition-all hover:border-blue-500/30">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
                  <FileText className="h-4 w-4 text-blue-400" />
                </div>
                <p className="text-sm font-semibold text-[hsl(0,0%,90%)]">Story Prompts</p>
              </div>
              <div className="space-y-2 text-xs">
                <div className="rounded-lg border border-[hsl(0,0%,100%,0.06)] bg-[hsl(0,0%,100%,0.03)] px-3 py-2 text-[hsl(0,0%,60%)]">
                  1. Panda waking up in bamboo forest
                </div>
                <div className="rounded-lg border border-[hsl(0,0%,100%,0.06)] bg-[hsl(0,0%,100%,0.03)] px-3 py-2 text-[hsl(0,0%,60%)]">
                  2. Playing with butterfly friends
                </div>
                <div className="rounded-lg border border-[hsl(0,0%,100%,0.06)] bg-[hsl(0,0%,100%,0.03)] px-3 py-2 text-[hsl(0,0%,60%)]">
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
            <div className="rounded-2xl border border-[hsl(0,0%,100%,0.1)] bg-[hsl(var(--card))]/80 p-5 shadow-lg backdrop-blur-md transition-all hover:border-emerald-500/30">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Image className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-[hsl(0,0%,90%)]">Preview</p>
              </div>
              <div className="aspect-[8.5/11] overflow-hidden rounded-lg border border-[hsl(0,0%,100%,0.1)] bg-white shadow-inner">
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
