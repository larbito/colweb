import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create Book</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wizard UI comes in the next step. This page is scaffolded so deploys work while we build Phase 1/2 fully.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Wizard (placeholder)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Steps: trim size → theme/character → page count → style → prompts → bulk generate.
        </CardContent>
      </Card>
    </div>
  );
}


