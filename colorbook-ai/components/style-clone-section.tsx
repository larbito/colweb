"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Lock, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  Upload,
  Wand2,
  FileCheck,
  Book,
  Palette,
} from "lucide-react";

const features = [
  {
    icon: Lock,
    title: "Style lock from your reference",
    description: "Upload any coloring page and our AI extracts its exact line style, complexity, and composition rules.",
  },
  {
    icon: Book,
    title: "Storybook or Theme modes",
    description: "Keep the same character across pages for story books, or generate varied scenes with consistent style.",
  },
  {
    icon: ShieldCheck,
    title: "Quality checks: no color, no shading",
    description: "Every page passes strict print-safe checks—no fills, no gradients, pure black & white lines.",
  },
];

// Mock preview cards showing the style clone workflow
const previewSteps = [
  {
    step: "1",
    label: "Upload",
    preview: (
      <div className="bg-white rounded-xl p-3 aspect-[3/4] flex items-center justify-center border shadow-sm">
        <div className="text-center">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Reference.png</p>
        </div>
      </div>
    ),
  },
  {
    step: "2",
    label: "Extract",
    preview: (
      <div className="bg-white rounded-xl p-3 aspect-[3/4] flex items-center justify-center border shadow-sm">
        <div className="text-center">
          <Wand2 className="h-8 w-8 mx-auto text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Style Locked</p>
          <Badge className="mt-2 text-[10px] bg-violet-500/10 text-violet-600 border-violet-200">Bold Lines</Badge>
        </div>
      </div>
    ),
  },
  {
    step: "3",
    label: "Generate",
    preview: (
      <div className="bg-white rounded-xl p-3 aspect-[3/4] flex items-center justify-center border shadow-sm">
        <div className="text-center">
          <FileCheck className="h-8 w-8 mx-auto text-green-500 mb-2" />
          <p className="text-xs text-muted-foreground">40 Pages</p>
          <Badge className="mt-2 text-[10px] bg-green-500 text-white border-0">KDP Ready</Badge>
        </div>
      </div>
    ),
  },
];

export function StyleCloneSection() {
  return (
    <section className="relative overflow-hidden py-24">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-pink-500/5" />
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left: Content */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0 text-xs">
                <Sparkles className="mr-1 h-3 w-3" />
                Most Popular Feature
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                Clone Any Style
                <br />
                <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  In One Click
                </span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Upload a coloring page you love. Generate 1–30 matching pages in the same 
                line style—KDP-ready and print-perfect.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-5 mb-8"
            >
              {features.map((feature, i) => (
                <motion.div 
                  key={feature.title} 
                  className="flex gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex gap-3"
            >
              <Button asChild size="lg" className="rounded-full group gradient-primary border-0 text-white shadow-lg shadow-primary/25">
                <Link href="/app/batch">
                  Try Style Clone
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full">
                <Link href="#how-it-works">
                  See How It Works
                </Link>
              </Button>
            </motion.div>
          </div>

          {/* Right: Preview Cards */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <Card className="border bg-card/80 backdrop-blur-sm overflow-hidden shadow-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
                    <Wand2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="font-semibold">Style Clone Generator</span>
                    <p className="text-xs text-muted-foreground">Upload → Extract → Generate</p>
                  </div>
                </div>

                {/* Preview cards showing workflow */}
                <div className="grid grid-cols-3 gap-4">
                  {previewSteps.map((item, i) => (
                    <motion.div
                      key={item.step}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white text-[10px] font-bold">
                          {item.step}
                        </div>
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {item.preview}
                    </motion.div>
                  ))}
                </div>

                {/* Connection arrows */}
                <div className="flex justify-around px-8 -mt-16 mb-4 pointer-events-none">
                  <ArrowRight className="h-5 w-5 text-muted-foreground/40" />
                  <ArrowRight className="h-5 w-5 text-muted-foreground/40" />
                </div>

                {/* Sample result badge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.8 }}
                  className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-700 dark:text-green-400">All Pages Pass Quality Gates</p>
                      <p className="text-xs text-muted-foreground">Print-safe, no fills, consistent style</p>
                    </div>
                  </div>
                </motion.div>
              </CardContent>
            </Card>

            {/* Floating decorations */}
            <motion.div
              className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-gradient-to-br from-violet-500/30 to-purple-500/30 blur-2xl"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.div
              className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-gradient-to-br from-pink-500/30 to-rose-500/30 blur-2xl"
              animate={{ scale: [1.1, 1, 1.1] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
