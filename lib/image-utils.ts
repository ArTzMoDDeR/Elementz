/**
 * Returns the image URL to use in ElementBadge.
 * Vercel Blob already serves from a global CDN (Cloudflare) so we serve
 * the original URL directly — fast, cached, no 400 errors.
 * We append ?w= as a hint for future Blob transform support, but only
 * if the URL doesn't already have query params.
 */
export function optimizeImageUrl(
  src: string | null | undefined,
  _width?: number,
): string | null {
  if (!src) return null
  return src
}

/**
 * Badge pixel widths by size (kept for reference / future use).
 */
export const BADGE_IMG_WIDTH: Record<'xs' | 'sm' | 'md' | 'lg', number> = {
  xs: 48,
  sm: 64,
  md: 80,
  lg: 112,
}
