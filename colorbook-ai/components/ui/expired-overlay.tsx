'use client';

/**
 * ExpiredOverlay Component
 * 
 * Overlay shown on expired assets with upgrade CTA.
 */
import { AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ExpiredOverlayProps {
  className?: string;
  onRegenerate?: () => void;
  showRegenerate?: boolean;
}

export function ExpiredOverlay({ 
  className,
  onRegenerate,
  showRegenerate = true,
}: ExpiredOverlayProps) {
  return (
    <div 
      className={cn(
        'absolute inset-0 flex flex-col items-center justify-center',
        'bg-gray-100/95 dark:bg-gray-900/95',
        'backdrop-blur-sm z-10',
        className
      )}
    >
      <div className="text-center p-4 max-w-[200px]">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Expired
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Auto-deleted after storage time limit
        </p>
        
        <div className="flex flex-col gap-2">
          {showRegenerate && onRegenerate && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={onRegenerate}
              className="w-full"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Regenerate
            </Button>
          )}
          
          <Link href="/upgrade" className="w-full">
            <Button 
              size="sm" 
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              Upgrade for Longer Storage
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Banner shown when any assets are expired or expiring soon
 */
interface ExpiryBannerProps {
  expiredCount?: number;
  expiringSoonCount?: number;
  className?: string;
  onDismiss?: () => void;
}

export function ExpiryBanner({
  expiredCount = 0,
  expiringSoonCount = 0,
  className,
  onDismiss,
}: ExpiryBannerProps) {
  if (expiredCount === 0 && expiringSoonCount === 0) {
    return null;
  }
  
  const hasExpired = expiredCount > 0;
  
  return (
    <div 
      className={cn(
        'flex items-center justify-between gap-4 p-3 rounded-lg',
        hasExpired 
          ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
          : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className={cn(
          'h-5 w-5 flex-shrink-0',
          hasExpired ? 'text-red-500' : 'text-amber-500'
        )} />
        <div>
          <p className={cn(
            'text-sm font-medium',
            hasExpired ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
          )}>
            {hasExpired 
              ? `${expiredCount} file${expiredCount > 1 ? 's' : ''} expired and auto-deleted`
              : `${expiringSoonCount} file${expiringSoonCount > 1 ? 's' : ''} expiring soon`
            }
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Upgrade to keep your files longer
          </p>
        </div>
      </div>
      
      <Link href="/upgrade">
        <Button 
          size="sm"
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
        >
          Upgrade
        </Button>
      </Link>
    </div>
  );
}

/**
 * Failed state overlay (for max attempts exhausted)
 */
interface FailedOverlayProps {
  error?: string;
  onRetry?: () => void;
  className?: string;
}

export function FailedOverlay({
  error,
  onRetry,
  className,
}: FailedOverlayProps) {
  return (
    <div 
      className={cn(
        'absolute inset-0 flex flex-col items-center justify-center',
        'bg-red-50/95 dark:bg-red-950/95',
        'backdrop-blur-sm z-10',
        className
      )}
    >
      <div className="text-center p-4 max-w-[180px]">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-500" />
        <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
          Generation Failed
        </p>
        {error && (
          <p className="text-xs text-red-500 dark:text-red-400 mb-3 line-clamp-2">
            {error}
          </p>
        )}
        
        {onRetry && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={onRetry}
            className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}

