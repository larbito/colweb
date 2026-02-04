import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";

/**
 * Front Matter Generation API
 * 
 * Generates title page, copyright page, and belongs-to page as PNG images.
 * These can be previewed, edited, and regenerated before PDF export.
 */
export const maxDuration = 60;

const requestSchema = z.object({
  key: z.enum(["title", "copyright", "belongsTo"]),
  options: z.object({
    bookTitle: z.string().default("My Coloring Book"),
    authorName: z.string().optional(),
    year: z.string().default(new Date().getFullYear().toString()),
    publisher: z.string().optional(),
    belongsToName: z.string().optional(),
    subtitle: z.string().optional(),
    notes: z.string().optional(),
  }),
});

/**
 * POST /api/front-matter/generate
 * 
 * Generates a single front matter page as a PNG image.
 * Returns base64 encoded image that can be previewed and included in PDF.
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

    const { key, options } = parseResult.data;
    
    console.log(`[front-matter] Generating ${key} page`);
    
    // Generate the page as a PDF first (easier text rendering)
    const pdfDoc = await PDFDocument.create();
    
    // US Letter size (612 x 792 points)
    const pageWidth = 612;
    const pageHeight = 792;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    
    // Embed fonts
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    
    // Generate content based on key
    if (key === "title") {
      await renderTitlePage(page, options, titleFont, regularFont);
    } else if (key === "copyright") {
      await renderCopyrightPage(page, options, regularFont, italicFont);
    } else if (key === "belongsTo") {
      await renderBelongsToPage(page, options, titleFont, regularFont);
    }
    
    // Save PDF to bytes
    const pdfBytes = await pdfDoc.save();
    
    // Convert PDF page to PNG using sharp (via canvas rendering would be ideal, 
    // but we'll use a simple approach - return PDF bytes that frontend can render)
    // For now, we'll return metadata and let frontend use pdf.js to render preview
    
    // Actually, let's generate a simple PNG directly using sharp
    const imageBase64 = await renderPageToImage(key, options);
    
    return NextResponse.json({
      key,
      status: "done",
      imageBase64,
    });
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Generation failed";
    console.error("[front-matter] Error:", errorMsg);
    return NextResponse.json({
      error: errorMsg,
      status: "failed",
    }, { status: 500 });
  }
}

/**
 * Render front matter page to PNG image using sharp
 */
async function renderPageToImage(
  key: "title" | "copyright" | "belongsTo",
  options: z.infer<typeof requestSchema>["options"]
): Promise<string> {
  // US Letter at 150 DPI for preview (1275 x 1650 pixels)
  const width = 1275;
  const height = 1650;
  
  // Create SVG content based on page type
  let svgContent: string;
  
  if (key === "title") {
    svgContent = createTitlePageSVG(width, height, options);
  } else if (key === "copyright") {
    svgContent = createCopyrightPageSVG(width, height, options);
  } else {
    svgContent = createBelongsToPageSVG(width, height, options);
  }
  
  console.log(`[front-matter] SVG content length: ${svgContent.length} chars`);
  
  try {
    // Convert SVG to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(svgContent))
      .flatten({ background: "#ffffff" }) // Ensure white background
      .png()
      .toBuffer();
    
    console.log(`[front-matter] PNG generated: ${pngBuffer.length} bytes`);
    return pngBuffer.toString("base64");
  } catch (svgError) {
    console.error(`[front-matter] SVG to PNG failed:`, svgError);
    
    // Fallback: create a simple text image using sharp's composite
    const fallbackText = key === "title" 
      ? options.bookTitle || "My Coloring Book"
      : key === "copyright" 
        ? `© ${options.year} ${options.authorName || "Author"}`
        : "This Book Belongs To";
    
    // Create a white canvas with simple text (using SVG as workaround)
    const simpleSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      <text x="${width/2}" y="${height/2}" font-family="sans-serif" font-size="48" text-anchor="middle" fill="#333">${escapeXml(fallbackText)}</text>
    </svg>`;
    
    const fallbackBuffer = await sharp(Buffer.from(simpleSvg))
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();
    
    return fallbackBuffer.toString("base64");
  }
}

/**
 * Create Title Page SVG
 * Uses simple fonts that sharp can render
 */
function createTitlePageSVG(
  width: number, 
  height: number, 
  options: z.infer<typeof requestSchema>["options"]
): string {
  const title = escapeXml(options.bookTitle || "My Coloring Book");
  const subtitle = options.subtitle ? escapeXml(options.subtitle) : "";
  const author = options.authorName ? escapeXml(options.authorName) : "";
  
  // Truncate title if too long
  const displayTitle = title.length > 40 ? title.substring(0, 37) + "..." : title;
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
    
    <rect x="50" y="50" width="${width - 100}" height="${height - 100}" 
          fill="none" stroke="#e0e0e0" stroke-width="2" rx="10"/>
    
    <text x="${width / 2}" y="${height * 0.35}" 
          font-family="sans-serif" font-size="64" font-weight="bold" 
          text-anchor="middle" fill="#333333">${displayTitle}</text>
    
    ${subtitle ? `<text x="${width / 2}" y="${height * 0.45}" 
          font-family="sans-serif" font-size="32"
          text-anchor="middle" fill="#666666">${subtitle}</text>` : ""}
    
    <line x1="${width * 0.3}" y1="${height * 0.52}" 
          x2="${width * 0.7}" y2="${height * 0.52}" 
          stroke="#cccccc" stroke-width="2"/>
    
    ${author ? `<text x="${width / 2}" y="${height * 0.65}" 
          font-family="sans-serif" font-size="28"
          text-anchor="middle" fill="#555555">by ${author}</text>` : ""}
    
    <text x="${width / 2}" y="${height * 0.92}" 
          font-family="sans-serif" font-size="18"
          text-anchor="middle" fill="#999999">A Coloring Book</text>
  </svg>`;
}

/**
 * Create Copyright Page SVG
 */
function createCopyrightPageSVG(
  width: number, 
  height: number, 
  options: z.infer<typeof requestSchema>["options"]
): string {
  const title = escapeXml(options.bookTitle || "My Coloring Book");
  const author = options.authorName ? escapeXml(options.authorName) : "Author";
  const year = options.year || new Date().getFullYear().toString();
  
  const startY = height * 0.30;
  const lineHeight = 40;
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
    
    <text x="${width / 2}" y="${startY}" font-family="sans-serif" font-size="28" font-weight="bold" text-anchor="middle" fill="#333333">${title}</text>
    
    <text x="${width / 2}" y="${startY + lineHeight * 2}" font-family="sans-serif" font-size="22" text-anchor="middle" fill="#333333">Copyright ${year} ${author}</text>
    
    <text x="${width / 2}" y="${startY + lineHeight * 3}" font-family="sans-serif" font-size="20" text-anchor="middle" fill="#333333">All rights reserved.</text>
    
    <text x="${width / 2}" y="${startY + lineHeight * 5}" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#555555">No part of this publication may be reproduced,</text>
    <text x="${width / 2}" y="${startY + lineHeight * 6}" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#555555">distributed, or transmitted in any form</text>
    <text x="${width / 2}" y="${startY + lineHeight * 7}" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#555555">without prior written permission.</text>
    
    <text x="${width / 2}" y="${startY + lineHeight * 9}" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#555555">This is a coloring book for personal use.</text>
    
    <text x="${width / 2}" y="${startY + lineHeight * 11}" font-family="sans-serif" font-size="16" text-anchor="middle" fill="#999999">Created with ColorBook AI</text>
  </svg>`;
}

/**
 * Create Belongs To Page SVG
 */
function createBelongsToPageSVG(
  width: number, 
  height: number, 
  options: z.infer<typeof requestSchema>["options"]
): string {
  const name = options.belongsToName ? escapeXml(options.belongsToName) : "";
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
    
    <rect x="100" y="100" width="${width - 200}" height="${height - 200}" 
          fill="none" stroke="#e0e0e0" stroke-width="3" rx="20"/>
    
    <circle cx="${width * 0.35}" cy="${height * 0.25}" r="15" fill="#FFD700"/>
    <circle cx="${width * 0.5}" cy="${height * 0.25}" r="15" fill="#FFD700"/>
    <circle cx="${width * 0.65}" cy="${height * 0.25}" r="15" fill="#FFD700"/>
    
    <text x="${width / 2}" y="${height * 0.4}" 
          font-family="sans-serif" font-size="48" font-weight="bold"
          text-anchor="middle" fill="#333333">This Book Belongs To</text>
    
    ${name ? `<text x="${width / 2}" y="${height * 0.55}" 
          font-family="sans-serif" font-size="40"
          text-anchor="middle" fill="#555555">${name}</text>` 
    : `<line x1="${width * 0.25}" y1="${height * 0.55}" 
          x2="${width * 0.75}" y2="${height * 0.55}" 
          stroke="#333333" stroke-width="2"/>`}
    
    <circle cx="${width * 0.35}" cy="${height * 0.75}" r="12" fill="#FF6B6B"/>
    <circle cx="${width * 0.5}" cy="${height * 0.75}" r="12" fill="#FF6B6B"/>
    <circle cx="${width * 0.65}" cy="${height * 0.75}" r="12" fill="#FF6B6B"/>
  </svg>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// wrapText removed - truncation is handled inline in SVG generators

/**
 * Helper functions for pdf-lib rendering (not currently used but kept for reference)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function renderTitlePage(page: any, options: any, titleFont: any, regularFont: any) {
  const { width, height } = page.getSize();
  
  // Title
  page.drawText(options.bookTitle || "My Coloring Book", {
    x: 100,
    y: height - 300,
    size: 48,
    font: titleFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  // Author
  if (options.authorName) {
    page.drawText(`by ${options.authorName}`, {
      x: 100,
      y: height - 400,
      size: 24,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function renderCopyrightPage(page: any, options: any, regularFont: any, italicFont: any) {
  const { width, height } = page.getSize();
  const year = options.year || new Date().getFullYear().toString();
  const author = options.authorName || "Author";
  
  const lines = [
    `Copyright © ${year} ${author}`,
    "All rights reserved.",
    "",
    "This is a coloring book.",
    "Created with ColorBook AI",
  ];
  
  let y = height - 300;
  for (const line of lines) {
    page.drawText(line, {
      x: 100,
      y,
      size: 14,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 24;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function renderBelongsToPage(page: any, options: any, titleFont: any, regularFont: any) {
  const { width, height } = page.getSize();
  
  page.drawText("This Book Belongs To", {
    x: 150,
    y: height - 350,
    size: 36,
    font: titleFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  if (options.belongsToName) {
    page.drawText(options.belongsToName, {
      x: 150,
      y: height - 420,
      size: 28,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3),
    });
  } else {
    // Draw a line for writing in name
    page.drawLine({
      start: { x: 150, y: height - 420 },
      end: { x: width - 150, y: height - 420 },
      thickness: 1,
      color: rgb(0.3, 0.3, 0.3),
    });
  }
}

