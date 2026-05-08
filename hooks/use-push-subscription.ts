'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

// The public VAPID key must be set as NEXT_PUBLIC_VAPID_PUBLIC_KEY in env
const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

// Call this directly from a user gesture (button click) to request permission and subscribe.
// Pass the user's current lang so the subscription is tagged correctly for targeted notifications.
export async function subscribeToPush(lang: 'fr' | 'en' = 'en'): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  if (!PUBLIC_VAPID_KEY) return false
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
    })

    const json = sub.toJSON() as { endpoint: string; keys?: { p256dh: string; auth: string } }
    if (!json.keys) return false

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...json, lang }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
  } catch { /* ignore */ }
}

export function usePushSubscription() {
  const { status } = useSession()

  useEffect(() => {
    // On login, if permission is already granted, silently refresh the subscription record.
    // This covers users who already granted permission in a previous session.
    if (status !== 'authenticated') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (!PUBLIC_VAPID_KEY) return
    if (Notification.permission !== 'granted') return

    async function refreshSubscription() {
      try {
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        if (!existing) return

        const json = existing.toJSON() as { endpoint: string; keys?: { p256dh: string; auth: string } }
        if (!json.keys) return

        // Fetch current lang from profile to keep subscription lang in sync
        const profileRes = await fetch('/api/profile')
        const profile = profileRes.ok ? await profileRes.json() : {}
        const lang: 'fr' | 'en' = profile.lang === 'fr' ? 'fr' : 'en'

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...json, lang }),
        })
      } catch { /* ignore */ }
    }

    refreshSubscription()
  }, [status])
}
