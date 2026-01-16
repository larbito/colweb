import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    q: "Can I use this for KDP?",
    a: "Yes. We provide KDP-friendly trim sizes (8.5×11, 8×10, A4) and export layouts with safe margins.",
  },
  {
    q: "Do images expire?",
    a: "In the MVP, preview links may expire after a period. You can regenerate any page anytime from your saved prompts.",
  },
  {
    q: "How do I regenerate a page?",
    a: "Open your project, select the page, and click Regenerate. Your prompt is preserved and you get a fresh generation.",
  },
  {
    q: "Do I own the content?",
    a: "Your prompts and outputs belong to you. Always review KDP's content requirements before publishing.",
  },
  {
    q: "Can I edit prompts after generating?",
    a: "Yes. All prompts are editable in a clean table view before and after initial generation.",
  },
  {
    q: "Is the PDF print-ready?",
    a: "Export includes margin handling, optional page numbering, blank pages, and copyright pages for KDP compliance.",
  },
  {
    q: "What if a generation fails?",
    a: "Failed pages are clearly marked. You can edit the prompt and retry without affecting other pages.",
  },
  {
    q: "Can I change line thickness later?",
    a: "Currently you set style (thickness/complexity) per project. Per-page control is on the roadmap.",
  },
];

export function FAQSection() {
  return (
    <Accordion type="single" collapsible className="space-y-3">
      {faqs.map((item, idx) => (
        <AccordionItem key={idx} value={`item-${idx}`} className="rounded-2xl border-border bg-card/50 backdrop-blur">
          <AccordionTrigger className="px-6 py-4 text-left hover:no-underline">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 text-sm text-muted-foreground">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

