"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: "$0",
    description: "Try the workflow",
    features: ["3 projects", "10 pages per project", "Basic PDF export"],
    cta: "Get started free",
  },
  {
    name: "Creator",
    price: "$19",
    period: "/mo",
    description: "For active publishers",
    features: ["Unlimited projects", "100 pages per project", "Priority support", "Bulk regeneration"],
    cta: "Start creating",
    popular: true,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
    description: "Maximum output",
    features: ["Everything unlimited", "500 pages per project", "API access", "Team features"],
    cta: "Go Pro",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-5xl px-6 py-32">
      <div className="mb-20 text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground/70">
          Pricing
        </p>
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Simple, transparent pricing
        </h2>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`relative rounded-[24px] border p-10 transition-all duration-300 ${
              tier.popular
                ? "border-foreground/20 bg-card shadow-2xl dark:shadow-none dark:border-white/10 scale-[1.02]"
                : "border-border/50 dark:border-transparent bg-card"
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-3.5 left-8 rounded-full bg-foreground px-4 py-1 text-xs font-semibold text-background">
                Popular
              </div>
            )}

            <div className="mb-2">
              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <p className="text-sm text-muted-foreground">{tier.description}</p>
            </div>

            <div className="mb-8 mt-6">
              <span className="text-5xl font-bold tracking-tight">{tier.price}</span>
              {tier.period && <span className="text-muted-foreground text-lg">{tier.period}</span>}
            </div>

            <ul className="mb-10 space-y-4 text-[15px]">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-foreground shrink-0" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              asChild
              className="w-full rounded-full"
              variant={tier.popular ? "default" : "outline"}
              size="lg"
            >
              <Link href="/auth">{tier.cta}</Link>
            </Button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
