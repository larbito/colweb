"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Clock, DollarSign, Palette, Shield, Zap, Heart } from "lucide-react";

const cards = [
  {
    icon: Clock,
    title: "Save Hours",
    description: "What used to take weeks now takes minutes. Generate an entire book in one session.",
    color: "from-blue-500/20 to-blue-500/5",
  },
  {
    icon: DollarSign,
    title: "Cut Costs",
    description: "No need to hire illustrators. Create unlimited pages at a fraction of the cost.",
    color: "from-green-500/20 to-green-500/5",
  },
  {
    icon: Palette,
    title: "Stay Consistent",
    description: "Every page matches your style. Consistent line thickness and complexity throughout.",
    color: "from-purple-500/20 to-purple-500/5",
  },
  {
    icon: Shield,
    title: "Print-Ready",
    description: "KDP-compliant exports with proper margins, bleed, and DPI settings built in.",
    color: "from-orange-500/20 to-orange-500/5",
  },
  {
    icon: Zap,
    title: "Instant Iteration",
    description: "Don't like a page? Regenerate it instantly. Keep iterating until it's perfect.",
    color: "from-yellow-500/20 to-yellow-500/5",
  },
  {
    icon: Heart,
    title: "Made for Creators",
    description: "Built by KDP publishers who understand what you actually need to ship books.",
    color: "from-pink-500/20 to-pink-500/5",
  },
];

export function FloatingCards() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.title}
          className="group relative overflow-hidden rounded-2xl border border-border bg-card/50 p-6 transition-colors hover:bg-card"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ 
            duration: 0.5, 
            delay: shouldReduceMotion ? 0 : i * 0.1,
            ease: [0.21, 0.47, 0.32, 0.98]
          }}
          whileHover={shouldReduceMotion ? {} : { y: -5, transition: { duration: 0.2 } }}
        >
          {/* Gradient background */}
          <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 transition-opacity group-hover:opacity-100`} />
          
          <div className="relative">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/50 transition-colors group-hover:border-border/80 group-hover:bg-muted">
              <card.icon className="h-6 w-6 text-foreground/80" />
            </div>
            <h3 className="mb-2 text-lg font-medium">{card.title}</h3>
            <p className="text-sm text-muted-foreground">{card.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

