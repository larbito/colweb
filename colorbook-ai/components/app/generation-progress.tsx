"use client";

import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  FileImage,
  Zap,
  FileDown
} from "lucide-react";

// Types
export type PageStage = "queued" | "generating" | "generated" | "enhancing" | "enhanced" | "processing" | "done" | "failed";
export type JobPhase = "idle" | "generating" | "enhancing" | "processing" | "exporting" | "complete";

export interface PageProgress {
  page: number;
  stage: PageStage;
  startedAt?: number;
  completedAt?: number;
}

export interface JobProgress {
  totalPages: number;
  pages: PageProgress[];
  phase: JobPhase;
  startedAt?: number;
  // Rolling averages (in seconds)
  avgGenerateSec: number;
  avgEnhanceSec: number;
  avgProcessSec: number;
  // Timestamps for completed stages
  generateDurations: number[];
  enhanceDurations: number[];
  processDurations: number[];
}

// Helper to calculate rolling average
export function calculateRollingAvg(durations: number[], windowSize: number = 5): number {
  if (durations.length === 0) return 30; // Default estimate: 30 seconds
  const recent = durations.slice(-windowSize);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

// Helper to format time
function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

// Helper to get stage label
function getStageLabel(stage: PageStage): string {
  switch (stage) {
    case "queued": return "Queued";
    case "generating": return "Generating...";
    case "generated": return "Generated";
    case "enhancing": return "Enhancing...";
    case "enhanced": return "Enhanced";
    case "processing": return "Processing...";
    case "done": return "Ready";
    case "failed": return "Failed";
  }
}

// Helper to get stage color
function getStageColor(stage: PageStage): string {
  switch (stage) {
    case "queued": return "text-muted-foreground";
    case "generating": return "text-blue-500";
    case "generated": return "text-green-500";
    case "enhancing": return "text-purple-500";
    case "enhanced": return "text-purple-600";
    case "processing": return "text-orange-500";
    case "done": return "text-emerald-500";
    case "failed": return "text-red-500";
  }
}

interface GenerationProgressBarProps {
  progress: JobProgress;
  className?: string;
}

/**
 * Global progress bar showing overall job progress with ETA
 */
export function GenerationProgressBar({ progress, className = "" }: GenerationProgressBarProps) {
  const {
    totalPages,
    pages,
    phase,
    avgGenerateSec,
    avgEnhanceSec,
    avgProcessSec,
  } = progress;

  // Calculate completion percentages
  const stats = useMemo(() => {
    const generated = pages.filter(p => 
      ["generated", "enhancing", "enhanced", "processing", "done"].includes(p.stage)
    ).length;
    const enhanced = pages.filter(p => 
      ["enhanced", "processing", "done"].includes(p.stage)
    ).length;
    const processed = pages.filter(p => p.stage === "done").length;
    const failed = pages.filter(p => p.stage === "failed").length;
    
    return { generated, enhanced, processed, failed };
  }, [pages]);

  // Calculate overall progress (0-100)
  const overallProgress = useMemo(() => {
    if (totalPages === 0) return 0;
    
    // Weight: generate=50%, enhance=30%, process=20%
    const generateProgress = (stats.generated / totalPages) * 50;
    const enhanceProgress = (stats.enhanced / totalPages) * 30;
    const processProgress = (stats.processed / totalPages) * 20;
    
    return Math.round(generateProgress + enhanceProgress + processProgress);
  }, [totalPages, stats]);

  // Calculate ETA
  const eta = useMemo(() => {
    if (phase === "idle" || phase === "complete") return null;
    
    const remainingGenerate = totalPages - stats.generated;
    const remainingEnhance = totalPages - stats.enhanced;
    const remainingProcess = totalPages - stats.processed;
    
    // Calculate remaining time for each phase
    let remainingSec = 0;
    
    if (phase === "generating") {
      remainingSec = (remainingGenerate * avgGenerateSec) + 
                     (remainingEnhance * avgEnhanceSec) + 
                     (remainingProcess * avgProcessSec);
    } else if (phase === "enhancing") {
      remainingSec = (remainingEnhance * avgEnhanceSec) + 
                     (remainingProcess * avgProcessSec);
    } else if (phase === "processing") {
      remainingSec = remainingProcess * avgProcessSec;
    } else if (phase === "exporting") {
      remainingSec = 10; // Rough estimate for PDF export
    }
    
    return remainingSec > 0 ? formatTime(remainingSec) : null;
  }, [phase, totalPages, stats, avgGenerateSec, avgEnhanceSec, avgProcessSec]);

  // Get phase label
  const phaseLabel = useMemo(() => {
    switch (phase) {
      case "idle": return "Ready";
      case "generating": return `Generating pages (${stats.generated}/${totalPages})`;
      case "enhancing": return `Enhancing (${stats.enhanced}/${totalPages})`;
      case "processing": return `Processing (${stats.processed}/${totalPages})`;
      case "exporting": return "Building PDF...";
      case "complete": return "Complete!";
    }
  }, [phase, stats, totalPages]);

  // Get phase icon
  const PhaseIcon = useMemo(() => {
    switch (phase) {
      case "idle": return Clock;
      case "generating": return FileImage;
      case "enhancing": return Zap;
      case "processing": return Sparkles;
      case "exporting": return FileDown;
      case "complete": return CheckCircle2;
    }
  }, [phase]);

  if (phase === "idle" && totalPages === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Progress bar with label */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {phase !== "idle" && phase !== "complete" ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <PhaseIcon className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">{phaseLabel}</span>
        </div>
        
        <div className="flex items-center gap-3">
          {eta && (
            <span className="text-muted-foreground">
              ~{eta} remaining
            </span>
          )}
          <span className="font-mono text-sm">
            {overallProgress}%
          </span>
        </div>
      </div>
      
      {/* Progress bar */}
      <Progress value={overallProgress} className="h-2" />
      
      {/* Stats badges */}
      {totalPages > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
            <FileImage className="h-3 w-3 mr-1" />
            {stats.generated}/{totalPages} generated
          </Badge>
          {stats.enhanced > 0 && (
            <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
              <Zap className="h-3 w-3 mr-1" />
              {stats.enhanced} enhanced
            </Badge>
          )}
          {stats.processed > 0 && (
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {stats.processed} ready
            </Badge>
          )}
          {stats.failed > 0 && (
            <Badge variant="destructive">
              {stats.failed} failed
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

interface PageStatusBadgeProps {
  stage: PageStage;
  compact?: boolean;
}

/**
 * Per-page status badge showing current stage
 */
export function PageStatusBadge({ stage, compact = false }: PageStatusBadgeProps) {
  const isActive = stage === "generating" || stage === "enhancing" || stage === "processing";
  const colorClass = getStageColor(stage);
  
  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        {isActive ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : stage === "done" ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : stage === "failed" ? (
          <span className="h-3 w-3 text-red-500">✕</span>
        ) : (
          <Clock className="h-3 w-3" />
        )}
      </div>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={`text-xs ${
        stage === "done" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
        stage === "failed" ? "border-red-200 bg-red-50 text-red-700" :
        isActive ? "border-blue-200 bg-blue-50 text-blue-700" :
        "border-gray-200 bg-gray-50 text-gray-600"
      }`}
    >
      {isActive && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
      {stage === "done" && <CheckCircle2 className="h-3 w-3 mr-1" />}
      {getStageLabel(stage)}
    </Badge>
  );
}

// Helper to create initial job progress
export function createInitialJobProgress(totalPages: number): JobProgress {
  return {
    totalPages,
    pages: Array.from({ length: totalPages }, (_, i) => ({
      page: i + 1,
      stage: "queued" as PageStage,
    })),
    phase: "idle",
    avgGenerateSec: 30, // Default estimates
    avgEnhanceSec: 15,
    avgProcessSec: 5,
    generateDurations: [],
    enhanceDurations: [],
    processDurations: [],
  };
}

// Helper to update page stage
// Alias for backwards compatibility
export const StatusBadge = PageStatusBadge;

export function updatePageStage(
  progress: JobProgress, 
  pageNum: number, 
  stage: PageStage,
  duration?: number
): JobProgress {
  const now = Date.now();
  const updatedPages = progress.pages.map(p => {
    if (p.page === pageNum) {
      return {
        ...p,
        stage,
        ...(stage !== "queued" && !p.startedAt ? { startedAt: now } : {}),
        ...(["generated", "enhanced", "done", "failed"].includes(stage) ? { completedAt: now } : {}),
      };
    }
    return p;
  });

  // Update rolling averages if duration provided
  let newProgress = { ...progress, pages: updatedPages };
  
  if (duration) {
    if (stage === "generated") {
      newProgress.generateDurations = [...progress.generateDurations, duration];
      newProgress.avgGenerateSec = calculateRollingAvg(newProgress.generateDurations);
    } else if (stage === "enhanced") {
      newProgress.enhanceDurations = [...progress.enhanceDurations, duration];
      newProgress.avgEnhanceSec = calculateRollingAvg(newProgress.enhanceDurations);
    } else if (stage === "done") {
      newProgress.processDurations = [...progress.processDurations, duration];
      newProgress.avgProcessSec = calculateRollingAvg(newProgress.processDurations);
    }
  }

  // Update phase based on current state
  const stages = updatedPages.map(p => p.stage);
  if (stages.every(s => s === "done" || s === "failed")) {
    newProgress.phase = "complete";
  } else if (stages.some(s => s === "processing")) {
    newProgress.phase = "processing";
  } else if (stages.some(s => s === "enhancing")) {
    newProgress.phase = "enhancing";
  } else if (stages.some(s => s === "generating")) {
    newProgress.phase = "generating";
  }

  return newProgress;
}

