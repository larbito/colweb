import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="container py-10">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My Books</h1>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Projects, pages, and export status.</p>
          </div>
          <Button asChild>
            <Link href="/app/new">Create New</Link>
          </Button>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Welcome to Colorbook AI</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--color-muted-foreground)]">
            <p className="mb-4">
              This is a preview of your dashboard. API integration will be added later.
            </p>
            <p>Create a new book project to get started.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

