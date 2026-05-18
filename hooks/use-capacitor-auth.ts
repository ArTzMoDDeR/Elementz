import { useCallback } from 'react'

const BASE_URL = 'https://www.elementz.fun'

type Provider = 'apple' | 'google' | 'discord'

function isNative(): boolean {
  if (typeof window === 'undefined') return false
  // @ts-expect-error — Capacitor is injected at runtime
  return !!window.Capacitor?.isNativePlatform?.()
}

export function useCapacitorAuth() {
  const signIn = useCallback(async (provider: Provider) => {
    if (!isNative()) {
      // Web: use server action redirect (normal NextAuth flow)
      const { signInWithApple, signInWithGoogle, signInWithDiscord } = await import(
        '@/app/actions/auth'
      )
      if (provider === 'apple') return signInWithApple()
      if (provider === 'google') return signInWithGoogle()
      if (provider === 'discord') return signInWithDiscord()
      return
    }

    // iOS native: open SFSafariViewController via @capacitor/browser
    // NextAuth will redirect back to elementz.fun after auth,
    // which triggers the Universal Link and brings the user back to the app.
    const { Browser } = await import('@capacitor/browser')
    const url = `${BASE_URL}/api/auth/signin/${provider}?callbackUrl=${encodeURIComponent(BASE_URL + '/')}`
    await Browser.open({
      url,
      presentationStyle: 'popover', // SFSafariViewController — stays within app flow
      toolbarColor: '#ffffff',
    })
  }, [])

  return { signIn }
}
