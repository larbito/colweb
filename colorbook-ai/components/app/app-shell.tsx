"use client";

import { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { MobileSidebar } from "./mobile-sidebar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
}

/**
 * AppShell - Main layout wrapper for all dashboard pages
 * Provides a fixed sidebar on desktop and a mobile drawer on smaller screens
 * Main content area is centered with a max-width container
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <AppSidebar />
      
      {/* Mobile Sidebar (self-contained with its own toggle) */}
      <MobileSidebar />
      
      {/* Main content area - offset by sidebar width on lg screens, and top padding for mobile header */}
      <div className="lg:pl-64 min-h-screen flex flex-col pt-14 lg:pt-0">
        {children}
      </div>
    </div>
  );
}

/**
 * PageContainer - Centered content container for dashboard pages
 * Use this inside AppShell to ensure consistent centering
 */
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
      "w-full mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8",
      maxWidthClasses[maxWidth],
      className
    )}>
      {children}
    </div>
  );
}

/**
 * DashboardHeader - Top bar for mobile navigation trigger and page context
 */
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6 lg:px-10">
      {/* Mobile menu button - only shown on mobile */}
      <button
        onClick={onMenuClick}
        className="lg:hidden inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Open menu"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Title section */}
      {(title || subtitle) && (
        <div className="flex-1 min-w-0">
          {title && (
            <h1 className="text-lg font-semibold truncate">{title}</h1>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      )}

      {/* Custom content / actions */}
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </header>
  );
}

