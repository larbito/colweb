import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Note: For production, install: npm install archiver @types/archiver
// For now, we'll create a simple implementation

/**
 * Route segment config
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
 * Structure:
 *   /coloring-book/
 *     001.png
 *     002.png
 *     ...
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

    const { title, pages, includeTitlePage, titlePageImage, includeCopyrightPage, copyrightPageImage } = parseResult.data;

    console.log(`[export/png-zip] Creating ZIP: "${title}" with ${pages.length} pages`);

    // TODO: Install archiver for production: npm install archiver @types/archiver
    // For now, return a placeholder response that triggers client-side ZIP creation
    
    // Return page data for client-side ZIP creation
    return NextResponse.json({
      ok: true,
      title,
      pages: pages.map((p, idx) => ({
        pageNumber: p.pageNumber,
        filename: p.filename || `${String(p.pageNumber).padStart(3, "0")}.png`,
        imageBase64: p.imageBase64,
      })),
      message: "Use client-side ZIP library (e.g., JSZip) to create ZIP from these images",
      // Alternative: Install archiver on server for server-side ZIP creation
    });

  } catch (error) {
    console.error("[export/png-zip] Error:", error);
    return NextResponse.json(
      { 
        ok: false,
        error: error instanceof Error ? error.message : "Failed to create ZIP",
        errorCode: "ZIP_CREATION_ERROR",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

