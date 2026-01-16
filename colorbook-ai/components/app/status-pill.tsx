"use client";

import { cn } from "@/lib/utils";
import type { ProjectStatus, PageStatus } from "@/lib/mock-data";

interface StatusPillProps {
  status: ProjectStatus | PageStatus;
  size?: "sm" | "md";
}

const statusConfig = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
  generating: { label: "Generating", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  ready: { label: "Ready", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  exported: { label: "Exported", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function StatusPill({ status, size = "sm" }: StatusPillProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

