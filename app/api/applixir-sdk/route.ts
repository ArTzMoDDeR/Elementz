// Proxy route for AppLixir SDK.
// Serving the script from our own domain prevents it from being blocked
// by browser-level ad-blocker filter lists that target cdn.applixir.com.
import { NextResponse } from 'next/server'

const APPLIXIR_CDN = 'https://cdn.applixir.com/applixir.stable.min.js'

// Cache the fetched script in memory for 1 hour so we don't hit the CDN on
// every page load. On cold starts / edge runtimes a fresh fetch is performed.
let cachedScript: string | null = null
let cachedAt = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function GET() {
  try {
    const now = Date.now()
    if (!cachedScript || now - cachedAt > CACHE_TTL) {
      const res = await fetch(APPLIXIR_CDN, { next: { revalidate: 3600 } })
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
    console.error('[applixir-sdk proxy] fetch failed:', err)
    // Return an empty valid JS file so the page doesn't throw a syntax error
    return new NextResponse('/* AppLixir SDK unavailable */', {
      status: 200,
      headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
    })
  }
}
