"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Bug, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface GenerationDebugInfo {
  // Models used
  textModel?: string;
  imageModel?: string;
  provider?: "openai" | "replicate";
  
  // Request details
  endpoint?: string;
  size?: string;
  quality?: string;
  style?: string;
  
  // Prompt info
  scenePrompt?: string;
  finalPromptLength?: number;
  finalPromptPreview?: string; // First 500 chars
  negativePrompt?: string;
  
  // Post-processing
  binarized?: boolean;
  blackRatio?: number;
  largestBlobPercent?: number;
  microBlobCount?: number;
  uniqueColors?: number;
  complexityUsed?: string;
  
  // Retries
  retryCount?: number;
  failureReason?: string;
  
  // Timestamps
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
}

interface GenerationDebugPanelProps {
  title?: string;
  debug: GenerationDebugInfo | null;
  className?: string;
}

export function GenerationDebugPanel({ title = "Generation Debug", debug, className }: GenerationDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!debug) return null;

  const copyDebugInfo = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(debug, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className={cn("border border-border/50 rounded-lg bg-muted/30", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4" />
          <span>{title}</span>
          {debug.provider && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
              {debug.provider}
            </span>
          )}
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3 text-xs">
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={copyDebugInfo}
            >
              {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              {copied ? "Copied" : "Copy JSON"}
            </Button>
          </div>

          {/* Models */}
          <div className="grid grid-cols-2 gap-2">
            <DebugField label="Image Model" value={debug.imageModel} />
            <DebugField label="Text Model" value={debug.textModel} />
            <DebugField label="Provider" value={debug.provider} />
            <DebugField label="Endpoint" value={debug.endpoint} />
          </div>

          {/* Image settings */}
          <div className="grid grid-cols-3 gap-2">
            <DebugField label="Size" value={debug.size} />
            <DebugField label="Quality" value={debug.quality} />
            <DebugField label="Style" value={debug.style} />
          </div>

          {/* Prompt info */}
          <div className="space-y-1">
            <DebugField label="Final Prompt Length" value={debug.finalPromptLength ? `${debug.finalPromptLength} chars` : undefined} />
            {debug.finalPromptPreview && (
              <div className="space-y-1">
                <span className="text-muted-foreground">Prompt Preview:</span>
                <pre className="bg-background/50 p-2 rounded text-[10px] overflow-auto max-h-32 whitespace-pre-wrap">
                  {debug.finalPromptPreview}...
                </pre>
              </div>
            )}
          </div>

          {/* Post-processing */}
          <div className="grid grid-cols-2 gap-2">
            <DebugField label="Binarized" value={debug.binarized ? "Yes" : "No"} />
            <DebugField label="Unique Colors" value={debug.uniqueColors?.toString()} />
            <DebugField label="Complexity" value={debug.complexityUsed} />
            <DebugField 
              label="Black Ratio" 
              value={debug.blackRatio !== undefined ? `${(debug.blackRatio * 100).toFixed(1)}%` : undefined}
              warn={debug.blackRatio !== undefined && debug.blackRatio > 0.25}
            />
            <DebugField 
              label="Largest Blob" 
              value={debug.largestBlobPercent !== undefined ? `${(debug.largestBlobPercent * 100).toFixed(2)}%` : undefined}
              warn={debug.largestBlobPercent !== undefined && debug.largestBlobPercent > 0.03}
            />
            <DebugField 
              label="Micro-blobs" 
              value={debug.microBlobCount?.toString()}
              warn={debug.microBlobCount !== undefined && debug.microBlobCount > 1000}
            />
          </div>

          {/* Retries */}
          <div className="grid grid-cols-2 gap-2">
            <DebugField label="Retries" value={debug.retryCount?.toString()} />
            <DebugField label="Duration" value={debug.durationMs ? `${debug.durationMs}ms` : undefined} />
          </div>

          {/* Failure reason */}
          {debug.failureReason && (
            <div className="bg-destructive/10 text-destructive p-2 rounded">
              <span className="font-medium">Failure: </span>
              {debug.failureReason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DebugField({ label, value, warn }: { label: string; value?: string; warn?: boolean }) {
  return (
    <div className="space-y-0.5">
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn(
        "block font-mono",
        warn && "text-yellow-500",
        !value && "text-muted-foreground/50"
      )}>
        {value || "—"}
      </span>
    </div>
  );
}

