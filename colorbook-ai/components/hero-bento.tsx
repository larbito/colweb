"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, FileText, Image, Ruler, Play, Star } from "lucide-react";

export function HeroBento() {
  return (
    <section className="relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 bg-grid opacity-40" />
      
      {/* Floating gradient orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-accent/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      
      <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-32">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="flex flex-col">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-6"
            >
              <Badge className="gap-1.5 rounded-full px-4 py-1.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                <Sparkles className="h-3.5 w-3.5" />
                AI-Powered Generation
              </Badge>
              <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                4.9/5 Rating
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-6 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
            >
              Create stunning
              <span className="block bg-gradient-to-r from-primary via-purple-500 to-accent bg-clip-text text-transparent">
                coloring books
              </span>
              in minutes
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-8 max-w-lg text-lg text-muted-foreground leading-relaxed"
            >
              Generate story-driven prompts, create consistent line art pages, 
              and export print-ready PDFs. Perfect for Amazon KDP publishers.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/25 gradient-primary border-0 text-white px-8">
                <Link href="/auth">
                  Start Creating Free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full group">
                <Link href="#how-it-works" className="flex items-center">
                  <Play className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                  Watch Demo
                </Link>
              </Button>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-10 flex items-center gap-4"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div 
                    key={i} 
                    className="h-8 w-8 rounded-full border-2 border-background bg-gradient-to-br from-violet-400 to-purple-600"
                    style={{ 
                      background: `linear-gradient(135deg, hsl(${260 + i * 15} 70% 60%) 0%, hsl(${280 + i * 15} 70% 50%) 100%)` 
                    }}
                  />
                ))}
              </div>
              <div className="text-sm">
                <p className="font-semibold">2,500+ creators</p>
                <p className="text-muted-foreground text-xs">have made 50,000+ pages</p>
              </div>
            </motion.div>
          </div>

          {/* Right: Bento Cards */}
          <div className="relative hidden min-h-[500px] lg:block">
            
            {/* Card 1: Size Presets */}
            <motion.div
              initial={{ opacity: 0, y: 30, rotate: -3 }}
              animate={{ opacity: 1, y: 0, rotate: -3 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ y: -8, rotate: -1, transition: { duration: 0.2 } }}
              className="absolute left-0 top-12 z-10 w-56"
            >
              <div className="rounded-2xl border bg-card/80 p-5 shadow-xl backdrop-blur-md transition-all hover:shadow-2xl">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
                    <Ruler className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-sm font-semibold">KDP Sizes</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["8.5×11", "8×10", "A4", "6×9"].map((size) => (
                    <span key={size} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                      {size}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Card 2: Story Prompts */}
            <motion.div
              initial={{ opacity: 0, y: 30, rotate: 2 }}
              animate={{ opacity: 1, y: 0, rotate: 2 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              whileHover={{ y: -8, rotate: 0, transition: { duration: 0.2 } }}
              className="absolute right-0 top-0 z-20 w-72"
            >
              <div className="rounded-2xl border bg-card/80 p-5 shadow-xl backdrop-blur-md transition-all hover:shadow-2xl">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-sm font-semibold">AI Story Prompts</p>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    "1. Panda wakes up in bamboo forest",
                    "2. Playing with butterfly friends",
                    "3. Finding a hidden waterfall",
                  ].map((prompt, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className="rounded-lg bg-muted/80 px-3 py-2 text-muted-foreground"
                    >
                      {prompt}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Card 3: Preview */}
            <motion.div
              initial={{ opacity: 0, y: 30, rotate: 3 }}
              animate={{ opacity: 1, y: 0, rotate: 3 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              whileHover={{ y: -8, rotate: 1, transition: { duration: 0.2 } }}
              className="absolute bottom-0 left-20 z-30 w-56"
            >
              <div className="rounded-2xl border bg-card/80 p-5 shadow-xl backdrop-blur-md transition-all hover:shadow-2xl">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500">
                    <Image className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-sm font-semibold">Live Preview</p>
                </div>
                <div className="aspect-[8.5/11] overflow-hidden rounded-xl border bg-white shadow-inner">
                  <img 
                    src="/preview-coloring-page.png" 
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </motion.div>

            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="absolute right-8 bottom-24 z-40"
            >
              <div className="rounded-full bg-green-500 px-4 py-2 text-white text-xs font-semibold shadow-lg flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                Print Ready
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
