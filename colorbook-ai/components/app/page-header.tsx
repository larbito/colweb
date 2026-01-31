"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, HelpCircle } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  backHref?: string;
  helpText?: string;
  actions?: React.ReactNode;
  className?: string;
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
      "flex flex-col gap-1",
      size === "lg" ? "pb-8" : "pb-6",
      className
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Back button */}
          {backHref && (
            <Button variant="ghost" size="icon" asChild className="h-10 w-10 shrink-0 -ml-2">
              <Link href={backHref}>
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>
          )}
          
          {/* Icon */}
          {Icon && (
            <div className={cn(
              "flex shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
              size === "lg" ? "h-12 w-12" : "h-10 w-10"
            )}>
              <Icon className={size === "lg" ? "h-6 w-6" : "h-5 w-5"} />
            </div>
          )}
          
          {/* Title block */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className={cn(
                "font-semibold tracking-tight",
                size === "lg" ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"
              )}>
                {title}
              </h1>
              {badge && (
                <Badge variant={badgeVariant} className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className={cn(
                "text-muted-foreground",
                size === "lg" ? "text-base" : "text-sm"
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
        
        {/* Actions */}
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
    <h1 className={cn("text-xl font-semibold tracking-tight md:text-2xl", className)}>
      {children}
    </h1>
  );
}

export function PageSubtitle({ children, className }: PageTitleProps) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  );
}
