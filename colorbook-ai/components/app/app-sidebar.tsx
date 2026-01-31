"use client";

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

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <Link href="/app" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-primary">
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
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="flex flex-col gap-1">
            {/* Quick Create Button */}
            <div className="px-3 pb-4">
              <Button asChild className="w-full justify-start gap-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 h-11 text-sm" size="default">
                <Link href="/app/new">
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
                          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                          active 
                            ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-sm ring-1 ring-primary/10" 
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                          isDisabled && "cursor-not-allowed opacity-50"
                        )}
                        onClick={isDisabled ? (e) => e.preventDefault() : undefined}
                      >
                        <div className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                          active 
                            ? "bg-primary/10 text-primary" 
                            : "bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
                        )}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <Badge 
                            variant="secondary"
                            className={cn(
                              "text-[10px] px-2 py-0.5 font-medium rounded-md",
                              item.badge === "New" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20",
                              item.badge === "Beta" && "bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/20",
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
            <span className="text-xs font-medium text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          
          {/* User Menu */}
          <UserMenu />
        </div>
      </aside>
    </>
  );
}
