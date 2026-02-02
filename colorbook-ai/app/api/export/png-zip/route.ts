import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import JSZip from "jszip";

/**
 * Route segment config
 * PNG ZIP Export - creates downloadable ZIP of all coloring pages
 */
export const maxDuration = 180; // 3 minutes for large ZIP files
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  title: z.string().default("coloring-book"),
  pages: z.array(z.object({
    pageNumber: z.number(),
    imageBase64: z.string(),
    filename: z.string().optional(),
  })),
  includeTitlePage: z.boolean().default(false),
  titlePageImage: z.string().optional(),
  includeCopyrightPage: z.boolean().default(false),
  copyrightPageImage: z.string().optional(),
});

/**
 * POST /api/export/png-zip
 * 
 * Creates a ZIP file containing all PNG images.
 * Returns the ZIP as binary data for direct download.
 * 
 * Structure:
 *   /coloring-book/
 *     001.png
 *     002.png
 *     ...
 *     title.png (optional)
 *     copyright.png (optional)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      console.error("[export/png-zip] Validation error:", parseResult.error.flatten());
      return NextResponse.json(
        { 
          ok: false,
          error: "Invalid request - check page data format",
          errorCode: "VALIDATION_ERROR",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { 
      title, 
      pages, 
      includeTitlePage, 
      titlePageImage, 
      includeCopyrightPage, 
      copyrightPageImage 
    } = parseResult.data;

    console.log(`[export/png-zip] Creating ZIP: "${title}" with ${pages.length} pages`);

    // Validate we have at least one page
    if (pages.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "No pages provided",
          errorCode: "NO_PAGES",
        },
        { status: 400 }
      );
    }

    // Create ZIP using JSZip
    const zip = new JSZip();
    
    // Create folder with sanitized title
    const folderName = title.replace(/[^a-zA-Z0-9-_]/g, "-").substring(0, 50) || "coloring-book";
    const folder = zip.folder(folderName);
    
    if (!folder) {
      throw new Error("Failed to create ZIP folder");
    }

    let fileIndex = 1;

    // Add title page if provided
    if (includeTitlePage && titlePageImage) {
      try {
        const imageData = Buffer.from(titlePageImage, "base64");
        folder.file("000-title.png", imageData);
        console.log("[export/png-zip] Added title page");
      } catch (imgError) {
        console.error("[export/png-zip] Failed to add title page:", imgError);
      }
    }

    // Add copyright page if provided
    if (includeCopyrightPage && copyrightPageImage) {
      try {
        const imageData = Buffer.from(copyrightPageImage, "base64");
        folder.file("000-copyright.png", imageData);
        console.log("[export/png-zip] Added copyright page");
      } catch (imgError) {
        console.error("[export/png-zip] Failed to add copyright page:", imgError);
      }
    }

    // Add coloring pages
    let successCount = 0;
    let failCount = 0;
    
    for (const page of pages) {
      try {
        // Validate base64 data
        if (!page.imageBase64 || page.imageBase64.length < 100) {
          console.warn(`[export/png-zip] Page ${page.pageNumber} has invalid image data`);
          failCount++;
          continue;
        }

        const imageData = Buffer.from(page.imageBase64, "base64");
        const filename = page.filename || `${String(page.pageNumber).padStart(3, "0")}.png`;
        
        folder.file(filename, imageData);
        successCount++;
        fileIndex++;
      } catch (imgError) {
        console.error(`[export/png-zip] Failed to add page ${page.pageNumber}:`, imgError);
        failCount++;
      }
    }

    console.log(`[export/png-zip] Added ${successCount} pages, ${failCount} failed`);

    if (successCount === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to add any pages to ZIP",
          errorCode: "NO_VALID_PAGES",
        },
        { status: 500 }
      );
    }

    // Generate ZIP buffer
    console.log("[export/png-zip] Generating ZIP buffer...");
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const durationMs = Date.now() - startTime;
    console.log(`[export/png-zip] ZIP created: ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB in ${durationMs}ms`);

    // Return ZIP as binary
    const safeFilename = `${folderName}.zip`;
    
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Content-Length": String(zipBuffer.length),
        "X-Page-Count": String(successCount),
        "X-Duration-Ms": String(durationMs),
      },
    });

  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error("[export/png-zip] Error after", durationMs, "ms:", error);
    console.error("[export/png-zip] Stack:", error instanceof Error ? error.stack : "no stack");
    
    // Provide specific error messages
    let errorMessage = "Failed to create ZIP";
    let errorCode = "ZIP_CREATION_ERROR";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes("memory")) {
        errorCode = "MEMORY_ERROR";
        errorMessage = "Out of memory - try with fewer pages";
      } else if (error.message.includes("buffer") || error.message.includes("base64")) {
        errorCode = "INVALID_IMAGE_DATA";
        errorMessage = "Invalid image data - check base64 encoding";
      }
    }
    
    return NextResponse.json(
      { 
        ok: false,
        error: errorMessage,
        errorCode,
        details: error instanceof Error ? error.stack : String(error),
        durationMs,
      },
      { status: 500 }
    );
  }
}
