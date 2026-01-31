"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Eye, 
  RefreshCw, 
  Sparkles, 
  Check, 
  X, 
  Loader2, 
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Status types
export type PreviewStatus = 
  | "pending" 
  | "queued" 
  | "generating" 
  | "enhancing" 
  | "processing" 
  | "done" 
  | "failed"
  | "approved";

// Status configuration
const statusConfig: Record<PreviewStatus, {
  label: string;
  icon: React.ElementType;
  className: string;
}> = {
  pending: { 
    label: "Pending", 
    icon: Clock, 
    className: "bg-muted text-muted-foreground" 
  },
  queued: { 
    label: "Queued", 
    icon: Clock, 
    className: "bg-muted text-muted-foreground" 
  },
  generating: { 
    label: "Generating", 
    icon: Loader2, 
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" 
  },
  enhancing: { 
    label: "Enhancing", 
    icon: Sparkles, 
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400" 
  },
  processing: { 
    label: "Processing", 
    icon: Loader2, 
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400" 
  },
  done: { 
    label: "Done", 
    icon: CheckCircle2, 
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
  },
  failed: { 
    label: "Failed", 
    icon: XCircle, 
    className: "bg-destructive/10 text-destructive" 
  },
  approved: { 
    label: "Approved", 
    icon: Check, 
    className: "bg-emerald-500 text-white" 
  },
};

// Status Badge
interface StatusBadgeProps {
  status: PreviewStatus;
  className?: string;
}

export function PreviewStatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const isAnimated = status === "generating" || status === "enhancing" || status === "processing";

  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "gap-1 text-[10px] px-1.5 py-0.5 font-medium",
        config.className,
        className
      )}
    >
      <Icon className={cn("h-3 w-3", isAnimated && "animate-spin")} />
      {config.label}
    </Badge>
  );
}

// Preview Card Props
interface PreviewCardProps {
  index?: number;
  label?: string;
  imageUrl?: string;
  status: PreviewStatus;
  isEnhanced?: boolean;
  isApproved?: boolean;
  error?: string;
  onView?: () => void;
  onRegenerate?: () => void;
  onEnhance?: () => void;
  onApprove?: () => void;
  className?: string;
}

export function PreviewCard({
  index,
  label,
  imageUrl,
  status,
  isEnhanced,
  isApproved,
  error,
  onView,
  onRegenerate,
  onEnhance,
  onApprove,
  className,
}: PreviewCardProps) {
  const hasImage = !!imageUrl;
  const isLoading = status === "generating" || status === "enhancing" || status === "processing";
  const showActions = hasImage && !isLoading;

  return (
    <div 
      className={cn(
        "group relative rounded-xl border border-border/50 bg-card overflow-hidden transition-all duration-200",
        "hover:border-border hover:shadow-md",
        className
      )}
    >
      {/* Image area */}
      <div className="aspect-[3/4] bg-muted/30 relative">
        {hasImage ? (
          <img
            src={imageUrl}
            alt={label || `Page ${index}`}
            className="w-full h-full object-contain cursor-pointer"
            onClick={onView}
          />
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            {status === "generating" && (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Generating...</span>
              </>
            )}
            {status === "enhancing" && (
              <>
                <Sparkles className="h-8 w-8 animate-pulse text-purple-500" />
                <span className="text-xs text-muted-foreground">Enhancing...</span>
              </>
            )}
            {status === "processing" && (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <span className="text-xs text-muted-foreground">Processing...</span>
              </>
            )}
          </div>
        ) : status === "failed" ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
            <XCircle className="h-8 w-8 text-destructive" />
            <span className="text-xs text-destructive text-center">
              {error || "Generation failed"}
            </span>
            {onRegenerate && (
              <Button size="sm" variant="outline" onClick={onRegenerate} className="mt-2">
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <ImageIcon className="h-10 w-10 opacity-30" />
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isEnhanced && (
            <Badge className="bg-purple-500/90 text-white text-[10px] px-1.5 py-0">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
              HD
            </Badge>
          )}
          {isApproved && (
            <Badge className="bg-emerald-500/90 text-white text-[10px] px-1.5 py-0">
              <Check className="h-2.5 w-2.5 mr-0.5" />
              Approved
            </Badge>
          )}
        </div>

        {/* Hover actions overlay */}
        {showActions && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            {onView && (
              <Button size="sm" variant="secondary" onClick={onView}>
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {onRegenerate && (
              <Button size="sm" variant="secondary" onClick={onRegenerate}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            {onEnhance && !isEnhanced && (
              <Button size="sm" variant="secondary" onClick={onEnhance}>
                <Sparkles className="h-4 w-4" />
              </Button>
            )}
            {onApprove && !isApproved && (
              <Button size="sm" variant="secondary" onClick={onApprove}>
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="p-2.5 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium truncate">
            {label || (index !== undefined ? `Page ${index}` : "Untitled")}
          </span>
          <PreviewStatusBadge status={isApproved ? "approved" : status} />
        </div>
      </div>
    </div>
  );
}

// Preview Grid Props
interface PreviewGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export function PreviewGrid({ children, columns = 4, className }: PreviewGridProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}

// Skeleton Preview Card for loading states
export function PreviewCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="aspect-[3/4] bg-muted/30">
        <Skeleton className="w-full h-full" />
      </div>
      <div className="p-2.5 border-t border-border/50">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Loading grid skeleton
export function PreviewGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <PreviewGrid>
      {Array.from({ length: count }).map((_, i) => (
        <PreviewCardSkeleton key={i} />
      ))}
    </PreviewGrid>
  );
}

