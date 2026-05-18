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
    const isRedirect =
      err instanceof Error &&
      'digest' in err &&
      typeof (err as { digest?: string }).digest === 'string' &&
      (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')

    if (isRedirect) {
      const digest = (err as { digest: string }).digest
      // Format: NEXT_REDIRECT;replace;https://accounts.google.com/...
      const parts = digest.split(';')
      const location = parts[parts.length - 1]
      if (location.startsWith('http')) {
        return NextResponse.redirect(location)
      }
    }
    throw err
  }

  // Fallback (should not reach here)
  return NextResponse.redirect(new URL(callbackUrl, request.url))
}
