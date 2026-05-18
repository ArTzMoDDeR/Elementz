import { type NextRequest, NextResponse } from 'next/server'
import { handlers } from '@/auth'

/**
 * GET /api/auth/redirect/[provider]?callbackUrl=...
 *
 * Used by @capacitor/browser (iOS) and mobile Safari.
 * We construct the same GET request NextAuth expects on its own signin route
 * and proxy it directly — this avoids the custom /login page redirect and
 * the NEXT_REDIRECT dance entirely.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') ?? 'https://www.elementz.fun/'

  const validProviders = ['apple', 'google', 'discord']
  if (!validProviders.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  // Build a POST request to NextAuth's internal signin endpoint
  // exactly as the NextAuth signin form does it
  const signinUrl = new URL(
    `/api/auth/signin/${provider}`,
    request.url
  )

  const body = new URLSearchParams({
    csrfToken: '', // NextAuth will validate via its own cookie flow
    callbackUrl,
    json: 'true',
  })

  // Call NextAuth's own POST handler directly
  const internalRequest = new NextRequest(signinUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      cookie: request.headers.get('cookie') ?? '',
      'x-forwarded-host': request.headers.get('x-forwarded-host') ?? request.nextUrl.host,
      'x-forwarded-proto': request.headers.get('x-forwarded-proto') ?? 'https',
    },
    body: body.toString(),
  })

  const response = await handlers.POST(internalRequest)

  // NextAuth returns a redirect or JSON with url — follow it
  if (response.status === 302 || response.status === 307 || response.status === 308) {
    const location = response.headers.get('location')
    if (location) return NextResponse.redirect(location)
  }

  // If JSON response with redirect url (json=true mode)
  try {
    const json = await response.json() as { url?: string }
    if (json?.url) return NextResponse.redirect(json.url)
  } catch {}

  // Fallback
  return NextResponse.redirect(new URL(callbackUrl, request.url))
}
