import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PricingPage() {
  return (
    <div className="container py-10">
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-semibold tracking-tight mb-4">Pricing</h1>
          <p className="text-lg text-[var(--color-muted-foreground)]">Simple, transparent pricing for creators.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Starter</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold mb-2">Free</p>
              <p className="text-sm text-[var(--color-muted-foreground)]">Perfect for trying out Colorbook AI.</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Pro</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold mb-2">Coming Soon</p>
              <p className="text-sm text-[var(--color-muted-foreground)]">Advanced features for power users.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

