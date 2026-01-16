import Link from "next/link";
import { BookOpen } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
            <BookOpen className="h-4 w-4" />
          </span>
          <span>Colorbook AI</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-[var(--color-muted-foreground)] md:flex">
          <Link className="hover:text-foreground" href="/pricing">
            Pricing
          </Link>
          <Link className="hover:text-foreground" href="/faq">
            FAQ
          </Link>
          <Link className="hover:text-foreground" href="/app">
            Dashboard
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="secondary" className="rounded-2xl">
            <Link href="/app">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

