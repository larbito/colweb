"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FolderOpen, Plus, Image, FileX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  onSecondaryAction?: () => void;
  variant?: "default" | "compact" | "card";
  className?: string;
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  onSecondaryAction,
  variant = "default",
  className,
}: EmptyStateProps) {
  const variantStyles = {
    default: "px-6 py-20",
    compact: "px-4 py-10",
    card: "px-6 py-16 border border-dashed border-border/50 bg-card/30 rounded-[20px]",
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center animate-fade-in",
      variantStyles[variant],
      className
    )}>
      <div className={cn(
        "mb-6 flex items-center justify-center rounded-2xl bg-muted",
        variant === "compact" ? "h-14 w-14" : "h-20 w-20"
      )}>
        <Icon className={cn(
          "text-muted-foreground",
          variant === "compact" ? "h-6 w-6" : "h-8 w-8"
        )} />
      </div>
      <h3 className={cn(
        "mb-2 font-semibold",
        variant === "compact" ? "text-lg" : "text-xl"
      )}>
        {title}
      </h3>
      <p className={cn(
        "mb-8 max-w-sm text-muted-foreground",
        variant === "compact" ? "text-sm" : "text-[15px]"
      )}>
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex items-center gap-3">
          {actionLabel && (actionHref || onAction) && (
            actionHref ? (
              <Button asChild size={variant === "compact" ? "sm" : "default"}>
                <Link href={actionHref}>
                  <Plus className="mr-2 h-4 w-4" />
                  {actionLabel}
                </Link>
              </Button>
            ) : (
              <Button onClick={onAction} size={variant === "compact" ? "sm" : "default"}>
                <Plus className="mr-2 h-4 w-4" />
                {actionLabel}
              </Button>
            )
          )}
          {secondaryActionLabel && (secondaryActionHref || onSecondaryAction) && (
            secondaryActionHref ? (
              <Button asChild variant="outline" size={variant === "compact" ? "sm" : "default"}>
                <Link href={secondaryActionHref}>{secondaryActionLabel}</Link>
              </Button>
            ) : (
              <Button onClick={onSecondaryAction} variant="outline" size={variant === "compact" ? "sm" : "default"}>
                {secondaryActionLabel}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}

export function NoProjectsEmptyState({ actionHref = "/app/new" }: { actionHref?: string }) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No projects yet"
      description="Create your first coloring book to get started."
      actionLabel="Create Book"
      actionHref={actionHref}
    />
  );
}

export function NoImagesEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={Image}
      title="No images generated"
      description="Generate images to see them appear here."
      actionLabel="Generate Images"
      onAction={onAction}
      variant="compact"
    />
  );
}

export function GenerationFailedState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={FileX}
      title="Generation failed"
      description="Something went wrong. Please try again."
      actionLabel="Retry"
      onAction={onRetry}
      variant="compact"
    />
  );
}
