import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <div className="container py-10 space-y-6">
      {!clerkEnabled ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Preview mode (auth disabled)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Clerk keys are not configured yet, so authentication is disabled. Add{' '}
            <span className="font-mono">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</span> and{' '}
            <span className="font-mono">CLERK_SECRET_KEY</span> later to enable sign-in and protected routes.
          </CardContent>
        </Card>
      ) : null}
      {children}
    </div>
  );
}


