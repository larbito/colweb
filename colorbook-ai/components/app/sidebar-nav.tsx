"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Plus,
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

export function SidebarNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  };

  return (
    <nav className="flex flex-col gap-1">
      {/* Quick Create Button */}
      <div className="px-3 pb-3">
        <Button asChild className="w-full justify-start gap-2 rounded-lg" size="sm">
          <Link href="/app/new">
            <Sparkles className="h-4 w-4" />
            Quick Create
          </Link>
        </Button>
      </div>

      {/* Nav Groups */}
      {navGroups.map((group) => (
        <div key={group.title} className="mb-2">
          <div className="section-heading">{group.title}</div>
          <div className="px-2 space-y-0.5">
            {group.items.map((item) => {
              const isDisabled = item.badge === "Soon";
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={isDisabled ? "#" : item.href}
                  className={cn(
                    "sidebar-item",
                    active && "active",
                    isDisabled && "cursor-not-allowed opacity-50"
                  )}
                  onClick={isDisabled ? (e) => e.preventDefault() : undefined}
                >
                  <item.icon className={cn(
                    "h-4 w-4 sidebar-icon",
                    active ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <Badge 
                      variant={
                        item.badge === "New" ? "default" : 
                        item.badge === "Beta" ? "outline" : 
                        "secondary"
                      } 
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-5",
                        item.badge === "New" && "bg-emerald-500 hover:bg-emerald-600 text-white",
                        item.badge === "Beta" && "border-purple-400 text-purple-500 bg-purple-50 dark:bg-purple-950/30",
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
  );
}
