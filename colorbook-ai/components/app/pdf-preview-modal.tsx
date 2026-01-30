"use client";

import { useState, useEffect } from "react";
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
  FileText,
  CheckCircle2,
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
  const [pdfSize, setPdfSize] = useState<number>(0);

  // Create blob URL from pdfData
  useEffect(() => {
    if (pdfData && pdfData.length > 0) {
      const arrayBuffer = pdfData.buffer.slice(
        pdfData.byteOffset,
        pdfData.byteOffset + pdfData.byteLength
      ) as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfSize(blob.size);
      
      return () => {
        URL.revokeObjectURL(url);
        setPdfUrl(null);
      };
    } else {
      setPdfUrl(null);
      setPdfSize(0);
    }
  }, [pdfData]);

  const zoomIn = () => setScale(prev => Math.min(200, prev + 25));
  const zoomOut = () => setScale(prev => Math.max(50, prev - 25));

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-slate-50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <FileText className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <DialogTitle className="text-lg">{title}</DialogTitle>
                {pdfSize > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatFileSize(pdfSize)}
                  </p>
                )}
              </div>
            </div>
            
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-white rounded-lg border px-2 py-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={zoomOut}
                disabled={scale <= 50}
                className="h-8 w-8 p-0"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-14 text-center text-gray-600">
                {scale}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={zoomIn}
                disabled={scale >= 200}
                className="h-8 w-8 p-0"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* PDF Preview */}
        <div className="flex-1 overflow-hidden bg-slate-200">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="p-4 bg-white rounded-full shadow-lg">
                <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
              </div>
              <p className="text-gray-600 font-medium">Generating your PDF...</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
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
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
              <div className="p-4 bg-red-50 rounded-full">
                <X className="h-8 w-8 text-red-400" />
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-700">PDF generation failed</p>
                <p className="text-sm mt-1">Please try again</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
              <FileText className="h-12 w-12 text-gray-300" />
              <p>No PDF to preview</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {pdfUrl && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Ready to download</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose} className="gap-2">
                <X className="h-4 w-4" />
                Close
              </Button>
              <Button 
                onClick={onDownload} 
                disabled={!pdfData || pdfData.length === 0 || isGenerating}
                className="gap-2 bg-amber-600 hover:bg-amber-700"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
