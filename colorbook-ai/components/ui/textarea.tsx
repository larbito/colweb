import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Textarea Design System - ColorBook AI
 * 
 * Consistent textarea styling using CSS variables:
 * - Border radius: 16px
 * - Border: uses --border token
 */

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-2xl border border-input bg-transparent px-4 py-3 text-[15px] text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
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
