import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input Design System - ColorBook AI
 * 
 * Consistent input styling using CSS variables:
 * - Height: 48px (same as default button)
 * - Border radius: 16px (same as buttons/cards)
 * - Border: uses --border token
 */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-input bg-transparent px-4 text-[15px] text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
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
