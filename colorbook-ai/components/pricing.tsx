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
    <section id="pricing" className="mx-auto max-w-5xl px-6 py-24">
      <div className="mb-16 text-center">
        <p className="mb-2 text-sm font-medium text-muted-foreground">Pricing</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Simple, transparent pricing
        </h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className={`relative rounded-2xl border p-6 ${
              tier.popular
                ? "border-primary/50 bg-primary/[0.03] shadow-lg"
                : "border-border/50 bg-card/50"
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                Popular
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <p className="text-sm text-muted-foreground">{tier.description}</p>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-semibold">{tier.price}</span>
              {tier.period && <span className="text-muted-foreground">{tier.period}</span>}
            </div>

            <ul className="mb-6 space-y-3 text-sm">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              asChild
              className="w-full rounded-full"
              variant={tier.popular ? "default" : "outline"}
            >
              <Link href="/auth">{tier.cta}</Link>
            </Button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

