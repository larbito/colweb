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

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[280px] flex-col border-r border-border/50 dark:border-transparent bg-sidebar lg:flex">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 px-7">
        <Link href="/app" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background transition-transform duration-300 group-hover:scale-105">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold text-foreground tracking-tight">ColorBook AI</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-[14px] px-4 py-3 text-[15px] font-medium transition-all duration-300",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  active ? "text-foreground" : "text-muted-foreground"
                )} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-border/50 dark:border-border p-5 space-y-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <UserMenu />
      </div>
    </aside>
  );
}
