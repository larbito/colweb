/**
 * Asset Types for UI Components
 * 
 * These types are used in React components and hooks.
 * They may include client-side derived fields like signedUrl.
 */

import type { GeneratedAsset, AssetStatus, AssetType, AssetMeta } from './database';

// Re-export database types
export type { GeneratedAsset, AssetStatus, AssetType, AssetMeta };

/**
 * Asset with signed URL for display
 * Used in UI components that need to render images
 */
export interface AssetWithUrl extends GeneratedAsset {
  signedUrl?: string;
  signedUrlExpiresAt?: number; // Unix timestamp
}

/**
 * Grouped assets for a project
 */
export interface ProjectAssets {
  projectId: string;
  pages: AssetWithUrl[];
  frontMatter: AssetWithUrl[];
  exports: AssetWithUrl[]; // PDFs and ZIPs
}

/**
 * Asset creation request
 */
export interface CreateAssetRequest {
  projectId: string;
  pageNumber?: number;
  assetType: AssetType;
  meta?: Partial<AssetMeta>;
}

/**
 * Asset update from realtime subscription
 */
export interface AssetRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: GeneratedAsset | null;
  old: GeneratedAsset | null;
}

/**
 * Front matter configuration
 */
export interface FrontMatterConfig {
  key: 'title' | 'copyright' | 'belongsTo';
  label: string;
  enabled: boolean;
}

/**
 * Generation progress for UI
 */
export interface GenerationProgress {
  total: number;
  generating: number;
  ready: number;
  failed: number;
  expired: number;
}

/**
 * Calculate generation progress from assets
 */
export function calculateProgress(assets: GeneratedAsset[]): GenerationProgress {
  return {
    total: assets.length,
    generating: assets.filter(a => a.status === 'generating').length,
    ready: assets.filter(a => a.status === 'ready').length,
    failed: assets.filter(a => a.status === 'failed').length,
    expired: assets.filter(a => a.status === 'expired').length,
  };
}

/**
 * Check if an asset is displayable (has valid image)
 */
export function isDisplayable(asset: GeneratedAsset): boolean {
  return asset.status === 'ready' && !!asset.storage_path;
}

/**
 * Get time remaining until expiry
 */
export function getTimeUntilExpiry(expiresAt: string | null): {
  expired: boolean;
  hours: number;
  minutes: number;
  totalMinutes: number;
  label: string;
} {
  if (!expiresAt) {
    return { expired: false, hours: 0, minutes: 0, totalMinutes: 0, label: 'No expiry' };
  }
  
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return { expired: true, hours: 0, minutes: 0, totalMinutes: 0, label: 'Expired' };
  }
  
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  let label: string;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    label = `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    label = `${hours}h ${minutes}m`;
  } else {
    label = `${minutes}m`;
  }
  
  return { expired: false, hours, minutes, totalMinutes, label };
}

/**
 * Sort assets by page number
 */
export function sortAssetsByPage(assets: GeneratedAsset[]): GeneratedAsset[] {
  return [...assets].sort((a, b) => {
    const pageA = a.page_number ?? Infinity;
    const pageB = b.page_number ?? Infinity;
    return pageA - pageB;
  });
}

