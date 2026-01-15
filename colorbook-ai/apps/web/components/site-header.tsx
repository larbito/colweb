'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { BookOpen } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

const ClerkControls = dynamic(() => import('@/components/clerk-controls').then((m) => m.ClerkControls), {
  ssr: false,
});

export function SiteHeader() {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border bg-card shadow-sm">
            <BookOpen className="h-4 w-4" />
          </span>
          <span>Colorbook AI</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
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
          {clerkEnabled ? <ClerkControls /> : null}
        </div>
      </div>
    </header>
  );
}


