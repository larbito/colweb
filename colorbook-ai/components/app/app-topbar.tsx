"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileSidebar } from "./mobile-sidebar";
import { Plus } from "lucide-react";

interface AppTopbarProps {
  title: string;
  subtitle?: string;
}

export function AppTopbar({ title, subtitle }: AppTopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-sm lg:px-6">
      <MobileSidebar />

      <div className="flex-1">
        <h1 className="text-lg font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button asChild size="sm" className="hidden rounded-full sm:inline-flex">
          <Link href="/app/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Create
          </Link>
        </Button>
      </div>
    </header>
  );
}

