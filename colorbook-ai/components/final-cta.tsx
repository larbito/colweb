"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-40">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Ship your first book today
        </h2>

        <p className="mx-auto mb-12 max-w-lg text-lg text-muted-foreground leading-relaxed">
          Join creators who are publishing KDP coloring books faster with AI-powered workflows.
        </p>

        <Button asChild size="lg" className="rounded-full px-10 h-14 text-base">
          <Link href="/auth">
            Start Creating Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </motion.div>
    </section>
  );
}
