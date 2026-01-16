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
        "fixed left-0 right-0 top-0 z-50 transition-all duration-200",
        scrolled && "border-b border-border/50 bg-background/80 backdrop-blur-md"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-medium">
          <BookOpen className="h-5 w-5" />
          <span>ColorBook AI</span>
        </Link>

        <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <Link href="#features" className="transition-colors hover:text-foreground">Features</Link>
          <Link href="#how-it-works" className="transition-colors hover:text-foreground">How it works</Link>
          <Link href="#pricing" className="transition-colors hover:text-foreground">Pricing</Link>
          <Link href="/faq" className="transition-colors hover:text-foreground">FAQ</Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild><Link href="#features">Features</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="#how-it-works">How it works</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="#pricing">Pricing</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/faq">FAQ</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild size="sm" className="hidden rounded-full md:inline-flex">
            <Link href="/auth">Get started</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
