"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { FileImage, BookOpen, Users, Headphones } from "lucide-react";

const stats = [
  {
    icon: FileImage,
    value: 125000,
    suffix: "+",
    label: "Pages Generated",
    description: "Clean line art pages created",
  },
  {
    icon: BookOpen,
    value: 4800,
    suffix: "+",
    label: "Books Created",
    description: "Coloring books shipped to KDP",
  },
  {
    icon: Users,
    value: 2500,
    suffix: "+",
    label: "Happy Creators",
    description: "Publishers trust our platform",
  },
  {
    icon: Headphones,
    value: 24,
    suffix: "/7",
    label: "Support",
    description: "We're here when you need us",
  },
];

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isInView) return;
    
    if (shouldReduceMotion) {
      setCount(value);
      return;
    }

    const duration = 2000;
    const steps = 60;
    const stepValue = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isInView, value, shouldReduceMotion]);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return num.toLocaleString();
    }
    return num.toString();
  };

  return (
    <span ref={ref} className="tabular-nums">
      {formatNumber(count)}{suffix}
    </span>
  );
}

export function StatsSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="mb-16 text-center"
      >
        <p className="mb-2 text-sm font-medium text-muted-foreground">Trusted by creators</p>
        <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
          Numbers that speak for themselves
        </h2>
      </motion.div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card/50 p-6 text-center transition-colors hover:bg-card"
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/50 transition-colors group-hover:bg-muted">
              <stat.icon className="h-6 w-6 text-foreground/80" />
            </div>
            <div className="mb-1 text-4xl font-bold tracking-tight">
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
            </div>
            <div className="mb-1 font-medium">{stat.label}</div>
            <div className="text-sm text-muted-foreground">{stat.description}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

