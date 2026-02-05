/**
 * POST /api/export/build-pdf
 * 
 * Build PDF from project assets and upload to Supabase Storage.
 * Returns signed URL for preview/download.
 * 
 * Order: Title Page → Copyright Page → Belongs To Page → Coloring Pages
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getSupabaseServerClient, uploadToStorage, createSignedUrl } from '@/lib/supabase/server';

export const maxDuration = 300;

const requestSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string(),
  // Options
  includePageNumbers: z.boolean().default(true),
});

// PDF dimensions (72 DPI)
const PDF_WIDTH = 612;  // 8.5"
const PDF_HEIGHT = 792; // 11"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = requestSchema.parse(body);
    
    const supabase = getSupabaseServerClient();
    
    console.log(`[build-pdf] Starting PDF build for project ${data.projectId}`);
    
    // Get project info
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name, settings')
      .eq('id', data.projectId)
      .single();
    
    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Get all ready assets for this project
    const { data: assets, error: assetsError } = await supabase
      .from('generated_assets')
      .select('*')
      .eq('project_id', data.projectId)
      .eq('status', 'ready')
      .order('page_number', { ascending: true });
    
    if (assetsError) {
      console.error('[build-pdf] Assets query error:', assetsError);
      return NextResponse.json(
        { error: 'Failed to fetch assets' },
        { status: 500 }
      );
    }
    
    // Separate by type
    const allAssets = (assets || []) as Array<{
      id: string;
      asset_type: string;
      storage_path: string | null;
      storage_bucket: string;
      page_number: number | null;
      meta: Record<string, unknown>;
    }>;
    
    const frontMatterAssets = allAssets.filter(a => a.asset_type === 'front_matter');
    const pageAssets = allAssets.filter(a => a.asset_type === 'page_image');
    
    const titlePage = frontMatterAssets.find(a => (a.meta as { frontMatterType?: string })?.frontMatterType === 'title');
    const copyrightPage = frontMatterAssets.find(a => (a.meta as { frontMatterType?: string })?.frontMatterType === 'copyright');
    const belongsToPage = frontMatterAssets.find(a => (a.meta as { frontMatterType?: string })?.frontMatterType === 'belongsTo');
    
    if (pageAssets.length === 0 && frontMatterAssets.length === 0) {
      return NextResponse.json(
        { error: 'No assets to include in PDF' },
        { status: 400 }
      );
    }
    
    console.log(`[build-pdf] Found ${pageAssets.length} pages, ${frontMatterAssets.length} front matter`);
    
    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    let pageNumber = 0;
    
    // Helper to add image page
    async function addImagePage(asset: typeof allAssets[0]) {
      if (!asset.storage_path) return false;
      
      try {
        const { data: fileData, error } = await supabase.storage
          .from(asset.storage_bucket || 'colweb')
          .download(asset.storage_path);
        
        if (error || !fileData) {
          console.error(`[build-pdf] Failed to download ${asset.storage_path}:`, error);
          return false;
        }
        
        const arrayBuffer = await fileData.arrayBuffer();
        const imageBytes = new Uint8Array(arrayBuffer);
        
        // Embed image (PNG)
        const image = await pdfDoc.embedPng(imageBytes);
        
        // Add page
        const page = pdfDoc.addPage([PDF_WIDTH, PDF_HEIGHT]);
        pageNumber++;
        
        // Scale to fit with margins
        const margin = 18; // 0.25"
        const maxWidth = PDF_WIDTH - margin * 2;
        const maxHeight = PDF_HEIGHT - margin * 2 - (data.includePageNumbers ? 20 : 0);
        
        const scaleX = maxWidth / image.width;
        const scaleY = maxHeight / image.height;
        const scale = Math.min(scaleX, scaleY, 1); // Don't upscale
        
        const scaledWidth = image.width * scale;
        const scaledHeight = image.height * scale;
        
        // Center
        const x = (PDF_WIDTH - scaledWidth) / 2;
        const y = data.includePageNumbers 
          ? (PDF_HEIGHT - scaledHeight) / 2 + 10
          : (PDF_HEIGHT - scaledHeight) / 2;
        
        page.drawImage(image, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });
        
        // Page number
        if (data.includePageNumbers && asset.asset_type === 'page_image') {
          const numText = `- ${pageNumber} -`;
          const numWidth = font.widthOfTextAtSize(numText, 10);
          page.drawText(numText, {
            x: (PDF_WIDTH - numWidth) / 2,
            y: 30,
            size: 10,
            font,
            color: rgb(0.5, 0.5, 0.5),
          });
        }
        
        return true;
      } catch (err) {
        console.error(`[build-pdf] Error adding page:`, err);
        return false;
      }
    }
    
    // Add pages in order
    // 1. Title page
    if (titlePage) {
      await addImagePage(titlePage);
    }
    
    // 2. Copyright page
    if (copyrightPage) {
      await addImagePage(copyrightPage);
    }
    
    // 3. Belongs to page
    if (belongsToPage) {
      await addImagePage(belongsToPage);
    }
    
    // 4. Coloring pages
    for (const asset of pageAssets) {
      await addImagePage(asset);
    }
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    console.log(`[build-pdf] PDF generated: ${pdfBytes.length} bytes, ${pageNumber} pages`);
    
    // Upload to storage
    const storagePath = `${data.userId}/${data.projectId}/export/book.pdf`;
    const { path, error: uploadError } = await uploadToStorage(
      'colweb',
      storagePath,
      pdfBytes,
      'application/pdf'
    );
    
    if (uploadError) {
      console.error('[build-pdf] Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload PDF' },
        { status: 500 }
      );
    }
    
    // Upsert asset record
    const { data: existingAsset } = await supabase
      .from('generated_assets')
      .select('id')
      .eq('project_id', data.projectId)
      .eq('asset_type', 'pdf')
      .single();
    
    if (existingAsset) {
      await supabase
        .from('generated_assets')
        .update({
          storage_path: path,
          status: 'ready',
          meta: {
            pageCount: pageNumber,
            fileSize: pdfBytes.length,
          },
        })
        .eq('id', existingAsset.id);
    } else {
      await supabase
        .from('generated_assets')
        .insert({
          project_id: data.projectId,
          user_id: data.userId,
          asset_type: 'pdf',
          storage_bucket: 'colweb',
          storage_path: path,
          mime_type: 'application/pdf',
          status: 'ready',
          meta: {
            pageCount: pageNumber,
            fileSize: pdfBytes.length,
          },
        });
    }
    
    // Create signed URL for preview
    const signedUrl = await createSignedUrl('colweb', path, 3600);
    
    return NextResponse.json({
      success: true,
      storagePath: path,
      signedUrl,
      pageCount: pageNumber,
      fileSize: pdfBytes.length,
    });
    
  } catch (error) {
    console.error('[build-pdf] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PDF build failed' },
      { status: 500 }
    );
  }
}

