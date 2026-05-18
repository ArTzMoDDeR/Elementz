'use client'

import { useCallback, useEffect } from 'react'
import { signIn } from 'next-auth/react'

type Provider = 'apple' | 'google' | 'discord'

function isNative(): boolean {
  if (typeof window === 'undefined') return false
  // @ts-expect-error — Capacitor injected at runtime
  return !!window.Capacitor?.isNativePlatform?.()
}

export function useCapacitorAuth() {
  // On iOS native: listen for Universal Links and close the SFSafariViewController
  useEffect(() => {
    if (!isNative()) return
    let remove: (() => void) | undefined

    import('@capacitor/app').then(({ App }) => {
      import('@capacitor/browser').then(({ Browser }) => {
        App.addListener('appUrlOpen', async (event) => {
          if (event.url.includes('elementz.fun')) {
            await Browser.close()
            // Force session refresh
            window.location.href = '/'
          }
        }).then((handle) => {
          remove = () => handle.remove()
        })
      })
    })

    return () => remove?.()
  }, [])

  const handleSignIn = useCallback(async (provider: Provider) => {
    if (isNative()) {
      // iOS native app: open SFSafariViewController with NextAuth's direct signin URL.
      // Since we removed pages.signIn, /api/auth/signin/[provider] now redirects
      // directly to the OAuth provider without any intermediate page.
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({
        url: `https://www.elementz.fun/api/auth/signin/${provider}?callbackUrl=${encodeURIComponent('https://www.elementz.fun/')}`,
        presentationStyle: 'popover',
        toolbarColor: '#ffffff',
      })
      return
    }

    // Web (mobile Safari, PWA, desktop): standard NextAuth redirect flow.
    await signIn(provider, { callbackUrl: '/', redirect: true })
  }, [])

  return { signIn: handleSignIn }
}
