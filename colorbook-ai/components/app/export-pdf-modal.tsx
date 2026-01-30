"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Loader2, 
  Download, 
  FileText, 
  BookOpen, 
  Eye, 
  AlertTriangle, 
  CheckCircle2,
  BookMarked,
  FileCheck,
  Layers,
  X
} from "lucide-react";
import { toast } from "sonner";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { PDFPreviewModal } from "./pdf-preview-modal";

// US Letter at 72 DPI (standard PDF points)
const PAGE_SIZES = {
  letter: { width: 612, height: 792 },
  a4: { width: 595.28, height: 841.89 },
};

interface PageData {
  page: number;
  imageBase64: string;
  enhancedImageBase64?: string;
  finalLetterBase64?: string;
  activeVersion?: "original" | "enhanced" | "finalLetter";
  finalLetterStatus?: "none" | "processing" | "done" | "failed";
}

interface BelongsToData {
  imageBase64: string;
  enhancedImageBase64?: string;
  finalLetterBase64?: string;
  characterUsed?: string;
  wasEnhanced?: boolean;
  wasReframed?: boolean;
}

interface ExportPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  coloringPages: PageData[];
  characterProfile?: {
    species?: string;
    faceShape?: string;
    eyeStyle?: string;
    proportions?: string;
    keyFeatures?: string[];
  };
  defaultTitle?: string;
  defaultAuthor?: string;
  onProcessPages?: () => Promise<void>;
}

export function ExportPDFModal({
  isOpen,
  onClose,
  coloringPages,
  characterProfile,
  defaultTitle = "My Coloring Book",
  defaultAuthor = "",
  onProcessPages,
}: ExportPDFModalProps) {
  // Form state
  const [title, setTitle] = useState(defaultTitle);
  const [author, setAuthor] = useState(defaultAuthor);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [website, setWebsite] = useState("");
  const [pageSize, setPageSize] = useState<"letter" | "a4">("letter");
  const [insertBlankPages, setInsertBlankPages] = useState(true);
  const [includeBelongsTo, setIncludeBelongsTo] = useState(true);
  const [includeCopyright, setIncludeCopyright] = useState(true);
  const [includePageNumbers, setIncludePageNumbers] = useState(false);
  const [includeCreatedWith, setIncludeCreatedWith] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportMode, setExportMode] = useState<"preview" | "download" | null>(null);
  const [belongsToData, setBelongsToData] = useState<BelongsToData | null>(null);
  const [exportStep, setExportStep] = useState<string>("");
  
  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);

  // Check processing status
  const processedCount = coloringPages.filter(p => p.finalLetterBase64 || p.finalLetterStatus === "done").length;
  const allPagesProcessed = processedCount === coloringPages.length;

  // Generate the belongs-to page
  const generateBelongsToPage = async (): Promise<BelongsToData | null> => {
    if (belongsToData?.finalLetterBase64) return belongsToData;
    
    setExportStep("Creating ownership page...");
    
    try {
      const response = await fetch("/api/book/belongs-to", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterProfile: characterProfile || undefined,
          characterDescription: characterProfile?.species 
            ? `a cute ${characterProfile.species}` 
            : "a friendly cartoon animal",
          size: "1024x1536",
          labelText: "THIS BOOK BELONGS TO:",
          style: "cute",
          autoProcess: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate belongs-to page");
      }

      const data = await response.json();
      const newBelongsTo: BelongsToData = {
        imageBase64: data.imageBase64,
        enhancedImageBase64: data.enhancedImageBase64,
        finalLetterBase64: data.finalLetterBase64,
        characterUsed: data.characterUsed,
        wasEnhanced: data.wasEnhanced,
        wasReframed: data.wasReframed,
      };
      
      setBelongsToData(newBelongsTo);
      return newBelongsTo;
    } catch (error) {
      console.error("Failed to generate belongs-to page:", error);
      toast.error("Failed to generate ownership page");
      return null;
    }
  };

  // Convert base64 to Uint8Array
  const base64ToUint8Array = (base64: string): Uint8Array => {
    let cleanBase64 = base64;
    if (base64.includes(",")) {
      cleanBase64 = base64.split(",")[1];
    }
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Get the best available image for a page
  const getPageImage = (page: PageData): string => {
    if (page.finalLetterBase64) return page.finalLetterBase64;
    if (page.enhancedImageBase64) return page.enhancedImageBase64;
    return page.imageBase64;
  };

  // Embed image into PDF
  const embedImage = async (pdfDoc: PDFDocument, base64: string) => {
    const imageBytes = base64ToUint8Array(base64);
    try {
      return await pdfDoc.embedPng(imageBytes);
    } catch {
      try {
        return await pdfDoc.embedJpg(imageBytes);
      } catch (jpgError) {
        console.error("Failed to embed image:", jpgError);
        throw new Error("Unsupported image format");
      }
    }
  };

  // Generate PDF
  const generatePDF = async (): Promise<{ pdfDoc: PDFDocument; pageCount: number }> => {
    const dimensions = PAGE_SIZES[pageSize];
    const margins = 36;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let currentPageNum = 0;

    const addPageNumber = (page: Awaited<ReturnType<typeof pdfDoc.addPage>>, num: number) => {
      if (!includePageNumbers) return;
      const { width } = page.getSize();
      page.drawText(String(num), {
        x: width / 2 - 10,
        y: 30,
        size: 10,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
    };

    // 1. BELONGS TO PAGE
    if (includeBelongsTo) {
      let finalBelongsTo = belongsToData;
      if (!finalBelongsTo?.finalLetterBase64) {
        finalBelongsTo = await generateBelongsToPage();
      }

      if (finalBelongsTo?.finalLetterBase64) {
        try {
          setExportStep("Adding ownership page...");
          const belongsToPage = pdfDoc.addPage([dimensions.width, dimensions.height]);
          currentPageNum++;
          
          const pngImage = await embedImage(pdfDoc, finalBelongsTo.finalLetterBase64);
          
          const availableWidth = dimensions.width - (margins * 2);
          const availableHeight = dimensions.height - (margins * 2);
          const scale = Math.min(
            availableWidth / pngImage.width,
            availableHeight / pngImage.height
          );
          const scaledWidth = pngImage.width * scale;
          const scaledHeight = pngImage.height * scale;
          
          const x = (dimensions.width - scaledWidth) / 2;
          const y = (dimensions.height - scaledHeight) / 2;
          
          belongsToPage.drawImage(pngImage, { x, y, width: scaledWidth, height: scaledHeight });
          addPageNumber(belongsToPage, currentPageNum);
        } catch (imgError) {
          console.error("Failed to embed belongs-to image:", imgError);
        }
      }
    }

    // 2. COPYRIGHT PAGE
    if (includeCopyright) {
      setExportStep("Adding copyright page...");
      const copyrightPage = pdfDoc.addPage([dimensions.width, dimensions.height]);
      currentPageNum++;
      
      const { width, height } = copyrightPage.getSize();
      const centerX = width / 2;
      let textY = height / 2 + 50;
      const lineHeight = 20;
      
      const copyrightLine = `Copyright © ${year} ${author || ""}`.trim();
      const copyrightWidth = fontBold.widthOfTextAtSize(copyrightLine, 12);
      copyrightPage.drawText(copyrightLine, {
        x: centerX - copyrightWidth / 2,
        y: textY,
        size: 12,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      textY -= lineHeight * 2;
      
      const rightsText = "All rights reserved.";
      const rightsWidth = font.widthOfTextAtSize(rightsText, 10);
      copyrightPage.drawText(rightsText, {
        x: centerX - rightsWidth / 2,
        y: textY,
        size: 10,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      textY -= lineHeight * 2;
      
      const lines = [
        "No part of this book may be reproduced, stored, or",
        "transmitted in any form without written permission,",
        "except for personal use.",
      ];
      
      lines.forEach(line => {
        const lineWidth = font.widthOfTextAtSize(line, 9);
        copyrightPage.drawText(line, {
          x: centerX - lineWidth / 2,
          y: textY,
          size: 9,
          font: font,
          color: rgb(0.3, 0.3, 0.3),
        });
        textY -= lineHeight;
      });
      
      if (website) {
        textY -= lineHeight;
        const websiteWidth = font.widthOfTextAtSize(website, 9);
        copyrightPage.drawText(website, {
          x: centerX - websiteWidth / 2,
          y: textY,
          size: 9,
          font: font,
          color: rgb(0.3, 0.3, 0.3),
        });
      }
      
      if (includeCreatedWith) {
        textY -= lineHeight * 2;
        const createdText = "Created with ColorBookAI";
        const createdWidth = font.widthOfTextAtSize(createdText, 8);
        copyrightPage.drawText(createdText, {
          x: centerX - createdWidth / 2,
          y: textY,
          size: 8,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
      
      addPageNumber(copyrightPage, currentPageNum);
    }

    // 3. COLORING PAGES
    for (let i = 0; i < coloringPages.length; i++) {
      setExportStep(`Adding coloring page ${i + 1}/${coloringPages.length}...`);
      const pageData = coloringPages[i];
      
      try {
        const coloringPage = pdfDoc.addPage([dimensions.width, dimensions.height]);
        currentPageNum++;
        
        const imageToUse = getPageImage(pageData);
        const pngImage = await embedImage(pdfDoc, imageToUse);
        
        const availableWidth = dimensions.width - (margins * 2);
        const availableHeight = dimensions.height - (margins * 2);
        const scale = Math.min(
          availableWidth / pngImage.width,
          availableHeight / pngImage.height
        );
        const scaledWidth = pngImage.width * scale;
        const scaledHeight = pngImage.height * scale;
        
        const x = (dimensions.width - scaledWidth) / 2;
        const y = (dimensions.height - scaledHeight) / 2;
        
        coloringPage.drawImage(pngImage, { x, y, width: scaledWidth, height: scaledHeight });
        addPageNumber(coloringPage, currentPageNum);
        
        if (insertBlankPages && i < coloringPages.length - 1) {
          pdfDoc.addPage([dimensions.width, dimensions.height]);
          currentPageNum++;
        }
      } catch (imgError) {
        console.error(`Failed to embed page ${pageData.page}:`, imgError);
      }
    }

    return { pdfDoc, pageCount: currentPageNum };
  };

  // Preview handler
  const handlePreview = async () => {
    if (coloringPages.length === 0) {
      toast.error("No pages to preview");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a book title");
      return;
    }

    setIsExporting(true);
    setExportMode("preview");
    setExportStep("Preparing preview...");

    try {
      const { pdfDoc, pageCount } = await generatePDF();
      const pdfBytes = await pdfDoc.save();
      setPdfData(pdfBytes);
      setShowPreview(true);
      toast.success(`Preview ready! (${pageCount} pages)`);
    } catch (error) {
      console.error("Preview error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate preview");
    } finally {
      setIsExporting(false);
      setExportMode(null);
      setExportStep("");
    }
  };

  // Download handler
  const handleDownload = useCallback(() => {
    if (!pdfData) return;
    
    const arrayBuffer = pdfData.buffer.slice(
      pdfData.byteOffset,
      pdfData.byteOffset + pdfData.byteLength
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_coloring_book.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("PDF downloaded!");
    onClose();
    setShowPreview(false);
  }, [pdfData, title, onClose]);

  // Direct export handler
  const handleDirectExport = async () => {
    if (coloringPages.length === 0) {
      toast.error("No pages to export");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a book title");
      return;
    }

    setIsExporting(true);
    setExportMode("download");

    try {
      setExportStep("Building PDF...");
      const { pdfDoc, pageCount } = await generatePDF();
      
      setExportStep("Finalizing...");
      const pdfBytes = await pdfDoc.save();
      
      const arrayBuffer = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength
      ) as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_coloring_book.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`PDF exported! (${pageCount} pages)`);
      onClose();
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to export PDF");
    } finally {
      setIsExporting(false);
      setExportMode(null);
      setExportStep("");
    }
  };

  const availablePages = coloringPages.filter(p => p.imageBase64);
  const totalPages = (includeBelongsTo ? 1 : 0) + (includeCopyright ? 1 : 0) + availablePages.length + (insertBlankPages ? Math.max(0, availablePages.length - 1) : 0);

  return (
    <>
      <Dialog open={isOpen && !showPreview} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-amber-50 to-orange-50">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-amber-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-amber-700" />
              </div>
              Export Coloring Book
            </DialogTitle>
            <DialogDescription className="text-sm mt-1">
              Create a print-ready PDF with {availablePages.length} coloring page{availablePages.length !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>

          {/* Content */}
          <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
            
            {/* Book Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <FileText className="h-4 w-4" />
                Book Details
              </div>
              
              <div className="space-y-3">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Book Title *"
                  className="h-10"
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Author"
                    className="h-10"
                  />
                  <Input
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="Year"
                    className="h-10"
                  />
                </div>
                
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="Website (optional)"
                  className="h-10"
                />
              </div>
            </div>

            {/* Page Format */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Layers className="h-4 w-4" />
                Page Format
              </div>
              
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as "letter" | "a4")}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="letter">US Letter (8.5 × 11 in)</option>
                <option value="a4">A4 (210 × 297 mm)</option>
              </select>
            </div>

            {/* Content Options */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <BookMarked className="h-4 w-4" />
                Content Options
              </div>
              
              <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                <label className="flex items-center justify-between py-1 cursor-pointer">
                  <span className="text-sm">Include &quot;Belongs To&quot; page</span>
                  <Switch checked={includeBelongsTo} onCheckedChange={setIncludeBelongsTo} />
                </label>
                
                <label className="flex items-center justify-between py-1 cursor-pointer">
                  <span className="text-sm">Include copyright page</span>
                  <Switch checked={includeCopyright} onCheckedChange={setIncludeCopyright} />
                </label>
                
                <label className="flex items-center justify-between py-1 cursor-pointer">
                  <span className="text-sm">Insert blank pages between drawings</span>
                  <Switch checked={insertBlankPages} onCheckedChange={setInsertBlankPages} />
                </label>
                
                <label className="flex items-center justify-between py-1 cursor-pointer">
                  <span className="text-sm">Include page numbers</span>
                  <Switch checked={includePageNumbers} onCheckedChange={setIncludePageNumbers} />
                </label>
                
                <label className="flex items-center justify-between py-1 cursor-pointer text-muted-foreground">
                  <span className="text-sm">Include &quot;Created with ColorBookAI&quot;</span>
                  <Switch checked={includeCreatedWith} onCheckedChange={setIncludeCreatedWith} />
                </label>
              </div>
            </div>

            {/* Processing Warning */}
            {!allPagesProcessed && onProcessPages && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-amber-800">Processing recommended</p>
                  <p className="text-amber-700 mt-0.5">
                    {processedCount}/{coloringPages.length} pages are optimized for print.
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 mt-1 text-amber-800 underline"
                    onClick={onProcessPages}
                  >
                    Process all pages now →
                  </Button>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="flex items-center justify-between py-3 px-4 bg-gray-100 rounded-lg">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Total pages</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{totalPages}</span>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t bg-gray-50 gap-2 sm:gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isExporting} className="gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={isExporting || availablePages.length === 0}
              className="gap-2"
            >
              {isExporting && exportMode === "preview" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {exportStep || "Loading..."}
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Preview
                </>
              )}
            </Button>
            <Button 
              onClick={handleDirectExport} 
              disabled={isExporting || availablePages.length === 0}
              className="gap-2 bg-amber-600 hover:bg-amber-700"
            >
              {isExporting && exportMode === "download" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {exportStep || "Exporting..."}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        pdfData={pdfData}
        title={title}
        onDownload={handleDownload}
        isGenerating={isExporting}
      />
    </>
  );
}
