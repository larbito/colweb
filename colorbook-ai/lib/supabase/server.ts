/**
 * Supabase Server Client
 * 
 * Uses service role key for server-side operations.
 * ONLY use in API routes and server components.
 * Never expose to client!
 */
import 'server-only';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
  console.warn('[Supabase Server] Missing NEXT_PUBLIC_SUPABASE_URL');
}
if (!supabaseServiceKey) {
  console.warn('[Supabase Server] Missing SUPABASE_SERVICE_ROLE_KEY');
}

// Create a new client for each request in server context
// Using 'any' for database type since we don't have auto-generated types yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseServerClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Get retention hours based on user's plan
 * TODO: Implement actual plan lookup from users table
 */
export async function getRetentionHours(userId: string): Promise<number> {
  // TODO: Look up user's plan from DB
  // Free plan: 24 hours (or 72 hours for generous free tier)
  // Pro plan: 720 hours (30 days)
  
  // For now, return 72 hours for all users
  return 72;
}

/**
 * Calculate expiry timestamp based on retention hours
 */
export function calculateExpiresAt(retentionHours: number): string {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + retentionHours);
  return expiresAt.toISOString();
}

/**
 * Create a signed URL for a storage object
 * Used for private bucket access
 */
export async function createSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  
  if (error) {
    console.error('[Supabase] Failed to create signed URL:', error);
    return null;
  }
  
  return data.signedUrl;
}

/**
 * Upload a file to Supabase storage
 */
export async function uploadToStorage(
  bucket: string,
  path: string,
  data: Buffer | Uint8Array,
  contentType: string = 'image/png'
): Promise<{ path: string; error: Error | null }> {
  const supabase = getSupabaseServerClient();
  
  const { data: uploadData, error } = await supabase.storage
    .from(bucket)
    .upload(path, data, {
      contentType,
      upsert: true,
    });
  
  if (error) {
    console.error('[Supabase] Upload failed:', error);
    return { path: '', error: error as Error };
  }
  
  return { path: uploadData.path, error: null };
}

/**
 * Delete a file from Supabase storage
 */
export async function deleteFromStorage(
  bucket: string,
  paths: string[]
): Promise<{ error: Error | null }> {
  const supabase = getSupabaseServerClient();
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove(paths);
  
  if (error) {
    console.error('[Supabase] Delete failed:', error);
    return { error: error as Error };
  }
  
  return { error: null };
}

