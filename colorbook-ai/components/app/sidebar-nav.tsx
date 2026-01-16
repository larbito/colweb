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
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
  { label: "New Book", href: "/app/new", icon: Plus },
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
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.badge ? "#" : item.href}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            isActive(item.href)
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            item.badge && "cursor-not-allowed opacity-60"
          )}
          onClick={item.badge ? (e) => e.preventDefault() : undefined}
        >
          <item.icon className="h-4 w-4" />
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <Badge variant="secondary" className="text-[10px]">
              {item.badge}
            </Badge>
          )}
        </Link>
      ))}
    </nav>
  );
}

