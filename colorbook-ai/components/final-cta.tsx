"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { FloatingEmojis } from "./floating-emojis";

export function FinalCTA() {
  return (
    <section className="mx-auto max-w-4xl px-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 via-card to-card p-10 text-center shadow-lg md:p-14"
      >
        {/* Gradient border effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-50" />
        
        {/* Floating emojis */}
        <div className="absolute inset-0 opacity-50">
          <FloatingEmojis />
        </div>

        <div className="relative">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Ready to create?
          </div>

          <h2 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Ship your first coloring book today
          </h2>

          <p className="mx-auto mb-8 max-w-lg text-muted-foreground">
            Join creators who are publishing KDP coloring books faster with AI-powered workflows.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full shadow-md">
              <Link href="/auth">
                Start Creating Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link href="#pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

