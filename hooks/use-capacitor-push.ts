'use client'

/**
 * Unified push notification helper.
 * - On iOS native (Capacitor): uses @capacitor/push-notifications + sends FCM token to server
 * - On web: falls back to the existing web-push subscription helpers
 */

function isNative(): boolean {
  if (typeof window === 'undefined') return false
  // @ts-expect-error — Capacitor injected at runtime
  return !!window.Capacitor?.isNativePlatform?.()
}

/** Request permission, register for push, get FCM token, send to server. */
export async function nativeRequestPush(lang: 'fr' | 'en' = 'en'): Promise<boolean> {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    const permResult = await PushNotifications.requestPermissions()
    if (permResult.receive !== 'granted') return false

    // Listen for the FCM registration token (one-shot)
    const tokenPromise = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('FCM registration timeout')), 10000)

      PushNotifications.addListener('registration', (token) => {
        clearTimeout(timeout)
        resolve(token.value)
      })

      PushNotifications.addListener('registrationError', (err) => {
        clearTimeout(timeout)
        reject(new Error(err.error))
      })
    })

    await PushNotifications.register()
    const fcmToken = await tokenPromise

    // Send FCM token to our server
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fcm_token: fcmToken, lang }),
    })

    return true
  } catch (err) {
    console.error('[push] native registration error', err)
    return false
  }
}

/** Re-register silently on app resume to keep the token fresh. */
export async function nativeRefreshPushToken(lang: 'fr' | 'en' = 'en'): Promise<void> {
  if (!isNative()) return
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const perm = await PushNotifications.checkPermissions()
    if (perm.receive !== 'granted') return

    await PushNotifications.addListener('registration', async (token) => {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fcm_token: token.value, lang }),
      })
    })

    await PushNotifications.register()
  } catch {}
}

/** Check current native push permission without prompting. */
export async function nativeCheckPushPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const result = await PushNotifications.checkPermissions()
    return result.receive
  } catch {
    return 'denied'
  }
}

/** Unified subscribe — picks native or web automatically. */
export async function capacitorSubscribeToPush(lang: 'fr' | 'en' = 'en'): Promise<boolean> {
  if (isNative()) {
    return nativeRequestPush(lang)
  }
  const { subscribeToPush } = await import('@/hooks/use-push-subscription')
  return subscribeToPush(lang)
}

/** Unified unsubscribe — picks native or web automatically. */
export async function capacitorUnsubscribeFromPush(): Promise<void> {
  if (isNative()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications')
      await PushNotifications.unregister()
      await fetch('/api/push/subscribe', { method: 'DELETE' })
    } catch (err) {
      console.error('[push] native unregister error', err)
    }
    return
  }
  const { unsubscribeFromPush } = await import('@/hooks/use-push-subscription')
  await unsubscribeFromPush()
}

/** Check if push is currently blocked (native or web). */
export async function isPushDenied(): Promise<boolean> {
  if (isNative()) {
    const perm = await nativeCheckPushPermission()
    return perm === 'denied'
  }
  if (typeof Notification === 'undefined') return true
  return Notification.permission === 'denied'
}
