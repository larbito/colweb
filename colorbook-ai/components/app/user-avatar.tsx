"use client";

import { cn } from "@/lib/utils";

interface UserAvatarProps {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-16 w-16 text-xl",
};

/**
 * Simple avatar component showing user initials.
 * Uses the existing brand primary color.
 */
export function UserAvatar({ initials, size = "md", className }: UserAvatarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary/10 font-semibold text-primary",
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
