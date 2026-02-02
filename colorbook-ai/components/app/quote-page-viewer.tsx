"use client";

import { useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  RefreshCw,
  Sparkles,
  Loader2,
  Quote,
  Code,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuotePageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  pages: {
    page: number;
    quote: string;
    imageBase64?: string;
    enhancedImageBase64?: string;
    finalLetterBase64?: string;
    status: "pending" | "generating" | "done" | "failed";
    enhanceStatus: "none" | "enhancing" | "enhanced" | "failed";
  }[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onRegenerate: (pageNumber: number) => void;
  onEnhance: (pageNumber: number) => void;
  onDownload: (pageNumber: number) => void;
  onViewPrompt: (pageNumber: number) => void;
  isRegenerating?: boolean;
  isEnhancing?: boolean;
}

export function QuotePageViewer({
  isOpen,
  onClose,
  pages,
  currentIndex,
  onNavigate,
  onRegenerate,
  onEnhance,
  onDownload,
  onViewPrompt,
  isRegenerating = false,
  isEnhancing = false,
}: QuotePageViewerProps) {
  const currentPage = pages[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < pages.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      onNavigate(currentIndex - 1);
    }
  }, [hasPrev, currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onNavigate(currentIndex + 1);
    }
  }, [hasNext, currentIndex, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  if (!currentPage) return null;

  const getDisplayImage = () => {
    return currentPage.finalLetterBase64 || 
           currentPage.enhancedImageBase64 || 
           currentPage.imageBase64;
  };

  const imageData = getDisplayImage();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 bg-background/95 backdrop-blur-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background/80">
          <div className="flex items-center gap-3">
            <Quote className="h-5 w-5 text-primary" />
            <span className="font-semibold">Page {currentPage.page}</span>
            <span className="text-muted-foreground text-sm">
              {currentIndex + 1} of {pages.length}
            </span>
            {currentPage.enhanceStatus === "enhanced" && (
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
                <Sparkles className="h-3 w-3 mr-1" />
                Enhanced
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          {/* Navigation Arrows */}
          <button
            onClick={handlePrev}
            disabled={!hasPrev}
            className={cn(
              "absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-background/90 border shadow-lg transition-all",
              hasPrev 
                ? "hover:bg-background hover:scale-105 cursor-pointer" 
                : "opacity-30 cursor-not-allowed"
            )}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={handleNext}
            disabled={!hasNext}
            className={cn(
              "absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-background/90 border shadow-lg transition-all",
              hasNext 
                ? "hover:bg-background hover:scale-105 cursor-pointer" 
                : "opacity-30 cursor-not-allowed"
            )}
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Image Display - WHITE PAPER BACKGROUND */}
          <div className="flex items-center justify-center p-8 w-full h-full">
            {imageData ? (
              <div 
                className="relative bg-white rounded-lg shadow-2xl overflow-hidden"
                style={{ 
                  maxHeight: "calc(90vh - 180px)",
                  maxWidth: "calc((90vh - 180px) * 0.7727)" // US Letter aspect ratio
                }}
              >
                {/* White paper container */}
                <div className="bg-white p-4">
                  <img
                    src={`data:image/png;base64,${imageData}`}
                    alt={`Page ${currentPage.page}`}
                    className="w-full h-full object-contain"
                    style={{ 
                      maxHeight: "calc(90vh - 220px)",
                      background: "white"
                    }}
                  />
                </div>
                {/* Paper shadow effect */}
                <div className="absolute inset-0 pointer-events-none border border-gray-200 rounded-lg" />
              </div>
            ) : currentPage.status === "generating" ? (
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <span>Generating...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <Quote className="h-16 w-16 opacity-30" />
                <span>Not generated yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Quote Preview */}
        {currentPage.quote && (
          <div className="px-6 py-2 border-t bg-muted/30">
            <p className="text-sm text-center text-muted-foreground italic line-clamp-2">
              &ldquo;{currentPage.quote}&rdquo;
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-background/80">
          {/* Page Navigation Dots */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-[200px]">
            {pages.slice(
              Math.max(0, currentIndex - 3), 
              Math.min(pages.length, currentIndex + 4)
            ).map((p, i) => {
              const actualIndex = Math.max(0, currentIndex - 3) + i;
              return (
                <button
                  key={p.page}
                  onClick={() => onNavigate(actualIndex)}
                  className={cn(
                    "h-2 w-2 rounded-full transition-all",
                    actualIndex === currentIndex
                      ? "bg-primary w-4"
                      : p.status === "done"
                        ? "bg-green-500/50 hover:bg-green-500"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewPrompt(currentPage.page)}
              className="rounded-xl"
            >
              <Code className="mr-2 h-4 w-4" />
              View Prompt
            </Button>
            
            {currentPage.status === "done" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEnhance(currentPage.page)}
                  disabled={isEnhancing || currentPage.enhanceStatus === "enhanced"}
                  className="rounded-xl"
                >
                  {isEnhancing && currentPage.enhanceStatus === "enhancing" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {currentPage.enhanceStatus === "enhanced" ? "Enhanced" : "Enhance"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRegenerate(currentPage.page)}
                  disabled={isRegenerating}
                  className="rounded-xl"
                >
                  {isRegenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Regenerate
                </Button>

                <Button
                  size="sm"
                  onClick={() => onDownload(currentPage.page)}
                  className="rounded-xl"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PNG
                </Button>
              </>
            )}

            {(currentPage.status === "pending" || currentPage.status === "failed") && (
              <Button
                size="sm"
                onClick={() => onRegenerate(currentPage.page)}
                disabled={isRegenerating}
                className="rounded-xl"
              >
                {isRegenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Generate
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

