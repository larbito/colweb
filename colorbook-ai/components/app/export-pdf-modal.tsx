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
import { Loader2, Download, FileText, BookOpen, Eye, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { PDFPreviewModal } from "./pdf-preview-modal";

// US Letter at 72 DPI (standard PDF points)
const PAGE_SIZES = {
  letter: { width: 612, height: 792 }, // 8.5 x 11 inches
  a4: { width: 595.28, height: 841.89 },
};

// US Letter at 300 DPI (for image processing)
const LETTER_PIXELS = {
  width: 2550,
  height: 3300,
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
  const [pageSize, setPageSize] = useState<"letter" | "a4">("letter"); // Default to Letter
  const [insertBlankPages, setInsertBlankPages] = useState(true);
  const [includeBelongsTo, setIncludeBelongsTo] = useState(true);
  const [includeCopyright, setIncludeCopyright] = useState(true);
  const [includePageNumbers, setIncludePageNumbers] = useState(false);
  const [includeCreatedWith, setIncludeCreatedWith] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [belongsToData, setBelongsToData] = useState<BelongsToData | null>(null);
  const [exportStep, setExportStep] = useState<string>("");
  
  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);

  // Check processing status
  const processedCount = coloringPages.filter(p => p.finalLetterBase64 || p.finalLetterStatus === "done").length;
  const allPagesProcessed = processedCount === coloringPages.length;
  const belongsToReady = !includeBelongsTo || (belongsToData?.finalLetterBase64);

  // Generate and process the belongs-to page
  const generateBelongsToPage = async (): Promise<BelongsToData | null> => {
    if (belongsToData?.finalLetterBase64) return belongsToData;
    
    setExportStep("Generating 'Belongs To' page...");
    
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
          autoProcess: true, // Auto-enhance and reframe to Letter
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
      toast.error("Failed to generate 'Belongs To' page");
      return null;
    }
  };

  // Convert base64 to Uint8Array (strips data URL prefix if present)
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

  // Get the best available image for a page (prefers finalLetter)
  const getPageImage = (page: PageData): string => {
    // Priority: finalLetter > enhanced > original
    if (page.finalLetterBase64) {
      return page.finalLetterBase64;
    }
    if (page.enhancedImageBase64) {
      return page.enhancedImageBase64;
    }
    return page.imageBase64;
  };

  // Embed image into PDF (handles both PNG and JPEG)
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

  // Generate PDF using ONLY finalLetter images
  const generatePDF = async (): Promise<{ pdfDoc: PDFDocument; pageCount: number }> => {
    const dimensions = PAGE_SIZES[pageSize];
    const margins = 36; // 0.5 inch margins

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let currentPageNum = 0;

    // Helper to add page numbers
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

    // 1. BELONGS TO PAGE (if enabled)
    if (includeBelongsTo) {
      let finalBelongsTo = belongsToData;
      if (!finalBelongsTo?.finalLetterBase64) {
        finalBelongsTo = await generateBelongsToPage();
      }

      if (finalBelongsTo?.finalLetterBase64) {
        try {
          setExportStep("Adding 'Belongs To' page...");
          const belongsToPage = pdfDoc.addPage([dimensions.width, dimensions.height]);
          currentPageNum++;
          
          // Use finalLetter image (already 2550x3300)
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
          
          belongsToPage.drawImage(pngImage, {
            x,
            y,
            width: scaledWidth,
            height: scaledHeight,
          });
          
          addPageNumber(belongsToPage, currentPageNum);
        } catch (imgError) {
          console.error("Failed to embed belongs-to image:", imgError);
          toast.error("Failed to add 'Belongs To' page");
        }
      }
    }

    // 2. COPYRIGHT PAGE (if enabled)
    if (includeCopyright) {
      setExportStep("Adding copyright page...");
      const copyrightPage = pdfDoc.addPage([dimensions.width, dimensions.height]);
      currentPageNum++;
      
      const { width, height } = copyrightPage.getSize();
      const centerX = width / 2;
      let textY = height / 2 + 50;
      const lineHeight = 20;
      
      // Copyright line
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
      
      // All rights reserved
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
      
      // No reproduction text
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
      
      // Website
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
      
      // Created with
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

    // 3. COLORING PAGES (using finalLetter when available)
    for (let i = 0; i < coloringPages.length; i++) {
      setExportStep(`Adding page ${i + 1} of ${coloringPages.length}...`);
      const pageData = coloringPages[i];
      
      try {
        const coloringPage = pdfDoc.addPage([dimensions.width, dimensions.height]);
        currentPageNum++;
        
        // Get best available image (prioritizes finalLetter)
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
        
        coloringPage.drawImage(pngImage, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });
        
        addPageNumber(coloringPage, currentPageNum);
        
        // Add blank page after (if enabled and not the last page)
        if (insertBlankPages && i < coloringPages.length - 1) {
          pdfDoc.addPage([dimensions.width, dimensions.height]);
          currentPageNum++;
        }
      } catch (imgError) {
        console.error(`Failed to embed page ${pageData.page}:`, imgError);
        toast.error(`Failed to add page ${pageData.page}`);
      }
    }

    return { pdfDoc, pageCount: currentPageNum };
  };

  // Generate PDF and show preview
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
    setExportStep("Generating PDF preview...");

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
      setExportStep("");
    }
  };

  // Download the generated PDF
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

  // Export directly without preview
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

    try {
      setExportStep("Creating PDF...");
      const { pdfDoc, pageCount } = await generatePDF();
      
      setExportStep("Downloading...");
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
      setExportStep("");
    }
  };

  const availablePages = coloringPages.filter(p => p.imageBase64);

  return (
    <>
      <Dialog open={isOpen && !showPreview} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Export Coloring Book PDF
            </DialogTitle>
            <DialogDescription>
              Create a print-ready US Letter PDF with {availablePages.length} coloring pages
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Book Info */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Book Information
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label htmlFor="title" className="text-sm font-medium">Book Title *</label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My Coloring Book"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label htmlFor="author" className="text-sm font-medium">Author / Company</label>
                  <Input
                    id="author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Your name"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label htmlFor="year" className="text-sm font-medium">Year</label>
                  <Input
                    id="year"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="2026"
                    className="mt-1"
                  />
                </div>

                <div className="col-span-2">
                  <label htmlFor="website" className="text-sm font-medium">Website (optional)</label>
                  <Input
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="www.example.com"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Page Options */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Page Options</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Page Size</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as "letter" | "a4")}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="letter">US Letter (8.5 × 11 in)</option>
                    <option value="a4">A4 (210 × 297 mm)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content Options */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Content Options</h4>
              
              <div className="space-y-3">
                {/* Processing status */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Page processing status
                    <span className="text-xs text-muted-foreground">
                      ({processedCount}/{coloringPages.length} ready)
                    </span>
                  </label>
                  {allPagesProcessed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <span className="text-xs text-amber-600">Processing needed</span>
                  )}
                </div>

                {/* Warning if pages not processed */}
                {!allPagesProcessed && onProcessPages && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p>Some pages need processing for best print quality.</p>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-amber-800 underline"
                        onClick={onProcessPages}
                      >
                        Process all pages now
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <label htmlFor="blankPages" className="flex items-center gap-2 cursor-pointer text-sm">
                    Insert blank pages between drawings
                    <span className="text-xs text-muted-foreground">(prevents bleed-through)</span>
                  </label>
                  <Switch
                    id="blankPages"
                    checked={insertBlankPages}
                    onCheckedChange={setInsertBlankPages}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="belongsTo" className="flex items-center gap-2 cursor-pointer text-sm">
                    Include &quot;Belongs To&quot; page
                    {characterProfile?.species && (
                      <span className="text-xs text-muted-foreground">
                        (featuring {characterProfile.species})
                      </span>
                    )}
                    {belongsToData?.finalLetterBase64 && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </label>
                  <Switch
                    id="belongsTo"
                    checked={includeBelongsTo}
                    onCheckedChange={setIncludeBelongsTo}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="copyright" className="cursor-pointer text-sm">
                    Include copyright page
                  </label>
                  <Switch
                    id="copyright"
                    checked={includeCopyright}
                    onCheckedChange={setIncludeCopyright}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="pageNumbers" className="cursor-pointer text-sm">
                    Include page numbers
                  </label>
                  <Switch
                    id="pageNumbers"
                    checked={includePageNumbers}
                    onCheckedChange={setIncludePageNumbers}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="createdWith" className="cursor-pointer text-sm text-muted-foreground">
                    Include &quot;Created with ColorBookAI&quot;
                  </label>
                  <Switch
                    id="createdWith"
                    checked={includeCreatedWith}
                    onCheckedChange={setIncludeCreatedWith}
                  />
                </div>
              </div>
            </div>

            {/* Preview Summary */}
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium">PDF Preview:</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {includeBelongsTo && <li>• &quot;Belongs To&quot; page (auto-generated)</li>}
                {includeCopyright && <li>• Copyright page</li>}
                <li>• {availablePages.length} coloring pages (US Letter format)</li>
                {insertBlankPages && <li>• {Math.max(0, availablePages.length - 1)} blank pages</li>}
                <li className="pt-1 text-xs font-medium">
                  Total: ~{(includeBelongsTo ? 1 : 0) + (includeCopyright ? 1 : 0) + availablePages.length + (insertBlankPages ? Math.max(0, availablePages.length - 1) : 0)} pages
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={isExporting || availablePages.length === 0}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {exportStep || "Generating..."}
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview PDF
                </>
              )}
            </Button>
            <Button onClick={handleDirectExport} disabled={isExporting || availablePages.length === 0}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {exportStep || "Exporting..."}
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
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
