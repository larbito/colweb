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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      {/* Mobile sidebar toggle */}
      <MobileSidebar />

      {/* Page title (optional) */}
      {title && (
        <div className="hidden sm:flex flex-col">
          <h1 className="text-sm font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}

      {/* Search (optional) */}
      {showSearch && (
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search projects..."
              className={cn(
                "w-full h-9 rounded-lg border border-input bg-background pl-9 pr-4 text-sm",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"
              )}
            />
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Custom actions passed from page */}
        {actions}
        
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
          <Bell className="h-4 w-4" />
        </Button>

        {/* Create button */}
        <Button asChild size="sm" className="hidden sm:inline-flex h-9 gap-1.5 rounded-lg">
          <Link href="/app/new">
            <Plus className="h-4 w-4" />
            <span>Create</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
