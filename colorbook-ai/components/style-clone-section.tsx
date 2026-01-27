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
} from "lucide-react";

const features = [
  {
    icon: Lock,
    title: "Style lock from your reference",
    description: "Upload any coloring page and our AI extracts its exact line style, complexity, and composition rules.",
  },
  {
    icon: Sparkles,
    title: "Generate prompts + pages",
    description: "Create 5–80 unique scenes that match your reference style perfectly, with editable prompts.",
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
      <div className="bg-white rounded-lg p-3 aspect-[3/4] flex items-center justify-center border border-border/50">
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
      <div className="bg-white rounded-lg p-3 aspect-[3/4] flex items-center justify-center border border-border/50">
        <div className="text-center">
          <Wand2 className="h-8 w-8 mx-auto text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Style Locked</p>
          <Badge variant="secondary" className="mt-2 text-[10px]">Bold Lines</Badge>
        </div>
      </div>
    ),
  },
  {
    step: "3",
    label: "Generate",
    preview: (
      <div className="bg-white rounded-lg p-3 aspect-[3/4] flex items-center justify-center border border-border/50">
        <div className="text-center">
          <FileCheck className="h-8 w-8 mx-auto text-green-500 mb-2" />
          <p className="text-xs text-muted-foreground">40 Pages</p>
          <Badge variant="default" className="mt-2 text-[10px] bg-green-500">KDP Ready</Badge>
        </div>
      </div>
    ),
  },
];

export function StyleCloneSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
        {/* Left: Content */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-4">
              ✨ New Feature
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl mb-4">
              Clone a Style in One Click
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Upload a page you love. Generate 5–80 matching pages in the same line style—KDP-ready.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4 mb-8"
          >
            {features.map((feature, i) => (
              <div key={feature.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50">
                  <feature.icon className="h-5 w-5 text-foreground/70" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button asChild size="lg" className="rounded-full group">
              <Link href="/app/style-clone">
                Try Style Clone
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
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
          {/* Gradient background decoration */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-primary/10 via-transparent to-transparent rounded-3xl" />
          
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">Style Clone Generator</span>
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
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                        {item.step}
                      </div>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {item.preview}
                  </motion.div>
                ))}
              </div>

              {/* Connection arrows */}
              <div className="flex justify-center gap-8 mt-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                  className="text-muted-foreground"
                >
                  <ArrowRight className="h-4 w-4" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.7 }}
                  className="text-muted-foreground"
                >
                  <ArrowRight className="h-4 w-4" />
                </motion.div>
              </div>

              {/* Sample result badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.8 }}
                className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">All Pages Pass Quality Gates</p>
                    <p className="text-xs text-muted-foreground">Print-safe, no fills, consistent style</p>
                  </div>
                </div>
              </motion.div>
            </CardContent>
          </Card>

          {/* Floating decoration */}
          <motion.div
            className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-primary/10 blur-2xl"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        </motion.div>
      </div>
    </section>
  );
}

