"use client";

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Pause, 
  Play, 
  X,
  Sparkles,
  Image as ImageIcon,
  FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ProgressPhase = 
  | "idle" 
  | "preparing" 
  | "generating" 
  | "enhancing" 
  | "processing" 
  | "exporting"
  | "complete" 
  | "paused"
  | "failed";

interface ProgressPanelProps {
  phase: ProgressPhase;
  current: number;
  total: number;
  label?: string;
  estimatedSeconds?: number;
  canPause?: boolean;
  canCancel?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  className?: string;
  compact?: boolean;
}

const PHASE_CONFIG: Record<ProgressPhase, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = {
  idle: { label: "Ready", icon: Clock, color: "text-muted-foreground", bgColor: "bg-muted" },
  preparing: { label: "Preparing...", icon: Loader2, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  generating: { label: "Generating...", icon: ImageIcon, color: "text-primary", bgColor: "bg-primary/10" },
  enhancing: { label: "Enhancing...", icon: Sparkles, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  processing: { label: "Processing...", icon: FileDown, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  exporting: { label: "Exporting...", icon: FileDown, color: "text-green-500", bgColor: "bg-green-500/10" },
  complete: { label: "Complete", icon: CheckCircle2, color: "text-green-500", bgColor: "bg-green-500/10" },
  paused: { label: "Paused", icon: Pause, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  failed: { label: "Failed", icon: XCircle, color: "text-destructive", bgColor: "bg-destructive/10" },
};

export function formatEta(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) return "calculating...";
  if (seconds < 60) return `~${Math.ceil(seconds)}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `~${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `~${hours}h ${mins}m`;
}

export function ProgressPanel({
  phase,
  current,
  total,
  label,
  estimatedSeconds,
  canPause = false,
  canCancel = false,
  onPause,
  onResume,
  onCancel,
  className = "",
  compact = false,
}: ProgressPanelProps) {
  const config = PHASE_CONFIG[phase];
  const Icon = config.icon;
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const isActive = !["idle", "complete", "failed", "paused"].includes(phase);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Icon className={cn("h-4 w-4", config.color, isActive && "animate-spin")} />
        <Progress value={percentage} className="flex-1 h-2" />
        <span className="text-xs text-muted-foreground tabular-nums">
          {current}/{total}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border p-4 space-y-3", config.bgColor, className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn(
            "h-5 w-5",
            config.color,
            isActive && Icon === Loader2 && "animate-spin"
          )} />
          <span className="font-medium text-sm">{label || config.label}</span>
          <Badge variant="secondary" className="text-xs tabular-nums">
            {current} / {total}
          </Badge>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-1">
          {canPause && isActive && onPause && (
            <Button variant="ghost" size="sm" onClick={onPause} className="h-7 px-2">
              <Pause className="h-3.5 w-3.5" />
            </Button>
          )}
          {phase === "paused" && onResume && (
            <Button variant="ghost" size="sm" onClick={onResume} className="h-7 px-2">
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          {canCancel && (isActive || phase === "paused") && onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 px-2 text-destructive hover:text-destructive">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={percentage} className="h-2" />

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{percentage}% complete</span>
        {estimatedSeconds !== undefined && estimatedSeconds > 0 && isActive && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatEta(estimatedSeconds)} remaining
          </span>
        )}
        {phase === "complete" && (
          <span className="text-green-600 font-medium">Done!</span>
        )}
      </div>
    </div>
  );
}

// Inline status badge for individual items
interface StatusBadgeProps {
  status: "pending" | "queued" | "generating" | "enhancing" | "processing" | "done" | "failed";
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const configs: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon?: React.ElementType }> = {
    pending: { label: "Pending", variant: "outline", icon: Clock },
    queued: { label: "Queued", variant: "secondary", icon: Clock },
    generating: { label: "Generating", variant: "default", icon: Loader2 },
    enhancing: { label: "Enhancing", variant: "secondary", icon: Sparkles },
    processing: { label: "Processing", variant: "secondary", icon: FileDown },
    done: { label: "Done", variant: "outline", icon: CheckCircle2 },
    failed: { label: "Failed", variant: "destructive", icon: XCircle },
  };

  const config = configs[status] || configs.pending;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={cn("text-[10px] gap-1", className)}>
      {Icon && (
        <Icon className={cn(
          "h-2.5 w-2.5",
          status === "generating" && "animate-spin"
        )} />
      )}
      {config.label}
    </Badge>
  );
}

