import { PricingSection } from "@/components/pricing-section";
import { GradientBackground } from "@/components/gradient-background";

export default function PricingPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <GradientBackground />
      <section className="container py-20 md:py-32">
        <div className="mx-auto max-w-4xl space-y-4 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Pricing</p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Start simple, scale when ready
          </h1>
          <p className="text-lg text-muted-foreground">
            Choose a plan that fits your workflow. Upgrade anytime.
          </p>
        </div>
        <div className="mt-16">
          <PricingSection />
        </div>
      </section>
    </div>
  );
}
