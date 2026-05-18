import { type NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/auth'

/**
 * GET /api/auth/redirect/[provider]?callbackUrl=...
 *
 * Used by @capacitor/browser on iOS — Browser.open() can only do GET requests,
 * but NextAuth's signIn() server action does a POST. This route bridges the gap:
 * it calls signIn() on the server, which throws a NEXT_REDIRECT, and we catch
 * that redirect and forward it to the browser.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') ?? '/'

  const validProviders = ['apple', 'google', 'discord']
  if (!validProviders.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  try {
    await signIn(provider, { redirectTo: callbackUrl })
  } catch (err: unknown) {
    // NextAuth throws a NEXT_REDIRECT — extract the location and forward it
    const digest =
      err instanceof Error && 'digest' in err
        ? (err as { digest?: string }).digest ?? ''
        : ''

    console.log('[v0] redirect route digest:', digest)

    if (digest.startsWith('NEXT_REDIRECT')) {
      // Format: NEXT_REDIRECT;replace;https://accounts.google.com/...
      const parts = digest.split(';')
      console.log('[v0] redirect parts:', parts)
      const location = parts[parts.length - 1]
      if (location.startsWith('http')) {
        return NextResponse.redirect(location)
      }
    }
    console.log('[v0] redirect route unexpected error:', err)
    throw err
  }

  // Fallback (should not reach here)
  return NextResponse.redirect(new URL(callbackUrl, request.url))
}
