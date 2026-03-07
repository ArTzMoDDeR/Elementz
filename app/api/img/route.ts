import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy element images from Vercel Blob.
 * This avoids "Your store is blocked" CDN errors when the app domain
 * is not in the Blob store's allowed origins.
 *
 * Usage: /api/img?url=https://...blob.vercel-storage.com/elements/1.jpg
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new NextResponse('Missing url', { status: 400 })

  // Only allow Vercel Blob URLs
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return new NextResponse('Invalid url', { status: 400 })
  }

  if (!parsed.hostname.endsWith('.blob.vercel-storage.com')) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Elementz/1.0' },
    })

    if (!upstream.ok) {
      return new NextResponse('Upstream error', { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg'
    const buffer = await upstream.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse('Fetch failed', { status: 502 })
  }
}
