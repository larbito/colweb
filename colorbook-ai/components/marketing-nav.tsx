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
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        scrolled ? "border-b border-border/50 bg-background/80 backdrop-blur-xl" : ""
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <BookOpen className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">ColorBook AI</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <Link href="#features" className="transition hover:text-foreground">Features</Link>
          <Link href="#how" className="transition hover:text-foreground">How it works</Link>
          <Link href="/pricing" className="transition hover:text-foreground">Pricing</Link>
          <Link href="/faq" className="transition hover:text-foreground">FAQ</Link>
        </nav>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild><Link href="#features">Features</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="#how">How it works</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/pricing">Pricing</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/faq">FAQ</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
          <Button asChild className="hidden h-9 rounded-lg px-4 md:flex">
            <Link href="/app/new">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
