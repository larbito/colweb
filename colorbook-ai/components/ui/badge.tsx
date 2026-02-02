import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge Design System - ColorBook AI
 * 
 * Consistent badge styling using CSS variables:
 * - Rounded full (pill shape)
 * - Compact padding
 * - Clear status indication
 */

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        // Default: Subtle background
        default: "border-transparent bg-primary/10 text-foreground",
        
        // Secondary: Even more subtle
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        
        // Outline: Border only
        outline: "border-border text-foreground",
        
        // Muted: Very subtle, for less important info
        muted: "border-transparent bg-muted text-muted-foreground",
        
        // Destructive: Red for errors
        destructive: "border-transparent bg-destructive/15 text-destructive",
        
        // Success: Teal/green for positive states
        success: "border-transparent bg-success/15 text-success",
        
        // Warning: Amber for caution
        warning: "border-transparent bg-warning/15 text-warning",
        
        // Info: Blue for informational
        info: "border-transparent bg-blue-500/15 text-blue-600 dark:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
