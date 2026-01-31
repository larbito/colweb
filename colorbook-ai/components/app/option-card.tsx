"use client";

import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// Full option card with icon and description
interface OptionCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconElement?: React.ReactNode;
  badge?: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "bordered" | "filled";
  className?: string;
}

export function OptionCard({
  title,
  description,
  icon: Icon,
  iconElement,
  badge,
  selected,
  onClick,
  disabled = false,
  size = "md",
  variant = "default",
  className,
}: OptionCardProps) {
  const sizeStyles = {
    sm: "p-3",
    md: "p-4",
    lg: "p-5",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const iconContainerSizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex flex-col rounded-xl border-2 text-left transition-all",
        sizeStyles[size],
        // Variant styles
        variant === "default" && [
          selected
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border bg-card hover:border-primary/30 hover:bg-muted/30",
        ],
        variant === "bordered" && [
          selected
            ? "border-primary bg-transparent"
            : "border-border bg-transparent hover:border-primary/50",
        ],
        variant === "filled" && [
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-muted/50 hover:bg-muted",
        ],
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {/* Selected indicator */}
      {selected && (
        <div className={cn(
          "absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full",
          variant === "filled" ? "bg-white/20" : "bg-primary text-primary-foreground"
        )}>
          <Check className="h-3 w-3" />
        </div>
      )}

      {/* Icon */}
      {(Icon || iconElement) && (
        <div className={cn(
          "mb-3 flex items-center justify-center rounded-lg",
          iconContainerSizes[size],
          selected 
            ? variant === "filled" 
              ? "bg-white/10" 
              : "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        )}>
          {Icon ? (
            <Icon className={iconSizes[size]} />
          ) : (
            iconElement
          )}
        </div>
      )}

      {/* Content */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-medium",
            size === "sm" && "text-sm",
            size === "md" && "text-sm",
            size === "lg" && "text-base"
          )}>
            {title}
          </span>
          {badge && (
            <Badge 
              variant="secondary" 
              className={cn(
                "text-[9px] px-1 py-0",
                selected && variant === "filled" && "bg-white/20 text-white"
              )}
            >
              {badge}
            </Badge>
          )}
        </div>
        {description && (
          <p className={cn(
            "text-muted-foreground line-clamp-2",
            size === "sm" && "text-xs",
            size === "md" && "text-xs",
            size === "lg" && "text-sm",
            selected && variant === "filled" && "text-primary-foreground/70"
          )}>
            {description}
          </p>
        )}
      </div>
    </button>
  );
}

// Compact chip-style option
interface OptionChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
  size?: "sm" | "md";
  className?: string;
}

export function OptionChip({
  label,
  selected,
  onClick,
  disabled = false,
  icon: Icon,
  size = "md",
  className,
}: OptionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium transition-all",
        size === "sm" && "px-2.5 py-1 text-xs",
        size === "md" && "px-3 py-1.5 text-sm",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {Icon && (
        <Icon className={cn(
          size === "sm" ? "h-3 w-3" : "h-4 w-4",
        )} />
      )}
      {label}
      {selected && <Check className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />}
    </button>
  );
}

// Grid layout helper
interface OptionGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function OptionGrid({ children, columns = 3, className }: OptionGridProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-3", gridCols[columns], className)}>
      {children}
    </div>
  );
}

// Chip group layout helper
interface ChipGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function ChipGroup({ children, className }: ChipGroupProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {children}
    </div>
  );
}
