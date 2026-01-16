"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah M.",
    role: "KDP Publisher",
    tag: "Beta user",
    quote: "Finally, a tool that understands the KDP workflow. I went from idea to published book in a single afternoon.",
    avatar: "👩‍🎨",
    bgColor: "bg-pink-100 dark:bg-pink-950",
  },
  {
    name: "David L.",
    role: "Children's Book Creator",
    tag: "Early adopter",
    quote: "The story-mode prompts are a game changer. My coloring books now have actual narratives that kids love.",
    avatar: "👨‍💼",
    bgColor: "bg-blue-100 dark:bg-blue-950",
  },
  {
    name: "Emily R.",
    role: "Indie Creator",
    tag: "Beta user",
    quote: "I've tried other AI tools, but this is the only one that gives me consistent, print-ready line art every time.",
    avatar: "👩‍🏫",
    bgColor: "bg-purple-100 dark:bg-purple-950",
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
                <div className="mb-4 flex items-center justify-between">
                  <Quote className="h-6 w-6 text-primary/30" />
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                
                <p className="mb-6 text-sm leading-relaxed text-foreground/80">
                  "{t.quote}"
                </p>

                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl ${t.bgColor}`}>
                    {t.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">
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
