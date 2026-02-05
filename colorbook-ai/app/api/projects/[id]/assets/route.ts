/**
 * GET /api/projects/:id/assets
 * 
 * List all assets for a project.
 * Returns assets with signed URLs for display.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, createSignedUrl } from '@/lib/supabase/server';
import type { GeneratedAsset } from '@/types/database';

// Cache signed URLs for 5 minutes to reduce API calls
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

async function getCachedSignedUrl(bucket: string, path: string): Promise<string | null> {
  const cacheKey = `${bucket}:${path}`;
  const cached = signedUrlCache.get(cacheKey);
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }
  
  // Create new signed URL (valid for 1 hour)
  const url = await createSignedUrl(bucket, path, 3600);
  
  if (url) {
    signedUrlCache.set(cacheKey, {
      url,
      expiresAt: Date.now() + CACHE_DURATION_MS,
    });
  }
  
  return url;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const includeSignedUrls = searchParams.get('signedUrls') !== 'false';
    const assetType = searchParams.get('type'); // Optional filter
    
    const supabase = getSupabaseServerClient();
    
    // Build query
    let query = supabase
      .from('generated_assets')
      .select('*')
      .eq('project_id', projectId)
      .order('page_number', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
    
    // Filter by asset type if specified
    if (assetType) {
      query = query.eq('asset_type', assetType);
    }
    
    const { data: assets, error } = await query;
    
    if (error) {
      console.error('[assets] List error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // Add signed URLs if requested
    let assetsWithUrls = assets as (GeneratedAsset & { signedUrl?: string })[];
    
    if (includeSignedUrls) {
      assetsWithUrls = await Promise.all(
        assets.map(async (asset) => {
          if (asset.status === 'ready' && asset.storage_path) {
            const signedUrl = await getCachedSignedUrl(
              asset.storage_bucket,
              asset.storage_path
            );
            return { ...asset, signedUrl };
          }
          return asset;
        })
      );
    }
    
    // Group assets by type for convenience
    const grouped = {
      pages: assetsWithUrls.filter(a => a.asset_type === 'page_image'),
      frontMatter: assetsWithUrls.filter(a => a.asset_type === 'front_matter'),
      exports: assetsWithUrls.filter(a => a.asset_type === 'pdf' || a.asset_type === 'zip'),
      previews: assetsWithUrls.filter(a => a.asset_type === 'preview'),
    };
    
    return NextResponse.json({
      success: true,
      projectId,
      assets: assetsWithUrls,
      grouped,
      counts: {
        total: assetsWithUrls.length,
        generating: assetsWithUrls.filter(a => a.status === 'generating').length,
        ready: assetsWithUrls.filter(a => a.status === 'ready').length,
        failed: assetsWithUrls.filter(a => a.status === 'failed').length,
        expired: assetsWithUrls.filter(a => a.status === 'expired').length,
      },
    });
    
  } catch (error) {
    console.error('[assets] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list assets' },
      { status: 500 }
    );
  }
}

