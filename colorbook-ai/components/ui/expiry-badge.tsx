'use client';

/**
 * ExpiryBadge Component
 * 
 * Shows countdown until asset expiry.
 * Changes color as expiry approaches.
 */
import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTimeUntilExpiry } from '@/types/assets';
import type { AssetStatus } from '@/types/database';

interface ExpiryBadgeProps {
  expiresAt: string | null;
  status: AssetStatus;
  className?: string;
  showIcon?: boolean;
}

export function ExpiryBadge({ 
  expiresAt, 
  status, 
  className,
  showIcon = true,
}: ExpiryBadgeProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeUntilExpiry(expiresAt));
  
  // Update countdown every minute
  useEffect(() => {
    if (!expiresAt || status !== 'ready') return;
    
    const interval = setInterval(() => {
      setTimeLeft(getTimeUntilExpiry(expiresAt));
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [expiresAt, status]);
  
  // Don't show badge for non-ready assets or those without expiry
  if (status !== 'ready' || !expiresAt) {
    return null;
  }
  
  // Determine badge color based on time remaining
  let colorClass = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  let IconComponent = Clock;
  
  if (timeLeft.expired) {
    colorClass = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    IconComponent = AlertTriangle;
  } else if (timeLeft.totalMinutes < 60) {
    // Less than 1 hour - urgent
    colorClass = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    IconComponent = AlertTriangle;
  } else if (timeLeft.totalMinutes < 360) {
    // Less than 6 hours - warning
    colorClass = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  } else if (timeLeft.totalMinutes < 720) {
    // Less than 12 hours - caution
    colorClass = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  }
  
  return (
    <div 
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        colorClass,
        className
      )}
    >
      {showIcon && <IconComponent className="h-3 w-3" />}
      <span>
        {timeLeft.expired ? 'Expired' : `Expires ${timeLeft.label}`}
      </span>
    </div>
  );
}

/**
 * Compact version for tight spaces
 */
export function ExpiryBadgeCompact({ 
  expiresAt, 
  status,
  className,
}: Omit<ExpiryBadgeProps, 'showIcon'>) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeUntilExpiry(expiresAt));
  
  useEffect(() => {
    if (!expiresAt || status !== 'ready') return;
    
    const interval = setInterval(() => {
      setTimeLeft(getTimeUntilExpiry(expiresAt));
    }, 60000);
    
    return () => clearInterval(interval);
  }, [expiresAt, status]);
  
  if (status !== 'ready' || !expiresAt) {
    return null;
  }
  
  let colorClass = 'text-green-600 dark:text-green-400';
  
  if (timeLeft.expired || timeLeft.totalMinutes < 60) {
    colorClass = 'text-red-600 dark:text-red-400';
  } else if (timeLeft.totalMinutes < 360) {
    colorClass = 'text-amber-600 dark:text-amber-400';
  }
  
  return (
    <span className={cn('text-xs font-medium', colorClass, className)}>
      {timeLeft.expired ? 'Expired' : timeLeft.label}
    </span>
  );
}

