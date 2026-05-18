import { type NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/auth'

/**
 * GET /api/auth/redirect/[provider]?callbackUrl=...
 *
 * Used by @capacitor/browser (iOS) and mobile Safari.
 * Calls signIn() server-side, catches the NEXT_REDIRECT thrown by NextAuth,
 * and forwards the OAuth provider URL as a proper HTTP redirect.
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

  try {
    await signIn(provider, { redirectTo: callbackUrl })
  } catch (err: unknown) {
    const digest =
      err instanceof Error && 'digest' in err
        ? String((err as { digest?: unknown }).digest ?? '')
        : ''

    if (digest.startsWith('NEXT_REDIRECT')) {
      // Digest format: "NEXT_REDIRECT;replace;https://...;307;"
      // Split and find the first http URL
      const parts = digest.split(';')
      const location = parts.find((p) => p.startsWith('http'))
      if (location) {
        return NextResponse.redirect(location)
      }
    }

    throw err
  }

  return NextResponse.redirect(new URL(callbackUrl, request.url))
}
