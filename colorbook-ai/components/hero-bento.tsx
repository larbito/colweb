"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroBento() {
  return (
    <section className="relative mx-auto max-w-5xl px-6 pb-32 pt-40">
      {/* Subtle gradient orb */}
      <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-gradient-radial from-muted/40 to-transparent blur-3xl opacity-60 dark:from-white/[0.03] dark:opacity-100" />

      <div className="relative text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-sm font-medium text-muted-foreground mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Coloring Books
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mb-8 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
        >
          Create print-ready coloring books{" "}
          <span className="text-muted-foreground">in minutes</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground leading-relaxed sm:text-xl"
        >
          Generate story-driven prompts, create consistent line art pages,
          and export KDP-ready PDFs. From idea to published book.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Button asChild size="lg" className="rounded-full px-8 text-base h-14">
            <Link href="/auth">
              Start Creating
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full px-8 text-base h-14">
            <Link href="#features">
              See Features
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
