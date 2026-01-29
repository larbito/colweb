"use client";

import Link from "next/link";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import { Sparkles } from "lucide-react";

export function AppSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-border/50 bg-card/80 backdrop-blur-xl lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border/50 px-6">
        <Link href="/app" className="flex items-center gap-3 font-semibold group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold">
            ColorBook<span className="text-primary">AI</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav />
      </div>

      {/* Upgrade Banner (for free users) */}
      <div className="mx-3 mb-3">
        <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-primary/20 p-4">
          <p className="text-sm font-semibold mb-1">Upgrade to Pro</p>
          <p className="text-xs text-muted-foreground mb-3">Unlock unlimited pages and premium features</p>
          <Link 
            href="/pricing" 
            className="inline-flex items-center justify-center text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            View Plans
          </Link>
        </div>
      </div>

      {/* User */}
      <div className="border-t border-border/50 p-3">
        <UserMenu />
      </div>
    </aside>
  );
}
