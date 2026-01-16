import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function FinalCTA() {
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-12 md:p-16">
      {/* Gradient accent */}
      <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-gradient-to-br from-primary/30 to-transparent blur-3xl" />
      
      <div className="relative space-y-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          Ready to create
        </div>
        <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
          Ready to ship your first book?
        </h2>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Build a KDP-ready coloring book project in minutes, not hours.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Button asChild size="lg" className="rounded-2xl">
            <Link href="/app/new">
              <Sparkles className="mr-2 h-4 w-4" />
              Create a Book
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-2xl">
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

