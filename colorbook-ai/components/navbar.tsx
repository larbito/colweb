"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-50 transition-all duration-300",
        scrolled && "border-b border-border/40 bg-background/80 backdrop-blur-xl"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-primary">
            <rect width="28" height="28" rx="8" fill="currentColor" fillOpacity="0.15"/>
            <path d="M8 10C8 8.89543 8.89543 8 10 8H18C19.1046 8 20 8.89543 20 10V18C20 19.1046 19.1046 20 18 20H10C8.89543 20 8 19.1046 8 18V10Z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 12H17M11 15H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>ColorBook AI</span>
        </Link>

        <div className="hidden items-center gap-8 text-sm md:flex">
          <Link href="#features" className="text-muted-foreground transition hover:text-foreground">Features</Link>
          <Link href="#pricing" className="text-muted-foreground transition hover:text-foreground">Pricing</Link>
          <Link href="#faq" className="text-muted-foreground transition hover:text-foreground">FAQ</Link>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button asChild size="sm" className="hidden rounded-full px-4 md:inline-flex">
            <Link href="/auth">Get Started</Link>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </nav>
    </header>
  );
}

