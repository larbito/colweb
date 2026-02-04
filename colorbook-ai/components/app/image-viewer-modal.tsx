"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Download, 
  RefreshCw, 
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export interface ViewerPage {
  index: number;
  imageBase64?: string;
  title?: string;
  status: "pending" | "generating" | "done" | "failed";
  error?: string;
}

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: ViewerPage[];
  initialPageIndex: number;
  onRegenerate?: (pageIndex: number) => Promise<void>;
  onEnhance?: (pageIndex: number) => Promise<void>;
  onDownload?: (pageIndex: number) => void;
  bookTitle?: string;
}

export function ImageViewerModal({
  isOpen,
  onClose,
  pages,
  initialPageIndex,
  onRegenerate,
  onEnhance,
  onDownload,
  bookTitle = "Coloring Book",
}: ImageViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialPageIndex);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Reset to initial index when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialPageIndex);
    }
  }, [isOpen, initialPageIndex]);
  
  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") {
        goToPrevious();
      } else if (e.key === "ArrowRight" || e.key === "d") {
        goToNext();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, pages.length]);
  
  const currentPage = pages[currentIndex];
  
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : pages.length - 1));
  }, [pages.length]);
  
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < pages.length - 1 ? prev + 1 : 0));
  }, [pages.length]);
  
  const handleRegenerate = async () => {
    if (!onRegenerate || !currentPage) return;
    setIsRegenerating(true);
    try {
      await onRegenerate(currentPage.index);
    } finally {
      setIsRegenerating(false);
    }
  };
  
  const handleEnhance = async () => {
    if (!onEnhance || !currentPage) return;
    setIsEnhancing(true);
    try {
      await onEnhance(currentPage.index);
    } finally {
      setIsEnhancing(false);
    }
  };
  
  const handleDownload = () => {
    if (!onDownload || !currentPage) return;
    onDownload(currentPage.index);
  };
  
  // Download directly if no callback provided
  const downloadImage = () => {
    if (!currentPage?.imageBase64) return;
    
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${currentPage.imageBase64}`;
    link.download = `${bookTitle}-page-${currentPage.index + 1}.png`;
    link.click();
  };
  
  if (!currentPage) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 bg-zinc-950 border-zinc-800 overflow-hidden flex flex-col">
        {/* Accessible title and description (visually hidden) */}
        <DialogTitle className="sr-only">
          {currentPage.title || `Page ${currentPage.index + 1}`}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Preview of coloring book page {currentPage.index + 1} of {pages.length}. Use arrow keys to navigate between pages.
        </DialogDescription>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">
              Page {currentIndex + 1} of {pages.length}
            </span>
            {currentPage.title && (
              <span className="text-sm text-zinc-200 font-medium truncate max-w-[300px]">
                {currentPage.title}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Status indicator */}
            {currentPage.status === "done" && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle className="h-3 w-3" />
                Ready
              </span>
            )}
            {currentPage.status === "failed" && (
              <span className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="h-3 w-3" />
                Failed
              </span>
            )}
            
            {/* Actions */}
            <div className="flex items-center gap-1 ml-4">
              {onRegenerate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={isRegenerating || currentPage.status === "generating"}
                  className="text-zinc-400 hover:text-white"
                >
                  {isRegenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-1.5 hidden sm:inline">Regenerate</span>
                </Button>
              )}
              
              {onEnhance && currentPage.status === "done" && currentPage.imageBase64 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEnhance}
                  disabled={isEnhancing}
                  className="text-zinc-400 hover:text-white"
                >
                  {isEnhancing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span className="ml-1.5 hidden sm:inline">Enhance</span>
                </Button>
              )}
              
              {currentPage.imageBase64 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDownload ? handleDownload : downloadImage}
                  className="text-zinc-400 hover:text-white"
                >
                  <Download className="h-4 w-4" />
                  <span className="ml-1.5 hidden sm:inline">Download</span>
                </Button>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-zinc-400 hover:text-white ml-2"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Image area */}
        <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
          {/* Navigation buttons */}
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevious}
            className="absolute left-2 z-10 h-12 w-12 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNext}
            className="absolute right-2 z-10 h-12 w-12 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
          
          {/* Image display */}
          <div className="w-full h-full flex items-center justify-center">
            {currentPage.status === "generating" && (
              <div className="flex flex-col items-center gap-4 text-zinc-400">
                <Loader2 className="h-12 w-12 animate-spin" />
                <span>Generating image...</span>
              </div>
            )}
            
            {currentPage.status === "failed" && (
              <div className="flex flex-col items-center gap-4 text-zinc-400 text-center">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <div>
                  <p className="text-red-400 font-medium">Generation Failed</p>
                  {currentPage.error && (
                    <p className="text-sm mt-2 max-w-md">{currentPage.error}</p>
                  )}
                </div>
                {onRegenerate && (
                  <Button
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="mt-4"
                  >
                    {isRegenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
            
            {currentPage.status === "pending" && (
              <div className="flex flex-col items-center gap-4 text-zinc-400">
                <div className="w-32 h-44 border-2 border-dashed border-zinc-700 rounded-lg flex items-center justify-center">
                  <span className="text-3xl text-zinc-600">{currentPage.index + 1}</span>
                </div>
                <span>Waiting to generate...</span>
              </div>
            )}
            
            {currentPage.imageBase64 && (
              <img
                src={`data:image/png;base64,${currentPage.imageBase64}`}
                alt={currentPage.title || `Page ${currentPage.index + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-white"
                style={{ maxHeight: "calc(90vh - 100px)" }}
              />
            )}
          </div>
        </div>
        
        {/* Thumbnail strip */}
        <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/50 overflow-x-auto">
          <div className="flex gap-2 justify-center">
            {pages.slice(
              Math.max(0, currentIndex - 4),
              Math.min(pages.length, currentIndex + 5)
            ).map((page) => (
              <button
                key={page.index}
                onClick={() => setCurrentIndex(pages.indexOf(page))}
                className={`
                  w-12 h-16 rounded overflow-hidden border-2 flex-shrink-0 transition-all
                  ${pages.indexOf(page) === currentIndex 
                    ? "border-purple-500 ring-2 ring-purple-500/30" 
                    : "border-zinc-700 hover:border-zinc-500"}
                `}
              >
                {page.imageBase64 ? (
                  <img
                    src={`data:image/png;base64,${page.imageBase64}`}
                    alt=""
                    className="w-full h-full object-cover bg-white"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                    {page.status === "generating" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : page.status === "failed" ? (
                      <AlertCircle className="h-3 w-3 text-red-400" />
                    ) : (
                      page.index + 1
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* Keyboard hint */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-xs text-zinc-500 pointer-events-none">
          Use ← → arrow keys to navigate
        </div>
      </DialogContent>
    </Dialog>
  );
}

