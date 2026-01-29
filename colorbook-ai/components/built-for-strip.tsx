"use client";

import { motion } from "framer-motion";
import { Printer, FileOutput, Sparkles, Layers, Zap, Palette } from "lucide-react";

const items = [
  { icon: Printer, label: "KDP Ready", color: "text-orange-500" },
  { icon: FileOutput, label: "PDF Export", color: "text-blue-500" },
  { icon: Sparkles, label: "AI Prompts", color: "text-purple-500" },
  { icon: Layers, label: "Batch Generation", color: "text-green-500" },
  { icon: Zap, label: "Instant Preview", color: "text-yellow-500" },
  { icon: Palette, label: "Style Clone", color: "text-pink-500" },
];

export function BuiltForStrip() {
  return (
    <section className="border-b border-border/40 bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-8 text-center text-sm font-medium text-muted-foreground"
        >
          Built for KDP creators
        </motion.p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {items.map((item, i) => (
            <motion.div 
              key={item.label} 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-default group"
            >
              <div className={`p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors`}>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <span className="font-medium">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
