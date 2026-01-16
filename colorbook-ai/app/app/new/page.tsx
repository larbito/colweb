import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewBookPage() {
  return (
    <div className="container py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create New Book</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Set up your coloring book project.</p>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Book Wizard</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--color-muted-foreground)]">
            <p>Book creation wizard will be implemented here. API integration coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

