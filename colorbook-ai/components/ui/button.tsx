import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button Design System - ColorBook AI
 * 
 * Consistent button styling across the application:
 * - Border radius: 16px everywhere
 * - Heights: 44px (sm), 48px (md/default), 52px (lg)
 * - Uses CSS variables for light/dark mode support
 */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 rounded-2xl",
  {
    variants: {
      variant: {
        // Primary: Uses theme primary (black in light, white in dark)
        default: "bg-primary text-primary-foreground hover:opacity-90",
        
        // Destructive: Red variant for dangerous actions
        destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
        
        // Outline/Secondary: Transparent with border
        outline: "border border-border bg-transparent text-foreground hover:bg-muted",
        
        // Secondary: Subtle background
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        
        // Ghost: No background, no border
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        
        // Link: Text only with underline on hover
        link: "text-foreground underline-offset-4 hover:underline p-0 h-auto",
        
        // Success: Teal/green for positive actions
        success: "bg-success text-success-foreground hover:opacity-90",
      },
      size: {
        // Default: 48px height
        default: "h-12 px-6 text-[15px]",
        
        // Small: 44px height
        sm: "h-11 px-4 text-sm",
        
        // Large: 52px height
        lg: "h-[52px] px-8 text-base",
        
        // Extra small: 36px for compact UI
        xs: "h-9 px-3 text-xs",
        
        // Icon only
        icon: "h-12 w-12",
        "icon-sm": "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
