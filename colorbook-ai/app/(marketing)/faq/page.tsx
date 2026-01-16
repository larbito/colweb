import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/components/animated-section";
import { ChevronDown, ArrowRight } from "lucide-react";

const faqs = [
  { 
    q: "Can I use this for Amazon KDP?", 
    a: "Yes! We support all common KDP trim sizes (8.5×11, 8×10, A4, etc.) with proper bleed and margin settings. The PDF export is designed for print-on-demand." 
  },
  { 
    q: "Do generated images expire?", 
    a: "Preview image links may expire after some time. However, you can always regenerate any page from your saved prompts at no additional cost." 
  },
  { 
    q: "Who owns the generated content?", 
    a: "You own all rights to your prompts and the generated outputs. We recommend reviewing Amazon KDP's content policies before publishing." 
  },
  { 
    q: "Can I edit prompts after generating?", 
    a: "Absolutely. All prompts remain editable. You can refine them and regenerate individual pages at any time." 
  },
  { 
    q: "What AI model do you use?", 
    a: "We use state-of-the-art models optimized for clean line art. The models are fine-tuned to produce consistent, print-safe results." 
  },
  { 
    q: "Is there a page limit?", 
    a: "Limits depend on your plan: Starter allows 10 pages per project, Creator allows 100, and Pro allows 500." 
  },
  { 
    q: "Can I get a refund?", 
    a: "We offer a 14-day money-back guarantee. Contact support and we'll process your refund." 
  },
  { 
    q: "Do you offer team plans?", 
    a: "Yes, the Pro plan includes team collaboration. Contact us for custom enterprise pricing." 
  },
];

export default function FAQPage() {
  return (
    <div className="relative">
      <div className="gradient-bg fixed inset-0 -z-10" />
      <div className="bg-grid fixed inset-0 -z-10" />

      <section className="mx-auto max-w-2xl px-6 pb-24 pt-32">
        <AnimatedSection className="mb-16 text-center">
          <p className="mb-2 text-sm font-medium text-muted-foreground">FAQ</p>
          <h1 className="mb-4 text-4xl font-medium tracking-tight sm:text-5xl">
            Frequently asked questions
          </h1>
          <p className="text-muted-foreground">
            Everything you need to know about the product.
          </p>
        </AnimatedSection>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <AnimatedSection key={i} delay={i * 0.05}>
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

        <AnimatedSection delay={0.4} className="mt-16 text-center">
          <p className="mb-4 text-muted-foreground">Still have questions?</p>
          <Button asChild className="rounded-full">
            <Link href="#">
              Contact support
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </AnimatedSection>
      </section>
    </div>
  );
}
