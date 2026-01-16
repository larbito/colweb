"use client";

import Link from "next/link";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

export function AppSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-border bg-card/50 backdrop-blur-sm lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-6">
        <Link href="/app" className="flex items-center gap-2.5 font-semibold">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-primary">
            <rect width="28" height="28" rx="8" fill="currentColor" fillOpacity="0.15" />
            <path
              d="M8 10C8 8.89543 8.89543 8 10 8H18C19.1046 8 20 8.89543 20 10V18C20 19.1046 19.1046 20 18 20H10C8.89543 20 8 19.1046 8 18V10Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M11 12H17M11 15H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>ColorBook AI</span>
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav />
      </div>

      {/* User */}
      <div className="border-t border-border p-3">
        <UserMenu />
      </div>
    </aside>
  );
}

