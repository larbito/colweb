import { FAQSection } from "@/components/faq-section";
import { GradientBackground } from "@/components/gradient-background";
import { FinalCTA } from "@/components/final-cta";

export default function FAQPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <GradientBackground />
      <section className="container py-20 md:py-32">
        <div className="mx-auto max-w-3xl space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">FAQ</p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Answers to common questions
          </h1>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about the workflow and export process.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-3xl">
          <FAQSection />
        </div>
      </section>
      
      <section className="container pb-24">
        <FinalCTA />
      </section>
    </div>
  );
}
