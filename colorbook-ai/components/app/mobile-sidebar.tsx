"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "./user-menu";
import {
  LayoutDashboard,
  FolderOpen,
  Layers,
  Download,
  Settings,
  Copy,
  Quote,
  Boxes,
  Sparkles,
  PenTool,
  X,
  Menu,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: "New" | "Beta" | "Soon";
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/app", icon: LayoutDashboard },
    ],
  },
  {
    title: "Create",
    items: [
      { label: "Coloring Book", href: "/app/create", icon: PenTool },
      { label: "Quote Book", href: "/app/quote-book", icon: Quote },
      { label: "Bulk Create", href: "/app/bulk", icon: Boxes, badge: "New" },
      { label: "Style Clone", href: "/app/style-clone", icon: Copy, badge: "Beta" },
    ],
  },
  {
    title: "Library",
    items: [
      { label: "My Projects", href: "/app/projects", icon: FolderOpen },
      { label: "Templates", href: "/app/templates", icon: Layers, badge: "Soon" },
      { label: "Exports", href: "/app/exports", icon: Download, badge: "Soon" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Settings", href: "/app/settings", icon: Settings },
    ],
  },
];

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const onClose = useCallback(() => setOpen(false), []);

  const isActive = (href: string) => {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  };

  // Close on escape key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, handleEscape]);

  // Close when route changes
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  return (
    <>
      {/* Toggle Button - visible on mobile only */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar drawer */}
      {open && (
        <aside 
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-sidebar border-r border-sidebar-border lg:hidden",
            "animate-in slide-in-from-left duration-200"
          )}
        >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <Link href="/app" className="flex items-center gap-3" onClick={onClose}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary">
                <path
                  d="M4 6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V6Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path 
                  d="M8 9H16M8 13H14M8 17H12" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground">ColorBook AI</span>
              <span className="text-[10px] text-muted-foreground">Premium Dashboard</span>
            </div>
          </Link>
          
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="flex flex-col gap-1">
            {/* Quick Create Button */}
            <div className="px-3 pb-3">
              <Button asChild className="w-full justify-start gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20" size="default">
                <Link href="/app/new" onClick={onClose}>
                  <Sparkles className="h-4 w-4" />
                  Quick Create
                </Link>
              </Button>
            </div>

            {/* Nav Groups */}
            {navGroups.map((group) => (
              <div key={group.title} className="mb-2">
                <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.title}
                </div>
                <div className="px-2 space-y-0.5">
                  {group.items.map((item) => {
                    const isDisabled = item.badge === "Soon";
                    const active = isActive(item.href);
                    
                    return (
                      <Link
                        key={item.href}
                        href={isDisabled ? "#" : item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                          active 
                            ? "bg-primary/10 text-primary shadow-sm" 
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                          isDisabled && "cursor-not-allowed opacity-50"
                        )}
                        onClick={isDisabled ? (e) => e.preventDefault() : undefined}
                      >
                        <item.icon className={cn(
                          "h-5 w-5 transition-colors",
                          active ? "text-primary" : "text-muted-foreground"
                        )} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <Badge 
                            variant="secondary"
                            className={cn(
                              "text-[10px] px-2 py-0.5 font-medium",
                              item.badge === "New" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                              item.badge === "Beta" && "bg-purple-500/15 text-purple-600 dark:text-purple-400",
                              item.badge === "Soon" && "bg-muted text-muted-foreground"
                            )}
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4 space-y-4">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          
          {/* User Menu */}
          <UserMenu />
        </div>
        </aside>
      )}
    </>
  );
}
