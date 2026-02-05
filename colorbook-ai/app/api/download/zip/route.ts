/**
 * GET /api/download/zip?projectId=...
 * 
 * Stream ZIP download from Supabase Storage.
 * Returns proper streaming response with correct headers.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseServerClient();
    
    // Get project info for filename
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();
    
    const projectName = project?.name || 'coloring-book';
    
    // Get ZIP asset from database
    const { data: zipAsset } = await supabase
      .from('generated_assets')
      .select('storage_path, storage_bucket')
      .eq('project_id', projectId)
      .eq('asset_type', 'zip')
      .eq('status', 'ready')
      .single();
    
    if (!zipAsset?.storage_path) {
      return NextResponse.json(
        { error: 'ZIP not found. Generate it first.' },
        { status: 404 }
      );
    }
    
    // Download from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(zipAsset.storage_bucket || 'colweb')
      .download(zipAsset.storage_path);
    
    if (downloadError || !fileData) {
      console.error('[download/zip] Storage download error:', downloadError);
      return NextResponse.json(
        { error: 'Failed to download ZIP from storage' },
        { status: 500 }
      );
    }
    
    // Convert to array buffer and stream
    const arrayBuffer = await fileData.arrayBuffer();
    const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '-')}.zip`;
    
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(arrayBuffer.byteLength),
        'Cache-Control': 'private, max-age=3600',
      },
    });
    
  } catch (error) {
    console.error('[download/zip] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Download failed' },
      { status: 500 }
    );
  }
}

