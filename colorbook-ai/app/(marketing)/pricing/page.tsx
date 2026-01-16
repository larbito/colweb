import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/components/animated-section";
import { Check } from "lucide-react";

const pricingTiers = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect to try the workflow",
    features: ["3 projects", "10 pages per project", "Basic PDF export", "Community support"],
  },
  {
    name: "Creator",
    price: "$19",
    period: "/mo",
    description: "For active coloring book creators",
    features: ["Unlimited projects", "100 pages per project", "Advanced export options", "Priority support", "Bulk regeneration", "Version history"],
    popular: true,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
    description: "Maximum output and team features",
    features: ["Unlimited everything", "500 pages per project", "API access", "Team collaboration", "Custom branding", "Dedicated support"],
  },
];

export default function PricingPage() {
  return (
    <div className="relative min-h-screen px-6 pt-32">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[40%] left-1/2 h-[1000px] w-[1000px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="bg-grid absolute inset-0 opacity-30 dark:opacity-20" />
      </div>

      <div className="mx-auto max-w-5xl">
        <AnimatedSection className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">Pricing</p>
          <h1 className="mb-4 text-5xl font-bold tracking-tight md:text-6xl">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-muted-foreground">
            Start free. Upgrade when you're ready to scale.
          </p>
        </AnimatedSection>

        <div className="grid gap-6 md:grid-cols-3">
          {pricingTiers.map((tier, idx) => (
            <AnimatedSection key={tier.name} delay={idx * 0.1}>
              <div className={`glass relative h-full rounded-2xl border p-8 transition-all ${
                tier.popular 
                  ? "border-primary/50 shadow-lg shadow-primary/10" 
                  : "border-border/50 hover:border-border"
              }`}>
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </div>
                <div className="mb-8">
                  <span className="text-5xl font-bold">{tier.price}</span>
                  {tier.period && <span className="text-muted-foreground">{tier.period}</span>}
                </div>
                <ul className="mb-8 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className="w-full rounded-xl" variant={tier.popular ? "default" : "outline"} asChild>
                  <Link href="/app/new">Get Started</Link>
                </Button>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </div>
  );
}
