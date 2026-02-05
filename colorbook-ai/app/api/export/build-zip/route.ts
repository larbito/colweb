/**
 * POST /api/export/build-zip
 * 
 * Build ZIP from project assets and upload to Supabase Storage.
 * Returns signed URL for download.
 * 
 * Structure:
 * - /front/title.png
 * - /front/copyright.png
 * - /front/belongs.png
 * - /pages/page-001.png ... page-N.png
 * - /export/book.pdf (if exists)
 * - /meta/prompts.json
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import JSZip from 'jszip';
import { getSupabaseServerClient, uploadToStorage, createSignedUrl } from '@/lib/supabase/server';

export const maxDuration = 300;

const requestSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string(),
  includePdf: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = requestSchema.parse(body);
    
    const supabase = getSupabaseServerClient();
    
    console.log(`[build-zip] Starting ZIP build for project ${data.projectId}`);
    
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
    
    // Get all ready assets
    const { data: assets, error: assetsError } = await supabase
      .from('generated_assets')
      .select('*')
      .eq('project_id', data.projectId)
      .eq('status', 'ready')
      .order('page_number', { ascending: true });
    
    if (assetsError) {
      console.error('[build-zip] Assets query error:', assetsError);
      return NextResponse.json(
        { error: 'Failed to fetch assets' },
        { status: 500 }
      );
    }
    
    const allAssets = (assets || []) as Array<{
      id: string;
      asset_type: string;
      storage_path: string | null;
      storage_bucket: string;
      page_number: number | null;
      meta: Record<string, unknown>;
    }>;
    
    if (allAssets.length === 0) {
      return NextResponse.json(
        { error: 'No assets to include in ZIP' },
        { status: 400 }
      );
    }
    
    const zip = new JSZip();
    const pagesFolder = zip.folder('pages');
    const frontFolder = zip.folder('front');
    const exportFolder = zip.folder('export');
    const metaFolder = zip.folder('meta');
    
    let downloadedCount = 0;
    const prompts: Record<string, string> = {};
    
    // Helper to download and add file
    async function addFileToZip(
      asset: typeof allAssets[0],
      folder: JSZip | null,
      filename: string
    ): Promise<boolean> {
      if (!asset.storage_path || !folder) return false;
      
      try {
        const { data: fileData, error } = await supabase.storage
          .from(asset.storage_bucket || 'colweb')
          .download(asset.storage_path);
        
        if (error || !fileData) {
          console.error(`[build-zip] Failed to download ${asset.storage_path}:`, error);
          return false;
        }
        
        const arrayBuffer = await fileData.arrayBuffer();
        folder.file(filename, arrayBuffer);
        downloadedCount++;
        return true;
      } catch (err) {
        console.error(`[build-zip] Error adding ${filename}:`, err);
        return false;
      }
    }
    
    // Process assets by type
    for (const asset of allAssets) {
      if (asset.asset_type === 'front_matter') {
        const fmType = (asset.meta as { frontMatterType?: string })?.frontMatterType || 'unknown';
        await addFileToZip(asset, frontFolder, `${fmType}.png`);
        
      } else if (asset.asset_type === 'page_image') {
        const pageNum = String(asset.page_number || 0).padStart(3, '0');
        await addFileToZip(asset, pagesFolder, `page-${pageNum}.png`);
        
        // Store prompt if available
        const prompt = (asset.meta as { prompt?: string })?.prompt;
        if (prompt) {
          prompts[`page-${pageNum}`] = prompt;
        }
        
      } else if (asset.asset_type === 'pdf' && data.includePdf) {
        await addFileToZip(asset, exportFolder, 'book.pdf');
      }
    }
    
    // Add prompts.json
    if (Object.keys(prompts).length > 0 && metaFolder) {
      metaFolder.file('prompts.json', JSON.stringify({
        projectName: project.name,
        exportDate: new Date().toISOString(),
        prompts,
      }, null, 2));
    }
    
    // Add README
    zip.file('README.txt', `# ${project.name || 'Coloring Book'}

Exported: ${new Date().toLocaleString()}
Total Files: ${downloadedCount}

## Folders
- pages/ - Coloring pages (PNG, US Letter @ 300 DPI)
- front/ - Title, copyright, belongs-to pages (PNG)
- export/ - Full PDF book (if generated)
- meta/ - Prompts and settings (JSON)

Created with ColorBook AI
`);
    
    // Generate ZIP
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    
    console.log(`[build-zip] ZIP generated: ${zipBuffer.length} bytes, ${downloadedCount} files`);
    
    // Upload to storage
    const storagePath = `${data.userId}/${data.projectId}/export/book.zip`;
    const { path, error: uploadError } = await uploadToStorage(
      'colweb',
      storagePath,
      zipBuffer,
      'application/zip'
    );
    
    if (uploadError) {
      console.error('[build-zip] Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload ZIP' },
        { status: 500 }
      );
    }
    
    // Upsert asset record
    const { data: existingAsset } = await supabase
      .from('generated_assets')
      .select('id')
      .eq('project_id', data.projectId)
      .eq('asset_type', 'zip')
      .single();
    
    if (existingAsset) {
      await supabase
        .from('generated_assets')
        .update({
          storage_path: path,
          status: 'ready',
          meta: {
            fileCount: downloadedCount,
            fileSize: zipBuffer.length,
          },
        })
        .eq('id', existingAsset.id);
    } else {
      await supabase
        .from('generated_assets')
        .insert({
          project_id: data.projectId,
          user_id: data.userId,
          asset_type: 'zip',
          storage_bucket: 'colweb',
          storage_path: path,
          mime_type: 'application/zip',
          status: 'ready',
          meta: {
            fileCount: downloadedCount,
            fileSize: zipBuffer.length,
          },
        });
    }
    
    // Create signed URL for download
    const signedUrl = await createSignedUrl('colweb', path, 3600);
    
    return NextResponse.json({
      success: true,
      storagePath: path,
      signedUrl,
      fileCount: downloadedCount,
      fileSize: zipBuffer.length,
    });
    
  } catch (error) {
    console.error('[build-zip] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ZIP build failed' },
      { status: 500 }
    );
  }
}

