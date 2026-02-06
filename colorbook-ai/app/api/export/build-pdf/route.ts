import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getSupabaseServerClient, createSignedUrl } from "@/lib/supabase/server";

/**
 * Server-side PDF Generation
 * 
 * Creates a complete coloring book PDF with:
 * 1. Title page (pdf-lib vector text - no images)
 * 2. Copyright page (pdf-lib vector text - no images)
 * 3. Belongs-To page (AI-generated image - optional)
 * 4. All coloring pages (images from storage)
 * 
 * Title and Copyright are rendered using pdf-lib fonts to avoid
 * SVG→PNG font rendering issues on serverless platforms.
 */
export const maxDuration = 300;

const requestSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  // Options
  includeTitlePage: z.boolean().default(true),
  includeCopyrightPage: z.boolean().default(true),
  includeBelongsToPage: z.boolean().default(false),
  includePageNumbers: z.boolean().default(true),
  // Book info
  bookTitle: z.string().default("My Coloring Book"),
  authorName: z.string().optional(),
  // Preview mode
  previewMode: z.boolean().default(false),
  previewPageCount: z.number().default(5),
});

// PDF dimensions (72 DPI = 1 point per pixel)
const PDF_WIDTH = 612;  // 8.5"
const PDF_HEIGHT = 792; // 11"
const MARGIN = 54;      // 0.75" margin

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const data = requestSchema.parse(body);
    
    console.log(`[build-pdf] Starting for project ${data.projectId}`);
    
    const supabase = getSupabaseServerClient();
    
    // Fetch all ready assets for this project
    const { data: assets, error: assetsError } = await supabase
      .from("generated_assets")
      .select("*")
      .eq("project_id", data.projectId)
      .eq("user_id", data.userId)
      .eq("status", "ready")
      .order("page_number", { ascending: true });
    
    if (assetsError) {
      console.error("[build-pdf] Failed to fetch assets:", assetsError);
      return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
    }
    
    // Separate assets by type
    const pageAssets = (assets || []).filter(a => a.asset_type === "page_image").sort((a, b) => (a.page_number || 0) - (b.page_number || 0));
    const belongsToAsset = (assets || []).find(a => a.asset_type === "front_matter" && a.meta?.frontMatterType === "belongsTo");
    
    if (pageAssets.length === 0) {
      return NextResponse.json({ error: "No coloring pages found for this project" }, { status: 404 });
    }
    
    console.log(`[build-pdf] Found ${pageAssets.length} coloring pages, belongsTo: ${belongsToAsset ? "yes" : "no"}`);
    
    // Limit for preview mode
    const pagesToProcess = data.previewMode ? pageAssets.slice(0, data.previewPageCount) : pageAssets;
    
    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Embed standard fonts (these always work - no custom fonts needed)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    
    let currentPageNum = 0;
    
    // ========================================
    // 1. TITLE PAGE (pdf-lib vector text)
    // ========================================
    if (data.includeTitlePage) {
      const titlePage = pdfDoc.addPage([PDF_WIDTH, PDF_HEIGHT]);
      currentPageNum++;
      
      // Draw decorative border
      titlePage.drawRectangle({
        x: MARGIN - 10,
        y: MARGIN - 10,
        width: PDF_WIDTH - (MARGIN - 10) * 2,
        height: PDF_HEIGHT - (MARGIN - 10) * 2,
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 2,
      });
      titlePage.drawRectangle({
        x: MARGIN,
        y: MARGIN,
        width: PDF_WIDTH - MARGIN * 2,
        height: PDF_HEIGHT - MARGIN * 2,
        borderColor: rgb(0.85, 0.85, 0.85),
        borderWidth: 1,
      });
      
      // Title
      const title = data.bookTitle;
      const titleFontSize = title.length > 25 ? 28 : title.length > 18 ? 32 : 38;
      const titleWidth = timesRomanBold.widthOfTextAtSize(title, titleFontSize);
      titlePage.drawText(title, {
        x: (PDF_WIDTH - titleWidth) / 2,
        y: PDF_HEIGHT * 0.55,
        size: titleFontSize,
        font: timesRomanBold,
        color: rgb(0, 0, 0),
      });
      
      // Decorative line
      const lineY = PDF_HEIGHT * 0.48;
      const lineWidth = Math.min(titleWidth + 60, PDF_WIDTH - MARGIN * 2 - 40);
      titlePage.drawLine({
        start: { x: (PDF_WIDTH - lineWidth) / 2, y: lineY },
        end: { x: (PDF_WIDTH + lineWidth) / 2, y: lineY },
        thickness: 1.5,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      // Author (if provided)
      if (data.authorName) {
        const authorText = `by ${data.authorName}`;
        const authorWidth = timesRoman.widthOfTextAtSize(authorText, 18);
        titlePage.drawText(authorText, {
          x: (PDF_WIDTH - authorWidth) / 2,
          y: PDF_HEIGHT * 0.40,
          size: 18,
          font: timesRoman,
          color: rgb(0.2, 0.2, 0.2),
        });
      }
      
      // Footer
      const footerText = "A Coloring Book";
      const footerWidth = helvetica.widthOfTextAtSize(footerText, 14);
      titlePage.drawText(footerText, {
        x: (PDF_WIDTH - footerWidth) / 2,
        y: MARGIN + 30,
        size: 14,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
    
    // ========================================
    // 2. COPYRIGHT PAGE (pdf-lib vector text)
    // ========================================
    if (data.includeCopyrightPage) {
      const copyrightPage = pdfDoc.addPage([PDF_WIDTH, PDF_HEIGHT]);
      currentPageNum++;
      
      const year = new Date().getFullYear();
      const author = data.authorName || "The Author";
      
      // Title of book
      const titleForCopyright = data.bookTitle;
      const titleSize = titleForCopyright.length > 30 ? 20 : 24;
      const titleWidth = timesRomanBold.widthOfTextAtSize(titleForCopyright, titleSize);
      copyrightPage.drawText(titleForCopyright, {
        x: (PDF_WIDTH - titleWidth) / 2,
        y: PDF_HEIGHT - MARGIN - 50,
        size: titleSize,
        font: timesRomanBold,
        color: rgb(0, 0, 0),
      });
      
      // Separator line
      copyrightPage.drawLine({
        start: { x: MARGIN + 100, y: PDF_HEIGHT - MARGIN - 70 },
        end: { x: PDF_WIDTH - MARGIN - 100, y: PDF_HEIGHT - MARGIN - 70 },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
      
      // Copyright text - centered block
      const copyrightLines = [
        { text: `© ${year} ${author}`, size: 16, bold: false, spacing: 35 },
        { text: "All Rights Reserved", size: 14, bold: false, spacing: 50 },
        { text: "No part of this publication may be reproduced,", size: 11, bold: false, spacing: 18 },
        { text: "distributed, or transmitted in any form or by any means,", size: 11, bold: false, spacing: 18 },
        { text: "without the prior written permission of the author.", size: 11, bold: false, spacing: 40 },
        { text: "This coloring book is intended for personal use only.", size: 12, bold: false, spacing: 25 },
        { text: "Commercial use is strictly prohibited.", size: 12, bold: false, spacing: 0 },
      ];
      
      let y = PDF_HEIGHT - MARGIN - 130;
      for (const line of copyrightLines) {
        const font = line.bold ? timesRomanBold : timesRoman;
        const width = font.widthOfTextAtSize(line.text, line.size);
        copyrightPage.drawText(line.text, {
          x: (PDF_WIDTH - width) / 2,
          y,
          size: line.size,
          font,
          color: rgb(0.15, 0.15, 0.15),
        });
        y -= line.spacing;
      }
      
      // Footer
      const footerText = "Created with ColorBook AI";
      const footerWidth = helvetica.widthOfTextAtSize(footerText, 10);
      copyrightPage.drawText(footerText, {
        x: (PDF_WIDTH - footerWidth) / 2,
        y: MARGIN + 20,
        size: 10,
        font: helvetica,
        color: rgb(0.6, 0.6, 0.6),
      });
    }
    
    // ========================================
    // 3. BELONGS-TO PAGE (AI-generated image)
    // ========================================
    if (data.includeBelongsToPage && belongsToAsset?.storage_path) {
      try {
        const img = await embedImageFromStorage(pdfDoc, supabase, belongsToAsset.storage_path);
        if (img) {
          const belongsPage = pdfDoc.addPage([PDF_WIDTH, PDF_HEIGHT]);
          currentPageNum++;
          
          // Scale image to fit page with margin
          const maxW = PDF_WIDTH - MARGIN * 2;
          const maxH = PDF_HEIGHT - MARGIN * 2;
          const scale = Math.min(maxW / img.width, maxH / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          const x = (PDF_WIDTH - w) / 2;
          const y = (PDF_HEIGHT - h) / 2;
          
          belongsPage.drawImage(img, { x, y, width: w, height: h });
        }
      } catch (err) {
        console.error("[build-pdf] Failed to embed belongs-to image:", err);
      }
    }
    
    // ========================================
    // 4. COLORING PAGES (images from storage)
    // ========================================
    let processedCount = 0;
    const frontMatterPages = currentPageNum; // Track how many front matter pages
    
    for (const asset of pagesToProcess) {
      if (!asset.storage_path) continue;
      
      try {
        const img = await embedImageFromStorage(pdfDoc, supabase, asset.storage_path);
        if (!img) continue;
        
        const page = pdfDoc.addPage([PDF_WIDTH, PDF_HEIGHT]);
        currentPageNum++;
        
        // Scale to fit with margin
        const maxW = PDF_WIDTH - MARGIN * 2;
        const maxH = PDF_HEIGHT - MARGIN * 2 - (data.includePageNumbers ? 25 : 0);
        const scale = Math.min(maxW / img.width, maxH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (PDF_WIDTH - w) / 2;
        const y = data.includePageNumbers ? (PDF_HEIGHT - h) / 2 + 12 : (PDF_HEIGHT - h) / 2;
        
        page.drawImage(img, { x, y, width: w, height: h });
        
        // Page number (for coloring pages only, starting from 1)
        if (data.includePageNumbers) {
          const pageNum = currentPageNum - frontMatterPages;
          const numText = `- ${pageNum} -`;
          const numWidth = helvetica.widthOfTextAtSize(numText, 10);
          page.drawText(numText, {
            x: (PDF_WIDTH - numWidth) / 2,
            y: 28,
            size: 10,
            font: helvetica,
            color: rgb(0.5, 0.5, 0.5),
          });
        }
        
        processedCount++;
      } catch (err) {
        console.error(`[build-pdf] Failed to process page ${asset.page_number}:`, err);
      }
    }
    
    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    
    // Upload to storage
    const pdfPath = `${data.userId}/${data.projectId}/exports/book.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("generated")
      .upload(pdfPath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    
    if (uploadError) {
      console.error("[build-pdf] Failed to upload PDF:", uploadError);
    }
    
    // Create signed URL for download
    const signedUrl = await createSignedUrl("generated", pdfPath, 3600);
    
    const elapsed = Date.now() - startTime;
    console.log(`[build-pdf] Complete: ${processedCount} pages + ${frontMatterPages} front matter in ${elapsed}ms`);
    
    return NextResponse.json({
      success: true,
      totalPages: currentPageNum,
      coloringPages: processedCount,
      frontMatterPages,
      isPreview: data.previewMode,
      signedUrl,
      storagePath: pdfPath,
    });
    
  } catch (error) {
    console.error("[build-pdf] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PDF generation failed" },
      { status: 500 }
    );
  }
}

/**
 * Helper to download and embed PNG image from Supabase storage
 */
async function embedImageFromStorage(
  pdfDoc: PDFDocument,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  storagePath: string
): Promise<Awaited<ReturnType<typeof pdfDoc.embedPng>> | null> {
  try {
    const signedUrl = await createSignedUrl("generated", storagePath);
    if (!signedUrl) {
      console.error(`[build-pdf] No signed URL for ${storagePath}`);
      return null;
    }
    
    const response = await fetch(signedUrl);
    if (!response.ok) {
      console.error(`[build-pdf] Failed to fetch ${storagePath}: ${response.status}`);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    return await pdfDoc.embedPng(buffer);
  } catch (err) {
    console.error(`[build-pdf] Error embedding ${storagePath}:`, err);
    return null;
  }
}
