"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Section Card - Premium styling for dashboard sections
 * Uses CSS variables for light/dark mode support
 */

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
  variant?: "default" | "bordered" | "ghost";
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  iconColor = "text-foreground",
  iconBg = "bg-muted",
  badge,
  badgeVariant = "secondary",
  headerActions,
  children,
  className = "",
  contentClassName = "",
  noPadding = false,
  variant = "default",
}: SectionCardProps) {
  const variantStyles = {
    default: "border-border bg-card",
    bordered: "border-border bg-card",
    ghost: "border-transparent bg-transparent shadow-none",
  };

  return (
    <Card className={cn(variantStyles[variant], "overflow-hidden rounded-2xl", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                iconBg
              )}>
                <Icon className={cn("h-5 w-5", iconColor)} />
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base">{title}</h3>
                {badge && (
                  <Badge variant={badgeVariant} className="text-[10px] px-2 py-0.5">
                    {badge}
                  </Badge>
                )}
              </div>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          {headerActions && (
            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn(noPadding && "p-0 pt-0", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

// Simpler sub-section for grouping form fields
interface SubSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SubSection({ title, description, children, className = "" }: SubSectionProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h4 className="text-sm font-medium">{title}</h4>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

// Compact info card for displaying key-value pairs
interface InfoCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export function InfoCard({ label, value, icon: Icon, className }: InfoCardProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3",
      className
    )}>
      {Icon && (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
