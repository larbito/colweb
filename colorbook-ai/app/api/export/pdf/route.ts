import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFPage, rgb, StandardFonts } from "pdf-lib";
import { z } from "zod";

/**
 * Route segment config
 * Professional PDF export with US Letter format, page numbers, and copyright
 */
export const maxDuration = 120;

// Page sizes in points (72 points = 1 inch)
// US Letter is the default and primary format
const PAGE_SIZES = {
  "a4": { width: 595.28, height: 841.89 },      // A4: 210mm x 297mm
  "letter": { width: 612, height: 792 },         // US Letter: 8.5" x 11" (DEFAULT)
  "a4-landscape": { width: 841.89, height: 595.28 },
  "letter-landscape": { width: 792, height: 612 },
};

// US Letter constants
const US_LETTER = PAGE_SIZES.letter;
const SAFE_MARGIN = 18; // 0.25 inch safe margin for page numbers

const requestSchema = z.object({
  // Book metadata
  title: z.string().min(1, "Title is required"),
  author: z.string().optional().default(""),
  year: z.number().optional().default(new Date().getFullYear()),
  website: z.string().optional(),
  publisher: z.string().optional(), // Optional publisher name
  
  // Page options - default to US Letter
  pageSize: z.enum(["a4", "letter"]).default("letter"),
  orientation: z.enum(["portrait", "landscape"]).default("portrait"),
  margins: z.number().min(0).max(72).default(18), // margins in points (18pt = 0.25 inch)
  margin: z.number().optional(), // Alternative margin in inches (converts to points)
  
  // Content options - page numbers ON by default
  insertBlankPages: z.boolean().default(false), // OFF by default
  includeBelongsTo: z.boolean().default(true),
  includeCopyright: z.boolean().default(true),
  includePageNumbers: z.boolean().default(true), // ON by default
  includeCreatedWith: z.boolean().default(true),
  includeTitlePage: z.boolean().default(true), // NEW: Title page
  
  // Response format
  returnBinary: z.boolean().default(false), // If true, return binary PDF instead of base64
  
  // Images (base64 encoded PNG) - supports both formats
  belongsToImage: z.string().optional(),
  coloringPages: z.array(z.object({
    page: z.number().optional(),
    pageNumber: z.number().optional(), // Alternative key
    imageBase64: z.string(),
  })).optional(),
  // Alternative: simple pages array
  pages: z.array(z.object({
    pageNumber: z.number(),
    imageBase64: z.string(),
  })).optional(),
});

/**
 * POST /api/export/pdf
 * 
 * Generates a print-ready coloring book PDF.
 * Includes: belongs-to page, copyright page, coloring pages with optional blank pages.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      title,
      author,
      year,
      website,
      publisher,
      pageSize,
      orientation,
      margins,
      margin,
      insertBlankPages,
      includeBelongsTo,
      includeCopyright,
      includePageNumbers,
      includeCreatedWith,
      includeTitlePage,
      returnBinary,
      belongsToImage,
      coloringPages: rawColoringPages,
      pages: rawPages,
    } = parseResult.data;

    // Support both formats: coloringPages or pages
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coloringPages = (rawColoringPages || rawPages || []).map((p: any) => ({
      page: p.page ?? p.pageNumber ?? 0,
      imageBase64: p.imageBase64,
    }));

    // Convert margin from inches to points if provided
    const finalMargins = margin ? margin * 72 : margins;

    console.log(`[export/pdf] Creating PDF: "${title}" with ${coloringPages.length} coloring pages`);

    // Get page dimensions - default to US Letter
    const sizeKey = orientation === "landscape" ? `${pageSize}-landscape` : pageSize;
    const pageDimensions = PAGE_SIZES[sizeKey as keyof typeof PAGE_SIZES] || US_LETTER;

    console.log(`[export/pdf] Page size: ${pageDimensions.width}x${pageDimensions.height} pts (${sizeKey})`);

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    let currentPageNum = 0;
    let coloringPageNum = 0; // Separate counter for coloring pages only

    // Helper to add page numbers at bottom center (within safe margin)
    const addPageNumber = (page: PDFPage, num: number, isColoringPage: boolean = false) => {
      if (!includePageNumbers) return;
      const { width } = page.getSize();
      
      // For coloring pages, show "Page X" format
      const pageText = isColoringPage ? `Page ${num}` : String(num);
      const textWidth = font.widthOfTextAtSize(pageText, 10);
      
      page.drawText(pageText, {
        x: (width - textWidth) / 2,
        y: SAFE_MARGIN,
        size: 10,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      });
    };

    // 1. TITLE PAGE (if enabled)
    if (includeTitlePage) {
      const titlePage = pdfDoc.addPage([pageDimensions.width, pageDimensions.height]);
      currentPageNum++;
      
      const { width, height } = titlePage.getSize();
      const centerX = width / 2;
      
      // Title - centered, larger font
      const titleFontSize = Math.min(36, width / (title.length * 0.6));
      const titleWidth = fontBold.widthOfTextAtSize(title, titleFontSize);
      titlePage.drawText(title, {
        x: centerX - titleWidth / 2,
        y: height * 0.6,
        size: titleFontSize,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      // Subtitle line
      const subtitleText = "A Coloring Book";
      const subtitleWidth = fontItalic.widthOfTextAtSize(subtitleText, 14);
      titlePage.drawText(subtitleText, {
        x: centerX - subtitleWidth / 2,
        y: height * 0.6 - 50,
        size: 14,
        font: fontItalic,
        color: rgb(0.3, 0.3, 0.3),
      });
      
      // Author/Publisher (if provided)
      if (author || publisher) {
        const byLine = author ? `By ${author}` : publisher || "";
        const byLineWidth = font.widthOfTextAtSize(byLine, 12);
        titlePage.drawText(byLine, {
          x: centerX - byLineWidth / 2,
          y: height * 0.3,
          size: 12,
          font: font,
          color: rgb(0.3, 0.3, 0.3),
        });
      }
      
      console.log("[export/pdf] Added title page");
    }

    // 2. BELONGS TO PAGE (if enabled and image provided)
    if (includeBelongsTo && belongsToImage) {
      const belongsToPage = pdfDoc.addPage([pageDimensions.width, pageDimensions.height]);
      currentPageNum++;
      
      try {
        const imageBytes = Buffer.from(belongsToImage, "base64");
        const pngImage = await pdfDoc.embedPng(imageBytes);
        
        // Calculate scaling to fit within margins while preserving aspect ratio
        const availableWidth = pageDimensions.width - (finalMargins * 2);
        const availableHeight = pageDimensions.height - (finalMargins * 2);
        const scale = Math.min(
          availableWidth / pngImage.width,
          availableHeight / pngImage.height
        );
        const scaledWidth = pngImage.width * scale;
        const scaledHeight = pngImage.height * scale;
        
        // Center the image
        const x = (pageDimensions.width - scaledWidth) / 2;
        const y = (pageDimensions.height - scaledHeight) / 2;
        
        belongsToPage.drawImage(pngImage, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });
        
        console.log("[export/pdf] Added belongs-to page");
      } catch (imgError) {
        console.error("[export/pdf] Failed to embed belongs-to image:", imgError);
      }
    }

    // 3. COPYRIGHT PAGE (if enabled)
    if (includeCopyright) {
      const copyrightPage = pdfDoc.addPage([pageDimensions.width, pageDimensions.height]);
      currentPageNum++;
      
      const { width, height } = copyrightPage.getSize();
      const centerX = width / 2;
      let textY = height * 0.55;
      const lineHeight = 18;
      
      // Book title
      const bookTitleWidth = fontBold.widthOfTextAtSize(title, 14);
      copyrightPage.drawText(title, {
        x: centerX - bookTitleWidth / 2,
        y: textY,
        size: 14,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      textY -= lineHeight * 2;
      
      // Copyright symbol and year
      const copyrightHolder = publisher || author || "";
      const copyrightLine = `© ${year} ${copyrightHolder}`.trim();
      const copyrightWidth = font.widthOfTextAtSize(copyrightLine, 11);
      copyrightPage.drawText(copyrightLine, {
        x: centerX - copyrightWidth / 2,
        y: textY,
        size: 11,
        font: font,
        color: rgb(0.1, 0.1, 0.1),
      });
      textY -= lineHeight * 1.5;
      
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
      const noReprodText = [
        "No part of this book may be reproduced, stored, or",
        "transmitted in any form without written permission,",
        "except for personal use.",
      ];
      
      noReprodText.forEach(line => {
        const lineWidth = font.widthOfTextAtSize(line, 9);
        copyrightPage.drawText(line, {
          x: centerX - lineWidth / 2,
          y: textY,
          size: 9,
          font: font,
          color: rgb(0.35, 0.35, 0.35),
        });
        textY -= lineHeight * 0.9;
      });
      
      textY -= lineHeight;
      
      // Coloring book notice
      const coloringNotice = "This is a coloring book. Images contain black outlines only.";
      const noticeWidth = fontItalic.widthOfTextAtSize(coloringNotice, 9);
      copyrightPage.drawText(coloringNotice, {
        x: centerX - noticeWidth / 2,
        y: textY,
        size: 9,
        font: fontItalic,
        color: rgb(0.4, 0.4, 0.4),
      });
      textY -= lineHeight * 2;
      
      // Website (if provided)
      if (website) {
        const websiteWidth = font.widthOfTextAtSize(website, 9);
        copyrightPage.drawText(website, {
          x: centerX - websiteWidth / 2,
          y: textY,
          size: 9,
          font: font,
          color: rgb(0.3, 0.3, 0.3),
        });
        textY -= lineHeight * 1.5;
      }
      
      // Created with ColorBookAI (if enabled)
      if (includeCreatedWith) {
        const createdText = "Created with ColorBook AI";
        const createdWidth = font.widthOfTextAtSize(createdText, 8);
        copyrightPage.drawText(createdText, {
          x: centerX - createdWidth / 2,
          y: textY,
          size: 8,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
      
      console.log("[export/pdf] Added copyright page");
    }

    // 4. COLORING PAGES
    for (let i = 0; i < coloringPages.length; i++) {
      const pageData = coloringPages[i];
      
      try {
        // Add coloring page
        const coloringPage = pdfDoc.addPage([pageDimensions.width, pageDimensions.height]);
        currentPageNum++;
        coloringPageNum++;
        
        const imageBytes = Buffer.from(pageData.imageBase64, "base64");
        const pngImage = await pdfDoc.embedPng(imageBytes);
        
        // Calculate scaling to fit within margins while preserving aspect ratio
        // Keep small margin for page number area at bottom
        const availableWidth = pageDimensions.width - (finalMargins * 2);
        const availableHeight = pageDimensions.height - (finalMargins * 2) - (SAFE_MARGIN * 2); // Extra space for page number
        const scale = Math.min(
          availableWidth / pngImage.width,
          availableHeight / pngImage.height
        );
        const scaledWidth = pngImage.width * scale;
        const scaledHeight = pngImage.height * scale;
        
        // Center the image, offset slightly up to make room for page number
        const x = (pageDimensions.width - scaledWidth) / 2;
        const y = ((pageDimensions.height - scaledHeight) / 2) + (SAFE_MARGIN / 2);
        
        coloringPage.drawImage(pngImage, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });
        
        // Add page number for coloring pages (e.g., "Page 1", "Page 2")
        addPageNumber(coloringPage, coloringPageNum, true);
        
        // Add blank page after (if enabled and not the last page)
        if (insertBlankPages && i < coloringPages.length - 1) {
          pdfDoc.addPage([pageDimensions.width, pageDimensions.height]);
          currentPageNum++;
          // Blank pages don't get page numbers
        }
        
      } catch (imgError) {
        console.error(`[export/pdf] Failed to embed page ${pageData.page}:`, imgError);
      }
    }

    console.log(`[export/pdf] PDF created: ${currentPageNum} total pages, ${coloringPageNum} coloring pages`);

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    
    // Return as binary if requested
    if (returnBinary) {
      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(title)}.pdf"`,
          "Content-Length": String(pdfBytes.length),
        },
      });
    }
    
    // Return as base64
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    return NextResponse.json({
      pdfBase64,
      pageCount: currentPageNum,
      title,
    });

  } catch (error) {
    console.error("[export/pdf] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

