/**
 * POST /api/assets/signed-url
 * 
 * Create a signed URL for a storage object.
 * Used for private bucket access.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient, createSignedUrl } from '@/lib/supabase/server';

const requestSchema = z.object({
  assetId: z.string().uuid().optional(),
  bucket: z.string().optional(),
  path: z.string().optional(),
  expiresIn: z.number().default(3600), // 1 hour default
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = requestSchema.parse(body);
    
    const supabase = getSupabaseServerClient();
    
    let bucket = data.bucket;
    let path = data.path;
    
    // If assetId provided, look up the asset
    if (data.assetId) {
      const { data: asset, error } = await supabase
        .from('generated_assets')
        .select('storage_bucket, storage_path, status')
        .eq('id', data.assetId)
        .single();
      
      if (error || !asset) {
        return NextResponse.json(
          { error: 'Asset not found' },
          { status: 404 }
        );
      }
      
      // Type assertion since we know the shape
      const assetData = asset as { storage_bucket: string; storage_path: string | null; status: string };
      
      if (assetData.status !== 'ready') {
        return NextResponse.json(
          { error: `Asset is not ready (status: ${assetData.status})` },
          { status: 400 }
        );
      }
      
      if (!assetData.storage_path) {
        return NextResponse.json(
          { error: 'Asset has no storage path' },
          { status: 400 }
        );
      }
      
      bucket = assetData.storage_bucket;
      path = assetData.storage_path;
    }
    
    if (!bucket || !path) {
      return NextResponse.json(
        { error: 'bucket and path are required' },
        { status: 400 }
      );
    }
    
    const signedUrl = await createSignedUrl(bucket, path, data.expiresIn);
    
    if (!signedUrl) {
      return NextResponse.json(
        { error: 'Failed to create signed URL' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      signedUrl,
      expiresIn: data.expiresIn,
      expiresAt: new Date(Date.now() + data.expiresIn * 1000).toISOString(),
    });
    
  } catch (error) {
    console.error('[signed-url] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create signed URL' },
      { status: 500 }
    );
  }
}

