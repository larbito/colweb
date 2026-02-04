"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, HelpCircle } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PageHeader - Consistent pattern across all dashboard pages
 * 
 * Layout: Title + subtitle on left, primary CTA on right
 * Typography: 30px page title (text-page-title)
 */

interface PageHeaderProps {
  /** Page title - 30px semibold */
  title: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Optional icon */
  icon?: LucideIcon;
  /** Badge text */
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  /** Back link */
  backHref?: string;
  /** Help tooltip text */
  helpText?: string;
  /** Right-aligned actions (typically primary CTA) */
  actions?: React.ReactNode;
  className?: string;
  /** Size variant */
  size?: "default" | "lg";
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  badge,
  badgeVariant = "secondary",
  backHref,
  helpText,
  actions,
  className = "",
  size = "default",
}: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col gap-1 border-b border-border pb-6 mb-6",
      className
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          {/* Back button */}
          {backHref && (
            <Button variant="ghost" size="icon-sm" asChild className="shrink-0 -ml-2 mt-1">
              <Link href={backHref}>
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>
          )}
          
          {/* Icon */}
          {Icon && (
            <div className={cn(
              "flex shrink-0 items-center justify-center rounded-xl bg-muted text-foreground",
              size === "lg" ? "h-14 w-14" : "h-12 w-12"
            )}>
              <Icon className={size === "lg" ? "h-7 w-7" : "h-6 w-6"} />
            </div>
          )}
          
          {/* Title block */}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className={cn(
                "font-semibold tracking-tight truncate",
                size === "lg" ? "text-[30px]" : "text-2xl"
              )}>
                {title}
              </h1>
              {badge && (
                <Badge variant={badgeVariant} className="text-xs shrink-0">
                  {badge}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className={cn(
                "text-muted-foreground",
                size === "lg" ? "text-base" : "text-[15px]"
              )}>
                {subtitle}
              </p>
            )}
            {helpText && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                <HelpCircle className="h-3 w-3" />
                <span>{helpText}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions - aligned right */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// Compact variant for inline use
interface PageTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTitle({ children, className }: PageTitleProps) {
  return (
    <h1 className={cn("text-2xl font-semibold tracking-tight", className)}>
      {children}
    </h1>
  );
}

export function PageSubtitle({ children, className }: PageTitleProps) {
  return (
    <p className={cn("text-[15px] text-muted-foreground", className)}>
      {children}
    </p>
  );
}
