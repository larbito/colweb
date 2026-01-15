import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const FAQ = [
  {
    q: 'Do you store my images?',
    a: 'No. For the MVP we store only prompts + metadata + temporary output URLs returned by the generation provider.',
  },
  {
    q: 'What if a preview expires?',
    a: 'We’ll show “Preview expired → Regenerate” and let you re-run that page.',
  },
  {
    q: 'Can I export a PDF?',
    a: 'Yes—PDFs are generated on demand and streamed (not stored).',
  },
];

export default function FaqPage() {
  return (
    <div className="container py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">FAQ</h1>
        <div className="mt-10 grid gap-4">
          {FAQ.map((item) => (
            <Card key={item.q} className="rounded-2xl">
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


