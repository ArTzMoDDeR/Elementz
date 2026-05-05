// Proxy route for AppLixir SDK.
// Serving the script from our own domain prevents it from being blocked
// by browser-level ad-blocker filter lists that target cdn.applixir.com.
import { NextResponse } from 'next/server'

const APPLIXIR_CDN = 'https://cdn.applixir.com/applixir.app.v6.0.1.js'

// Cache the fetched script in memory for 1 hour so we don't hit the CDN on
// every page load. On cold starts / edge runtimes a fresh fetch is performed.
let cachedScript: string | null = null
let cachedAt = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function GET() {
  try {
    const now = Date.now()
    if (!cachedScript || now - cachedAt > CACHE_TTL) {
      const res = await fetch(APPLIXIR_CDN, {
        headers: {
          // Some CDNs block server-side fetches without a browser User-Agent
          'User-Agent': 'Mozilla/5.0 (compatible; Vercel/1.0)',
          'Referer': 'https://elementz.fun/',
        },
        // Do not use Next.js data cache — we manage our own in-memory cache
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`CDN responded ${res.status}`)
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
  } catch (err) {
    // Don't cache the failure — retry on next request
    cachedScript = null
    cachedAt = 0
    // Return a valid empty JS stub so next/script doesn't fire an error event
    // and the app loads normally. The modal's polling loop handles SDK absence.
    return new NextResponse(
      '/* AppLixir SDK temporarily unavailable — site pending approval */',
      {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      }
    )
  }
}
