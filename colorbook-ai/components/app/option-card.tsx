"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  title: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function OptionCard({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
  disabled = false,
  className = "",
  size = "md",
}: OptionCardProps) {
  const sizeClasses = {
    sm: "p-2",
    md: "p-3",
    lg: "p-4",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-start text-left rounded-lg border-2 transition-all",
        sizeClasses[size],
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border hover:border-primary/50 hover:bg-muted/50",
        disabled && "opacity-50 cursor-not-allowed hover:border-border hover:bg-transparent",
        className
      )}
    >
      {Icon && (
        <div className={cn(
          "mb-2",
          selected ? "text-primary" : "text-muted-foreground"
        )}>
          <Icon className={iconSizes[size]} />
        </div>
      )}
      <div className={cn(
        "font-medium",
        size === "sm" ? "text-xs" : "text-sm"
      )}>
        {title}
      </div>
      {description && (
        <div className={cn(
          "text-muted-foreground mt-0.5",
          size === "sm" ? "text-[10px]" : "text-xs"
        )}>
          {description}
        </div>
      )}
    </button>
  );
}

// Chip variant for smaller inline selections
interface OptionChipProps {
  selected: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  label: string;
  disabled?: boolean;
  className?: string;
}

export function OptionChip({
  selected,
  onClick,
  icon: Icon,
  label,
  disabled = false,
  className = "",
}: OptionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

