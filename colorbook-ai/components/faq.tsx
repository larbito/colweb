"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Can I use this for Amazon KDP?",
    a: "Yes. We support all common KDP trim sizes with proper bleed and margin settings. Export is optimized for print-on-demand.",
  },
  {
    q: "Do generated images expire?",
    a: "Preview links may expire after some time. You can always regenerate any page from your saved prompts at no additional cost.",
  },
  {
    q: "Who owns the generated content?",
    a: "You own all rights to your prompts and generated outputs. Review KDP's content policies before publishing.",
  },
  {
    q: "Can I edit prompts after generating?",
    a: "Absolutely. All prompts remain fully editable. Refine them and regenerate individual pages anytime.",
  },
  {
    q: "What if a generation fails?",
    a: "Failed pages are clearly marked. Edit the prompt and retry without affecting other pages in your project.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-2xl px-6 py-24">
      <div className="mb-16 text-center">
        <p className="mb-2 text-sm font-medium text-muted-foreground">FAQ</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Common questions
        </h2>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <motion.details
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="group rounded-xl border border-border/50 bg-card/50 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between p-5 font-medium">
              {faq.q}
              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
              {faq.a}
            </div>
          </motion.details>
        ))}
      </div>
    </section>
  );
}

