import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Textarea Design System - ColorBook AI
 * 
 * Consistent textarea styling matching inputs:
 * - Border radius: 16px
 * - Border: white 10% opacity
 */

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-2xl border border-[hsl(0,0%,100%,0.1)] bg-transparent px-4 py-3 text-[15px] text-[hsl(0,0%,90%)]",
          "placeholder:text-[hsl(0,0%,45%)]",
          "focus-visible:outline-none focus-visible:border-[hsl(0,0%,100%,0.25)] focus-visible:ring-2 focus-visible:ring-[hsl(0,0%,100%,0.1)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-150 resize-y",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
