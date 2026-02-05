/**
 * POST /api/generate/front-matter
 * 
 * Generate front matter pages (title, copyright, belongs-to) with Supabase persistence.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import sharp from 'sharp';
import { 
  getSupabaseServerClient, 
  getRetentionHours, 
  calculateExpiresAt,
  uploadToStorage 
} from '@/lib/supabase/server';
import type { AssetMeta } from '@/types/database';

export const maxDuration = 60;

const requestSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string(),
  frontMatterType: z.enum(['title', 'copyright', 'belongsTo']),
  options: z.object({
    bookTitle: z.string().default('My Coloring Book'),
    authorName: z.string().optional(),
    year: z.string().default(new Date().getFullYear().toString()),
    publisher: z.string().optional(),
    belongsToName: z.string().optional(),
    subtitle: z.string().optional(),
  }),
  // Optional: existing asset ID for regeneration
  assetId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = requestSchema.parse(body);
    
    const supabase = getSupabaseServerClient();
    
    // Get retention hours for expiry calculation
    const retentionHours = await getRetentionHours(data.userId);
    const expiresAt = calculateExpiresAt(retentionHours);
    
    // Create or update asset row
    let assetId = data.assetId;
    
    if (!assetId) {
      // Check if asset already exists for this front matter type
      const { data: existing } = await supabase
        .from('generated_assets')
        .select('id')
        .eq('project_id', data.projectId)
        .eq('asset_type', 'front_matter')
        .eq('meta->>frontMatterType', data.frontMatterType)
        .single();
      
      assetId = existing?.id;
    }
    
    const meta: AssetMeta = {
      frontMatterType: data.frontMatterType,
      title: data.options.bookTitle,
    };
    
    if (assetId) {
      await supabase
        .from('generated_assets')
        .update({
          status: 'generating',
          meta,
        })
        .eq('id', assetId);
    } else {
      const { data: newAsset, error } = await supabase
        .from('generated_assets')
        .insert({
          project_id: data.projectId,
          user_id: data.userId,
          asset_type: 'front_matter',
          status: 'generating',
          meta,
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('[generate/front-matter] Failed to create asset row:', error);
        return NextResponse.json(
          { error: 'Failed to create asset record' },
          { status: 500 }
        );
      }
      
      assetId = newAsset.id;
    }
    
    console.log(`[generate/front-matter] Generating ${data.frontMatterType} for asset ${assetId}`);
    
    try {
      // Generate SVG content
      const width = 1275;
      const height = 1650;
      let svgContent: string;
      
      if (data.frontMatterType === 'title') {
        svgContent = createTitlePageSVG(width, height, data.options);
      } else if (data.frontMatterType === 'copyright') {
        svgContent = createCopyrightPageSVG(width, height, data.options);
      } else {
        svgContent = createBelongsToPageSVG(width, height, data.options);
      }
      
      // Convert SVG to PNG
      const pngBuffer = await sharp(Buffer.from(svgContent))
        .flatten({ background: '#ffffff' })
        .png()
        .toBuffer();
      
      // Upload to storage
      const storagePath = `${data.userId}/${data.projectId}/front-matter/${data.frontMatterType}.png`;
      
      const { path, error: uploadError } = await uploadToStorage(
        'generated',
        storagePath,
        pngBuffer,
        'image/png'
      );
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Update asset as ready
      await supabase
        .from('generated_assets')
        .update({
          status: 'ready',
          storage_path: path,
          expires_at: expiresAt,
          meta: {
            ...meta,
            fileSize: pngBuffer.length,
          },
        })
        .eq('id', assetId);
      
      console.log(`[generate/front-matter] Success! Asset ${assetId} ready`);
      
      return NextResponse.json({
        success: true,
        assetId,
        status: 'ready',
        storagePath: path,
        expiresAt,
        // Include base64 for immediate preview
        imageBase64: pngBuffer.toString('base64'),
      });
      
    } catch (genError) {
      console.error('[generate/front-matter] Generation failed:', genError);
      
      const errorMsg = genError instanceof Error ? genError.message : 'Generation failed';
      
      await supabase
        .from('generated_assets')
        .update({
          status: 'failed',
          meta: {
            ...meta,
            error: errorMsg,
          },
        })
        .eq('id', assetId);
      
      return NextResponse.json({
        success: false,
        assetId,
        status: 'failed',
        error: errorMsg,
      });
    }
    
  } catch (error) {
    console.error('[generate/front-matter] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}

// SVG Generation helpers
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createTitlePageSVG(
  width: number,
  height: number,
  options: z.infer<typeof requestSchema>['options']
): string {
  const title = escapeXml(options.bookTitle || 'My Coloring Book');
  const displayTitle = title.length > 40 ? title.substring(0, 37) + '...' : title;
  const subtitle = options.subtitle ? escapeXml(options.subtitle) : '';
  const author = options.authorName ? escapeXml(options.authorName) : '';
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
    <rect x="50" y="50" width="${width - 100}" height="${height - 100}" 
          fill="none" stroke="#e0e0e0" stroke-width="2" rx="10"/>
    <text x="${width / 2}" y="${height * 0.35}" 
          font-family="sans-serif" font-size="64" font-weight="bold" 
          text-anchor="middle" fill="#333333">${displayTitle}</text>
    ${subtitle ? `<text x="${width / 2}" y="${height * 0.45}" 
          font-family="sans-serif" font-size="32"
          text-anchor="middle" fill="#666666">${subtitle}</text>` : ''}
    <line x1="${width * 0.3}" y1="${height * 0.52}" 
          x2="${width * 0.7}" y2="${height * 0.52}" 
          stroke="#cccccc" stroke-width="2"/>
    ${author ? `<text x="${width / 2}" y="${height * 0.65}" 
          font-family="sans-serif" font-size="28"
          text-anchor="middle" fill="#555555">by ${author}</text>` : ''}
    <text x="${width / 2}" y="${height * 0.92}" 
          font-family="sans-serif" font-size="18"
          text-anchor="middle" fill="#999999">A Coloring Book</text>
  </svg>`;
}

function createCopyrightPageSVG(
  width: number,
  height: number,
  options: z.infer<typeof requestSchema>['options']
): string {
  const title = escapeXml(options.bookTitle || 'My Coloring Book');
  const author = options.authorName ? escapeXml(options.authorName) : 'Author';
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

function createBelongsToPageSVG(
  width: number,
  height: number,
  options: z.infer<typeof requestSchema>['options']
): string {
  const name = options.belongsToName ? escapeXml(options.belongsToName) : '';
  
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
    ${name 
      ? `<text x="${width / 2}" y="${height * 0.55}" 
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

