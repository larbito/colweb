import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { GradientBackground } from "@/components/gradient-background";
import { HeroBento } from "@/components/hero-bento";
import { FeatureBento } from "@/components/feature-bento";
import { HowItWorks } from "@/components/how-it-works";
import { PricingSection } from "@/components/pricing-section";
import { FAQSection } from "@/components/faq-section";
import { FinalCTA } from "@/components/final-cta";
import { Printer, Grid3x3, Zap, Palette, Moon } from "lucide-react";

export default function MarketingPage() {
  return (
    <div className="relative">
      <GradientBackground />

      {/* HERO SECTION */}
      <section className="container py-20 md:py-32">
        <div className="grid gap-12 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="space-y-8">
            <Badge variant="secondary" className="gap-1.5">
              📘 KDP-ready workflow
            </Badge>
            <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
              Generate print-ready coloring books in minutes.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              Choose KDP trim sizes, craft story-mode prompts, bulk generate clean line art pages, and export a
              print-ready PDF—all in one calm workflow.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-2xl">
                <Link href="/app/new">
                  ✨ Create a Book
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-2xl">
                <Link href="/app/projects/demo">
                  ▶ View Demo
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-4">
              <Badge variant="outline" className="gap-1.5">
                🖨️ Print-safe line art
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                📐 KDP trim presets
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                ⚡ Bulk generation
              </Badge>
            </div>
          </div>

          {/* Bento preview */}
          <div className="relative hidden md:block">
            <HeroBento />
          </div>
        </div>
      </section>

      {/* BUILT FOR STRIP */}
      <section className="border-y border-border bg-card/30 py-12">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {[
              { icon: Grid3x3, label: "KDP Sizes" },
              { icon: Printer, label: "PDF Export" },
              { icon: Zap, label: "Bulk Generator" },
              { icon: Palette, label: "Prompt Builder" },
              { icon: Moon, label: "Dark Mode" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="container py-24 md:py-32">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Features</p>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
            Everything you need to ship a book
          </h2>
          <p className="max-w-2xl text-lg text-muted-foreground">
            From trim size presets to bulk regeneration—built for creators who want reliability.
          </p>
        </div>
        <div className="mt-12">
          <FeatureBento />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="container py-24 md:py-32">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">How it works</p>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
            From idea to printable PDF
          </h2>
        </div>
        <div className="mt-12">
          <HowItWorks />
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="container py-24 md:py-32">
        <div className="space-y-4 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Pricing</p>
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Start simple, scale when ready
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Choose a plan that fits your workflow. Upgrade anytime.
          </p>
        </div>
        <div className="mt-12">
          <PricingSection />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container py-24 md:py-32">
        <div className="mx-auto max-w-3xl space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">FAQ</p>
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Answers to common questions
          </h2>
        </div>
        <div className="mx-auto mt-12 max-w-3xl">
          <FAQSection />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="container pb-24 md:pb-32">
        <FinalCTA />
      </section>
    </div>
  );
}
