/**
 * Image optimization utilities using Supabase Storage Transformations
 * 
 * Supabase Storage supports on-the-fly image transformations:
 * - Dynamic resizing
 * - Format optimization (auto WebP/AVIF)
 * - Quality control
 * 
 * Usage: Apply these transformations when generating URLs
 */

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number; // 20-100, default 80
  resize?: "cover" | "contain" | "fill";
  // Note: Format optimization (WebP/AVIF) is automatic in Supabase Storage
  // and cannot be explicitly set via the transform API
}

/**
 * Generate optimized image URL with Supabase transformations
 * 
 * @param baseUrl - Base Supabase Storage public URL
 * @param options - Transformation options
 * @returns Optimized image URL with query parameters
 */
export function getOptimizedImageUrl(
  baseUrl: string,
  options: ImageTransformOptions = {}
): string {
  const {
    width,
    height,
    quality = 80,
    resize = "cover",
  } = options;

  const url = new URL(baseUrl);
  const params = new URLSearchParams();

  if (width) params.set("width", width.toString());
  if (height) params.set("height", height.toString());
  if (quality !== undefined) params.set("quality", quality.toString());
  if (resize) params.set("resize", resize);
  
  // Note: Format optimization (WebP/AVIF) is automatic in Supabase Storage
  // based on browser capabilities - no need to set it explicitly

  // Append params to existing query string or create new one
  const existingParams = url.search;
  if (existingParams) {
    const existing = new URLSearchParams(existingParams);
    params.forEach((value, key) => existing.set(key, value));
    url.search = existing.toString();
  } else {
    url.search = params.toString();
  }

  return url.toString();
}

/**
 * Predefined image size presets for common use cases
 */
export const ImageSizes = {
  thumbnail: { width: 400, height: 400, quality: 75 },
  small: { width: 800, height: 800, quality: 80 },
  medium: { width: 1200, height: 1200, quality: 85 },
  large: { width: 1920, height: 1920, quality: 90 },
  // For gallery grids
  gridThumb: { width: 300, height: 300, quality: 75, resize: "cover" as const },
  // For lightbox/full view
  lightbox: { width: 1920, height: 1920, quality: 90, resize: "contain" as const },
} as const;

/**
 * Get optimized thumbnail URL
 */
export function getThumbnailUrl(baseUrl: string): string {
  return getOptimizedImageUrl(baseUrl, ImageSizes.thumbnail);
}

/**
 * Get optimized grid thumbnail URL
 */
export function getGridThumbnailUrl(baseUrl: string): string {
  return getOptimizedImageUrl(baseUrl, ImageSizes.gridThumb);
}

/**
 * Get optimized lightbox URL
 */
export function getLightboxUrl(baseUrl: string): string {
  return getOptimizedImageUrl(baseUrl, ImageSizes.lightbox);
}

/**
 * Get responsive image srcset for different screen sizes
 */
export function getResponsiveSrcSet(baseUrl: string): string {
  const sizes = [
    { width: 400, suffix: "400w" },
    { width: 800, suffix: "800w" },
    { width: 1200, suffix: "1200w" },
    { width: 1920, suffix: "1920w" },
  ];

  return sizes
    .map(
      ({ width, suffix }) =>
        `${getOptimizedImageUrl(baseUrl, { width, quality: 80 })} ${suffix}`
    )
    .join(", ");
}

