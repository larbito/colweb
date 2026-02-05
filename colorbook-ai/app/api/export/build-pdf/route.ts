import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getSupabaseServerClient, createSignedUrl } from "@/lib/supabase/server";

/**
 * Server-side PDF Generation
 * 
 * Fetches images from Supabase storage and builds PDF.
 * Avoids 413 errors by not receiving images in request body.
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
  bookTitle: z.string().default("My Coloring Book"),
  authorName: z.string().optional(),
  // Preview mode
  previewMode: z.boolean().default(false),
  previewPageCount: z.number().default(5),
});

// PDF dimensions (72 DPI)
const PDF_WIDTH = 612;  // 8.5"
const PDF_HEIGHT = 792; // 11"

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
    
    if (!assets || assets.length === 0) {
      return NextResponse.json({ error: "No assets found for this project" }, { status: 404 });
    }
    
    console.log(`[build-pdf] Found ${assets.length} assets`);
    
    // Separate assets by type
    const pageAssets = assets.filter(a => a.asset_type === "page_image").sort((a, b) => (a.page_number || 0) - (b.page_number || 0));
    const frontMatterAssets = assets.filter(a => a.asset_type === "front_matter");
    
    // Limit for preview mode
    const pagesToProcess = data.previewMode ? pageAssets.slice(0, data.previewPageCount) : pageAssets;
    
    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    let pageNumber = 0;
    
    // Helper to download and embed image
    async function embedImage(storagePath: string): Promise<Awaited<ReturnType<typeof pdfDoc.embedPng>> | null> {
      try {
        const signedUrl = await createSignedUrl("generated", storagePath);
        if (!signedUrl) {
          console.error(`[build-pdf] Failed to get signed URL for ${storagePath}`);
          return null;
        }
        
        const response = await fetch(signedUrl);
        if (!response.ok) {
          console.error(`[build-pdf] Failed to fetch image: ${response.status}`);
          return null;
        }
        
        const buffer = await response.arrayBuffer();
        return await pdfDoc.embedPng(buffer);
      } catch (err) {
        console.error(`[build-pdf] Error embedding image:`, err);
        return null;
      }
    }
    
    // Add front matter pages first
    // 1. Title page
    const titleAsset = frontMatterAssets.find(a => a.meta?.frontMatterType === "title");
    if (data.includeTitlePage) {
      if (titleAsset?.storage_path) {
        const img = await embedImage(titleAsset.storage_path);
        if (img) {
          const page = pdfDoc.addPage([PDF_WIDTH, PDF_HEIGHT]);
          pageNumber++;
          const scale = Math.min(PDF_WIDTH / img.width, PDF_HEIGHT / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          page.drawImage(img, {
            x: (PDF_WIDTH - w) / 2,
            y: (PDF_HEIGHT - h) / 2,
            width: w,
            height: h,
          });
        }
      } else {
        // Generate simple title page
        const titlePage = pdfDoc.addPage([PDF_WIDTH, PDF_HEIGHT]);
        pageNumber++;
        const titleSize = 36;
        const titleWidth = boldFont.widthOfTextAtSize(data.bookTitle, titleSize);
        titlePage.drawText(data.bookTitle, {
          x: (PDF_WIDTH - titleWidth) / 2,
          y: PDF_HEIGHT / 2 + 50,
          size: titleSize,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        if (data.authorName) {
          const authorText = `by ${data.authorName}`;
          const authorWidth = regularFont.widthOfTextAtSize(authorText, 18);
          titlePage.drawText(authorText, {
            x: (PDF_WIDTH - authorWidth) / 2,
            y: PDF_HEIGHT / 2 - 20,
            size: 18,
            font: regularFont,
            color: rgb(0.3, 0.3, 0.3),
          });
        }
      }
    }
    
    // 2. Copyright page
    const copyrightAsset = frontMatterAssets.find(a => a.meta?.frontMatterType === "copyright");
    if (data.includeCopyrightPage) {
      if (copyrightAsset?.storage_path) {
        const img = await embedImage(copyrightAsset.storage_path);
        if (img) {
          const page = pdfDoc.addPage([PDF_WIDTH, PDF_HEIGHT]);
          pageNumber++;
          const scale = Math.min(PDF_WIDTH / img.width, PDF_HEIGHT / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          page.drawImage(img, {
            x: (PDF_WIDTH - w) / 2,
            y: (PDF_HEIGHT - h) / 2,
            width: w,
            height: h,
          });
        }
      } else {
        // Generate simple copyright page
        const copyrightPage = pdfDoc.addPage([PDF_WIDTH, PDF_HEIGHT]);
        pageNumber++;
        const year = new Date().getFullYear();
        const lines = [
          `© ${year} ${data.authorName || "Author"}`,
          "All rights reserved.",
          "",
          "This coloring book is for personal use only.",
        ];
        let y = PDF_HEIGHT - 100;
        for (const line of lines) {
          copyrightPage.drawText(line, {
            x: 72,
            y,
            size: 12,
            font: regularFont,
            color: rgb(0.2, 0.2, 0.2),
          });
          y -= 20;
        }
      }
    }
    
    // 3. Belongs To page
    const belongsAsset = frontMatterAssets.find(a => a.meta?.frontMatterType === "belongsTo");
    if (data.includeBelongsToPage && belongsAsset?.storage_path) {
      const img = await embedImage(belongsAsset.storage_path);
      if (img) {
        const page = pdfDoc.addPage([PDF_WIDTH, PDF_HEIGHT]);
        pageNumber++;
        const scale = Math.min(PDF_WIDTH / img.width, PDF_HEIGHT / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        page.drawImage(img, {
          x: (PDF_WIDTH - w) / 2,
          y: (PDF_HEIGHT - h) / 2,
          width: w,
          height: h,
        });
      }
    }
    
    // Add coloring pages
    let processedCount = 0;
    for (const asset of pagesToProcess) {
      if (!asset.storage_path) continue;
      
      const img = await embedImage(asset.storage_path);
      if (!img) continue;
      
      const page = pdfDoc.addPage([PDF_WIDTH, PDF_HEIGHT]);
      pageNumber++;
      
      // Scale to fit with small margin
      const margin = 18;
      const maxWidth = PDF_WIDTH - margin * 2;
      const maxHeight = PDF_HEIGHT - margin * 2 - (data.includePageNumbers ? 20 : 0);
      
      const scaleX = maxWidth / img.width;
      const scaleY = maxHeight / img.height;
      const scale = Math.min(scaleX, scaleY);
      
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (PDF_WIDTH - w) / 2;
      const y = data.includePageNumbers ? (PDF_HEIGHT - h) / 2 + 10 : (PDF_HEIGHT - h) / 2;
      
      page.drawImage(img, { x, y, width: w, height: h });
      
      // Page number
      if (data.includePageNumbers) {
        const numText = `- ${pageNumber} -`;
        const numWidth = regularFont.widthOfTextAtSize(numText, 10);
        page.drawText(numText, {
          x: (PDF_WIDTH - numWidth) / 2,
          y: 30,
          size: 10,
          font: regularFont,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
      
      processedCount++;
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
    const downloadUrl = await createSignedUrl("generated", pdfPath, 3600);
    
    const elapsed = Date.now() - startTime;
    console.log(`[build-pdf] Complete: ${processedCount} pages in ${elapsed}ms`);
    
    return NextResponse.json({
      success: true,
      totalPages: pageNumber,
      processedPages: processedCount,
      isPreview: data.previewMode,
      downloadUrl,
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
