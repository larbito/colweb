import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const items = [
  {
    q: "Can I use this for KDP?",
    a: "Yes. We support KDP trim presets and export options designed for print.",
  },
  {
    q: "Do images expire?",
    a: "In the MVP, previews can expire. You can regenerate pages anytime.",
  },
  {
    q: "How do I regenerate a page?",
    a: "Open the project, pick a page, and click Regenerate.",
  },
  {
    q: "Do I own the content?",
    a: "Your prompts and outputs belong to you. Always review KDP requirements.",
  },
  {
    q: "Can I edit prompts before generating?",
    a: "Yes. Prompts are editable in a clean table view.",
  },
  {
    q: "Is the PDF print-ready?",
    a: "Export includes margin handling, page numbering, and optional blank pages.",
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="container py-20">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">FAQ</h1>
          <p className="text-lg text-muted-foreground">Everything you need to know about the workflow.</p>
        </div>
        <div className="mt-10">
          <Accordion type="single" collapsible className="space-y-3">
            {items.map((item) => (
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

