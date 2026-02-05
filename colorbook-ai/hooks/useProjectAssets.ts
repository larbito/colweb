'use client';

/**
 * useProjectAssets Hook
 * 
 * Manages project assets with Supabase realtime subscriptions.
 * Provides live updates when assets change status.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { GeneratedAsset, AssetStatus } from '@/types/database';
import type { AssetWithUrl, GenerationProgress } from '@/types/assets';
import { calculateProgress, sortAssetsByPage } from '@/types/assets';

interface UseProjectAssetsOptions {
  projectId: string | null;
  userId?: string;
  autoFetch?: boolean;
  includeSignedUrls?: boolean;
}

interface UseProjectAssetsReturn {
  // Data
  assets: AssetWithUrl[];
  pages: AssetWithUrl[];
  frontMatter: AssetWithUrl[];
  exports: AssetWithUrl[];
  
  // State
  loading: boolean;
  error: string | null;
  progress: GenerationProgress;
  
  // Actions
  refetch: () => Promise<void>;
  updateAsset: (assetId: string, updates: Partial<GeneratedAsset>) => void;
  
  // Subscribed
  isSubscribed: boolean;
}

export function useProjectAssets({
  projectId,
  userId,
  autoFetch = true,
  includeSignedUrls = true,
}: UseProjectAssetsOptions): UseProjectAssetsReturn {
  const [assets, setAssets] = useState<AssetWithUrl[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  const subscriptionRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']> | null>(null);
  
  // Fetch assets from API
  const fetchAssets = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const url = new URL(`/api/projects/${projectId}/assets`, window.location.origin);
      if (includeSignedUrls) {
        url.searchParams.set('signedUrls', 'true');
      }
      
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch assets');
      }
      
      setAssets(data.assets || []);
    } catch (err) {
      console.error('[useProjectAssets] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  }, [projectId, includeSignedUrls]);
  
  // Update a single asset in local state
  const updateAsset = useCallback((assetId: string, updates: Partial<GeneratedAsset>) => {
    setAssets(prev => prev.map(asset => 
      asset.id === assetId ? { ...asset, ...updates } : asset
    ));
  }, []);
  
  // Handle realtime events
  const handleRealtimeEvent = useCallback((payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: GeneratedAsset | null;
    old: { id: string } | null;
  }) => {
    console.log('[useProjectAssets] Realtime event:', payload.eventType);
    
    if (payload.eventType === 'INSERT' && payload.new) {
      setAssets(prev => {
        // Check if asset already exists
        if (prev.some(a => a.id === payload.new!.id)) {
          return prev;
        }
        return sortAssetsByPage([...prev, payload.new!]);
      });
    } else if (payload.eventType === 'UPDATE' && payload.new) {
      setAssets(prev => prev.map(asset =>
        asset.id === payload.new!.id ? { ...asset, ...payload.new! } : asset
      ));
    } else if (payload.eventType === 'DELETE' && payload.old) {
      setAssets(prev => prev.filter(asset => asset.id !== payload.old!.id));
    }
  }, []);
  
  // Set up realtime subscription
  useEffect(() => {
    if (!projectId) return;
    
    const supabase = getSupabaseBrowserClient();
    
    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    
    // Create new subscription
    // Using type assertion since Supabase types are complex
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel(`project-assets-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generated_assets',
          filter: `project_id=eq.${projectId}`,
        },
        (payload: {
          eventType: 'INSERT' | 'UPDATE' | 'DELETE';
          new: GeneratedAsset | null;
          old: { id: string } | null;
        }) => {
          handleRealtimeEvent(payload);
        }
      )
      .subscribe((status: string) => {
        console.log('[useProjectAssets] Subscription status:', status);
        setIsSubscribed(status === 'SUBSCRIBED');
      });
    
    subscriptionRef.current = channel;
    
    return () => {
      channel.unsubscribe();
      setIsSubscribed(false);
    };
  }, [projectId, handleRealtimeEvent]);
  
  // Initial fetch
  useEffect(() => {
    if (autoFetch && projectId) {
      fetchAssets();
    }
  }, [autoFetch, projectId, fetchAssets]);
  
  // Compute derived data
  const pages = assets.filter(a => a.asset_type === 'page_image');
  const frontMatter = assets.filter(a => a.asset_type === 'front_matter');
  const exports = assets.filter(a => a.asset_type === 'pdf' || a.asset_type === 'zip');
  const progress = calculateProgress(assets);
  
  return {
    assets,
    pages: sortAssetsByPage(pages),
    frontMatter,
    exports,
    loading,
    error,
    progress,
    refetch: fetchAssets,
    updateAsset,
    isSubscribed,
  };
}

/**
 * Hook to create a new project
 */
export function useCreateProject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const createProject = useCallback(async (options: {
    name?: string;
    projectType?: 'coloring_book' | 'quote_book';
    settings?: Record<string, unknown>;
    userId?: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project');
      }
      
      return {
        projectId: data.project.id,
        project: data.project,
        retentionHours: data.retentionHours,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { createProject, loading, error };
}

/**
 * Hook to generate a page asset
 */
export function useGeneratePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const generatePage = useCallback(async (options: {
    projectId: string;
    userId: string;
    pageNumber: number;
    prompt: string;
    size?: 'square' | 'portrait' | 'landscape';
    validate?: boolean;
    assetId?: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/generate/page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }
      
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { generatePage, loading, error };
}

/**
 * Hook to generate front matter
 */
export function useGenerateFrontMatter() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const generateFrontMatter = useCallback(async (options: {
    projectId: string;
    userId: string;
    frontMatterType: 'title' | 'copyright' | 'belongsTo';
    options: {
      bookTitle?: string;
      authorName?: string;
      year?: string;
      belongsToName?: string;
      subtitle?: string;
    };
    assetId?: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/generate/front-matter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }
      
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { generateFrontMatter, loading, error };
}

