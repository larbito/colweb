import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import JSZip from "jszip";
import { 
  base64ToBuffer,
  smartCropToLetter,
  LETTER_WIDTH,
  LETTER_HEIGHT,
} from "@/lib/imageProcessing";

export const maxDuration = 300; // 5 minutes for large ZIPs

const pageImageSchema = z.object({
    pageIndex: z.number(),
    imageBase64: z.string(),
    title: z.string().optional(),
    prompt: z.string().optional(),
  isProcessed: z.boolean().default(false),
});
  
const extraSchema = z.object({
    type: z.enum(["title", "copyright", "belongs-to"]),
    imageBase64: z.string(),
});

const requestSchema = z.object({
  pages: z.array(pageImageSchema),
  // Support both naming conventions
  bookTitle: z.string().optional(),
  title: z.string().optional(),
  includeMetadata: z.boolean().default(true),
  processToLetter: z.boolean().default(true),
  // Front matter pages
  extras: z.array(extraSchema).optional(),
  // Additional metadata (ignored for now but accepted)
  metadata: z.any().optional(),
}).transform(data => ({
  ...data,
  // Normalize to bookTitle
  bookTitle: data.bookTitle || data.title || "Coloring-Book",
}));

/**
 * POST /api/export/zip
 * 
 * Generate a ZIP file containing all coloring pages as PNGs.
 * Includes optional metadata.json with prompts and titles.
 * 
 * All images are processed to US Letter format (2550x3300 @ 300 DPI).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = requestSchema.parse(body);
    
    console.log(`[export-zip] Starting ZIP generation: ${data.pages.length} pages`);
    
    const zip = new JSZip();
    const imagesFolder = zip.folder("images");
    
    if (!imagesFolder) {
      throw new Error("Failed to create images folder");
    }
    
    const metadata: {
      title: string;
      pageCount: number;
      pages: Array<{
        pageIndex: number;
        filename: string;
        title?: string;
        prompt?: string;
      }>;
      exportDate: string;
      format: string;
    } = {
      title: data.bookTitle,
      pageCount: data.pages.length,
      pages: [],
      exportDate: new Date().toISOString(),
      format: "US Letter (2550x3300 @ 300 DPI)",
    };
    
    // Process each page
    let processedCount = 0;
    for (const pageData of data.pages) {
      try {
        let imageBuffer: Buffer;
        
        // Process to US Letter if needed
        if (data.processToLetter && !pageData.isProcessed) {
          const processed = await smartCropToLetter(pageData.imageBase64, {
            targetWidth: LETTER_WIDTH,
            targetHeight: LETTER_HEIGHT,
          });
          imageBuffer = base64ToBuffer(processed.imageBase64);
        } else {
          imageBuffer = base64ToBuffer(pageData.imageBase64);
        }
        
        // Generate filename
        const paddedIndex = String(pageData.pageIndex).padStart(3, "0");
        const safeTitle = pageData.title 
          ? pageData.title.replace(/[^a-z0-9]/gi, "-").slice(0, 30) 
          : "";
        const filename = safeTitle 
          ? `page-${paddedIndex}-${safeTitle}.png`
          : `page-${paddedIndex}.png`;
        
        // Add to ZIP
        imagesFolder.file(filename, imageBuffer);
        
        // Add to metadata
        metadata.pages.push({
          pageIndex: pageData.pageIndex,
          filename,
          title: pageData.title,
          prompt: pageData.prompt,
        });
        
        processedCount++;
        
      } catch (pageError) {
        console.error(`[export-zip] Failed to process page ${pageData.pageIndex}:`, pageError);
        // Continue with other pages
      }
    }
    
    // Add front matter pages (extras)
    if (data.extras && data.extras.length > 0) {
      const frontMatterFolder = zip.folder("front-matter");
      if (frontMatterFolder) {
        for (const extra of data.extras) {
          try {
            const imageBuffer = base64ToBuffer(extra.imageBase64);
            const filename = `${extra.type}-page.png`;
            frontMatterFolder.file(filename, imageBuffer);
            console.log(`[export-zip] Added front matter: ${filename}`);
          } catch (err) {
            console.error(`[export-zip] Failed to add front matter ${extra.type}:`, err);
          }
        }
      }
    }
    
    // Add metadata if requested
    if (data.includeMetadata) {
      zip.file("metadata.json", JSON.stringify(metadata, null, 2));
    }
    
    // Add a README
    const readme = `# ${data.bookTitle}

Exported: ${new Date().toLocaleString()}
Total Pages: ${processedCount}

## Format
All images are in US Letter format (2550x3300 pixels @ 300 DPI).
Perfect for printing on standard US Letter paper (8.5" x 11").

## Files
- images/ - Contains all coloring pages as PNG files
${data.includeMetadata ? "- metadata.json - Page titles and prompts\n" : ""}
`;
    zip.file("README.txt", readme);
    
    console.log(`[export-zip] Processed ${processedCount} pages successfully`);
    
    // Generate ZIP
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    
    const filename = `${data.bookTitle.replace(/[^a-z0-9]/gi, "-")}-coloring-book.zip`;
    
    // Return ZIP as binary blob (not JSON)
    // Convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-File-Count": String(processedCount + (data.extras?.length || 0)),
        "X-Total-Size": String(zipBuffer.length),
      },
    });

  } catch (error) {
    console.error("[export-zip] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ZIP generation failed" },
      { status: 500 }
    );
  }
}
