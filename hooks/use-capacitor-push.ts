'use client'

/**
 * Unified push notification helper.
 * - On iOS/Android native (Capacitor): uses @capacitor/push-notifications
 * - On web: falls back to the existing subscribeToPush / unsubscribeFromPush helpers
 */

function isNative(): boolean {
  if (typeof window === 'undefined') return false
  // @ts-expect-error — Capacitor injected at runtime
  return !!window.Capacitor?.isNativePlatform?.()
}

/** Request permission and register for push on native iOS/Android. */
export async function nativeRequestPush(): Promise<boolean> {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const permResult = await PushNotifications.requestPermissions()
    if (permResult.receive !== 'granted') return false

    await PushNotifications.register()
    return true
  } catch (err) {
    console.error('[push] native request error', err)
    return false
  }
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
    return nativeRequestPush()
  }
  // Web fallback
  const { subscribeToPush } = await import('@/hooks/use-push-subscription')
  return subscribeToPush(lang)
}

/** Unified unsubscribe — picks native or web automatically. */
export async function capacitorUnsubscribeFromPush(): Promise<void> {
  if (isNative()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications')
      await PushNotifications.unregister()
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
