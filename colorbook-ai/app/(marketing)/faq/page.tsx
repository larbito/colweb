import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/components/animated-section";
import { ChevronDown, ArrowRight } from "lucide-react";

const faqs = [
  { q: "Can I use generated images for Amazon KDP?", a: "Yes! We support all common KDP trim sizes (8.5×11, 8×10, A4, etc.) with proper bleed and margin settings. The PDF export is designed for print-on-demand." },
  { q: "Do generated images expire?", a: "In the current version, preview image links may expire after some time. However, you can always regenerate any page from your saved prompts at no additional cost." },
  { q: "Who owns the generated content?", a: "You own all rights to your prompts and the generated outputs. However, we recommend reviewing Amazon KDP's content policies before publishing." },
  { q: "Can I edit prompts after generating images?", a: "Absolutely. All prompts remain editable. You can refine them and regenerate individual pages at any time without affecting other pages in your project." },
  { q: "What image generation model do you use?", a: "We use state-of-the-art AI models optimized for clean line art coloring pages. The models are fine-tuned to produce consistent, print-safe results." },
  { q: "Is there a limit to how many pages I can generate?", a: "Limits depend on your plan. Starter allows 10 pages per project, Creator allows 100, and Pro allows 500. You can have multiple projects." },
  { q: "Can I get a refund?", a: "We offer a 14-day money-back guarantee. If you're not satisfied, contact support and we'll process your refund." },
  { q: "Do you offer team plans?", a: "Yes, the Pro plan includes team collaboration features. Contact us for custom enterprise pricing if you need more seats." },
];

export default function FAQPage() {
  return (
    <div className="relative min-h-screen px-6 pt-32">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[40%] left-1/2 h-[1000px] w-[1000px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="bg-grid absolute inset-0 opacity-30 dark:opacity-20" />
      </div>

      <div className="mx-auto max-w-2xl">
        <AnimatedSection className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">FAQ</p>
          <h1 className="mb-4 text-5xl font-bold tracking-tight md:text-6xl">
            Frequently asked questions
          </h1>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about the product.
          </p>
        </AnimatedSection>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <AnimatedSection key={idx} delay={idx * 0.05}>
              <details className="glass group rounded-2xl border border-border/50 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between p-6 font-medium">
                  {faq.q}
                  <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </div>
              </details>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection delay={0.4} className="mt-16 text-center">
          <p className="mb-4 text-muted-foreground">Still have questions?</p>
          <Button asChild className="rounded-xl">
            <Link href="#">
              Contact Support <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </AnimatedSection>
      </div>
    </div>
  );
}
