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
    <div className={cn("flex flex-col gap-1 pb-8 mb-8", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          {backHref && (
            <Button variant="ghost" size="icon-sm" asChild className="shrink-0 -ml-2 mt-1">
              <Link href={backHref}>
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>
          )}

          {Icon && (
            <div className={cn(
              "flex shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground",
              size === "lg" ? "h-16 w-16" : "h-14 w-14"
            )}>
              <Icon className={size === "lg" ? "h-8 w-8" : "h-7 w-7"} />
            </div>
          )}

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className={cn(
                "font-bold tracking-tight truncate",
                size === "lg" ? "text-4xl" : "text-3xl"
              )}>
                {title}
              </h1>
              {badge && (
                <Badge variant={badgeVariant} className="text-xs shrink-0">{badge}</Badge>
              )}
            </div>
            {subtitle && (
              <p className={cn(
                "text-muted-foreground",
                size === "lg" ? "text-lg" : "text-base"
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

        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}

export function PageTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h1 className={cn("text-3xl font-bold tracking-tight", className)}>{children}</h1>
  );
}

export function PageSubtitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-base text-muted-foreground", className)}>{children}</p>
  );
}
