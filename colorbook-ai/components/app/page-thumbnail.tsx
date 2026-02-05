"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Eye,
  RefreshCw,
  Download,
  Wand2,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PageThumbnailProps {
  index: number;
  title?: string;
  imageBase64?: string;
  status: "queued" | "pending" | "generating" | "done" | "failed" | "paused";
  attempts?: number;
  warning?: string;
  enhanceStatus?: "none" | "enhancing" | "enhanced" | "failed";
  enhancedImageBase64?: string;
  onView?: () => void;
  onRegenerate?: () => void;
  onEnhance?: () => void;
  onDownload?: () => void;
  className?: string;
}

export function PageThumbnail({
  index,
  title,
  imageBase64,
  status,
  attempts,
  warning,
  enhanceStatus,
  enhancedImageBase64,
  onView,
  onRegenerate,
  onEnhance,
  onDownload,
  className,
}: PageThumbnailProps) {
  const [isHovered, setIsHovered] = useState(false);

  const showImage = (status === "done" || status === "paused") && imageBase64;
  const displayImage = enhanceStatus === "enhanced" && enhancedImageBase64
    ? enhancedImageBase64
    : imageBase64;

  return (
    <div
      className={cn(
        "group relative rounded-lg overflow-hidden border border-zinc-800 transition-all hover:border-zinc-600",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail area - ALWAYS WHITE BACKGROUND */}
      <div
        className="aspect-[8.5/11] relative overflow-hidden"
        style={{ backgroundColor: "#ffffff" }}
      >
        {showImage && displayImage ? (
          <img
            src={`data:image/png;base64,${displayImage}`}
            alt={title || `Page ${index + 1}`}
            className="w-full h-full object-contain"
          />
        ) : status === "generating" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            <span className="text-xs text-zinc-400 mt-2">
              Generating{attempts && attempts > 1 ? ` (${attempts})` : ""}...
            </span>
          </div>
        ) : status === "queued" || status === "pending" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/60">
            <div className="w-8 h-8 rounded-full border-2 border-zinc-600 border-t-transparent animate-spin" />
            <span className="text-xs text-zinc-500 mt-2">Queued</span>
          </div>
        ) : status === "failed" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <span className="text-xs text-red-400 mt-2">Failed</span>
            {onRegenerate && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-7 text-xs"
                onClick={onRegenerate}
              >
                Retry
              </Button>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/40">
            <span className="text-xs text-zinc-500">No image</span>
          </div>
        )}

        {/* Enhanced badge */}
        {enhanceStatus === "enhanced" && (
          <div className="absolute top-2 right-2 bg-green-500/90 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            Enhanced
          </div>
        )}

        {/* Warning badge */}
        {warning && (
          <div className="absolute top-2 left-2 bg-yellow-500/90 text-black text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            <span className="truncate max-w-[80px]">{warning}</span>
          </div>
        )}

        {/* Hover overlay with actions */}
        {showImage && isHovered && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {onView && (
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0"
                onClick={onView}
                title="View"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {onRegenerate && (
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0"
                onClick={onRegenerate}
                title="Regenerate"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            {onEnhance && !enhancedImageBase64 && (
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0"
                onClick={onEnhance}
                title="Enhance"
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            )}
            {onDownload && (
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0"
                onClick={onDownload}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2 py-1.5 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <span className="text-xs text-zinc-400 font-medium">
            Page {index + 1}
          </span>
          {title && (
            <p className="text-[10px] text-zinc-500 truncate" title={title}>
              {title}
            </p>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-1">
          {status === "done" && (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          )}
          {enhanceStatus === "enhancing" && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
          )}
        </div>

        {/* More actions dropdown (for mobile/touch) */}
        {showImage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              {onView && (
                <DropdownMenuItem onClick={onView}>
                  <Eye className="h-4 w-4 mr-2" /> View
                </DropdownMenuItem>
              )}
              {onRegenerate && (
                <DropdownMenuItem onClick={onRegenerate}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
                </DropdownMenuItem>
              )}
              {onEnhance && !enhancedImageBase64 && (
                <DropdownMenuItem onClick={onEnhance}>
                  <Wand2 className="h-4 w-4 mr-2" /> Enhance
                </DropdownMenuItem>
              )}
              {onDownload && (
                <DropdownMenuItem onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" /> Download
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

