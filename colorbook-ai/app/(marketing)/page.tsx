import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/components/animated-section";
import { 
  Sparkles, ArrowRight, BookOpen, Palette, Layers, RefreshCw, 
  FileOutput, SlidersHorizontal, Ruler, PenTool, Check, ChevronDown
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Story Mode Prompts",
    description: "Generate cohesive page-by-page prompts that tell a unified story throughout your book.",
  },
  {
    icon: Ruler,
    title: "KDP Trim Presets",
    description: "8.5×11, 8×10, A4 and more — all with proper margins for print-on-demand.",
  },
  {
    icon: PenTool,
    title: "Line Thickness",
    description: "Choose thin, medium, or bold outlines to match your audience's coloring preferences.",
  },
  {
    icon: SlidersHorizontal,
    title: "Complexity Control",
    description: "Simple designs for kids to intricate patterns for adults — one slider.",
  },
  {
    icon: RefreshCw,
    title: "Regenerate Pages",
    description: "Not happy with a page? Regenerate it instantly while keeping your prompt.",
  },
  {
    icon: FileOutput,
    title: "PDF Export",
    description: "Export with page numbers, blank backs, and copyright page included.",
  },
];

const steps = [
  { number: "01", title: "Choose your format", description: "Select KDP size, line style, and complexity level." },
  { number: "02", title: "Generate prompts", description: "Create and edit story-mode prompts in a simple table." },
  { number: "03", title: "Export your book", description: "Review pages, regenerate if needed, export print-ready PDF." },
];

const pricingTiers = [
  {
    name: "Starter",
    price: "Free",
    description: "Try the workflow",
    features: ["3 projects", "10 pages each", "Basic export"],
  },
  {
    name: "Creator",
    price: "$19",
    period: "/mo",
    description: "For active creators",
    features: ["Unlimited projects", "100 pages each", "Priority support", "Bulk regeneration"],
    popular: true,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
    description: "Maximum output",
    features: ["Unlimited everything", "500 pages each", "API access", "Team features"],
  },
];

const faqs = [
  { q: "Can I use this for Amazon KDP?", a: "Yes! We support all common KDP trim sizes with proper bleed and margin settings." },
  { q: "Do generated images expire?", a: "Preview links may expire after some time. You can always regenerate from your saved prompts." },
  { q: "Who owns the generated content?", a: "You do. Your prompts and outputs belong to you. Review KDP's content policies before publishing." },
  { q: "Can I edit prompts after generating?", a: "Absolutely. All prompts are editable before and after generation." },
];

export default function MarketingPage() {
  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[40%] left-1/2 h-[1000px] w-[1000px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-[60%] left-[20%] h-[600px] w-[600px] rounded-full bg-purple-500/10 blur-[100px]" />
        <div className="bg-grid absolute inset-0 opacity-30 dark:opacity-20" />
      </div>

      {/* HERO */}
      <section className="relative px-6 pb-20 pt-32">
        <div className="mx-auto max-w-4xl text-center">
          <AnimatedSection>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Now in public beta
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <h1 className="mb-6 text-5xl font-bold leading-[1.1] tracking-tight md:text-7xl">
              Create coloring books
              <br />
              <span className="text-gradient">in minutes, not weeks</span>
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Generate KDP-ready coloring books with AI. Story prompts, bulk generation, 
              and print-ready PDF export — all in one streamlined workflow.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.3}>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="h-12 rounded-xl px-8 text-base glow">
                <Link href="/app/new">
                  Start Creating <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 rounded-xl px-8 text-base">
                <Link href="#how">See how it works</Link>
              </Button>
            </div>
          </AnimatedSection>

          {/* Hero visual */}
          <AnimatedSection delay={0.4} className="mt-16">
            <div className="relative mx-auto max-w-3xl">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 via-purple-500/10 to-transparent blur-2xl" />
              <div className="glass relative overflow-hidden rounded-2xl border border-border/50 p-1">
                <div className="rounded-xl bg-card p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="ml-4 text-sm text-muted-foreground">ColorBook AI — Project Editor</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <BookOpen className="h-4 w-4 text-primary" />
                        Project Setup
                      </div>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="rounded-lg bg-background/50 px-3 py-2">Size: 8.5 × 11 in</div>
                        <div className="rounded-lg bg-background/50 px-3 py-2">Pages: 24</div>
                        <div className="rounded-lg bg-background/50 px-3 py-2">Style: Medium lines</div>
                      </div>
                    </div>
                    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Palette className="h-4 w-4 text-primary" />
                        Story Prompts
                      </div>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="rounded-lg bg-background/50 px-3 py-2">1. Panda waking up in bamboo</div>
                        <div className="rounded-lg bg-background/50 px-3 py-2">2. Panda eating breakfast</div>
                        <div className="rounded-lg bg-background/50 px-3 py-2">3. Panda playing with friends</div>
                      </div>
                    </div>
                    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Layers className="h-4 w-4 text-primary" />
                        Preview
                      </div>
                      <div className="aspect-[8.5/11] rounded-lg border-2 border-dashed border-border bg-background/50" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <AnimatedSection className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">Features</p>
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
              Everything you need to ship
            </h2>
          </AnimatedSection>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, idx) => (
              <AnimatedSection key={feature.title} delay={idx * 0.1}>
                <div className="glass group h-full rounded-2xl border border-border/50 p-6 transition-all hover:border-primary/30 hover:shadow-lg">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <AnimatedSection className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">How it works</p>
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
              Three steps to your book
            </h2>
          </AnimatedSection>

          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-8 top-0 hidden h-full w-px bg-gradient-to-b from-primary via-primary/50 to-transparent md:left-1/2 md:block" />
            
            <div className="space-y-12">
              {steps.map((step, idx) => (
                <AnimatedSection key={step.number} delay={idx * 0.15}>
                  <div className="relative flex items-start gap-6 md:gap-12">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-2xl font-bold text-primary md:mx-auto">
                      {step.number}
                    </div>
                    <div className="pt-3">
                      <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <AnimatedSection className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">Pricing</p>
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
              Start free, scale as you grow
            </h2>
          </AnimatedSection>

          <div className="grid gap-6 md:grid-cols-3">
            {pricingTiers.map((tier, idx) => (
              <AnimatedSection key={tier.name} delay={idx * 0.1}>
                <div className={`glass relative h-full rounded-2xl border p-6 transition-all ${
                  tier.popular 
                    ? "border-primary/50 shadow-lg shadow-primary/10" 
                    : "border-border/50 hover:border-border"
                }`}>
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold">{tier.name}</h3>
                    <p className="text-sm text-muted-foreground">{tier.description}</p>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    {tier.period && <span className="text-muted-foreground">{tier.period}</span>}
                  </div>
                  <ul className="mb-6 space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full rounded-xl" variant={tier.popular ? "default" : "outline"}>
                    Get Started
                  </Button>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <AnimatedSection className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">FAQ</p>
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
              Questions & answers
            </h2>
          </AnimatedSection>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <AnimatedSection key={idx} delay={idx * 0.1}>
                <details className="glass group rounded-2xl border border-border/50 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between p-6 font-medium">
                    {faq.q}
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-6 pb-6 text-sm text-muted-foreground">
                    {faq.a}
                  </div>
                </details>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <AnimatedSection>
          <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-12 text-center md:p-16">
            <div className="absolute inset-0 bg-grid opacity-20" />
            <h2 className="relative mb-4 text-4xl font-bold tracking-tight md:text-5xl">
              Ready to create your book?
            </h2>
            <p className="relative mb-8 text-lg text-muted-foreground">
              Join creators shipping KDP coloring books with AI-powered workflows.
            </p>
            <div className="relative flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="h-12 rounded-xl px-8 text-base glow">
                <Link href="/app/new">
                  Start Creating <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 rounded-xl px-8 text-base">
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </AnimatedSection>
      </section>
    </div>
  );
}
