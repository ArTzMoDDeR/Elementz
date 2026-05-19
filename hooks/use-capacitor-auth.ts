'use client'

import { useCallback } from 'react'
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
  return /iP(hone|ad|od)/.test(navigator.userAgent)
}

async function nativeAppleSignIn(): Promise<void> {
  const { SignInWithApple } = await import('@capacitor-community/apple-sign-in')

  const result = await SignInWithApple.authorize({
    clientId: 'com.eugenelabaleine.elementz',
    redirectURI: 'https://www.elementz.fun/api/auth/callback/apple',
    scopes: 'email name',
    state: Math.random().toString(36).slice(2),
    nonce: Math.random().toString(36).slice(2),
  })

  const res = await fetch('/api/auth/native/apple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identityToken: result.response.identityToken,
      user: result.response.givenName
        ? { name: { firstName: result.response.givenName, lastName: result.response.familyName ?? '' }, email: result.response.email }
        : undefined,
    }),
  })

  if (!res.ok) throw new Error('Apple native sign-in failed')

  // Session cookie is now set — reload to apply session
  window.location.href = '/'
}

async function nativeGoogleSignIn(): Promise<void> {
  const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')

  const user = await GoogleAuth.signIn()
  const idToken = user.authentication.idToken

  const res = await fetch('/api/auth/native/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })

  if (!res.ok) throw new Error('Google native sign-in failed')

  window.location.href = '/'
}

async function nativeDiscordSignIn(): Promise<void> {
  // Discord has no native SDK — use Browser.open with Universal Link callback
  const { Browser } = await import('@capacitor/browser')
  const { App } = await import('@capacitor/app')

  const authUrl = `${BASE_URL}/auth/discord?callbackUrl=${encodeURIComponent(BASE_URL + '/')}`

  // Listen for the Universal Link coming back
  const handle = await App.addListener('appUrlOpen', async (event) => {
    if (event.url.includes('elementz.fun')) {
      await handle.remove()
      await Browser.close()
      window.location.href = '/'
    }
  })

  await Browser.open({
    url: authUrl,
    presentationStyle: 'popover',
    toolbarColor: '#ffffff',
  })
}

export function useCapacitorAuth() {
  const handleSignIn = useCallback(async (provider: Provider) => {
    try {
      if (isNative()) {
        // iOS/Android app: use native SDKs for Apple and Google
        if (provider === 'apple') return await nativeAppleSignIn()
        if (provider === 'google') return await nativeGoogleSignIn()
        if (provider === 'discord') return await nativeDiscordSignIn()
        return
      }

      if (isMobileSafari()) {
        // Mobile Safari / iOS PWA: full page redirect to avoid AJAX/CSRF issues
        window.location.href = `${BASE_URL}/auth/${provider}?callbackUrl=${encodeURIComponent(BASE_URL + '/')}`
        return
      }

      // Desktop web: standard next-auth/react (fast, no reload)
      await signIn(provider, { callbackUrl: '/', redirect: true })
    } catch (err) {
      console.error(`[auth] ${provider} sign-in error:`, err)
    }
  }, [])

  return { signIn: handleSignIn }
}
