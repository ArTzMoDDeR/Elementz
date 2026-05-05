// Proxy route for Google IMA SDK.
// AppLixir internally loads imasdk.googleapis.com which gets blocked by ad blockers.
// Serving it from our own domain bypasses those filter lists.
import { NextResponse } from 'next/server'

const IMA_CDN = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js'

let cachedScript: string | null = null
let cachedAt = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function GET() {
  try {
    const now = Date.now()
    if (!cachedScript || now - cachedAt > CACHE_TTL) {
      const res = await fetch(IMA_CDN, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Vercel/1.0)',
          'Referer': 'https://elementz.fun/',
        },
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`IMA CDN responded ${res.status}`)
      cachedScript = await res.text()
      cachedAt = now
    }

    return new NextResponse(cachedScript, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    cachedScript = null
    cachedAt = 0
    return new NextResponse('/* Google IMA SDK unavailable */', {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  }
}
