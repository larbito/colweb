"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { X, ZoomIn, ZoomOut, RotateCcw, Download, Maximize2 } from "lucide-react";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  pageNumber: number;
}

const ZOOM_LEVELS = [1, 1.5, 2, 2.5, 3];

export function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  title,
  pageNumber,
}: ImagePreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset zoom and position when modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        setZoom((z) => Math.min(z + 0.5, 3));
      } else if (e.key === "-") {
        setZoom((z) => Math.max(z - 0.5, 1));
      } else if (e.key === "0") {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [zoom, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleZoomIn = () => {
    setZoom((z) => Math.min(z + 0.5, 3));
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.5, 1);
    setZoom(newZoom);
    if (newZoom === 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `coloring-page-${pageNumber}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 gap-0 bg-background/95 backdrop-blur-sm">
        <DialogHeader className="p-4 border-b border-border flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-lg font-semibold">
            Page {pageNumber}: {title}
          </DialogTitle>
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <div className="w-24">
                <Slider
                  value={[zoom]}
                  min={1}
                  max={3}
                  step={0.1}
                  onValueChange={([value]) => setZoom(value)}
                  className="w-full"
                />
              </div>
              
              <span className="text-xs font-mono w-10 text-center">
                {(zoom * 100).toFixed(0)}%
              </span>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick zoom buttons */}
            <div className="flex items-center gap-1">
              {ZOOM_LEVELS.map((level) => (
                <Button
                  key={level}
                  variant={Math.abs(zoom - level) < 0.1 ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setZoom(level);
                    if (level === 1) setPosition({ x: 0, y: 0 });
                  }}
                >
                  {level}x
                </Button>
              ))}
            </div>

            {/* Action buttons */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleReset}
              title="Reset view"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDownload}
              title="Download image"
            >
              <Download className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Image container */}
        <div
          className="flex-1 overflow-hidden relative bg-muted/30 flex items-center justify-center"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
        >
          {/* Checkerboard background for transparency */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `
                linear-gradient(45deg, #808080 25%, transparent 25%),
                linear-gradient(-45deg, #808080 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #808080 75%),
                linear-gradient(-45deg, transparent 75%, #808080 75%)
              `,
              backgroundSize: "20px 20px",
              backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
            }}
          />

          {/* Image */}
          <div
            className="relative transition-transform duration-150 ease-out"
            style={{
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            }}
          >
            <div className="bg-white shadow-2xl rounded-lg overflow-hidden">
              <img
                src={imageUrl}
                alt={`Page ${pageNumber}: ${title}`}
                className="max-h-[calc(95vh-120px)] w-auto object-contain select-none"
                draggable={false}
                style={{
                  imageRendering: zoom >= 2 ? "pixelated" : "auto",
                }}
              />
            </div>
          </div>

          {/* Zoom hint */}
          {zoom === 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm text-xs text-muted-foreground flex items-center gap-2">
              <Maximize2 className="h-3 w-3" />
              Use slider or +/- keys to zoom • Drag to pan when zoomed
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

