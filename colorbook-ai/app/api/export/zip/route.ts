import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBookZip, getSafeZipFilename } from "@/lib/exportZip";

/**
 * Route segment config
 * ZIP Export - creates downloadable ZIP with organized structure
 */
export const maxDuration = 180; // 3 minutes for large ZIP files
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  title: z.string().default("coloring-book"),
  
  // Coloring pages
  pages: z.array(z.object({
    pageIndex: z.number(),
    imageBase64: z.string(),
    title: z.string().optional(),
    prompt: z.string().optional(),
    finalPrompt: z.string().optional(),
  })),
  
  // Extra pages (title, copyright, belongs-to)
  extras: z.array(z.object({
    type: z.enum(["title", "copyright", "belongs-to"]),
    imageBase64: z.string(),
  })).optional(),
  
  // Book metadata
  metadata: z.object({
    bookType: z.string().optional(),
    complexity: z.string().optional(),
    pageSize: z.string().optional(),
    authorName: z.string().optional(),
    settings: z.record(z.unknown()).optional(),
  }).optional(),
});

/**
 * POST /api/export/zip
 * 
 * Creates a ZIP file containing:
 *   /pages/page-001.png ... page-080.png
 *   /extras/title.png, copyright.png (optional)
 *   /meta/prompts.json (page info and prompts)
 *   /meta/book.json (settings)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      console.error("[export/zip] Validation error:", parseResult.error.flatten());
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

    const { title, pages, extras, metadata } = parseResult.data;

    console.log(`[export/zip] Creating ZIP: "${title}" with ${pages.length} pages, ${extras?.length || 0} extras`);

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

    // Create ZIP using streaming helper
    const result = await createBookZip({
      pages,
      extras: extras as { type: "title" | "copyright" | "belongs-to"; imageBase64: string }[] | undefined,
      metadata: {
        title,
        createdAt: new Date().toISOString(),
        pageCount: pages.length,
        ...metadata,
      },
    });

    const durationMs = Date.now() - startTime;
    const sizeMB = (result.totalSizeBytes / 1024 / 1024).toFixed(2);
    console.log(`[export/zip] ZIP created: ${sizeMB} MB, ${result.fileCount} files in ${durationMs}ms`);

    // Return ZIP as binary
    const filename = getSafeZipFilename(title);
    
    return new NextResponse(new Uint8Array(result.zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(result.totalSizeBytes),
        "X-File-Count": String(result.fileCount),
        "X-Duration-Ms": String(durationMs),
      },
    });

  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error("[export/zip] Error after", durationMs, "ms:", error);
    
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
        durationMs,
      },
      { status: 500 }
    );
  }
}

