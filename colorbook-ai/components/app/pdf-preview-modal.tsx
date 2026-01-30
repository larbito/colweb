"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
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

// Dynamically import react-pdf to avoid SSR issues
const Document = dynamic(
  () => import("react-pdf").then((mod) => mod.Document),
  { ssr: false }
);
const Page = dynamic(
  () => import("react-pdf").then((mod) => mod.Page),
  { ssr: false }
);

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
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(0.8);
  const [isLoading, setIsLoading] = useState(true);
  const [workerReady, setWorkerReady] = useState(false);

  // Set up PDF.js worker on client side only
  useEffect(() => {
    const setupWorker = async () => {
      const pdfjs = await import("react-pdf");
      pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.pdfjs.version}/build/pdf.worker.min.mjs`;
      setWorkerReady(true);
    };
    setupWorker();
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  }, []);

  const zoomIn = () => {
    setScale(prev => Math.min(2, prev + 0.2));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.4, prev - 0.2));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Preview: {title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={zoomOut}
                disabled={scale <= 0.4}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-16 text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={zoomIn}
                disabled={scale >= 2}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-4">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Generating PDF preview...</p>
            </div>
          ) : pdfData && workerReady ? (
            <Document
              file={{ data: new Uint8Array(pdfData) }}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              }
              error={
                <div className="text-destructive text-center p-8">
                  Failed to load PDF preview
                </div>
              }
              className="flex flex-col items-center gap-4"
            >
              {/* Show all pages in a scrollable view */}
              {Array.from(new Array(numPages), (_, index) => (
                <div
                  key={`page_${index + 1}`}
                  className="bg-white shadow-lg rounded overflow-hidden"
                  style={{ marginBottom: "1rem" }}
                >
                  <Page
                    pageNumber={index + 1}
                    scale={scale}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    loading={
                      <div className="flex items-center justify-center h-96 w-64">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    }
                  />
                  <div className="text-center text-xs text-muted-foreground py-2 bg-muted/50">
                    Page {index + 1} of {numPages}
                  </div>
                </div>
              ))}
            </Document>
          ) : !workerReady ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No PDF to preview
            </div>
          )}
        </div>

        {/* Footer with navigation and download */}
        <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between bg-background">
          <div className="flex items-center gap-2">
            {numPages > 0 && (
              <span className="text-sm text-muted-foreground">
                {numPages} page{numPages !== 1 ? "s" : ""} total
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
            <Button onClick={onDownload} disabled={!pdfData || isGenerating}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
