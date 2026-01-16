import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/components/animated-section";
import { FloatingEmojis } from "@/components/floating-emojis";
import { FloatingCards } from "@/components/floating-cards";
import { 
  Sparkles, ArrowRight, Check, Zap, RefreshCw, 
  FileOutput, SlidersHorizontal, Ruler, PenTool, ChevronDown, Star, Quote
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Story-driven prompts",
    description: "Generate cohesive page-by-page prompts that tell a unified story.",
  },
  {
    icon: Ruler,
    title: "KDP trim presets",
    description: "8.5×11, 8×10, A4 — all with proper margins for print-on-demand.",
  },
  {
    icon: PenTool,
    title: "Line thickness control",
    description: "Thin, medium, or bold outlines to match coloring preferences.",
  },
  {
    icon: SlidersHorizontal,
    title: "Complexity slider",
    description: "Simple for kids to intricate for adults — one setting.",
  },
  {
    icon: RefreshCw,
    title: "Instant regeneration",
    description: "Not happy? Regenerate any page while keeping your prompt.",
  },
  {
    icon: FileOutput,
    title: "Print-ready export",
    description: "PDF with page numbers, blank backs, and copyright page.",
  },
];

const steps = [
  { 
    step: "01", 
    title: "Configure your book", 
    description: "Choose KDP trim size, line style, and complexity level for your coloring book." 
  },
  { 
    step: "02", 
    title: "Generate prompts", 
    description: "Create story-driven prompts in an editable table. Edit and refine as needed." 
  },
  { 
    step: "03", 
    title: "Review & export", 
    description: "Preview pages, regenerate any that need work, then export your print-ready PDF." 
  },
];

const testimonials = [
  {
    name: "Sarah M.",
    role: "KDP Publisher",
    content: "Finally, a tool that understands the KDP workflow. I went from idea to published book in a single afternoon.",
    avatar: "SM",
  },
  {
    name: "David L.",
    role: "Children's Book Creator",
    content: "The story-mode prompts are a game changer. My coloring books now have actual narratives that kids love.",
    avatar: "DL",
  },
  {
    name: "Emily R.",
    role: "Indie Creator",
    content: "I've tried other AI tools, but this is the only one that gives me consistent, print-ready line art.",
    avatar: "ER",
  },
];

const faqs = [
  { 
    q: "Can I use this for Amazon KDP?", 
    a: "Yes! We support all common KDP trim sizes with proper bleed and margin settings." 
  },
  { 
    q: "Do generated images expire?", 
    a: "Preview links may expire, but you can always regenerate from your saved prompts." 
  },
  { 
    q: "Who owns the generated content?", 
    a: "You do. Your prompts and outputs belong to you." 
  },
  { 
    q: "Can I edit prompts after generating?", 
    a: "Yes, all prompts are fully editable at any time." 
  },
];

const pricing = [
  {
    name: "Starter",
    price: "$0",
    description: "Try the workflow",
    features: ["3 projects", "10 pages each", "Basic export"],
    cta: "Get started free",
  },
  {
    name: "Creator",
    price: "$19",
    period: "/month",
    description: "For active creators",
    features: ["Unlimited projects", "100 pages each", "Priority support", "Bulk regeneration"],
    cta: "Start creating",
    popular: true,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    description: "Maximum output",
    features: ["Everything unlimited", "500 pages each", "API access", "Team features"],
    cta: "Go Pro",
  },
];

export default function Home() {
  return (
    <div className="relative">
      {/* Background */}
      <div className="gradient-bg fixed inset-0 -z-10" />
      <div className="bg-grid fixed inset-0 -z-10" />
      <FloatingEmojis />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-24 pt-32 text-center">
        <AnimatedSection>
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm">
            <Zap className="h-4 w-4" />
            <span>AI-powered coloring book generation</span>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <h1 className="mb-6 text-4xl font-medium tracking-tight sm:text-5xl md:text-6xl">
            Create KDP coloring books
            <br />
            <span className="text-muted-foreground">in minutes, not weeks</span>
          </h1>
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
            Generate story-driven prompts, bulk create clean line art pages, 
            and export print-ready PDFs. Built for Amazon KDP creators.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.3}>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="h-12 min-w-[180px] rounded-full text-base">
              <Link href="/app/new">
                Start creating
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 min-w-[180px] rounded-full text-base">
              <Link href="#how-it-works">
                How it works
              </Link>
            </Button>
          </div>
        </AnimatedSection>

        {/* Product Preview */}
        <AnimatedSection delay={0.4} className="mt-20">
          <div className="relative mx-auto overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <span className="ml-2 text-sm text-muted-foreground">ColorBook AI</span>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="mb-3 text-sm font-medium">Project Settings</div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between rounded bg-background/50 px-3 py-2">
                    <span>Size</span><span>8.5 × 11 in</span>
                  </div>
                  <div className="flex justify-between rounded bg-background/50 px-3 py-2">
                    <span>Pages</span><span>24</span>
                  </div>
                  <div className="flex justify-between rounded bg-background/50 px-3 py-2">
                    <span>Style</span><span>Medium lines</span>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="mb-3 text-sm font-medium">Story Prompts</div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="rounded bg-background/50 px-3 py-2">1. Panda waking up in bamboo forest</div>
                  <div className="rounded bg-background/50 px-3 py-2">2. Panda having breakfast with birds</div>
                  <div className="rounded bg-background/50 px-3 py-2">3. Panda playing in the river</div>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="mb-3 text-sm font-medium">Preview</div>
                <div className="aspect-[8.5/11] rounded border-2 border-dashed border-border bg-background/50" />
              </div>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Why Choose Us */}
      <section id="why-us" className="mx-auto max-w-5xl px-6 py-24">
        <AnimatedSection className="mb-16 text-center">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Why choose us</p>
          <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Built for serious creators
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            We understand what KDP publishers actually need — speed, consistency, and print-ready output.
          </p>
        </AnimatedSection>

        <FloatingCards />
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-5xl px-6 py-24">
        <AnimatedSection className="mb-16 text-center">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Features</p>
          <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Everything you need to ship
          </h2>
        </AnimatedSection>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <AnimatedSection key={feature.title} delay={i * 0.1}>
              <div className="group">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/50 transition-colors group-hover:bg-muted">
                  <feature.icon className="h-5 w-5 text-foreground/80" />
                </div>
                <h3 className="mb-2 font-medium">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-4xl px-6 py-24">
        <AnimatedSection className="mb-16 text-center">
          <p className="mb-2 text-sm font-medium text-muted-foreground">How it works</p>
          <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Three steps to your book
          </h2>
        </AnimatedSection>

        <div className="space-y-12">
          {steps.map((item, i) => (
            <AnimatedSection key={item.step} delay={i * 0.15}>
              <div className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50 text-sm font-medium">
                  {item.step}
                </div>
                <div className="pt-2">
                  <h3 className="mb-2 text-lg font-medium">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="mx-auto max-w-5xl px-6 py-24">
        <AnimatedSection className="mb-16 text-center">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Testimonials</p>
          <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Loved by creators
          </h2>
        </AnimatedSection>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, i) => (
            <AnimatedSection key={testimonial.name} delay={i * 0.1}>
              <div className="relative rounded-2xl border border-border bg-card/50 p-6">
                <Quote className="absolute right-4 top-4 h-8 w-8 text-muted-foreground/20" />
                <div className="mb-4 flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="mb-6 text-sm text-muted-foreground">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-6 py-24">
        <AnimatedSection className="mb-16 text-center">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Pricing</p>
          <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h2>
        </AnimatedSection>

        <div className="grid gap-6 lg:grid-cols-3">
          {pricing.map((tier, i) => (
            <AnimatedSection key={tier.name} delay={i * 0.1}>
              <div className={`relative rounded-2xl border p-6 ${
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

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-2xl px-6 py-24">
        <AnimatedSection className="mb-16 text-center">
          <p className="mb-2 text-sm font-medium text-muted-foreground">FAQ</p>
          <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Common questions
          </h2>
        </AnimatedSection>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <AnimatedSection key={i} delay={i * 0.1}>
              <details className="group rounded-xl border border-border bg-card/50 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between p-5 font-medium">
                  {faq.q}
                  <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-5 pb-5 text-sm text-muted-foreground">
                  {faq.a}
                </div>
              </details>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection delay={0.5} className="mt-8 text-center">
          <Link href="/faq" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            View all FAQs →
          </Link>
        </AnimatedSection>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <AnimatedSection>
          <div className="rounded-2xl border border-border bg-card/50 p-12">
            <h2 className="mb-4 text-3xl font-medium tracking-tight sm:text-4xl">
              Ready to create your book?
            </h2>
            <p className="mb-8 text-muted-foreground">
              Join creators shipping KDP coloring books with AI-powered workflows.
            </p>
            <Button asChild size="lg" className="h-12 min-w-[200px] rounded-full text-base">
              <Link href="/app/new">
                Start creating free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </AnimatedSection>
      </section>
    </div>
  );
}
