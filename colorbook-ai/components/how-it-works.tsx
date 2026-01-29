"use client";

import { motion } from "framer-motion";
import { Upload, Sparkles, Palette, Download, ArrowRight } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Upload,
    title: "Upload your reference",
    description: "Drop any coloring page image. Our AI extracts the style, line weight, and character details automatically.",
    color: "from-violet-500 to-purple-600",
  },
  {
    step: "02",
    icon: Sparkles,
    title: "Generate prompts",
    description: "Choose Storybook mode for consistent characters or Theme mode for varied scenes. AI creates detailed prompts for each page.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    step: "03",
    icon: Palette,
    title: "Customize & refine",
    description: "Edit any prompt, adjust settings, choose page orientation. Full control over every detail.",
    color: "from-pink-500 to-rose-500",
  },
  {
    step: "04",
    icon: Download,
    title: "Export & publish",
    description: "Download print-ready PNGs or PDFs. Perfect for Amazon KDP, Etsy, and other platforms.",
    color: "from-green-500 to-emerald-500",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-muted/30 py-24">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      
      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm font-semibold text-primary">How it works</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
            From idea to book in 4 steps
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our AI-powered workflow makes creating professional coloring books faster than ever
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative group"
            >
              {/* Connector arrow (hidden on last item and mobile) */}
              {i < steps.length - 1 && (
                <div className="absolute -right-3 top-16 hidden lg:block text-muted-foreground/30 z-10">
                  <ArrowRight className="h-6 w-6" />
                </div>
              )}
              
              <div className="h-full rounded-2xl border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/20">
                {/* Step number */}
                <div className="text-xs font-bold text-muted-foreground/50 mb-4">
                  STEP {item.step}
                </div>
                
                {/* Icon */}
                <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color}`}>
                  <item.icon className="h-7 w-7 text-white" />
                </div>
                
                {/* Content */}
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
