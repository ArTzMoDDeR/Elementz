import { useCallback, useEffect } from 'react'
import { signIn as nextAuthSignIn } from 'next-auth/react'

const BASE_URL = 'https://www.elementz.fun'

type Provider = 'apple' | 'google' | 'discord'

function isNative(): boolean {
  if (typeof window === 'undefined') return false
  // @ts-expect-error — Capacitor is injected at runtime
  return !!window.Capacitor?.isNativePlatform?.()
}

export function useCapacitorAuth() {
  // On iOS native: listen for Universal Links coming back into the app
  // and close the SFSafariViewController automatically.
  useEffect(() => {
    if (!isNative()) return

    let cleanup: (() => void) | undefined

    const setup = async () => {
      const { App } = await import('@capacitor/app')
      const { Browser } = await import('@capacitor/browser')

      const handle = await App.addListener('appUrlOpen', async (event) => {
        // Any deep link back to elementz.fun means auth is done — close browser
        if (event.url.includes('elementz.fun')) {
          await Browser.close()
          // Let Next.js router handle the URL — reload session
          window.location.href = '/'
        }
      })

      cleanup = () => handle.remove()
    }

    setup()
    return () => cleanup?.()
  }, [])

  const signIn = useCallback(async (provider: Provider) => {
    const callbackUrl = encodeURIComponent(BASE_URL + '/')
    const redirectUrl = `${BASE_URL}/api/auth/redirect/${provider}?callbackUrl=${callbackUrl}`

    if (isNative()) {
      // iOS native: open SFSafariViewController.
      // After auth, the callback redirects to elementz.fun which triggers
      // the Universal Link → appUrlOpen fires → Browser.close() is called above.
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({
        url: redirectUrl,
        presentationStyle: 'popover',
        toolbarColor: '#ffffff',
      })
      return
    }

    // Mobile web (Safari, PWA) + desktop: full-page redirect via our GET route.
    // This avoids popup blockers and the "invalid address" Apple OAuth error
    // that happens when next-auth/react tries to redirect directly on mobile.
    window.location.href = redirectUrl
  }, [])

  return { signIn }
}
