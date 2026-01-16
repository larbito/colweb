import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/components/animated-section";
import { Check } from "lucide-react";

const pricing = [
  {
    name: "Starter",
    price: "$0",
    description: "Try the workflow",
    features: ["3 projects", "10 pages per project", "Basic PDF export", "Community support"],
    cta: "Get started free",
  },
  {
    name: "Creator",
    price: "$19",
    period: "/month",
    description: "For active creators",
    features: ["Unlimited projects", "100 pages per project", "Advanced export", "Priority support", "Bulk regeneration", "Version history"],
    cta: "Start creating",
    popular: true,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    description: "Maximum output",
    features: ["Everything unlimited", "500 pages per project", "API access", "Team collaboration", "Custom branding", "Dedicated support"],
    cta: "Go Pro",
  },
];

export default function PricingPage() {
  return (
    <div className="relative">
      <div className="gradient-bg fixed inset-0 -z-10" />
      <div className="bg-grid fixed inset-0 -z-10" />

      <section className="mx-auto max-w-5xl px-6 pb-24 pt-32">
        <AnimatedSection className="mb-16 text-center">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Pricing</p>
          <h1 className="mb-4 text-4xl font-medium tracking-tight sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="text-muted-foreground">
            Start free. Upgrade when you're ready to scale.
          </p>
        </AnimatedSection>

        <div className="grid gap-6 lg:grid-cols-3">
          {pricing.map((tier, i) => (
            <AnimatedSection key={tier.name} delay={i * 0.1}>
              <div className={`relative h-full rounded-2xl border p-6 ${
                tier.popular 
                  ? "border-foreground/20 bg-foreground/[0.02]" 
                  : "border-border"
              }`}>
                {tier.popular && (
                  <div className="absolute -top-3 left-6 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
                    Popular
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-medium">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-medium">{tier.price}</span>
                  {tier.period && <span className="text-muted-foreground">{tier.period}</span>}
                </div>
                <ul className="mb-6 space-y-3 text-sm">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-muted-foreground" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  asChild 
                  className="w-full rounded-full" 
                  variant={tier.popular ? "default" : "outline"}
                >
                  <Link href="/app/new">{tier.cta}</Link>
                </Button>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>
    </div>
  );
}
