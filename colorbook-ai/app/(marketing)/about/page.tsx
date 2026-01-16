import { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Palette, Printer, ArrowRight, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "About - ColorBook AI",
  description: "Learn about ColorBook AI and our mission to help KDP creators ship coloring books faster.",
};

const pillars = [
  {
    icon: Zap,
    title: "Speed",
    description: "What used to take weeks now takes minutes. Generate an entire book's worth of prompts and pages in a single session.",
  },
  {
    icon: Palette,
    title: "Consistency",
    description: "Every page matches your style. Same line thickness, same complexity level, same cohesive story throughout.",
  },
  {
    icon: Printer,
    title: "Print-Ready",
    description: "KDP-compliant exports with proper margins, bleed settings, and DPI. Upload directly to Amazon.",
  },
];

const timeline = [
  { step: "01", title: "Configure", description: "Set your trim size, line style, and complexity." },
  { step: "02", title: "Generate", description: "Create story prompts and bulk generate pages." },
  { step: "03", title: "Export", description: "Review, refine, and export your print-ready PDF." },
];

export default function AboutPage() {
  return (
    <main className="relative">
      <PageHeader
        badge="About Us"
        badgeIcon={Sparkles}
        title="Built for KDP creators who ship"
        subtitle="We understand the coloring book workflow because we've been there. ColorBook AI exists to remove the friction between your ideas and a published book."
      />

      {/* Story Section */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="prose prose-neutral dark:prose-invert mx-auto">
          <h2 className="text-2xl font-semibold tracking-tight">Why we built this</h2>
          <p className="text-muted-foreground leading-relaxed">
            Creating coloring books for Amazon KDP should be straightforward. But between finding consistent 
            illustrations, managing page layouts, and ensuring print compliance, most creators spend more time 
            on logistics than creativity.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            ColorBook AI streamlines the entire process. From story-driven prompts to bulk page generation 
            to print-ready PDF export — everything happens in one place, designed specifically for the KDP workflow.
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="mb-12 text-center text-2xl font-semibold tracking-tight">What we stand for</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {pillars.map((pillar) => (
            <Card key={pillar.title} className="border-border/50 bg-card/50">
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <pillar.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{pillar.title}</h3>
                <p className="text-sm text-muted-foreground">{pillar.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="mb-12 text-center text-2xl font-semibold tracking-tight">Our workflow</h2>
        <div className="space-y-8">
          {timeline.map((item) => (
            <div key={item.step} className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold">
                {item.step}
              </div>
              <div className="pt-2">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-24 pt-8">
        <div className="rounded-2xl border border-border/50 bg-card/50 p-10 text-center">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight">Ready to ship your first book?</h2>
          <p className="mb-6 text-muted-foreground">Join creators publishing coloring books with AI-powered workflows.</p>
          <Button asChild size="lg" className="rounded-full">
            <Link href="/auth">
              Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

