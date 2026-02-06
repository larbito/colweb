"use client";

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
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
  { label: "Create", href: "/app/create", icon: PenTool },
  { label: "My Projects", href: "/app/projects", icon: FolderOpen },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

/**
 * AppSidebar - Clean, minimal sidebar navigation
 * Linear/Vercel style: simple icons, no badges, no gradients
 */
export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-border bg-sidebar lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <Link href="/app" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold text-foreground">ColorBook AI</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active 
                    ? "bg-muted text-foreground" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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

      {/* Footer */}
      <div className="border-t border-border p-4 space-y-3">
        {/* Theme Toggle Row */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        
        {/* User Menu */}
        <UserMenu />
      </div>
    </aside>
  );
}
