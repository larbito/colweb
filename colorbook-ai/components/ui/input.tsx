import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input Design System - ColorBook AI
 * 
 * Consistent input styling:
 * - Height: 48px (same as default button)
 * - Border radius: 16px (same as buttons/cards)
 * - Border: white 10% opacity
 */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-[hsl(0,0%,100%,0.1)] bg-transparent px-4 text-[15px] text-[hsl(0,0%,90%)]",
          "placeholder:text-[hsl(0,0%,45%)]",
          "focus-visible:outline-none focus-visible:border-[hsl(0,0%,100%,0.25)] focus-visible:ring-2 focus-visible:ring-[hsl(0,0%,100%,0.1)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-150",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
