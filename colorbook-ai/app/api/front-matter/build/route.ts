/**
 * POST /api/front-matter/build
 * 
 * Generate front matter pages (Title, Copyright, Belongs To) as PNG images.
 * Uses deterministic SVG rendering - NOT AI generation.
 * Saves to Supabase Storage.
 * 
 * Page size: US Letter (2550x3300 @ 300 DPI)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import sharp from 'sharp';
import { 
  getSupabaseServerClient, 
  uploadToStorage, 
  createSignedUrl,
  getRetentionHours,
  calculateExpiresAt 
} from '@/lib/supabase/server';

export const maxDuration = 60;

const requestSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string(),
  pageType: z.enum(['title', 'copyright', 'belongsTo']),
  options: z.object({
    bookTitle: z.string().default('My Coloring Book'),
    subtitle: z.string().optional(),
    authorName: z.string().optional(),
    publisherName: z.string().optional(),
    year: z.string().default(new Date().getFullYear().toString()),
    belongsToName: z.string().optional(),
    giftedBy: z.string().optional(),
  }),
});

// US Letter at 300 DPI
const PAGE_WIDTH = 2550;
const PAGE_HEIGHT = 3300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = requestSchema.parse(body);
    
    const supabase = getSupabaseServerClient();
    
    console.log(`[front-matter/build] Generating ${data.pageType} page`);
    
    // Generate SVG
    let svgContent: string;
    
    switch (data.pageType) {
      case 'title':
        svgContent = generateTitlePageSVG(data.options);
        break;
      case 'copyright':
        svgContent = generateCopyrightPageSVG(data.options);
        break;
      case 'belongsTo':
        svgContent = generateBelongsToPageSVG(data.options);
        break;
    }
    
    // Convert SVG to PNG using Sharp
    const pngBuffer = await sharp(Buffer.from(svgContent))
      .flatten({ background: '#ffffff' })
      .png({ compressionLevel: 9 })
      .toBuffer();
    
    console.log(`[front-matter/build] PNG generated: ${pngBuffer.length} bytes`);
    
    // Upload to Supabase Storage
    const storagePath = `${data.userId}/${data.projectId}/front/${data.pageType}.png`;
    const { path, error: uploadError } = await uploadToStorage(
      'colweb',
      storagePath,
      pngBuffer,
      'image/png'
    );
    
    if (uploadError) {
      console.error('[front-matter/build] Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }
    
    // Get retention hours
    const retentionHours = await getRetentionHours(data.userId);
    const expiresAt = calculateExpiresAt(retentionHours);
    
    // Upsert asset record
    const { data: existingAsset } = await supabase
      .from('generated_assets')
      .select('id')
      .eq('project_id', data.projectId)
      .eq('asset_type', 'front_matter')
      .eq('meta->>frontMatterType', data.pageType)
      .single();
    
    const assetData = {
      storage_path: path,
      status: 'ready' as const,
      expires_at: expiresAt,
      meta: {
        frontMatterType: data.pageType,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        fileSize: pngBuffer.length,
        options: data.options,
      },
    };
    
    if (existingAsset) {
      await supabase
        .from('generated_assets')
        .update(assetData)
        .eq('id', existingAsset.id);
    } else {
      await supabase
        .from('generated_assets')
        .insert({
          project_id: data.projectId,
          user_id: data.userId,
          asset_type: 'front_matter',
          storage_bucket: 'colweb',
          mime_type: 'image/png',
          ...assetData,
        });
    }
    
    // Create signed URL for preview
    const signedUrl = await createSignedUrl('colweb', path, 3600);
    
    return NextResponse.json({
      success: true,
      pageType: data.pageType,
      storagePath: path,
      signedUrl,
      // Also include base64 for immediate preview
      imageBase64: pngBuffer.toString('base64'),
    });
    
  } catch (error) {
    console.error('[front-matter/build] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}

// ===== SVG Generators =====

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateTitlePageSVG(options: z.infer<typeof requestSchema>['options']): string {
  const title = escapeXml(options.bookTitle);
  const subtitle = options.subtitle ? escapeXml(options.subtitle) : '';
  const author = options.authorName ? escapeXml(options.authorName) : '';
  
  // Safe margins
  const marginX = 200;
  const marginY = 300;
  const contentWidth = PAGE_WIDTH - marginX * 2;
  
  return `<svg width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
    
    <!-- Decorative border -->
    <rect x="${marginX}" y="${marginY}" width="${contentWidth}" height="${PAGE_HEIGHT - marginY * 2}" 
          fill="none" stroke="#dddddd" stroke-width="4" rx="20"/>
    
    <!-- Title -->
    <text x="${PAGE_WIDTH / 2}" y="${PAGE_HEIGHT * 0.38}" 
          font-family="Georgia, serif" font-size="180" font-weight="bold"
          text-anchor="middle" fill="#1a1a1a">${title}</text>
    
    ${subtitle ? `
    <text x="${PAGE_WIDTH / 2}" y="${PAGE_HEIGHT * 0.46}" 
          font-family="Georgia, serif" font-size="80"
          text-anchor="middle" fill="#4a4a4a">${subtitle}</text>
    ` : ''}
    
    <!-- Decorative line -->
    <line x1="${PAGE_WIDTH * 0.3}" y1="${PAGE_HEIGHT * 0.52}" 
          x2="${PAGE_WIDTH * 0.7}" y2="${PAGE_HEIGHT * 0.52}" 
          stroke="#cccccc" stroke-width="3"/>
    
    ${author ? `
    <text x="${PAGE_WIDTH / 2}" y="${PAGE_HEIGHT * 0.62}" 
          font-family="Arial, sans-serif" font-size="70"
          text-anchor="middle" fill="#3a3a3a">by ${author}</text>
    ` : ''}
    
    <text x="${PAGE_WIDTH / 2}" y="${PAGE_HEIGHT * 0.88}" 
          font-family="Arial, sans-serif" font-size="50"
          text-anchor="middle" fill="#888888">A Coloring Book</text>
  </svg>`;
}

function generateCopyrightPageSVG(options: z.infer<typeof requestSchema>['options']): string {
  const title = escapeXml(options.bookTitle);
  const author = options.authorName ? escapeXml(options.authorName) : '';
  const publisher = options.publisherName ? escapeXml(options.publisherName) : '';
  const year = options.year;
  
  const lines = [
    title,
    '',
    `Copyright © ${year}${author ? ` ${author}` : ''}`,
    'All Rights Reserved',
    '',
    'No part of this publication may be reproduced, distributed,',
    'or transmitted in any form or by any means, including',
    'photocopying, recording, or other electronic or mechanical',
    'methods, without the prior written permission of the publisher.',
    '',
    publisher ? `Published by ${publisher}` : '',
    '',
    'This coloring book is for personal use only.',
    '',
    '',
    'Created with ColorBook AI',
  ].filter(Boolean);
  
  const startY = PAGE_HEIGHT * 0.35;
  const lineHeight = 90;
  
  const textElements = lines.map((line, i) => {
    const y = startY + i * lineHeight;
    const fontSize = i === 0 ? 70 : 50;
    const fontWeight = i === 0 || i === 2 ? 'bold' : 'normal';
    const fill = i === 0 ? '#1a1a1a' : '#3a3a3a';
    return `<text x="${PAGE_WIDTH / 2}" y="${y}" 
            font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}"
            text-anchor="middle" fill="${fill}">${escapeXml(line)}</text>`;
  }).join('\n    ');
  
  return `<svg width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
    ${textElements}
  </svg>`;
}

function generateBelongsToPageSVG(options: z.infer<typeof requestSchema>['options']): string {
  const name = options.belongsToName ? escapeXml(options.belongsToName) : '';
  const giftedBy = options.giftedBy ? escapeXml(options.giftedBy) : '';
  
  const lineY = PAGE_HEIGHT * 0.52;
  const lineWidth = PAGE_WIDTH * 0.4;
  const lineX = (PAGE_WIDTH - lineWidth) / 2;
  
  return `<svg width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
    
    <!-- Decorative frame -->
    <rect x="200" y="200" width="${PAGE_WIDTH - 400}" height="${PAGE_HEIGHT - 400}" 
          fill="none" stroke="#e0e0e0" stroke-width="6" rx="40"/>
    
    <!-- Decorative dots -->
    <circle cx="${PAGE_WIDTH * 0.35}" cy="${PAGE_HEIGHT * 0.25}" r="30" fill="#FFD700"/>
    <circle cx="${PAGE_WIDTH * 0.5}" cy="${PAGE_HEIGHT * 0.25}" r="30" fill="#FFD700"/>
    <circle cx="${PAGE_WIDTH * 0.65}" cy="${PAGE_HEIGHT * 0.25}" r="30" fill="#FFD700"/>
    
    <!-- Title -->
    <text x="${PAGE_WIDTH / 2}" y="${PAGE_HEIGHT * 0.40}" 
          font-family="Georgia, serif" font-size="130" font-weight="bold"
          text-anchor="middle" fill="#1a1a1a">This Book Belongs To</text>
    
    ${name ? `
    <text x="${PAGE_WIDTH / 2}" y="${lineY}" 
          font-family="Georgia, serif" font-size="100"
          text-anchor="middle" fill="#3a3a3a">${name}</text>
    ` : `
    <line x1="${lineX}" y1="${lineY}" 
          x2="${lineX + lineWidth}" y2="${lineY}" 
          stroke="#1a1a1a" stroke-width="4"/>
    `}
    
    ${giftedBy ? `
    <text x="${PAGE_WIDTH / 2}" y="${PAGE_HEIGHT * 0.65}" 
          font-family="Arial, sans-serif" font-size="60"
          text-anchor="middle" fill="#5a5a5a">Gifted by: ${giftedBy}</text>
    ` : `
    <text x="${PAGE_WIDTH / 2}" y="${PAGE_HEIGHT * 0.62}" 
          font-family="Arial, sans-serif" font-size="60"
          text-anchor="middle" fill="#8a8a8a">Gifted by:</text>
    <line x1="${lineX}" y1="${PAGE_HEIGHT * 0.67}" 
          x2="${lineX + lineWidth}" y2="${PAGE_HEIGHT * 0.67}" 
          stroke="#1a1a1a" stroke-width="3"/>
    `}
    
    <!-- Decorative hearts -->
    <circle cx="${PAGE_WIDTH * 0.35}" cy="${PAGE_HEIGHT * 0.78}" r="25" fill="#FF6B6B"/>
    <circle cx="${PAGE_WIDTH * 0.5}" cy="${PAGE_HEIGHT * 0.78}" r="25" fill="#FF6B6B"/>
    <circle cx="${PAGE_WIDTH * 0.65}" cy="${PAGE_HEIGHT * 0.78}" r="25" fill="#FF6B6B"/>
  </svg>`;
}

