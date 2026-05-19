'use client'

import { useCallback, useEffect } from 'react'
import { signIn } from 'next-auth/react'

const BASE_URL = 'https://www.elementz.fun'

type Provider = 'apple' | 'google' | 'discord'

function isNative(): boolean {
  if (typeof window === 'undefined') return false
  // @ts-expect-error — Capacitor injected at runtime
  return !!window.Capacitor?.isNativePlatform?.()
}

function isMobileSafari(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  // Matches mobile Safari and iOS PWA (standalone)
  return /iP(hone|ad|od)/.test(ua)
}

export function useCapacitorAuth() {
  // On iOS native: listen for Universal Links and close SFSafariViewController
  useEffect(() => {
    if (!isNative()) return
    let remove: (() => void) | undefined

    import('@capacitor/app').then(({ App }) => {
      import('@capacitor/browser').then(({ Browser }) => {
        App.addListener('appUrlOpen', async (event) => {
          if (event.url.includes('elementz.fun')) {
            await Browser.close()
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
    const callbackUrl = encodeURIComponent(BASE_URL + '/')
    // The /auth/[provider] page is a Next.js Server Component that calls
    // signIn() server-side and does a real HTTP redirect to the OAuth provider.
    // This avoids ALL the issues with AJAX/CSRF/POST on mobile Safari and Capacitor.
    const authUrl = `${BASE_URL}/auth/${provider}?callbackUrl=${callbackUrl}`

    if (isNative()) {
      // iOS app: open in SFSafariViewController (stays in-app)
      // After OAuth, the Universal Link brings user back and Browser.close() fires
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({
        url: authUrl,
        presentationStyle: 'popover',
        toolbarColor: '#ffffff',
      })
      return
    }

    if (isMobileSafari()) {
      // Mobile Safari / iOS PWA: full page redirect (avoids popup blockers
      // and the Apple form_post SameSite cookie issue)
      window.location.href = authUrl
      return
    }

    // Desktop: standard next-auth/react signIn (fast, no full page reload)
    await signIn(provider, { callbackUrl: '/', redirect: true })
  }, [])

  return { signIn: handleSignIn }
}
