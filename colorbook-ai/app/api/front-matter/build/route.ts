import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { 
  getSupabaseServerClient, 
  uploadToStorage, 
  createSignedUrl,
  getRetentionHours, 
  calculateExpiresAt 
} from "@/lib/supabase/server";

/**
 * Front Matter Build API
 * 
 * Generates front matter pages (title, copyright, belongs-to) as MONOCHROME PNGs.
 * Supports different variants and seeds for regeneration diversity.
 * Saves to Supabase storage and returns signed URLs.
 */
export const maxDuration = 60;

type FrontMatterKey = "title" | "copyright" | "belongsTo";
type Variant = "minimal" | "classic" | "bordered";

const requestSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  key: z.enum(["title", "copyright", "belongsTo"]),
  bookTitle: z.string().default("My Coloring Book"),
  authorName: z.string().optional(),
  year: z.string().default(new Date().getFullYear().toString()),
  belongsToName: z.string().optional(),
  variant: z.enum(["minimal", "classic", "bordered"]).optional(),
  seed: z.number().int().optional(),
});

// US Letter at 150 DPI (1275 x 1650 pixels)
const WIDTH = 1275;
const HEIGHT = 1650;
const MARGIN = 90; // ~0.35" margin at 150 DPI

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = requestSchema.parse(body);
    
    // Determine variant from seed if not provided
    const variants: Variant[] = ["minimal", "classic", "bordered"];
    const variant = data.variant || variants[(data.seed || 0) % variants.length];
    
    console.log(`[front-matter/build] Building ${data.key} page, variant=${variant}, seed=${data.seed || 0}`);
    
    // Generate SVG content
    const svgContent = generateSVG(data.key, variant, {
      bookTitle: data.bookTitle,
      authorName: data.authorName,
      year: data.year,
      belongsToName: data.belongsToName,
      seed: data.seed || 0,
    });
    
    // Convert to PNG
    const pngBuffer = await sharp(Buffer.from(svgContent))
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();
    
    // Save to Supabase storage
    const storagePath = `${data.userId}/${data.projectId}/front/${data.key}.png`;
    const { path: uploadedPath, error: uploadError } = await uploadToStorage(
      "generated",
      storagePath,
      pngBuffer,
      "image/png"
    );
    
    if (uploadError) {
      console.error(`[front-matter/build] Upload failed:`, uploadError);
      return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }
    
    // Save asset record to database
    const supabase = getSupabaseServerClient();
    const retentionHours = await getRetentionHours(data.userId);
    const expiresAt = calculateExpiresAt(retentionHours);
    
    const assetData = {
      project_id: data.projectId,
      user_id: data.userId,
      asset_type: "front_matter" as const,
      storage_bucket: "generated",
      storage_path: uploadedPath,
      mime_type: "image/png",
      status: "ready" as const,
      expires_at: expiresAt,
      meta: {
        frontMatterType: data.key,
        variant,
        seed: data.seed || 0,
        bookTitle: data.bookTitle,
        authorName: data.authorName,
        fileSize: pngBuffer.length,
      },
    };
    
    // Check if asset already exists for this front matter type
    const { data: existingAsset } = await supabase
      .from("generated_assets")
      .select("id")
      .eq("project_id", data.projectId)
      .eq("user_id", data.userId)
      .eq("asset_type", "front_matter")
      .eq("meta->>frontMatterType", data.key)
      .single();
    
    let asset: { id: string } | null = null;
    
    if (existingAsset) {
      // Update existing record
      const { data: updated, error: updateErr } = await supabase
        .from("generated_assets")
        .update(assetData)
        .eq("id", existingAsset.id)
        .select("id")
        .single();
      if (updateErr) console.error(`[front-matter/build] Update error:`, updateErr);
      else asset = updated;
    } else {
      // Insert new record
      const { data: inserted, error: insertErr } = await supabase
        .from("generated_assets")
        .insert(assetData)
        .select("id")
        .single();
      if (insertErr) console.error(`[front-matter/build] Insert error:`, insertErr);
      else asset = inserted;
    }
    
    // Generate signed URL for preview
    const signedUrl = await createSignedUrl("generated", uploadedPath!, 3600);
    
    console.log(`[front-matter/build] SUCCESS: ${data.key} page built (variant=${variant}, seed=${data.seed || 0})`);
    
    return NextResponse.json({
      success: true,
      key: data.key,
      variant,
      seed: data.seed || 0,
      assetId: asset?.id,
      storagePath: uploadedPath,
      signedUrl,
      expiresAt,
    });
    
  } catch (error) {
    console.error("[front-matter/build] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Build failed" },
      { status: 500 }
    );
  }
}

/**
 * Generate SVG content for front matter page
 * All templates are MONOCHROME (black on white)
 */
function generateSVG(
  key: FrontMatterKey,
  variant: Variant,
  options: {
    bookTitle: string;
    authorName?: string;
    year: string;
    belongsToName?: string;
    seed: number;
  }
): string {
  if (key === "title") {
    return generateTitleSVG(variant, options);
  } else if (key === "copyright") {
    return generateCopyrightSVG(variant, options);
  } else {
    return generateBelongsToSVG(variant, options);
  }
}

// ============================================
// TITLE PAGE TEMPLATES (3 variants)
// ============================================

function generateTitleSVG(
  variant: Variant,
  options: { bookTitle: string; authorName?: string; seed: number }
): string {
  const title = escapeXml(options.bookTitle);
  const author = options.authorName ? escapeXml(options.authorName) : "";
  const centerX = WIDTH / 2;
  
  // Truncate long titles
  const displayTitle = title.length > 28 ? title.substring(0, 25) + "..." : title;
  
  if (variant === "minimal") {
    return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
      
      <!-- Title -->
      <text x="${centerX}" y="${HEIGHT * 0.42}" 
            style="font-family: Georgia, serif; font-size: 68px; font-weight: bold; fill: #000000;"
            text-anchor="middle">${displayTitle}</text>
      
      <!-- Simple line -->
      <line x1="${WIDTH * 0.35}" y1="${HEIGHT * 0.50}" x2="${WIDTH * 0.65}" y2="${HEIGHT * 0.50}" 
            stroke="#000000" stroke-width="2"/>
      
      ${author ? `
      <text x="${centerX}" y="${HEIGHT * 0.60}" 
            style="font-family: Georgia, serif; font-size: 28px; fill: #000000;"
            text-anchor="middle">by ${author}</text>
      ` : ""}
      
      <text x="${centerX}" y="${HEIGHT * 0.90}" 
            style="font-family: Georgia, serif; font-size: 20px; fill: #555555;"
            text-anchor="middle">A Coloring Book</text>
    </svg>`;
  }
  
  if (variant === "classic") {
    return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
      
      <!-- Double border frame -->
      <rect x="${MARGIN}" y="${MARGIN}" width="${WIDTH - MARGIN*2}" height="${HEIGHT - MARGIN*2}" 
            fill="none" stroke="#000000" stroke-width="3"/>
      <rect x="${MARGIN + 15}" y="${MARGIN + 15}" width="${WIDTH - MARGIN*2 - 30}" height="${HEIGHT - MARGIN*2 - 30}" 
            fill="none" stroke="#000000" stroke-width="1"/>
      
      <!-- Corner ornaments -->
      <circle cx="${MARGIN + 40}" cy="${MARGIN + 40}" r="6" fill="#000000"/>
      <circle cx="${WIDTH - MARGIN - 40}" cy="${MARGIN + 40}" r="6" fill="#000000"/>
      <circle cx="${MARGIN + 40}" cy="${HEIGHT - MARGIN - 40}" r="6" fill="#000000"/>
      <circle cx="${WIDTH - MARGIN - 40}" cy="${HEIGHT - MARGIN - 40}" r="6" fill="#000000"/>
      
      <!-- Title -->
      <text x="${centerX}" y="${HEIGHT * 0.38}" 
            style="font-family: Georgia, serif; font-size: 64px; font-weight: bold; fill: #000000;"
            text-anchor="middle">${displayTitle}</text>
      
      <!-- Decorative line with dots -->
      <line x1="${WIDTH * 0.25}" y1="${HEIGHT * 0.48}" x2="${WIDTH * 0.45}" y2="${HEIGHT * 0.48}" 
            stroke="#000000" stroke-width="2"/>
      <circle cx="${centerX}" cy="${HEIGHT * 0.48}" r="5" fill="#000000"/>
      <line x1="${WIDTH * 0.55}" y1="${HEIGHT * 0.48}" x2="${WIDTH * 0.75}" y2="${HEIGHT * 0.48}" 
            stroke="#000000" stroke-width="2"/>
      
      ${author ? `
      <text x="${centerX}" y="${HEIGHT * 0.60}" 
            style="font-family: Georgia, serif; font-size: 30px; fill: #000000;"
            text-anchor="middle">by ${author}</text>
      ` : ""}
      
      <text x="${centerX}" y="${HEIGHT * 0.88}" 
            style="font-family: Georgia, serif; font-size: 22px; fill: #333333;"
            text-anchor="middle">A Coloring Book</text>
    </svg>`;
  }
  
  // variant === "bordered"
  return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
    
    <!-- Thick decorative border -->
    <rect x="${MARGIN}" y="${MARGIN}" width="${WIDTH - MARGIN*2}" height="${HEIGHT - MARGIN*2}" 
          fill="none" stroke="#000000" stroke-width="8"/>
    
    <!-- Inner thin border -->
    <rect x="${MARGIN + 25}" y="${MARGIN + 25}" width="${WIDTH - MARGIN*2 - 50}" height="${HEIGHT - MARGIN*2 - 50}" 
          fill="none" stroke="#000000" stroke-width="1"/>
    
    <!-- Title -->
    <text x="${centerX}" y="${HEIGHT * 0.40}" 
          style="font-family: Arial, sans-serif; font-size: 72px; font-weight: bold; fill: #000000;"
          text-anchor="middle">${displayTitle}</text>
    
    <!-- Double line separator -->
    <line x1="${WIDTH * 0.20}" y1="${HEIGHT * 0.50}" x2="${WIDTH * 0.80}" y2="${HEIGHT * 0.50}" 
          stroke="#000000" stroke-width="3"/>
    <line x1="${WIDTH * 0.25}" y1="${HEIGHT * 0.52}" x2="${WIDTH * 0.75}" y2="${HEIGHT * 0.52}" 
          stroke="#000000" stroke-width="1"/>
    
    ${author ? `
    <text x="${centerX}" y="${HEIGHT * 0.64}" 
          style="font-family: Arial, sans-serif; font-size: 32px; fill: #000000;"
          text-anchor="middle">by ${author}</text>
    ` : ""}
    
    <text x="${centerX}" y="${HEIGHT * 0.88}" 
          style="font-family: Arial, sans-serif; font-size: 24px; fill: #333333;"
          text-anchor="middle">A Coloring Book</text>
  </svg>`;
}

// ============================================
// COPYRIGHT PAGE TEMPLATES (3 variants)
// ============================================

function generateCopyrightSVG(
  variant: Variant,
  options: { bookTitle: string; authorName?: string; year: string }
): string {
  const title = escapeXml(options.bookTitle);
  const author = options.authorName ? escapeXml(options.authorName) : "";
  const year = options.year;
  const centerX = WIDTH / 2;
  
  if (variant === "minimal") {
    return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
      
      <text x="${centerX}" y="${HEIGHT * 0.30}" 
            style="font-family: Georgia, serif; font-size: 36px; font-weight: bold; fill: #000000;"
            text-anchor="middle">${title}</text>
      
      <text x="${centerX}" y="${HEIGHT * 0.42}" 
            style="font-family: Georgia, serif; font-size: 26px; fill: #000000;"
            text-anchor="middle">© ${year}${author ? ` ${author}` : ""}</text>
      
      <text x="${centerX}" y="${HEIGHT * 0.50}" 
            style="font-family: Georgia, serif; font-size: 22px; fill: #000000;"
            text-anchor="middle">All Rights Reserved</text>
      
      <text x="${centerX}" y="${HEIGHT * 0.64}" 
            style="font-family: Georgia, serif; font-size: 18px; fill: #333333;"
            text-anchor="middle">No part of this publication may be reproduced,</text>
      <text x="${centerX}" y="${HEIGHT * 0.68}" 
            style="font-family: Georgia, serif; font-size: 18px; fill: #333333;"
            text-anchor="middle">distributed, or transmitted without permission.</text>
      
      <text x="${centerX}" y="${HEIGHT * 0.80}" 
            style="font-family: Georgia, serif; font-size: 20px; fill: #000000;"
            text-anchor="middle">For personal use only.</text>
    </svg>`;
  }
  
  if (variant === "classic") {
    return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
      
      <!-- Simple border -->
      <rect x="${MARGIN + 50}" y="${MARGIN + 50}" width="${WIDTH - MARGIN*2 - 100}" height="${HEIGHT - MARGIN*2 - 100}" 
            fill="none" stroke="#000000" stroke-width="1"/>
      
      <text x="${centerX}" y="${HEIGHT * 0.28}" 
            style="font-family: Georgia, serif; font-size: 38px; font-weight: bold; fill: #000000;"
            text-anchor="middle">${title}</text>
      
      <line x1="${WIDTH * 0.30}" y1="${HEIGHT * 0.34}" x2="${WIDTH * 0.70}" y2="${HEIGHT * 0.34}" 
            stroke="#000000" stroke-width="1"/>
      
      <text x="${centerX}" y="${HEIGHT * 0.44}" 
            style="font-family: Georgia, serif; font-size: 28px; fill: #000000;"
            text-anchor="middle">Copyright © ${year}</text>
      
      ${author ? `
      <text x="${centerX}" y="${HEIGHT * 0.52}" 
            style="font-family: Georgia, serif; font-size: 24px; fill: #000000;"
            text-anchor="middle">${author}</text>
      ` : ""}
      
      <text x="${centerX}" y="${HEIGHT * 0.62}" 
            style="font-family: Georgia, serif; font-size: 20px; fill: #000000;"
            text-anchor="middle">All Rights Reserved</text>
      
      <text x="${centerX}" y="${HEIGHT * 0.74}" 
            style="font-family: Georgia, serif; font-size: 16px; fill: #333333;"
            text-anchor="middle">No part of this publication may be reproduced,</text>
      <text x="${centerX}" y="${HEIGHT * 0.78}" 
            style="font-family: Georgia, serif; font-size: 16px; fill: #333333;"
            text-anchor="middle">distributed, or transmitted in any form without</text>
      <text x="${centerX}" y="${HEIGHT * 0.82}" 
            style="font-family: Georgia, serif; font-size: 16px; fill: #333333;"
            text-anchor="middle">prior written permission.</text>
      
      <text x="${centerX}" y="${HEIGHT * 0.92}" 
            style="font-family: Georgia, serif; font-size: 18px; fill: #555555;"
            text-anchor="middle">This coloring book is for personal use only.</text>
    </svg>`;
  }
  
  // variant === "bordered"
  return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
    
    <!-- Double border -->
    <rect x="${MARGIN}" y="${MARGIN}" width="${WIDTH - MARGIN*2}" height="${HEIGHT - MARGIN*2}" 
          fill="none" stroke="#000000" stroke-width="4"/>
    <rect x="${MARGIN + 20}" y="${MARGIN + 20}" width="${WIDTH - MARGIN*2 - 40}" height="${HEIGHT - MARGIN*2 - 40}" 
          fill="none" stroke="#000000" stroke-width="1"/>
    
    <text x="${centerX}" y="${HEIGHT * 0.26}" 
          style="font-family: Arial, sans-serif; font-size: 40px; font-weight: bold; fill: #000000;"
          text-anchor="middle">${title}</text>
    
    <line x1="${WIDTH * 0.25}" y1="${HEIGHT * 0.32}" x2="${WIDTH * 0.75}" y2="${HEIGHT * 0.32}" 
          stroke="#000000" stroke-width="2"/>
    
    <text x="${centerX}" y="${HEIGHT * 0.42}" 
          style="font-family: Arial, sans-serif; font-size: 30px; fill: #000000;"
          text-anchor="middle">© ${year}${author ? ` ${author}` : ""}</text>
    
    <text x="${centerX}" y="${HEIGHT * 0.52}" 
          style="font-family: Arial, sans-serif; font-size: 24px; fill: #000000;"
          text-anchor="middle">All Rights Reserved</text>
    
    <text x="${centerX}" y="${HEIGHT * 0.66}" 
          style="font-family: Arial, sans-serif; font-size: 18px; fill: #333333;"
          text-anchor="middle">No part of this publication may be reproduced,</text>
    <text x="${centerX}" y="${HEIGHT * 0.70}" 
          style="font-family: Arial, sans-serif; font-size: 18px; fill: #333333;"
          text-anchor="middle">distributed, or transmitted in any form</text>
    <text x="${centerX}" y="${HEIGHT * 0.74}" 
          style="font-family: Arial, sans-serif; font-size: 18px; fill: #333333;"
          text-anchor="middle">without prior written permission.</text>
    
    <text x="${centerX}" y="${HEIGHT * 0.86}" 
          style="font-family: Arial, sans-serif; font-size: 22px; fill: #000000;"
          text-anchor="middle">For personal use only.</text>
  </svg>`;
}

// ============================================
// BELONGS TO PAGE TEMPLATES (3 variants)
// ============================================

function generateBelongsToSVG(
  variant: Variant,
  options: { belongsToName?: string; seed: number }
): string {
  const name = options.belongsToName ? escapeXml(options.belongsToName) : "";
  const centerX = WIDTH / 2;
  
  if (variant === "minimal") {
    return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
      
      <text x="${centerX}" y="${HEIGHT * 0.40}" 
            style="font-family: Georgia, serif; font-size: 52px; font-weight: bold; fill: #000000;"
            text-anchor="middle">This Book Belongs To:</text>
      
      ${name ? `
      <text x="${centerX}" y="${HEIGHT * 0.55}" 
            style="font-family: Georgia, serif; font-size: 44px; fill: #000000;"
            text-anchor="middle">${name}</text>
      ` : `
      <line x1="${WIDTH * 0.20}" y1="${HEIGHT * 0.55}" x2="${WIDTH * 0.80}" y2="${HEIGHT * 0.55}" 
            stroke="#000000" stroke-width="2"/>
      `}
      
      <text x="${centerX}" y="${HEIGHT * 0.72}" 
            style="font-family: Georgia, serif; font-size: 22px; fill: #555555;"
            text-anchor="middle">Date: ____________________</text>
    </svg>`;
  }
  
  if (variant === "classic") {
    return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
      
      <!-- Decorative frame -->
      <rect x="${MARGIN + 30}" y="${MARGIN + 30}" width="${WIDTH - MARGIN*2 - 60}" height="${HEIGHT - MARGIN*2 - 60}" 
            fill="none" stroke="#000000" stroke-width="2" rx="20"/>
      
      <!-- Corner decorations -->
      <circle cx="${MARGIN + 60}" cy="${MARGIN + 60}" r="8" fill="#000000"/>
      <circle cx="${WIDTH - MARGIN - 60}" cy="${MARGIN + 60}" r="8" fill="#000000"/>
      <circle cx="${MARGIN + 60}" cy="${HEIGHT - MARGIN - 60}" r="8" fill="#000000"/>
      <circle cx="${WIDTH - MARGIN - 60}" cy="${HEIGHT - MARGIN - 60}" r="8" fill="#000000"/>
      
      <text x="${centerX}" y="${HEIGHT * 0.35}" 
            style="font-family: Georgia, serif; font-size: 48px; font-weight: bold; fill: #000000;"
            text-anchor="middle">This Book</text>
      <text x="${centerX}" y="${HEIGHT * 0.43}" 
            style="font-family: Georgia, serif; font-size: 48px; font-weight: bold; fill: #000000;"
            text-anchor="middle">Belongs To:</text>
      
      ${name ? `
      <text x="${centerX}" y="${HEIGHT * 0.58}" 
            style="font-family: Georgia, serif; font-size: 42px; fill: #000000;"
            text-anchor="middle">${name}</text>
      ` : `
      <line x1="${WIDTH * 0.22}" y1="${HEIGHT * 0.58}" x2="${WIDTH * 0.78}" y2="${HEIGHT * 0.58}" 
            stroke="#000000" stroke-width="2"/>
      `}
      
      <line x1="${WIDTH * 0.30}" y1="${HEIGHT * 0.66}" x2="${WIDTH * 0.70}" y2="${HEIGHT * 0.66}" 
            stroke="#000000" stroke-width="1"/>
      
      <text x="${centerX}" y="${HEIGHT * 0.78}" 
            style="font-family: Georgia, serif; font-size: 20px; fill: #333333;"
            text-anchor="middle">Date: ____________________</text>
    </svg>`;
  }
  
  // variant === "bordered"
  return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
    
    <!-- Bold border -->
    <rect x="${MARGIN}" y="${MARGIN}" width="${WIDTH - MARGIN*2}" height="${HEIGHT - MARGIN*2}" 
          fill="none" stroke="#000000" stroke-width="6"/>
    
    <!-- Inner decorative line -->
    <rect x="${MARGIN + 25}" y="${MARGIN + 25}" width="${WIDTH - MARGIN*2 - 50}" height="${HEIGHT - MARGIN*2 - 50}" 
          fill="none" stroke="#000000" stroke-width="1" stroke-dasharray="10,5"/>
    
    <text x="${centerX}" y="${HEIGHT * 0.32}" 
          style="font-family: Arial, sans-serif; font-size: 56px; font-weight: bold; fill: #000000;"
          text-anchor="middle">This Book</text>
    <text x="${centerX}" y="${HEIGHT * 0.42}" 
          style="font-family: Arial, sans-serif; font-size: 56px; font-weight: bold; fill: #000000;"
          text-anchor="middle">Belongs To:</text>
    
    ${name ? `
    <text x="${centerX}" y="${HEIGHT * 0.58}" 
          style="font-family: Arial, sans-serif; font-size: 46px; fill: #000000;"
          text-anchor="middle">${name}</text>
    ` : `
    <line x1="${WIDTH * 0.18}" y1="${HEIGHT * 0.58}" x2="${WIDTH * 0.82}" y2="${HEIGHT * 0.58}" 
          stroke="#000000" stroke-width="3"/>
    `}
    
    <text x="${centerX}" y="${HEIGHT * 0.74}" 
          style="font-family: Arial, sans-serif; font-size: 24px; fill: #333333;"
          text-anchor="middle">Date: ____________________</text>
    
    <text x="${centerX}" y="${HEIGHT * 0.86}" 
          style="font-family: Arial, sans-serif; font-size: 20px; fill: #555555;"
          text-anchor="middle">Keep coloring!</text>
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
