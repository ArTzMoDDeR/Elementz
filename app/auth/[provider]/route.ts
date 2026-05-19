import { type NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/auth'

const VALID = ['apple', 'google', 'discord']

/**
 * GET /auth/[provider]?callbackUrl=...
 *
 * A Route Handler (not a page) — signIn() can only run in Route Handlers or
 * Server Actions, not in page.tsx. This redirects the user to the OAuth provider.
 * Used by mobile Safari, PWA, and @capacitor/browser (iOS app).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') ?? 'https://www.elementz.fun/'

  if (!VALID.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  try {
    await signIn(provider, { redirectTo: callbackUrl })
  } catch (err: unknown) {
    const digest = err instanceof Error && 'digest' in err
      ? String((err as { digest?: unknown }).digest ?? '')
      : ''

    if (digest.startsWith('NEXT_REDIRECT')) {
      const location = digest.split(';').find(p => p.startsWith('http'))
      if (location) return NextResponse.redirect(location)
    }
    throw err
  }

  return NextResponse.redirect(new URL(callbackUrl, request.url))
}
