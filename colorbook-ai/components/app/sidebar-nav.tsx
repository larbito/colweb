"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Plus,
  FolderOpen,
  Layers,
  Download,
  Settings,
  Wand2,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
  { label: "New Book", href: "/app/new", icon: Plus },
  { label: "Style Clone", href: "/app/batch", icon: Wand2, badge: "Popular" },
  { label: "My Projects", href: "/app/projects", icon: FolderOpen },
  { label: "Templates", href: "/app/templates", icon: Layers, badge: "Soon" },
  { label: "Exports", href: "/app/exports", icon: Download, badge: "Soon" },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  };

  return (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => {
        const isDisabled = item.badge === "Soon";
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={isDisabled ? "#" : item.href}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              isDisabled && "cursor-not-allowed opacity-50"
            )}
            onClick={isDisabled ? (e) => e.preventDefault() : undefined}
          >
            <item.icon className={cn(
              "h-4 w-4 transition-transform duration-200",
              active && "scale-110",
              !isDisabled && "group-hover:scale-105"
            )} />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <Badge 
                variant={item.badge === "Popular" ? "default" : "secondary"} 
                className={cn(
                  "text-[10px] font-medium",
                  item.badge === "Popular" && "bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0"
                )}
              >
                {item.badge}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
