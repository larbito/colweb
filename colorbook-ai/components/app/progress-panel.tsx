"use client";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Clock, 
  Loader2, 
  Pause, 
  Play, 
  Square, 
  Sparkles, 
  AlertCircle,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Stage types
export type JobPhase = 
  | "idle" 
  | "preparing" 
  | "generating" 
  | "enhancing" 
  | "processing" 
  | "complete" 
  | "paused"
  | "error";

export type PageStage = 
  | "pending"
  | "queued" 
  | "generating" 
  | "generated" 
  | "enhancing" 
  | "enhanced" 
  | "processing" 
  | "done" 
  | "failed";

// Job progress interface
export interface JobProgress {
  totalItems: number;
  completedItems: number;
  currentItem?: number;
  phase: JobPhase;
  startedAt?: number;
  estimatedSecondsRemaining?: number;
  averageItemDuration?: number;
  failedCount?: number;
  message?: string;
}

// Phase configuration
const phaseConfig: Record<JobPhase, {
  label: string;
  icon: React.ElementType;
  color: string;
  animated?: boolean;
}> = {
  idle: { 
    label: "Ready", 
    icon: Clock, 
    color: "text-muted-foreground" 
  },
  preparing: { 
    label: "Preparing", 
    icon: Loader2, 
    color: "text-blue-500",
    animated: true 
  },
  generating: { 
    label: "Generating", 
    icon: Zap, 
    color: "text-primary",
    animated: true 
  },
  enhancing: { 
    label: "Enhancing", 
    icon: Sparkles, 
    color: "text-purple-500",
    animated: true 
  },
  processing: { 
    label: "Processing", 
    icon: Loader2, 
    color: "text-orange-500",
    animated: true 
  },
  complete: { 
    label: "Complete", 
    icon: CheckCircle2, 
    color: "text-emerald-500" 
  },
  paused: { 
    label: "Paused", 
    icon: Pause, 
    color: "text-yellow-500" 
  },
  error: { 
    label: "Error", 
    icon: XCircle, 
    color: "text-destructive" 
  },
};

// Format time remaining
export function formatTimeRemaining(seconds?: number): string {
  if (!seconds || seconds <= 0) return "calculating...";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

// Alias for backwards compat
export const formatEta = formatTimeRemaining;

// Status badge component
interface StatusBadgeProps {
  stage: PageStage | JobPhase;
  compact?: boolean;
}

export function StatusBadge({ stage, compact = false }: StatusBadgeProps) {
  const isActive = ["generating", "enhancing", "processing", "preparing"].includes(stage);
  const isDone = stage === "done" || stage === "complete" || stage === "enhanced" || stage === "generated";
  const isFailed = stage === "failed" || stage === "error";
  
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {isActive && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
        {isDone && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
        {isFailed && <XCircle className="h-3 w-3 text-destructive" />}
      </div>
    );
  }
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-xs capitalize",
        isDone && "border-emerald-200 bg-emerald-50 text-emerald-700",
        isFailed && "border-red-200 bg-red-50 text-red-700",
        isActive && "border-blue-200 bg-blue-50 text-blue-700"
      )}
    >
      {isActive && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
      {isDone && <CheckCircle2 className="h-3 w-3 mr-1" />}
      {stage}
    </Badge>
  );
}

// Main Progress Panel Props
interface ProgressPanelProps {
  progress: JobProgress;
  showControls?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  className?: string;
}

export function ProgressPanel({
  progress,
  showControls = false,
  onPause,
  onResume,
  onStop,
  className,
}: ProgressPanelProps) {
  const { 
    totalItems, 
    completedItems, 
    phase, 
    estimatedSecondsRemaining,
    failedCount,
    message,
  } = progress;

  const config = phaseConfig[phase];
  const Icon = config.icon;
  const percentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const isActive = phase !== "idle" && phase !== "complete" && phase !== "error";
  const isPaused = phase === "paused";

  return (
    <div className={cn(
      "rounded-xl border bg-card p-4 space-y-4",
      isActive && "border-primary/20 bg-primary/5",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            isActive ? "bg-primary/10" : "bg-muted"
          )}>
            <Icon className={cn(
              "h-5 w-5",
              config.color,
              config.animated && "animate-spin"
            )} />
          </div>
          <div>
            <h4 className="font-medium text-sm">{config.label}</h4>
            {message && (
              <p className="text-xs text-muted-foreground">{message}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Time remaining */}
          {isActive && estimatedSecondsRemaining !== undefined && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">ETA</p>
              <p className="text-sm font-medium">
                {formatTimeRemaining(estimatedSecondsRemaining)}
              </p>
            </div>
          )}
          
          {/* Count */}
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className="text-sm font-medium">
              {completedItems} / {totalItems}
              {failedCount && failedCount > 0 && (
                <span className="text-destructive ml-1">({failedCount} failed)</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <Progress value={percentage} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{Math.round(percentage)}% complete</span>
          {isActive && (
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              You can safely leave this page
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      {showControls && isActive && (
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          {isPaused ? (
            <Button variant="outline" size="sm" onClick={onResume}>
              <Play className="h-4 w-4 mr-1" />
              Resume
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onPause}>
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onStop} className="text-destructive hover:text-destructive">
            <Square className="h-4 w-4 mr-1" />
            Stop
          </Button>
        </div>
      )}
    </div>
  );
}

// Compact inline progress for headers
interface InlineProgressProps {
  completedItems: number;
  totalItems: number;
  phase: JobPhase;
  className?: string;
}

export function InlineProgress({ completedItems, totalItems, phase, className }: InlineProgressProps) {
  const config = phaseConfig[phase];
  const Icon = config.icon;
  const percentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Icon className={cn(
        "h-4 w-4",
        config.color,
        config.animated && "animate-spin"
      )} />
      <div className="w-24">
        <Progress value={percentage} className="h-1.5" />
      </div>
      <span className="text-xs text-muted-foreground">
        {completedItems}/{totalItems}
      </span>
    </div>
  );
}

// Create initial job progress helper
export function createInitialProgress(totalItems: number): JobProgress {
  return {
    totalItems,
    completedItems: 0,
    phase: "idle",
  };
}

// Update progress helper
export function updateProgress(
  current: JobProgress, 
  updates: Partial<JobProgress>
): JobProgress {
  return { ...current, ...updates };
}
