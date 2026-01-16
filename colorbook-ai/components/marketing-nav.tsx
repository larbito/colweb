"use client";

import Link from "next/link";
import { BookOpen, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled ? "border-b border-border bg-background/80 shadow-sm backdrop-blur" : "bg-transparent"
      )}
    >
      <div className="container flex h-16 items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight transition hover:opacity-80">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-gradient-to-br from-primary/20 to-primary/5">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <span>ColorBook AI</span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-8 text-sm text-muted-foreground lg:flex">
          <Link href="#features" className="transition hover:text-foreground">
            Features
          </Link>
          <Link href="#how" className="transition hover:text-foreground">
            How it works
          </Link>
          <Link href="/pricing" className="transition hover:text-foreground">
            Pricing
          </Link>
          <Link href="/faq" className="transition hover:text-foreground">
            FAQ
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-2xl lg:hidden">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="lg:hidden">
              <DropdownMenuItem asChild>
                <Link href="#features">Features</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="#how">How it works</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/pricing">Pricing</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/faq">FAQ</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
          <Button variant="outline" size="sm" className="hidden rounded-2xl md:flex" asChild>
            <Link href="/app">Sign in</Link>
          </Button>
          <Button size="sm" className="rounded-2xl" asChild>
            <Link href="/app/new">Create a Book</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

