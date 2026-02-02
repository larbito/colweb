import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge Design System - ColorBook AI
 * 
 * Consistent badge styling:
 * - Rounded full (pill shape)
 * - Compact padding
 * - Clear status indication
 */

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        // Default: Subtle white background
        default: "border-transparent bg-[hsl(0,0%,100%,0.1)] text-[hsl(0,0%,90%)]",
        
        // Secondary: Even more subtle
        secondary: "border-transparent bg-[hsl(0,0%,100%,0.06)] text-[hsl(0,0%,70%)]",
        
        // Outline: Border only
        outline: "border-[hsl(0,0%,100%,0.12)] text-[hsl(0,0%,80%)]",
        
        // Muted: Very subtle, for less important info
        muted: "border-transparent bg-[hsl(0,0%,100%,0.04)] text-[hsl(0,0%,55%)]",
        
        // Destructive: Red for errors
        destructive: "border-transparent bg-[hsl(0,62%,50%,0.15)] text-[hsl(0,62%,60%)]",
        
        // Success: Teal/green for positive states
        success: "border-transparent bg-[hsl(160,84%,39%,0.15)] text-[hsl(160,84%,50%)]",
        
        // Warning: Amber for caution
        warning: "border-transparent bg-[hsl(38,92%,50%,0.15)] text-[hsl(38,92%,55%)]",
        
        // Info: Blue for informational
        info: "border-transparent bg-[hsl(210,100%,50%,0.15)] text-[hsl(210,100%,60%)]",
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
