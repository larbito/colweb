"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Star, Zap } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="mx-auto max-w-5xl px-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-pink-500 p-10 text-center shadow-2xl md:p-16"
      >
        {/* Background patterns */}
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/10 rounded-full blur-3xl" />
        
        {/* Floating elements */}
        <motion.div 
          className="absolute top-10 left-10 h-20 w-20 rounded-full bg-white/10 blur-xl"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-10 right-10 h-24 w-24 rounded-full bg-white/10 blur-xl"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        <div className="relative">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-5 py-2.5 text-sm font-medium text-white"
          >
            <Sparkles className="h-4 w-4" />
            Start creating for free
          </motion.div>

          {/* Heading */}
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Ship your first coloring book
            <br />
            <span className="text-white/90">today</span>
          </h2>

          {/* Subtext */}
          <p className="mx-auto mb-10 max-w-xl text-lg text-white/80">
            Join 2,500+ creators who are publishing KDP coloring books faster with AI-powered workflows.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button 
              asChild 
              size="lg" 
              className="rounded-full bg-white text-purple-600 hover:bg-white/90 shadow-xl px-8 h-12 text-base font-semibold"
            >
              <Link href="/auth">
                Start Creating Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              size="lg" 
              className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm h-12 px-8 text-base"
            >
              <Link href="#pricing">View Pricing</Link>
            </Button>
          </div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-white/70"
          >
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>4.9/5 from 500+ reviews</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>50,000+ pages created</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
