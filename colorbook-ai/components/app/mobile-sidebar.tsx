"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "./user-menu";
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  PenTool,
  Sparkles,
  X,
  Menu,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
  { label: "Create", href: "/app/create", icon: PenTool },
  { label: "My Projects", href: "/app/projects", icon: FolderOpen },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const onClose = useCallback(() => setOpen(false), []);

  const isActive = (href: string) => {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  };

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

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  return (
    <>
      {/* Mobile Header Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-4 border-b border-border/50 bg-background/95 backdrop-blur-2xl px-4 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/app" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground text-background">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground tracking-tight">ColorBook AI</span>
        </Link>
      </header>

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
            "fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-sidebar border-r border-border/50 dark:border-transparent lg:hidden",
            "animate-in slide-in-from-left duration-200"
          )}
        >
          <div className="flex h-16 items-center justify-between border-b border-border/50 px-5">
            <Link href="/app" className="flex items-center gap-2.5" onClick={onClose}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-semibold text-foreground tracking-tight">ColorBook AI</span>
            </Link>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-6 px-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-[14px] px-4 py-3 text-[15px] font-medium transition-all duration-300",
                      active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn(
                      "h-[18px] w-[18px]",
                      active ? "text-foreground" : "text-muted-foreground"
                    )} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-border/50 p-5 space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
            <UserMenu />
          </div>
        </aside>
      )}
    </>
  );
}
