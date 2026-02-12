"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah M.",
    role: "KDP Publisher",
    initials: "SM",
    quote: "Finally, a tool that understands the KDP workflow. I went from idea to published book in a single afternoon.",
  },
  {
    name: "David L.",
    role: "Children's Book Creator",
    initials: "DL",
    quote: "The story-mode prompts are a game changer. My coloring books now have actual narratives that kids love.",
  },
  {
    name: "Emily R.",
    role: "Indie Creator",
    initials: "ER",
    quote: "I've tried other AI tools, but this is the only one that gives me consistent, print-ready line art every time.",
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-32">
      <div className="mb-20 text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground/70">
          Testimonials
        </p>
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Loved by creators
        </h2>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <Card className="h-full">
              <CardContent className="p-10">
                <div className="mb-6 flex gap-1">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-foreground text-foreground" />
                  ))}
                </div>

                <p className="mb-8 text-[15px] leading-relaxed text-foreground/80">
                  &ldquo;{t.quote}&rdquo;
                </p>

                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-sm text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
