import { useCallback } from 'react'
import { signIn as nextAuthSignIn } from 'next-auth/react'

const BASE_URL = 'https://www.elementz.fun'

type Provider = 'apple' | 'google' | 'discord'

function isNative(): boolean {
  if (typeof window === 'undefined') return false
  // @ts-expect-error — Capacitor is injected at runtime
  return !!window.Capacitor?.isNativePlatform?.()
}

export function useCapacitorAuth() {
  const signIn = useCallback(async (provider: Provider) => {
    if (isNative()) {
      // iOS native: open SFSafariViewController via @capacitor/browser.
      // We use our own GET route /api/auth/redirect/[provider] because
      // NextAuth's signIn page requires a POST which Browser.open() can't do.
      const { Browser } = await import('@capacitor/browser')
      const callbackUrl = encodeURIComponent(BASE_URL + '/')
      const url = `${BASE_URL}/api/auth/redirect/${provider}?callbackUrl=${callbackUrl}`
      await Browser.open({
        url,
        presentationStyle: 'popover',
        toolbarColor: '#ffffff',
      })
      return
    }

    // Web (desktop + mobile): use next-auth/react signIn with redirect mode.
    // This avoids popup blockers on mobile Safari and works on all browsers.
    await nextAuthSignIn(provider, { callbackUrl: '/', redirect: true })
  }, [])

  return { signIn }
}
