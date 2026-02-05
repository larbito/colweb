"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Wand2,
  X,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PageData {
  index: number;
  title?: string;
  prompt?: string;
  imageBase64?: string;
  status: "queued" | "pending" | "generating" | "done" | "failed" | "paused";
  enhanceStatus?: "none" | "enhancing" | "enhanced" | "failed";
  enhancedImageBase64?: string;
}

interface PageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: PageData[];
  initialPageIndex: number;
  onRegenerate?: (pageIndex: number) => Promise<void>;
  onEnhance?: (pageIndex: number) => Promise<void>;
  onDownload?: (pageIndex: number) => void;
}

export function PageViewerModal({
  isOpen,
  onClose,
  pages,
  initialPageIndex,
  onRegenerate,
  onEnhance,
  onDownload,
}: PageViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialPageIndex);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showEnhanced, setShowEnhanced] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialPageIndex);
      setZoom(1);
      setShowEnhanced(false);
    }
  }, [isOpen, initialPageIndex]);

  const currentPage = pages[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < pages.length - 1;

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrev) {
        setCurrentIndex(currentIndex - 1);
      } else if (e.key === "ArrowRight" && hasNext) {
        setCurrentIndex(currentIndex + 1);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, hasPrev, hasNext, onClose]);

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    setIsRegenerating(true);
    try {
      await onRegenerate(currentPage.index);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleEnhance = async () => {
    if (!onEnhance) return;
    setIsEnhancing(true);
    try {
      await onEnhance(currentPage.index);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleDownload = () => {
    if (!currentPage.imageBase64) return;

    const imageToDownload = showEnhanced && currentPage.enhancedImageBase64
      ? currentPage.enhancedImageBase64
      : currentPage.imageBase64;

    const link = document.createElement("a");
    link.href = `data:image/png;base64,${imageToDownload}`;
    link.download = `page-${String(currentPage.index).padStart(3, "0")}${showEnhanced ? "-enhanced" : ""}.png`;
    link.click();

    onDownload?.(currentPage.index);
  };

  const displayImage = showEnhanced && currentPage?.enhancedImageBase64
    ? currentPage.enhancedImageBase64
    : currentPage?.imageBase64;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 bg-zinc-950 border-zinc-800">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b border-zinc-800 flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <DialogTitle className="text-lg font-medium text-zinc-100">
              Page {currentPage?.index + 1} of {pages.length}
            </DialogTitle>
            {currentPage?.title && (
              <span className="text-sm text-zinc-400 truncate max-w-xs">
                {currentPage.title}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation - Left */}
          <button
            onClick={() => hasPrev && setCurrentIndex(currentIndex - 1)}
            disabled={!hasPrev}
            className={cn(
              "w-16 flex items-center justify-center transition-colors",
              hasPrev
                ? "hover:bg-zinc-900/50 text-zinc-400 hover:text-zinc-100 cursor-pointer"
                : "text-zinc-700 cursor-not-allowed"
            )}
          >
            <ChevronLeft className="h-8 w-8" />
          </button>

          {/* Image area */}
          <div className="flex-1 flex flex-col">
            {/* Image container with WHITE background for coloring pages */}
            <div
              className="flex-1 flex items-center justify-center p-4 overflow-hidden"
              style={{ backgroundColor: "#ffffff" }}
            >
              {currentPage?.status === "done" && displayImage ? (
                <img
                  src={`data:image/png;base64,${displayImage}`}
                  alt={`Page ${currentPage.index + 1}`}
                  className="max-w-full max-h-full object-contain shadow-lg transition-transform"
                  style={{ transform: `scale(${zoom})` }}
                />
              ) : currentPage?.status === "generating" ? (
                <div className="flex flex-col items-center gap-3 text-zinc-600">
                  <Loader2 className="h-12 w-12 animate-spin" />
                  <span>Generating...</span>
                </div>
              ) : currentPage?.status === "failed" ? (
                <div className="flex flex-col items-center gap-3 text-red-500">
                  <span>Generation failed</span>
                  {onRegenerate && (
                    <Button onClick={handleRegenerate} disabled={isRegenerating}>
                      {isRegenerating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Retry
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-zinc-500">
                  <span>No image yet</span>
                </div>
              )}
            </div>

            {/* Zoom controls */}
            <div className="flex items-center justify-center gap-2 py-2 border-t border-zinc-800 bg-zinc-950/80">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                disabled={zoom <= 0.5}
                className="text-zinc-400"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-zinc-500 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                disabled={zoom >= 3}
                className="text-zinc-400"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(1)}
                className="text-zinc-400"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation - Right */}
          <button
            onClick={() => hasNext && setCurrentIndex(currentIndex + 1)}
            disabled={!hasNext}
            className={cn(
              "w-16 flex items-center justify-center transition-colors",
              hasNext
                ? "hover:bg-zinc-900/50 text-zinc-400 hover:text-zinc-100 cursor-pointer"
                : "text-zinc-700 cursor-not-allowed"
            )}
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </div>

        {/* Footer with actions */}
        <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between">
          {/* Page indicator dots */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-[40%]">
            {pages.slice(0, 20).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  i === currentIndex ? "bg-zinc-100" : "bg-zinc-700 hover:bg-zinc-600"
                )}
              />
            ))}
            {pages.length > 20 && (
              <span className="text-xs text-zinc-500 ml-2">
                +{pages.length - 20} more
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Enhanced toggle */}
            {currentPage?.enhancedImageBase64 && (
              <Button
                variant={showEnhanced ? "default" : "outline"}
                size="sm"
                onClick={() => setShowEnhanced(!showEnhanced)}
              >
                {showEnhanced ? "Original" : "Enhanced"}
              </Button>
            )}

            {/* Regenerate */}
            {onRegenerate && currentPage?.status === "done" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Regenerate
              </Button>
            )}

            {/* Enhance */}
            {onEnhance && currentPage?.status === "done" && !currentPage?.enhancedImageBase64 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnhance}
                disabled={isEnhancing || currentPage?.enhanceStatus === "enhancing"}
              >
                {isEnhancing || currentPage?.enhanceStatus === "enhancing" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Enhance
              </Button>
            )}

            {/* Download */}
            {currentPage?.imageBase64 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="absolute bottom-16 left-4 text-xs text-zinc-600">
          ← → to navigate, Esc to close
        </div>
      </DialogContent>
    </Dialog>
  );
}

