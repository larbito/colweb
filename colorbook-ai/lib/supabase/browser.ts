/**
 * Supabase Browser Client
 * 
 * Uses anon key for client-side operations.
 * Safe to use in React components and hooks.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn('[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Singleton browser client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let browserClient: SupabaseClient<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseBrowserClient(): SupabaseClient<any> {
  if (!browserClient && supabaseUrl && supabaseAnonKey) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  // Return a mock client if not configured (for development without Supabase)
  if (!browserClient) {
    console.warn('[Supabase] Client not configured - using mock');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { channel: () => ({ on: () => ({ subscribe: () => {} }), unsubscribe: () => {} }) } as any;
  }
  return browserClient;
}

// Export for convenience - lazy initialization
export const supabase = { get: getSupabaseBrowserClient };

