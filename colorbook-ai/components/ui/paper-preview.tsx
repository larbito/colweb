"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * PaperPreview - White paper treatment for images
 * 
 * Renders images on a white "paper" canvas with:
 * - White background (always, even in dark mode)
 * - Thin light border
 * - Subtle shadow for depth
 * 
 * Mandatory for coloring page and quote page previews.
 */

interface PaperPreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Aspect ratio: "portrait" (3/4), "letter" (8.5/11), "square" (1/1), or custom */
  aspect?: "portrait" | "letter" | "square" | string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show loading skeleton */
  loading?: boolean;
  /** Children (typically an img) */
  children?: React.ReactNode;
}

const aspectRatios = {
  portrait: "aspect-[3/4]",
  letter: "aspect-[8.5/11]",
  square: "aspect-square",
};

const PaperPreview = React.forwardRef<HTMLDivElement, PaperPreviewProps>(
  ({ className, aspect = "portrait", size = "md", loading = false, children, ...props }, ref) => {
    const aspectClass = aspectRatios[aspect as keyof typeof aspectRatios] || `aspect-[${aspect}]`;
    
    const sizeClasses = {
      sm: "p-1",
      md: "p-2",
      lg: "p-3",
    };

    return (
      <div
        ref={ref}
        className={cn(
          // Outer container with padding for the shadow
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <div
          className={cn(
            // Inner paper container
            "relative bg-white rounded-lg overflow-hidden",
            // Border - visible in both light and dark
            "border border-gray-200 dark:border-gray-600",
            // Shadow - creates depth
            "shadow-sm dark:shadow-md",
            // Subtle shadow effect
            "shadow-gray-200/80 dark:shadow-black/30",
            aspectClass
          )}
        >
          {loading ? (
            <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    );
  }
);
PaperPreview.displayName = "PaperPreview";

/**
 * PaperImage - Image that fills the paper preview
 */
interface PaperImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Base64 or URL */
  src: string;
  /** Alt text */
  alt?: string;
}

const PaperImage = React.forwardRef<HTMLImageElement, PaperImageProps>(
  ({ className, src, alt = "Preview", ...props }, ref) => {
    // Handle base64 data
    const imageSrc = src.startsWith("data:") ? src : 
                     src.startsWith("/") || src.startsWith("http") ? src :
                     `data:image/png;base64,${src}`;
    
    return (
      <img
        ref={ref}
        src={imageSrc}
        alt={alt}
        className={cn(
          "w-full h-full object-contain bg-white",
          className
        )}
        {...props}
      />
    );
  }
);
PaperImage.displayName = "PaperImage";

/**
 * PaperPlaceholder - Placeholder content for empty paper
 */
interface PaperPlaceholderProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  text?: string;
}

const PaperPlaceholder = React.forwardRef<HTMLDivElement, PaperPlaceholderProps>(
  ({ className, icon, text, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center",
          "bg-gray-50 text-gray-400",
          className
        )}
        {...props}
      >
        {icon && <div className="mb-2 opacity-40">{icon}</div>}
        {text && <span className="text-xs text-center px-2">{text}</span>}
      </div>
    );
  }
);
PaperPlaceholder.displayName = "PaperPlaceholder";

export { PaperPreview, PaperImage, PaperPlaceholder };

