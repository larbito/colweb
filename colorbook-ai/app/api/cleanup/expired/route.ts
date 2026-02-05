/**
 * POST /api/cleanup/expired
 * 
 * Cron endpoint to clean up expired assets.
 * Deletes files from storage and marks DB rows as expired.
 * 
 * Set up as a cron job to run every hour:
 * - Vercel Cron: vercel.json
 * - External: curl -X POST https://your-app.com/api/cleanup/expired
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, deleteFromStorage } from '@/lib/supabase/server';

export const maxDuration = 300; // 5 minutes for batch processing

const BATCH_SIZE = 100;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[cleanup] Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const supabase = getSupabaseServerClient();
    
    // Find expired assets that haven't been cleaned up yet
    const { data: expiredAssetsRaw, error: queryError } = await supabase
      .from('generated_assets')
      .select('id, storage_bucket, storage_path')
      .eq('status', 'ready')
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString())
      .is('deleted_at', null)
      .limit(BATCH_SIZE);
    
    if (queryError) {
      console.error('[cleanup] Query error:', queryError);
      return NextResponse.json(
        { error: 'Failed to query expired assets' },
        { status: 500 }
      );
    }
    
    // Type assertion for the assets
    const expiredAssets = (expiredAssetsRaw || []) as Array<{
      id: string;
      storage_bucket: string;
      storage_path: string | null;
    }>;
    
    if (expiredAssets.length === 0) {
      console.log('[cleanup] No expired assets to clean up');
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No expired assets',
      });
    }
    
    console.log(`[cleanup] Found ${expiredAssets.length} expired assets to clean up`);
    
    let deletedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Group by bucket for batch deletion
    const byBucket = new Map<string, { id: string; path: string }[]>();
    
    for (const asset of expiredAssets) {
      if (!asset.storage_path) continue;
      
      const bucket = asset.storage_bucket || 'generated';
      if (!byBucket.has(bucket)) {
        byBucket.set(bucket, []);
      }
      byBucket.get(bucket)!.push({
        id: asset.id,
        path: asset.storage_path,
      });
    }
    
    // Delete from storage by bucket
    for (const [bucket, assets] of byBucket) {
      const paths = assets.map(a => a.path);
      const assetIds = assets.map(a => a.id);
      
      try {
        // Delete files from storage
        const { error: deleteError } = await deleteFromStorage(bucket, paths);
        
        if (deleteError) {
          console.error(`[cleanup] Storage delete error for bucket ${bucket}:`, deleteError);
          errors.push(`Bucket ${bucket}: ${deleteError.message}`);
          errorCount += assets.length;
          continue;
        }
        
        // Mark as expired in DB
        const { error: updateError } = await supabase
          .from('generated_assets')
          .update({
            status: 'expired',
            deleted_at: new Date().toISOString(),
            storage_path: null, // Clear path since file is deleted
          })
          .in('id', assetIds);
        
        if (updateError) {
          console.error(`[cleanup] DB update error:`, updateError);
          errors.push(`DB update: ${updateError.message}`);
          errorCount += assets.length;
          continue;
        }
        
        deletedCount += assets.length;
        console.log(`[cleanup] Deleted ${assets.length} files from bucket ${bucket}`);
        
      } catch (err) {
        console.error(`[cleanup] Error processing bucket ${bucket}:`, err);
        errors.push(`Bucket ${bucket}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        errorCount += assets.length;
      }
    }
    
    const duration = Date.now() - startTime;
    
    console.log(`[cleanup] Complete: ${deletedCount} deleted, ${errorCount} errors, ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      processed: expiredAssets.length,
      deleted: deletedCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined,
      duration,
      hasMore: expiredAssets.length === BATCH_SIZE,
    });
    
  } catch (error) {
    console.error('[cleanup] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cleanup failed' },
      { status: 500 }
    );
  }
}

// GET for health check / manual trigger from browser
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/cleanup/expired',
    method: 'POST required for cleanup',
    note: 'Set up as hourly cron job',
  });
}

