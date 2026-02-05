/**
 * POST /api/projects/:id/download-zip
 * 
 * Download all ready assets as a ZIP file from Supabase storage.
 * Streams the ZIP for immediate download.
 */
import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const maxDuration = 300; // 5 minutes for large downloads

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json().catch(() => ({}));
    const includeTypes = body.types || ['page_image', 'front_matter'];
    
    const supabase = getSupabaseServerClient();
    
    // Get project info
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name, settings')
      .eq('id', projectId)
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
      .eq('project_id', projectId)
      .eq('status', 'ready')
      .in('asset_type', includeTypes)
      .order('page_number', { ascending: true });
    
    if (assetsError) {
      console.error('[download-zip] Assets query error:', assetsError);
      return NextResponse.json(
        { error: 'Failed to fetch assets' },
        { status: 500 }
      );
    }
    
    if (!assets || assets.length === 0) {
      return NextResponse.json(
        { error: 'No ready assets to download' },
        { status: 400 }
      );
    }
    
    console.log(`[download-zip] Creating ZIP for project ${projectId} with ${assets.length} assets`);
    
    const zip = new JSZip();
    const pagesFolder = zip.folder('pages');
    const frontMatterFolder = zip.folder('front-matter');
    
    let downloadedCount = 0;
    let skippedCount = 0;
    const skippedReasons: string[] = [];
    
    // Download and add each asset to ZIP
    for (const asset of assets) {
      if (!asset.storage_path) {
        skippedCount++;
        skippedReasons.push(`Asset ${asset.id}: no storage path`);
        continue;
      }
      
      try {
        // Download from Supabase storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(asset.storage_bucket)
          .download(asset.storage_path);
        
        if (downloadError || !fileData) {
          console.error(`[download-zip] Failed to download asset ${asset.id}:`, downloadError);
          skippedCount++;
          skippedReasons.push(`Asset ${asset.id}: download failed`);
          continue;
        }
        
        const buffer = await fileData.arrayBuffer();
        
        // Determine filename and folder
        if (asset.asset_type === 'page_image' && pagesFolder) {
          const pageNum = String(asset.page_number || 0).padStart(3, '0');
          const title = (asset.meta as { title?: string })?.title;
          const safeTitle = title ? `-${title.replace(/[^a-z0-9]/gi, '-').slice(0, 20)}` : '';
          const filename = `page-${pageNum}${safeTitle}.png`;
          pagesFolder.file(filename, buffer);
        } else if (asset.asset_type === 'front_matter' && frontMatterFolder) {
          const fmType = (asset.meta as { frontMatterType?: string })?.frontMatterType || 'unknown';
          const filename = `${fmType}-page.png`;
          frontMatterFolder.file(filename, buffer);
        }
        
        downloadedCount++;
        
      } catch (err) {
        console.error(`[download-zip] Error processing asset ${asset.id}:`, err);
        skippedCount++;
        skippedReasons.push(`Asset ${asset.id}: processing error`);
      }
    }
    
    if (downloadedCount === 0) {
      return NextResponse.json(
        { error: 'No assets could be downloaded', skippedReasons },
        { status: 500 }
      );
    }
    
    // Add metadata
    const metadata = {
      projectId,
      projectName: project.name,
      exportDate: new Date().toISOString(),
      totalAssets: assets.length,
      downloadedCount,
      skippedCount,
      skippedReasons: skippedCount > 0 ? skippedReasons : undefined,
    };
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));
    
    // Add README
    const readme = `# ${project.name || 'Coloring Book'}

Exported: ${new Date().toLocaleString()}
Total Pages: ${downloadedCount}

## Folders
- pages/ - Coloring pages (PNG)
- front-matter/ - Title, copyright, belongs-to pages (PNG)

## Format
Images are in PNG format, suitable for printing.

Created with ColorBook AI
`;
    zip.file('README.txt', readme);
    
    // Generate ZIP
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    
    const filename = `${(project.name || 'coloring-book').replace(/[^a-z0-9]/gi, '-')}.zip`;
    
    console.log(`[download-zip] ZIP created: ${zipBuffer.length} bytes, ${downloadedCount} files`);
    
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Downloaded-Count': String(downloadedCount),
        'X-Skipped-Count': String(skippedCount),
      },
    });
    
  } catch (error) {
    console.error('[download-zip] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create ZIP' },
      { status: 500 }
    );
  }
}

