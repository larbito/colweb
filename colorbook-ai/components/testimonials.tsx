"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah M.",
    role: "KDP Publisher",
    tag: "Beta user",
    quote: "Finally, a tool that understands the KDP workflow. I went from idea to published book in a single afternoon.",
    initials: "SM",
    color: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300",
  },
  {
    name: "David L.",
    role: "Children's Book Creator",
    tag: "Early adopter",
    quote: "The story-mode prompts are a game changer. My coloring books now have actual narratives that kids love.",
    initials: "DL",
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300",
  },
  {
    name: "Emily R.",
    role: "Indie Creator",
    tag: "Beta user",
    quote: "I've tried other AI tools, but this is the only one that gives me consistent, print-ready line art every time.",
    initials: "ER",
    color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300",
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-16 text-center">
        <p className="mb-2 text-sm font-medium text-muted-foreground">Testimonials</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Loved by creators
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <Card className="group h-full border-border/50 bg-card/50 transition-all hover:border-border hover:bg-card hover:shadow-lg">
              <CardContent className="p-6">
                <Quote className="mb-4 h-8 w-8 text-muted-foreground/20" />
                
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                  "{t.quote}"
                </p>

                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${t.color}`}>
                    {t.initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {t.tag}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

