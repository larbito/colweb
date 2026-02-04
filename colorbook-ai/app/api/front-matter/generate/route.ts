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
  
  // TEMP DEBUG LOG - log first 500 chars of SVG to verify it's valid
  console.log(`[front-matter] SVG for ${key} (first 500 chars):`, svgContent.substring(0, 500));
  
  try {
    // Convert SVG to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(svgContent))
      .png()
      .toBuffer();
    
    console.log(`[front-matter] PNG buffer size for ${key}: ${pngBuffer.length} bytes`);
    
    return pngBuffer.toString("base64");
  } catch (sharpError) {
    console.error(`[front-matter] Sharp error for ${key}:`, sharpError);
    throw sharpError;
  }
}

/**
 * Create Title Page SVG
 */
function createTitlePageSVG(
  width: number, 
  height: number, 
  options: z.infer<typeof requestSchema>["options"]
): string {
  const title = escapeXml(options.bookTitle || "My Coloring Book");
  const subtitle = options.subtitle ? escapeXml(options.subtitle) : "";
  const author = options.authorName ? escapeXml(options.authorName) : "";
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
    
    <!-- Decorative border -->
    <rect x="50" y="50" width="${width - 100}" height="${height - 100}" 
          fill="none" stroke="#e0e0e0" stroke-width="2" rx="10"/>
    
    <!-- Title -->
    <text x="${width / 2}" y="${height * 0.35}" 
          font-family="Georgia, serif" font-size="72" font-weight="bold" 
          text-anchor="middle" fill="#333333">
      ${wrapText(title, 48, width - 200)}
    </text>
    
    ${subtitle ? `
    <!-- Subtitle -->
    <text x="${width / 2}" y="${height * 0.45}" 
          font-family="Georgia, serif" font-size="36" font-style="italic"
          text-anchor="middle" fill="#666666">
      ${subtitle}
    </text>
    ` : ""}
    
    <!-- Decorative line -->
    <line x1="${width * 0.3}" y1="${height * 0.52}" 
          x2="${width * 0.7}" y2="${height * 0.52}" 
          stroke="#cccccc" stroke-width="2"/>
    
    ${author ? `
    <!-- Author -->
    <text x="${width / 2}" y="${height * 0.65}" 
          font-family="Arial, sans-serif" font-size="32"
          text-anchor="middle" fill="#555555">
      by ${author}
    </text>
    ` : ""}
    
    <!-- Footer text -->
    <text x="${width / 2}" y="${height * 0.92}" 
          font-family="Arial, sans-serif" font-size="18"
          text-anchor="middle" fill="#999999">
      A Coloring Book
    </text>
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
  const publisher = options.publisher ? escapeXml(options.publisher) : "";
  
  const lines = [
    title,
    "",
    `Copyright © ${year} ${author}`,
    "All rights reserved.",
    "",
    "No part of this publication may be reproduced,",
    "distributed, or transmitted in any form or by any means,",
    "including photocopying, recording, or other electronic",
    "or mechanical methods, without prior written permission.",
    "",
    publisher ? `Published by ${publisher}` : "",
    "",
    "This is a coloring book for personal use.",
    "",
    "Created with ColorBook AI",
  ].filter(line => line !== undefined);
  
  const startY = height * 0.35;
  const lineHeight = 36;
  
  const textElements = lines.map((line, i) => {
    const y = startY + i * lineHeight;
    const fontSize = i === 0 ? 28 : 20;
    const fontWeight = i === 0 ? "bold" : "normal";
    return `<text x="${width / 2}" y="${y}" 
                  font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}"
                  text-anchor="middle" fill="#333333">${escapeXml(line)}</text>`;
  }).join("\n    ");
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
    ${textElements}
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
  const showLine = !name; // Show write-in line if no name provided
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
    
    <!-- Decorative frame -->
    <rect x="100" y="100" width="${width - 200}" height="${height - 200}" 
          fill="none" stroke="#e0e0e0" stroke-width="3" rx="20"/>
    
    <!-- Stars decoration -->
    <text x="${width / 2}" y="${height * 0.25}" 
          font-family="Arial" font-size="48" text-anchor="middle" fill="#FFD700">
      ⭐ ⭐ ⭐
    </text>
    
    <!-- Title -->
    <text x="${width / 2}" y="${height * 0.4}" 
          font-family="Georgia, serif" font-size="56" font-weight="bold"
          text-anchor="middle" fill="#333333">
      This Book Belongs To
    </text>
    
    ${name ? `
    <!-- Name (filled in) -->
    <text x="${width / 2}" y="${height * 0.55}" 
          font-family="Georgia, serif" font-size="48" font-style="italic"
          text-anchor="middle" fill="#555555">
      ${name}
    </text>
    ` : `
    <!-- Write-in line -->
    <line x1="${width * 0.25}" y1="${height * 0.55}" 
          x2="${width * 0.75}" y2="${height * 0.55}" 
          stroke="#333333" stroke-width="2"/>
    `}
    
    <!-- Decorative hearts -->
    <text x="${width / 2}" y="${height * 0.75}" 
          font-family="Arial" font-size="36" text-anchor="middle" fill="#FF6B6B">
      ♥ ♥ ♥
    </text>
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

/**
 * Wrap text to fit within width (simple version)
 */
function wrapText(text: string, maxChars: number, maxWidth: number): string {
  if (text.length <= maxChars) return text;
  
  // For SVG, we'd ideally use tspan elements for multi-line
  // For now, just truncate
  return text.substring(0, maxChars - 3) + "...";
}

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

