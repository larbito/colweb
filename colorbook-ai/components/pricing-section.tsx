"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: { monthly: "Free", yearly: "Free" },
    description: "Plan projects and export a handful of pages.",
    features: ["3 projects", "10 pages per project", "Basic export", "Community support"],
  },
  {
    name: "Creator",
    price: { monthly: "$19", yearly: "$15" },
    description: "Bulk generation, prompt tables, export controls.",
    features: ["Unlimited projects", "100 pages per project", "Advanced export", "Priority support", "Bulk regeneration"],
    popular: true,
  },
  {
    name: "Pro",
    price: { monthly: "$49", yearly: "$39" },
    description: "Higher limits and collaboration-ready workflows.",
    features: ["Unlimited everything", "500 pages per project", "Team collaboration", "Priority support", "API access"],
  },
];

export function PricingSection() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setBilling("monthly")}
          className={`px-4 py-2 text-sm font-medium transition ${
            billing === "monthly" ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          Monthly
        </button>
        <div className="h-8 w-12 rounded-full border border-border bg-muted p-1">
          <div
            className={`h-6 w-6 rounded-full bg-primary transition-transform ${
              billing === "yearly" ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </div>
        <button
          onClick={() => setBilling("yearly")}
          className={`px-4 py-2 text-sm font-medium transition ${
            billing === "yearly" ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          Yearly <Badge variant="secondary" className="ml-2">Save 20%</Badge>
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => (
          <Card
            key={tier.name}
            className={`group relative overflow-hidden transition-all duration-300 ${
              tier.popular 
                ? "glass-card scale-105 border-primary/40 shadow-2xl ring-1 ring-primary/20" 
                : "glass-card hover:border-primary/20 hover:shadow-xl"
            }`}
          >
            {tier.popular && (
              <div className="absolute right-4 top-4">
                <Badge className="border-primary/20 bg-primary/20 text-primary-foreground">
                  ✨ Most popular
                </Badge>
              </div>
            )}
            {tier.popular && (
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
            )}
            <CardHeader className="space-y-6 pb-6">
              <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
              <div>
                <span className="text-5xl font-bold">
                  {tier.price[billing] === "Free" ? "Free" : tier.price[billing]}
                </span>
                {tier.price[billing] !== "Free" && (
                  <span className="text-lg text-muted-foreground">/mo</span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{tier.description}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3.5">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full rounded-2xl shadow-sm"
                variant={tier.popular ? "default" : "secondary"}
                size="lg"
              >
                Choose {tier.name}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

