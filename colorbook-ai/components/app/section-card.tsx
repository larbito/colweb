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
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  noPadding?: boolean;
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  iconColor = "text-primary",
  badge,
  badgeVariant = "secondary",
  headerActions,
  children,
  className = "",
  contentClassName = "",
  noPadding = false,
}: SectionCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/80",
                iconColor
              )}>
                <Icon className="h-4 w-4" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{title}</h3>
                {badge && (
                  <Badge variant={badgeVariant} className="text-[10px]">
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
      <CardContent className={cn(noPadding && "p-0", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

// Simpler variant for sub-sections
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
        <div>
          {title && <h4 className="text-sm font-medium">{title}</h4>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

