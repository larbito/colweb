import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PricingPage() {
  return (
    <div className="container py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Pricing</h1>
        <p className="mt-3 text-muted-foreground">
          MVP pricing is a placeholder. We’ll introduce usage-based plans once generation is live.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Starter</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              For trying the workflow. Limited projects and generation credits.
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Pro</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              For creators shipping books weekly. Higher limits + priority queues.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


