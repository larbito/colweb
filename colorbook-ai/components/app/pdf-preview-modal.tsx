"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Download,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfData: Uint8Array | null;
  title: string;
  onDownload: () => void;
  isGenerating?: boolean;
}

export function PDFPreviewModal({
  isOpen,
  onClose,
  pdfData,
  title,
  onDownload,
  isGenerating = false,
}: PDFPreviewModalProps) {
  const [scale, setScale] = useState<number>(100);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Create blob URL from pdfData
  useEffect(() => {
    if (pdfData && pdfData.length > 0) {
      // Convert Uint8Array to ArrayBuffer properly
      const arrayBuffer = pdfData.buffer.slice(
        pdfData.byteOffset,
        pdfData.byteOffset + pdfData.byteLength
      ) as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      
      // Cleanup on unmount or when pdfData changes
      return () => {
        URL.revokeObjectURL(url);
        setPdfUrl(null);
      };
    } else {
      setPdfUrl(null);
    }
  }, [pdfData]);

  const zoomIn = () => {
    setScale(prev => Math.min(200, prev + 25));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(50, prev - 25));
  };

  // Estimate page count based on typical coloring book structure
  const estimatedPages = useMemo(() => {
    if (!pdfData) return 0;
    // Rough estimate: PDF header + page objects
    // A more accurate count would require parsing the PDF
    return Math.max(1, Math.floor(pdfData.length / 50000));
  }, [pdfData]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Preview: {title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={zoomOut}
                disabled={scale <= 50}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-16 text-center">
                {scale}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={zoomIn}
                disabled={scale >= 200}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/30">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Generating PDF preview...</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={`${pdfUrl}#zoom=${scale}&toolbar=0&navpanes=0`}
              className="w-full h-full border-0"
              title="PDF Preview"
              style={{ 
                transform: `scale(${scale / 100})`,
                transformOrigin: 'top center',
                width: `${10000 / scale}%`,
                height: `${10000 / scale}%`,
              }}
            />
          ) : pdfData && pdfData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-destructive gap-2">
              <p>PDF generation failed - empty file</p>
              <p className="text-sm text-muted-foreground">Please try again</p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No PDF to preview
            </div>
          )}
        </div>

        {/* Footer with download */}
        <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between bg-background">
          <div className="flex items-center gap-2">
            {pdfData && pdfData.length > 0 && (
              <span className="text-sm text-muted-foreground">
                PDF ready ({Math.round(pdfData.length / 1024)} KB)
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
            <Button onClick={onDownload} disabled={!pdfData || pdfData.length === 0 || isGenerating}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
