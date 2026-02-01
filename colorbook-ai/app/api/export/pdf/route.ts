import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFPage, rgb, StandardFonts } from "pdf-lib";
import { z } from "zod";

/**
 * Route segment config
 * Note: PDF is now generated client-side. This route is kept for potential future use.
 */
export const maxDuration = 120;

// Page sizes in points (72 points = 1 inch)
const PAGE_SIZES = {
  "a4": { width: 595.28, height: 841.89 },      // A4: 210mm x 297mm
  "letter": { width: 612, height: 792 },         // US Letter: 8.5" x 11"
  "a4-landscape": { width: 841.89, height: 595.28 },
  "letter-landscape": { width: 792, height: 612 },
};

const requestSchema = z.object({
  // Book metadata
  title: z.string().min(1, "Title is required"),
  author: z.string().optional().default(""),
  year: z.number().optional().default(new Date().getFullYear()),
  website: z.string().optional(),
  
  // Page options
  pageSize: z.enum(["a4", "letter"]).default("a4"),
  orientation: z.enum(["portrait", "landscape"]).default("portrait"),
  margins: z.number().min(0).max(72).default(36), // margins in points (36pt = 0.5 inch)
  margin: z.number().optional(), // Alternative margin in inches (converts to points)
  
  // Content options
  insertBlankPages: z.boolean().default(true),
  includeBelongsTo: z.boolean().default(true),
  includeCopyright: z.boolean().default(true),
  includePageNumbers: z.boolean().default(false),
  includeCreatedWith: z.boolean().default(false),
  
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
      pageSize,
      orientation,
      margins,
      margin,
      insertBlankPages,
      includeBelongsTo,
      includeCopyright,
      includePageNumbers,
      includeCreatedWith,
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

    console.log(`[export/pdf] Creating PDF: "${title}" with ${coloringPages.length} pages`);

    // Get page dimensions
    const sizeKey = orientation === "landscape" ? `${pageSize}-landscape` : pageSize;
    const pageDimensions = PAGE_SIZES[sizeKey as keyof typeof PAGE_SIZES] || PAGE_SIZES.a4;

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let currentPageNum = 0;

    // Helper to add page numbers
    const addPageNumber = (page: PDFPage, num: number) => {
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

    // 1. BELONGS TO PAGE (if enabled and image provided)
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
      
      addPageNumber(belongsToPage, currentPageNum);
    }

    // 2. COPYRIGHT PAGE (if enabled)
    if (includeCopyright) {
      const copyrightPage = pdfDoc.addPage([pageDimensions.width, pageDimensions.height]);
      currentPageNum++;
      
      const { width, height } = copyrightPage.getSize();
      const centerX = width / 2;
      let textY = height / 2 + 50; // Start from center-ish
      const lineHeight = 20;
      
      // Copyright symbol and year
      const copyrightLine = `Copyright © ${year} ${author || ""}`.trim();
      const copyrightWidth = font.widthOfTextAtSize(copyrightLine, 12);
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
      const noReprodText1 = "No part of this book may be reproduced, stored, or";
      const noReprodText2 = "transmitted in any form without written permission,";
      const noReprodText3 = "except for personal use.";
      
      [noReprodText1, noReprodText2, noReprodText3].forEach(line => {
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
      
      // Website (if provided)
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
      
      // Created with ColorBookAI (if enabled)
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
      console.log("[export/pdf] Added copyright page");
    }

    // 3. COLORING PAGES
    for (let i = 0; i < coloringPages.length; i++) {
      const pageData = coloringPages[i];
      
      try {
        // Add coloring page
        const coloringPage = pdfDoc.addPage([pageDimensions.width, pageDimensions.height]);
        currentPageNum++;
        
        const imageBytes = Buffer.from(pageData.imageBase64, "base64");
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
        
        coloringPage.drawImage(pngImage, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });
        
        addPageNumber(coloringPage, currentPageNum);
        
        // Add blank page after (if enabled and not the last page)
        if (insertBlankPages && i < coloringPages.length - 1) {
          const blankPage = pdfDoc.addPage([pageDimensions.width, pageDimensions.height]);
          currentPageNum++;
          // Blank pages don't get page numbers
        }
        
      } catch (imgError) {
        console.error(`[export/pdf] Failed to embed page ${pageData.page}:`, imgError);
      }
    }

    console.log(`[export/pdf] PDF created with ${currentPageNum} total pages`);

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

