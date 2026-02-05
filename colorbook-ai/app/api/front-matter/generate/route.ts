import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { 
  getSupabaseServerClient, 
  uploadToStorage, 
  getRetentionHours, 
  calculateExpiresAt 
} from "@/lib/supabase/server";

/**
 * Front Matter Generation API
 * 
 * Generates title page, copyright page, and belongs-to page as PNG images.
 * These can be previewed, edited, and regenerated before PDF export.
 * 
 * DETERMINISTIC: Uses SVG rendering (no AI) for consistent, reliable output.
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
  // Supabase persistence (optional - if provided, saves to storage)
  projectId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  saveToStorage: z.boolean().default(false),
});

/**
 * POST /api/front-matter/generate
 * 
 * Generates a single front matter page as a PNG image.
 * Returns base64 encoded image that can be previewed and included in PDF.
 * 
 * Optionally saves to Supabase storage if projectId and userId are provided.
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

    const { key, options, projectId, userId, saveToStorage } = parseResult.data;
    
    console.log(`[front-matter] Generating ${key} page (save=${saveToStorage})`);
    
    // Generate PNG directly using SVG rendering
    const imageBase64 = await renderPageToImage(key, options);
    
    let assetId: string | undefined;
    let storagePath: string | undefined;
    let expiresAt: string | undefined;
    
    // Save to Supabase if requested
    if (saveToStorage && projectId && userId) {
      try {
        const imageBuffer = Buffer.from(imageBase64, "base64");
        storagePath = `${userId}/${projectId}/front/${key}.png`;
        
        const { path: uploadedPath, error: uploadError } = await uploadToStorage(
          "generated",
          storagePath,
          imageBuffer,
          "image/png"
        );
        
        if (uploadError) {
          console.error(`[front-matter] Upload failed: ${uploadError.message}`);
        } else {
          storagePath = uploadedPath;
          
          // Save to database
          const supabase = getSupabaseServerClient();
          const retentionHours = await getRetentionHours(userId);
          expiresAt = calculateExpiresAt(retentionHours);
          
          const { data: asset, error: dbError } = await supabase
            .from("generated_assets")
            .upsert({
              project_id: projectId,
              user_id: userId,
              asset_type: "front_matter",
              storage_bucket: "generated",
              storage_path: uploadedPath,
              mime_type: "image/png",
              status: "ready",
              expires_at: expiresAt,
              meta: {
                frontMatterType: key,
                options,
                fileSize: imageBuffer.length,
              },
            }, {
              onConflict: "project_id,asset_type,meta->>frontMatterType",
              ignoreDuplicates: false,
            })
            .select("id")
            .single();
          
          if (dbError) {
            console.error(`[front-matter] DB save failed: ${dbError.message}`);
          } else if (asset) {
            assetId = asset.id;
          }
        }
      } catch (storageError) {
        console.error(`[front-matter] Storage error:`, storageError);
        // Continue - return image even if storage fails
      }
    }
    
    return NextResponse.json({
      key,
      status: "done",
      imageBase64,
      assetId,
      storagePath,
      expiresAt,
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
 * Using simple inline styles for maximum compatibility with sharp
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
  const displayTitle = title.length > 30 ? title.substring(0, 27) + "..." : title;
  
  // Calculate positions
  const centerX = width / 2;
  const titleY = height * 0.38;
  const subtitleY = height * 0.48;
  const lineY = height * 0.55;
  const authorY = height * 0.65;
  const footerY = height * 0.90;
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#ffffff"/>
    
    <!-- Decorative border -->
    <rect x="60" y="60" width="${width - 120}" height="${height - 120}" 
          fill="none" stroke="#d0d0d0" stroke-width="4" rx="20"/>
    
    <!-- Decorative corner elements -->
    <circle cx="100" cy="100" r="8" fill="#333333"/>
    <circle cx="${width - 100}" cy="100" r="8" fill="#333333"/>
    <circle cx="100" cy="${height - 100}" r="8" fill="#333333"/>
    <circle cx="${width - 100}" cy="${height - 100}" r="8" fill="#333333"/>
    
    <!-- Title -->
    <text x="${centerX}" y="${titleY}" 
          style="font-family: Arial, Helvetica, sans-serif; font-size: 72px; font-weight: bold; fill: #1a1a1a;"
          text-anchor="middle" dominant-baseline="middle">${displayTitle}</text>
    
    ${subtitle ? `
    <!-- Subtitle -->
    <text x="${centerX}" y="${subtitleY}" 
          style="font-family: Arial, Helvetica, sans-serif; font-size: 36px; fill: #4a4a4a;"
          text-anchor="middle" dominant-baseline="middle">${subtitle}</text>
    ` : ""}
    
    <!-- Decorative line -->
    <line x1="${width * 0.25}" y1="${lineY}" x2="${width * 0.75}" y2="${lineY}" 
          stroke="#888888" stroke-width="3"/>
    <circle cx="${centerX}" cy="${lineY}" r="6" fill="#888888"/>
    
    ${author ? `
    <!-- Author -->
    <text x="${centerX}" y="${authorY}" 
          style="font-family: Arial, Helvetica, sans-serif; font-size: 32px; fill: #3a3a3a;"
          text-anchor="middle" dominant-baseline="middle">by ${author}</text>
    ` : ""}
    
    <!-- Footer -->
    <text x="${centerX}" y="${footerY}" 
          style="font-family: Arial, Helvetica, sans-serif; font-size: 24px; fill: #666666;"
          text-anchor="middle" dominant-baseline="middle">A Coloring Book</text>
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
  const author = options.authorName ? escapeXml(options.authorName) : "";
  const year = options.year || new Date().getFullYear().toString();
  
  const centerX = width / 2;
  const startY = height * 0.25;
  const lineHeight = 55;
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#ffffff"/>
    
    <!-- Title -->
    <text x="${centerX}" y="${startY}" 
          style="font-family: Arial, Helvetica, sans-serif; font-size: 42px; font-weight: bold; fill: #1a1a1a;"
          text-anchor="middle">${title}</text>
    
    <!-- Decorative line -->
    <line x1="${width * 0.3}" y1="${startY + 40}" x2="${width * 0.7}" y2="${startY + 40}" 
          stroke="#cccccc" stroke-width="2"/>
    
    <!-- Copyright notice -->
    <text x="${centerX}" y="${startY + lineHeight * 2}" 
          style="font-family: Arial, Helvetica, sans-serif; font-size: 32px; fill: #1a1a1a;"
          text-anchor="middle">© ${year}${author ? ` ${author}` : ""}</text>
    
    <text x="${centerX}" y="${startY + lineHeight * 3}" 
          style="font-family: Arial, Helvetica, sans-serif; font-size: 28px; fill: #1a1a1a;"
          text-anchor="middle">All Rights Reserved</text>
    
    <!-- Legal text -->
    <text x="${centerX}" y="${startY + lineHeight * 5}" 
          style="font-family: Arial, Helvetica, sans-serif; font-size: 22px; fill: #4a4a4a;"
          text-anchor="middle">No part of this publication may be</text>
    <text x="${centerX}" y="${startY + lineHeight * 5.8}" 
          style="font-family: Arial, Helvetica, sans-serif; font-size: 22px; fill: #4a4a4a;"
          text-anchor="middle">reproduced, distributed, or transmitted</text>
    <text x="${centerX}" y="${startY + lineHeight * 6.6}" 
          style="font-family: Arial, Helvetica, sans-serif; font-size: 22px; fill: #4a4a4a;"
          text-anchor="middle">without prior written permission.</text>
    
    <!-- Usage note -->
    <text x="${centerX}" y="${startY + lineHeight * 8.5}" 
          style="font-family: Arial, Helvetica, sans-serif; font-size: 24px; fill: #3a3a3a;"
          text-anchor="middle">This coloring book is for personal use only.</text>
    
    <!-- Footer -->
    <text x="${centerX}" y="${height * 0.88}" 
          style="font-family: Arial, Helvetica, sans-serif; font-size: 20px; fill: #888888;"
          text-anchor="middle">Created with ColorBook AI</text>
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
  const centerX = width / 2;
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#ffffff"/>
    
    <!-- Decorative border -->
    <rect x="80" y="80" width="${width - 160}" height="${height - 160}" 
          fill="none" stroke="#d0d0d0" stroke-width="4" rx="30"/>
    
    <!-- Top decorative stars -->
    <circle cx="${width * 0.30}" cy="${height * 0.18}" r="20" fill="#FFD700"/>
    <circle cx="${width * 0.42}" cy="${height * 0.15}" r="15" fill="#FFA500"/>
    <circle cx="${width * 0.50}" cy="${height * 0.18}" r="20" fill="#FFD700"/>
    <circle cx="${width * 0.58}" cy="${height * 0.15}" r="15" fill="#FFA500"/>
    <circle cx="${width * 0.70}" cy="${height * 0.18}" r="20" fill="#FFD700"/>
    
    <!-- Main title -->
    <text x="${centerX}" y="${height * 0.38}" 
          style="font-family: Arial, Helvetica, sans-serif; font-size: 58px; font-weight: bold; fill: #1a1a1a;"
          text-anchor="middle">This Book</text>
    <text x="${centerX}" y="${height * 0.46}" 
          style="font-family: Arial, Helvetica, sans-serif; font-size: 58px; font-weight: bold; fill: #1a1a1a;"
          text-anchor="middle">Belongs To:</text>
    
    ${name ? `
    <!-- Name if provided -->
    <text x="${centerX}" y="${height * 0.58}" 
          style="font-family: Arial, Helvetica, sans-serif; font-size: 48px; fill: #333333;"
          text-anchor="middle">${name}</text>
    ` : `
    <!-- Line for writing name -->
    <line x1="${width * 0.20}" y1="${height * 0.58}" x2="${width * 0.80}" y2="${height * 0.58}" 
          stroke="#1a1a1a" stroke-width="3"/>
    `}
    
    <!-- Bottom decorative hearts -->
    <circle cx="${width * 0.30}" cy="${height * 0.78}" r="18" fill="#FF6B6B"/>
    <circle cx="${width * 0.42}" cy="${height * 0.80}" r="14" fill="#FF8C8C"/>
    <circle cx="${width * 0.50}" cy="${height * 0.78}" r="18" fill="#FF6B6B"/>
    <circle cx="${width * 0.58}" cy="${height * 0.80}" r="14" fill="#FF8C8C"/>
    <circle cx="${width * 0.70}" cy="${height * 0.78}" r="18" fill="#FF6B6B"/>
    
    <!-- Date line (optional) -->
    <text x="${centerX}" y="${height * 0.88}" 
          style="font-family: Arial, Helvetica, sans-serif; font-size: 24px; fill: #666666;"
          text-anchor="middle">Date: _________________</text>
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

// PDF rendering helper functions removed - now using SVG-only rendering via sharp

