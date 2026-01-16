import Link from "next/link";
import { Sparkles, BookOpen, Paintbrush, Wand2, FileOutput, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const features = [
  {
    title: "Story Mode prompts",
    description: "Generate guided prompts that keep your book cohesive.",
    icon: Sparkles,
  },
  {
    title: "KDP trim presets",
    description: "Pick exact sizes like 8.5×11 or A4 without guesswork.",
    icon: BookOpen,
  },
  {
    title: "Line thickness presets",
    description: "Keep outlines consistent across every page.",
    icon: Paintbrush,
  },
  {
    title: "Complexity presets",
    description: "Go from kids-simple to detailed with one toggle.",
    icon: Layers,
  },
  {
    title: "Regenerate & versions",
    description: "Retry individual pages without losing your workflow.",
    icon: Wand2,
  },
  {
    title: "PDF export options",
    description: "Add blank pages, numbering, and copyright pages.",
    icon: FileOutput,
  },
];

const faqItems = [
  {
    q: "Can I use this for KDP?",
    a: "Yes. We provide KDP-friendly trim sizes and export layouts.",
  },
  {
    q: "Do images expire?",
    a: "In the MVP, previews may expire. You can regenerate any page anytime.",
  },
  {
    q: "How do I regenerate a page?",
    a: "Open a project, pick a page, and hit Regenerate to re-run it.",
  },
  {
    q: "Do I have commercial rights?",
    a: "Your content is yours. Always review KDP and platform guidelines.",
  },
  {
    q: "Can I edit prompts?",
    a: "Yes, prompts are editable before and after generation.",
  },
  {
    q: "Is the PDF print-ready?",
    a: "Export includes margins and options for blank pages and numbering.",
  },
];

export default function MarketingPage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-primary/20 via-transparent to-transparent blur-3xl" />
          <div className="absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-gradient-to-br from-secondary/50 via-transparent to-transparent blur-3xl" />
        </div>

        <div className="container grid gap-10 py-16 md:py-24 md:grid-cols-[1.15fr_0.85fr] md:items-center">
          <div className="space-y-6">
            <Badge variant="secondary">KDP-ready workflow</Badge>
            <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
              Generate print-ready coloring books in minutes.
            </h1>
            <p className="text-lg text-muted-foreground">
              Pick KDP trim sizes, generate story mode prompts, bulk create clean line art, and export a
              print-ready PDF.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-2xl">
                <Link href="/app/new">Create a Book</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl">
                <Link href="/app/projects/1">View Demo</Link>
              </Button>
            </div>
          </div>

          <Card className="rounded-2xl border border-border bg-card/80 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Book preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-40 rounded-xl border border-dashed border-border bg-muted/40" />
              <div className="grid gap-3">
                <div className="h-3 w-3/4 rounded-full bg-muted" />
                <div className="h-3 w-1/2 rounded-full bg-muted" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container py-12 md:py-16">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Built for KDP creators, teachers, and parents</span>
          <Separator className="hidden h-6 md:block" orientation="vertical" />
          <Badge variant="outline">KDP size presets</Badge>
          <Badge variant="outline">Clean line art</Badge>
          <Badge variant="outline">Bulk generation</Badge>
        </div>
      </section>

      <section id="features" className="container py-16 md:py-24">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Features</p>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Everything you need to ship a book</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="rounded-2xl">
              <CardHeader className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted">
                  <feature.icon className="h-5 w-5 text-foreground" />
                </div>
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{feature.description}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="how" className="container py-16 md:py-24">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">How it works</p>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">From idea to printable PDF</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { step: "1", title: "Choose size & style", body: "Pick KDP trim size, complexity, and line thickness." },
            { step: "2", title: "Generate story prompts", body: "Draft prompts in a clean editor you control." },
            { step: "3", title: "Review & export PDF", body: "Approve pages, then export with numbering options." },
          ].map((item) => (
            <Card key={item.step} className="rounded-2xl">
              <CardHeader className="space-y-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-sm font-semibold">
                  {item.step}
                </div>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{item.body}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="pricing" className="container py-16 md:py-24">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Pricing</p>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Start simple, scale when ready</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { name: "Starter", price: "Free", desc: "Plan projects and export a few pages." },
            { name: "Creator", price: "$19/mo", desc: "Bulk generation and PDF export options.", popular: true },
            { name: "Pro", price: "$49/mo", desc: "Higher limits for studios and teams." },
          ].map((tier) => (
            <Card key={tier.name} className="rounded-2xl border border-border bg-card/90">
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

      <section id="faq" className="container py-16 md:py-24">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">FAQ</p>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Answers to common questions</h2>
        </div>
        <div className="mt-8">
          <Accordion type="single" collapsible className="space-y-3">
            {faqItems.map((item) => (
              <AccordionItem key={item.q} value={item.q} className="bg-card">
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}

