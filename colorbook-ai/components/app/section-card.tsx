"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
    default: "",
    bordered: "",
    ghost: "border-transparent bg-transparent shadow-none",
  };

  return (
    <Card className={cn(variantStyles[variant], "overflow-hidden", className)}>
      <CardHeader className="pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {Icon && (
              <div className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                iconBg
              )}>
                <Icon className={cn("h-6 w-6", iconColor)} />
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-xl tracking-tight">{title}</h3>
                {badge && (
                  <Badge variant={badgeVariant} className="text-[10px] px-2 py-0.5">{badge}</Badge>
                )}
              </div>
              {description && (
                <p className="text-[15px] text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          {headerActions && (
            <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn(
        noPadding && "p-0 pt-0",
        contentClassName
      )}>
        {children}
      </CardContent>
    </Card>
  );
}

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

interface InfoCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export function InfoCard({ label, value, icon: Icon, className }: InfoCardProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-[14px] border border-border/50 dark:border-transparent bg-muted/30 p-4",
      className
    )}>
      {Icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background">
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
