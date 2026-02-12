"use client";

import { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { MobileSidebar } from "./mobile-sidebar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <MobileSidebar />
      <div className="lg:pl-[280px] min-h-screen flex flex-col pt-14 lg:pt-0">
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

export function PageContainer({
  children,
  className,
  maxWidth = "xl"
}: PageContainerProps) {
  const maxWidthClasses = {
    sm: "max-w-2xl",
    md: "max-w-3xl",
    lg: "max-w-4xl",
    xl: "max-w-5xl",
    "2xl": "max-w-6xl",
    full: "max-w-[1400px]",
  };

  return (
    <div className={cn(
      "w-full mx-auto px-6 sm:px-8 lg:px-12 py-8 lg:py-12",
      maxWidthClasses[maxWidth],
      className
    )}>
      {children}
    </div>
  );
}

interface DashboardHeaderProps {
  onMenuClick?: () => void;
  title?: string;
  subtitle?: string;
  children?: ReactNode;
}

export function DashboardHeader({
  onMenuClick,
  title,
  subtitle,
  children
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-border/40 bg-background/95 backdrop-blur-2xl px-6 sm:px-8 lg:px-12">
      <button
        onClick={onMenuClick}
        className="lg:hidden inline-flex items-center justify-center rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Open menu"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {(title || subtitle) && (
        <div className="flex-1 min-w-0">
          {title && <h1 className="text-lg font-semibold truncate">{title}</h1>}
          {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
        </div>
      )}

      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </header>
  );
}
