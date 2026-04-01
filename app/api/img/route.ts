import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy element images from Vercel Blob (legacy).
 * New images are on Cloudinary and served directly — no proxy needed.
 *
 * Usage: /api/img?url=https://...blob.vercel-storage.com/elements/1.jpg
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new NextResponse('Missing url', { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return new NextResponse('Invalid url', { status: 400 })
  }

  // Allow Vercel Blob (legacy) and Cloudinary URLs
  const isBlob = parsed.hostname.endsWith('.blob.vercel-storage.com')
  const isCloudinary = parsed.hostname.endsWith('cloudinary.com') || parsed.hostname.endsWith('res.cloudinary.com')

  if (!isBlob && !isCloudinary) {
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
