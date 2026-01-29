"use client";

import { useState } from "react";
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
import { Loader2, Download, FileText, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// Page sizes in points (72 points = 1 inch)
const PAGE_SIZES = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
};

interface ExportPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Pages to export (with base64 images)
  coloringPages: Array<{ page: number; imageBase64: string }>;
  // Character profile for belongs-to page
  characterProfile?: {
    species?: string;
    faceShape?: string;
    eyeStyle?: string;
    proportions?: string;
  };
  // Default values
  defaultTitle?: string;
  defaultAuthor?: string;
}

export function ExportPDFModal({
  isOpen,
  onClose,
  coloringPages,
  characterProfile,
  defaultTitle = "My Coloring Book",
  defaultAuthor = "",
}: ExportPDFModalProps) {
  // Form state
  const [title, setTitle] = useState(defaultTitle);
  const [author, setAuthor] = useState(defaultAuthor);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [website, setWebsite] = useState("");
  const [pageSize, setPageSize] = useState<"a4" | "letter">("a4");
  const [insertBlankPages, setInsertBlankPages] = useState(true);
  const [includeBelongsTo, setIncludeBelongsTo] = useState(true);
  const [includeCopyright, setIncludeCopyright] = useState(true);
  const [includePageNumbers, setIncludePageNumbers] = useState(false);
  const [includeCreatedWith, setIncludeCreatedWith] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [belongsToImage, setBelongsToImage] = useState<string | null>(null);
  const [exportStep, setExportStep] = useState<string>("");

  // Generate the belongs-to page
  const generateBelongsToPage = async (): Promise<string | null> => {
    if (belongsToImage) return belongsToImage;
    
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
          labelText: "This book belongs to:",
          style: "cute",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate belongs-to page");
      }

      const data = await response.json();
      setBelongsToImage(data.imageBase64);
      return data.imageBase64;
    } catch (error) {
      console.error("Failed to generate belongs-to page:", error);
      toast.error("Failed to generate 'Belongs To' page. Continuing without it.");
      return null;
    }
  };

  // Convert base64 to Uint8Array
  const base64ToUint8Array = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Generate PDF client-side using pdf-lib
  const generatePDF = async () => {
    const dimensions = PAGE_SIZES[pageSize];
    const margins = 36; // 0.5 inch

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
      let finalBelongsToImage = belongsToImage;
      if (!finalBelongsToImage) {
        finalBelongsToImage = await generateBelongsToPage();
      }

      if (finalBelongsToImage) {
        try {
          const belongsToPage = pdfDoc.addPage([dimensions.width, dimensions.height]);
          currentPageNum++;
          
          const imageBytes = base64ToUint8Array(finalBelongsToImage);
          const pngImage = await pdfDoc.embedPng(imageBytes);
          
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

    // 3. COLORING PAGES
    for (let i = 0; i < coloringPages.length; i++) {
      setExportStep(`Adding page ${i + 1} of ${coloringPages.length}...`);
      const pageData = coloringPages[i];
      
      try {
        const coloringPage = pdfDoc.addPage([dimensions.width, dimensions.height]);
        currentPageNum++;
        
        const imageBytes = base64ToUint8Array(pageData.imageBase64);
        const pngImage = await pdfDoc.embedPng(imageBytes);
        
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

  // Export to PDF
  const handleExport = async () => {
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
      
      // Generate PDF bytes
      const pdfBytes = await pdfDoc.save();
      
      // Download
      const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Export Coloring Book PDF
          </DialogTitle>
          <DialogDescription>
            Create a print-ready PDF with {availablePages.length} coloring pages
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
                  onChange={(e) => setPageSize(e.target.value as "a4" | "letter")}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="a4">A4 (210 × 297 mm)</option>
                  <option value="letter">US Letter (8.5 × 11 in)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Content Options */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Content Options</h4>
            
            <div className="space-y-3">
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
              {includeBelongsTo && <li>• &quot;Belongs To&quot; page</li>}
              {includeCopyright && <li>• Copyright page</li>}
              <li>• {availablePages.length} coloring pages</li>
              {insertBlankPages && <li>• {Math.max(0, availablePages.length - 1)} blank pages (between drawings)</li>}
              <li className="pt-1 text-xs">
                Total: ~{(includeBelongsTo ? 1 : 0) + (includeCopyright ? 1 : 0) + availablePages.length + (insertBlankPages ? Math.max(0, availablePages.length - 1) : 0)} pages
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || availablePages.length === 0}>
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
  );
}
