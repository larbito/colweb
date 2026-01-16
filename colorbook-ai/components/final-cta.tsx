import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function FinalCTA() {
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background/50 to-background p-16 md:p-24">
      {/* Gradient accents */}
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-gradient-to-br from-primary/40 to-transparent blur-[100px]" />
      <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-tr from-blue-500/30 to-transparent blur-[100px]" />
      
      <div className="relative space-y-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-5 py-2 text-sm font-semibold text-primary shadow-sm backdrop-blur">
          <Sparkles className="h-4 w-4" />
          Ready to create
        </div>
        <h2 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl">
          <span className="gradient-text">Ready to ship</span>
          <br />
          your first book?
        </h2>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          Build a KDP-ready coloring book project in minutes, not hours.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
          <Button asChild size="lg" className="rounded-2xl shadow-lg shadow-primary/20">
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

