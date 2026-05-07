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

export function usePushSubscription() {
  const { status } = useSession()

  useEffect(() => {
    if (status !== 'authenticated') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (!PUBLIC_VAPID_KEY) return

    async function syncSubscription() {
      try {
        // Check user's saved preference first
        const profileRes = await fetch('/api/profile')
        if (!profileRes.ok) return
        const profile = await profileRes.json()
        const wantsPush = profile.push_notifications !== false

        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()

        if (!wantsPush) {
          // User opted out — unsubscribe if still subscribed
          if (existing) await existing.unsubscribe()
          return
        }

        // User wants push — subscribe (or refresh existing)
        const sub = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
        })

        const json = sub.toJSON() as { endpoint: string; keys?: { p256dh: string; auth: string } }
        if (!json.keys) return

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json),
        })
      } catch {
        // Permission denied or push not supported — silently ignore
      }
    }

    syncSubscription()
  }, [status])
}
