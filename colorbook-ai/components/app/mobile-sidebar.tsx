"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import { Menu, X } from "lucide-react";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 transform border-r border-border bg-card transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href="/app" className="flex items-center gap-2.5 font-semibold" onClick={() => setOpen(false)}>
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
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-4" onClick={() => setOpen(false)}>
          <SidebarNav />
        </div>

        {/* User */}
        <div className="border-t border-border p-3">
          <UserMenu />
        </div>
      </aside>
    </>
  );
}

