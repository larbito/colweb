import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FAQPage() {
  return (
    <div className="container py-10">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-semibold tracking-tight mb-4">FAQ</h1>
          <p className="text-lg text-muted-foreground">Frequently asked questions.</p>
        </div>

        <div className="space-y-4">
          {[
            { q: "How does it work?", a: "Create a project, generate prompts, bulk generate pages, and export PDF." },
            { q: "Do you store my images?", a: "No, we only store prompts and metadata. Image URLs may expire." },
            { q: "Can I edit prompts?", a: "Yes, all prompts are editable before and after generation." },
          ].map((item, i) => (
            <Card key={i} className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">{item.q}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{item.a}</CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

