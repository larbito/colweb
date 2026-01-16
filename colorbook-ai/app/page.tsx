import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="relative">
      {/* subtle background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-muted to-background blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-muted to-background blur-3xl" />
      </div>

      <section className="container relative py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">Coloring Book Generator</p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            Create print-ready coloring books with a calm, reliable workflow.
          </h1>
          <p className="mt-6 text-pretty text-lg text-[var(--color-muted-foreground)]">
            Build projects, generate prompts and pages in bulk, review/regenerate, and export a clean PDF—without
            juggling tools.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-2xl">
              <Link href="/app">Open Dashboard</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="rounded-2xl">
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Projects that feel professional</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--color-muted-foreground)]">
              Clear status pills, progress, retries, and calm UI states for creators.
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Bulk generation, safely</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--color-muted-foreground)]">
              Queue page generation with predictable progress and per-page actions.
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Export without storage</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--color-muted-foreground)]">
              We only store prompts/metadata + temporary URLs; export is streamed on demand.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container relative border-t py-14">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">How it works</h2>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              A straightforward pipeline from idea → prompts → pages → PDF.
            </p>
          </div>
          <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
            {[
              { title: "Create a book", body: "Pick trim size, style, and page count." },
              { title: "Generate prompts", body: "Draft prompts you can edit in a table." },
              { title: "Generate pages", body: "Bulk queue generation with progress." },
              { title: "Export PDF", body: "Print-ready layout with options." },
            ].map((x) => (
              <Card key={x.title} className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">{x.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-[var(--color-muted-foreground)]">{x.body}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
