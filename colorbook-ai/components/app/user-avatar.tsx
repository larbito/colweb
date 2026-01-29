"use client";

import { cn } from "@/lib/utils";
import { getAvatarGradient } from "@/lib/mock-data";

interface UserAvatarProps {
  name: string;
  initials: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

export function UserAvatar({ name, initials, avatarUrl, size = "md", className }: UserAvatarProps) {
  const gradient = getAvatarGradient(initials);
  
  if (avatarUrl) {
    return (
      <div className={cn(
        "relative rounded-full overflow-hidden ring-2 ring-background shadow-md",
        sizeClasses[size],
        className
      )}>
        <img
          src={avatarUrl}
          alt={name}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center justify-center rounded-full font-semibold text-white shadow-md ring-2 ring-background",
      `bg-gradient-to-br ${gradient}`,
      sizeClasses[size],
      className
    )}>
      {initials}
    </div>
  );
}

