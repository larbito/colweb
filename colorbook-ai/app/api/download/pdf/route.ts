/**
 * GET /api/download/pdf?projectId=...
 * 
 * Stream PDF download from Supabase Storage.
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
    
    // Get PDF asset from database
    const { data: pdfAsset } = await supabase
      .from('generated_assets')
      .select('storage_path, storage_bucket')
      .eq('project_id', projectId)
      .eq('asset_type', 'pdf')
      .eq('status', 'ready')
      .single();
    
    if (!pdfAsset?.storage_path) {
      return NextResponse.json(
        { error: 'PDF not found. Generate it first.' },
        { status: 404 }
      );
    }
    
    // Download from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(pdfAsset.storage_bucket || 'colweb')
      .download(pdfAsset.storage_path);
    
    if (downloadError || !fileData) {
      console.error('[download/pdf] Storage download error:', downloadError);
      return NextResponse.json(
        { error: 'Failed to download PDF from storage' },
        { status: 500 }
      );
    }
    
    // Convert to array buffer and stream
    const arrayBuffer = await fileData.arrayBuffer();
    const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
    
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(arrayBuffer.byteLength),
        'Cache-Control': 'private, max-age=3600',
      },
    });
    
  } catch (error) {
    console.error('[download/pdf] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Download failed' },
      { status: 500 }
    );
  }
}

