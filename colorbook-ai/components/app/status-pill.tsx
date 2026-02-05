"use client";

import { cn } from "@/lib/utils";
import type { ProjectStatus, PageStatus } from "@/lib/mock-data";

// Extended status type to support both old and new formats
type ExtendedStatus = ProjectStatus | PageStatus | "in_progress" | "complete" | "partial";

interface StatusPillProps {
  status: ExtendedStatus;
  size?: "sm" | "md";
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
  generating: { label: "Generating", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  in_progress: { label: "In Progress", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  partial: { label: "Partial", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  ready: { label: "Ready", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  complete: { label: "Complete", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  exported: { label: "Exported", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function StatusPill({ status, size = "sm" }: StatusPillProps) {
  const config = statusConfig[status] || statusConfig.draft;

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

