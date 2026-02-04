import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { 
  LETTER_WIDTH, 
  LETTER_HEIGHT, 
  base64ToBuffer,
  smartCropToLetter,
} from "@/lib/imageProcessing";

export const maxDuration = 300; // 5 minutes for large PDFs

const pageImageSchema = z.object({
  pageIndex: z.number(),
  imageBase64: z.string(),
  title: z.string().optional(),
  isProcessed: z.boolean().default(false), // Is it already US Letter size?
});

const requestSchema = z.object({
  pages: z.array(pageImageSchema),
  // PDF Options
  includeTitlePage: z.boolean().default(true),
  includeCopyrightPage: z.boolean().default(true),
  includePageNumbers: z.boolean().default(true),
  // Title page content
  bookTitle: z.string().default("My Coloring Book"),
  authorName: z.string().optional(),
  // Copyright content
  copyrightText: z.string().optional(),
  copyrightYear: z.string().optional(),
  // Preview mode - returns fewer pages for quick preview
  previewMode: z.boolean().default(false),
  previewPageCount: z.number().default(5),
});

/**
 * POST /api/export/pdf
 * 
 * Generate a PDF from coloring pages with:
 * - Optional title page
 * - Optional copyright page  
 * - Page numbers
 * - US Letter format (8.5x11 @ 300 DPI = 2550x3300)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = requestSchema.parse(body);
    
    console.log(`[export-pdf] Starting PDF generation: ${data.pages.length} pages, preview: ${data.previewMode}`);
    
    // For preview mode, limit pages
    let pagesToProcess = data.pages;
    if (data.previewMode) {
      pagesToProcess = data.pages.slice(0, data.previewPageCount);
      console.log(`[export-pdf] Preview mode: processing ${pagesToProcess.length} pages`);
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // PDF page dimensions (72 DPI for PDF)
    const PDF_WIDTH = 612;  // 8.5" * 72
    const PDF_HEIGHT = 792; // 11" * 72
    
    let pageNumber = 0;
    
    // Add Title Page
    if (data.includeTitlePage) {
      const titlePage = pdfDoc.addPage([PDF_WIDTH, PDF_HEIGHT]);
      pageNumber++;
      
      // Center the title
      const titleSize = 36;
      const titleWidth = font.widthOfTextAtSize(data.bookTitle, titleSize);
      
      titlePage.drawText(data.bookTitle, {
        x: (PDF_WIDTH - titleWidth) / 2,
        y: PDF_HEIGHT / 2 + 50,
        size: titleSize,
        font,
        color: rgb(0, 0, 0),
      });
      
      // Add author if provided
      if (data.authorName) {
        const authorSize = 18;
        const authorText = `by ${data.authorName}`;
        const authorWidth = regularFont.widthOfTextAtSize(authorText, authorSize);
        
        titlePage.drawText(authorText, {
          x: (PDF_WIDTH - authorWidth) / 2,
          y: PDF_HEIGHT / 2 - 20,
          size: authorSize,
          font: regularFont,
          color: rgb(0.3, 0.3, 0.3),
        });
      }
    }
    
    // Add Copyright Page
    if (data.includeCopyrightPage) {
      const copyrightPage = pdfDoc.addPage([PDF_WIDTH, PDF_HEIGHT]);
      pageNumber++;
      
      const copyrightYear = data.copyrightYear || new Date().getFullYear().toString();
      const copyrightText = data.copyrightText || 
        `© ${copyrightYear} All Rights Reserved\n\nThis coloring book is for personal use only.\nNo part may be reproduced without permission.`;
      
      const lines = copyrightText.split("\n");
      let y = PDF_HEIGHT - 100;
      
      for (const line of lines) {
        const size = 12;
        copyrightPage.drawText(line, {
          x: 72, // 1" margin
          y,
          size,
          font: regularFont,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 20;
      }
    }
    
    // Process and add coloring pages
    let processedCount = 0;
    for (const pageData of pagesToProcess) {
      try {
        // Process image to US Letter if needed
        let processedImageBase64 = pageData.imageBase64;
        
        if (!pageData.isProcessed) {
          const processed = await smartCropToLetter(pageData.imageBase64, {
            targetWidth: LETTER_WIDTH,
            targetHeight: LETTER_HEIGHT,
          });
          processedImageBase64 = processed.imageBase64;
        }
        
        // Embed image in PDF
        const imageBuffer = base64ToBuffer(processedImageBase64);
        const pdfImage = await pdfDoc.embedPng(imageBuffer);
        
        // Add page
        const page = pdfDoc.addPage([PDF_WIDTH, PDF_HEIGHT]);
        pageNumber++;
        
        // Scale image to fit PDF page with small margin
        const margin = 18; // 0.25" margin
        const maxWidth = PDF_WIDTH - margin * 2;
        const maxHeight = PDF_HEIGHT - margin * 2 - (data.includePageNumbers ? 20 : 0);
        
        const scaleX = maxWidth / pdfImage.width;
        const scaleY = maxHeight / pdfImage.height;
        const scale = Math.min(scaleX, scaleY);
        
        const scaledWidth = pdfImage.width * scale;
        const scaledHeight = pdfImage.height * scale;
        
        // Center image
        const x = (PDF_WIDTH - scaledWidth) / 2;
        const y = data.includePageNumbers 
          ? (PDF_HEIGHT - scaledHeight) / 2 + 10
          : (PDF_HEIGHT - scaledHeight) / 2;
        
        page.drawImage(pdfImage, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });
        
        // Add page number
        if (data.includePageNumbers) {
          const pageNumText = `- ${pageNumber} -`;
          const numWidth = regularFont.widthOfTextAtSize(pageNumText, 10);
          
          page.drawText(pageNumText, {
            x: (PDF_WIDTH - numWidth) / 2,
            y: 30,
            size: 10,
            font: regularFont,
            color: rgb(0.5, 0.5, 0.5),
          });
        }
        
        processedCount++;
        
      } catch (pageError) {
        console.error(`[export-pdf] Failed to process page ${pageData.pageIndex}:`, pageError);
        // Continue with other pages
      }
    }
    
    console.log(`[export-pdf] Processed ${processedCount} pages successfully`);

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    return NextResponse.json({
      success: true,
      pdfBase64,
      totalPages: pageNumber,
      processedPages: processedCount,
      isPreview: data.previewMode,
    });

  } catch (error) {
    console.error("[export-pdf] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PDF generation failed" },
      { status: 500 }
    );
  }
}
