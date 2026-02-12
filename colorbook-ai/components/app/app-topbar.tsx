"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MobileSidebar } from "./mobile-sidebar";
import { Plus, Search, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppTopbarProps {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  actions?: React.ReactNode;
}

export function AppTopbar({
  title,
  subtitle,
  showSearch = false,
  actions,
}: AppTopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-border/40 bg-background/95 backdrop-blur-2xl px-6 lg:px-8">
      <MobileSidebar />

      {title && (
        <div className="hidden sm:flex flex-col">
          <h1 className="text-[15px] font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}

      {showSearch && (
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search projects..."
              className={cn(
                "w-full h-10 rounded-[14px] border border-input bg-background pl-10 pr-4 text-sm",
                "placeholder:text-muted-foreground/60",
                "focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring",
                "transition-all duration-300"
              )}
            />
          </div>
        </div>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {actions}

        <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
          <Bell className="h-4 w-4" />
        </Button>

        <Button asChild size="sm" className="hidden sm:inline-flex gap-1.5">
          <Link href="/app/create">
            <Plus className="h-4 w-4" />
            <span>Create</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
