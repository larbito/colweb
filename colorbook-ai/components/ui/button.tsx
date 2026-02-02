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
 * - Primary: White bg, black text
 * - Secondary: Transparent, white border 10%
 * - Ghost: Transparent, no border, hover bg white 6%
 */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(0,0%,100%,0.3)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))] disabled:pointer-events-none disabled:opacity-50 rounded-2xl",
  {
    variants: {
      variant: {
        // Primary: White bg, black text (main CTA)
        default: "bg-white text-black hover:bg-[hsl(0,0%,90%)]",
        
        // Destructive: Red variant for dangerous actions
        destructive: "bg-[hsl(0,62%,50%)] text-white hover:bg-[hsl(0,62%,45%)]",
        
        // Outline/Secondary: Transparent with white border
        outline: "border border-[hsl(0,0%,100%,0.12)] bg-transparent text-[hsl(0,0%,90%)] hover:bg-[hsl(0,0%,100%,0.06)] hover:border-[hsl(0,0%,100%,0.18)]",
        
        // Secondary: Subtle background
        secondary: "bg-[hsl(0,0%,100%,0.06)] text-[hsl(0,0%,90%)] hover:bg-[hsl(0,0%,100%,0.1)]",
        
        // Ghost: No background, no border
        ghost: "text-[hsl(0,0%,65%)] hover:bg-[hsl(0,0%,100%,0.06)] hover:text-[hsl(0,0%,90%)]",
        
        // Link: Text only with underline on hover
        link: "text-[hsl(0,0%,90%)] underline-offset-4 hover:underline p-0 h-auto",
        
        // Success: Teal/green for positive actions
        success: "bg-[hsl(160,84%,39%)] text-white hover:bg-[hsl(160,84%,35%)]",
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
