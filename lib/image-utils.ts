/**
 * Returns a Next.js optimized image URL that will be served as WebP
 * from Vercel's CDN with the given width and quality.
 * Falls back to the original URL if it's not a supported remote domain.
 */
export function optimizeImageUrl(
  src: string | null | undefined,
  width: number,
  quality = 75,
): string | null {
  if (!src) return null
  // Only optimize Vercel Blob URLs (the configured remote pattern)
  if (!src.includes('blob.vercel-storage.com')) return src
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`
}

/**
 * Pick the right pixel width for a badge size to avoid over-fetching.
 * Multiply by 2 for retina screens — Next.js will pick the closest
 * srcset step automatically, so we just provide a sensible upper bound.
 */
export const BADGE_IMG_WIDTH: Record<'xs' | 'sm' | 'md' | 'lg', number> = {
  xs: 48,   // ~48px * 2x = 96
  sm: 64,   // ~68px * 2x
  md: 80,   // ~80px * 2x
  lg: 112,  // ~112px * 2x
}
