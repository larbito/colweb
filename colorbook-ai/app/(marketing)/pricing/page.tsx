import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tiers = [
  {
    name: "Starter",
    price: "Free",
    desc: "Plan projects and export a handful of pages.",
  },
  {
    name: "Creator",
    price: "$19/mo",
    desc: "Bulk generation, prompt tables, export controls.",
    popular: true,
  },
  {
    name: "Pro",
    price: "$49/mo",
    desc: "Higher limits and collaboration-ready workflows.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="container py-16 md:py-24">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Pricing</h1>
          <p className="text-lg text-muted-foreground">
            Start free, upgrade when you’re ready to scale production.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <Card key={tier.name} className="rounded-2xl">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{tier.name}</CardTitle>
                  {tier.popular ? <Badge>Most popular</Badge> : null}
                </div>
                <div className="text-3xl font-semibold">{tier.price}</div>
                <p className="text-sm text-muted-foreground">{tier.desc}</p>
              </CardHeader>
              <CardContent>
                <Button className="w-full rounded-2xl" variant={tier.popular ? "default" : "secondary"}>
                  Choose {tier.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

