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
    if (status === 'unauthenticated') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (!PUBLIC_VAPID_KEY) return

    async function subscribe() {
      try {
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()

        // If already subscribed, just refresh the record server-side
        const sub = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
        })

        const json = sub.toJSON() as {
          endpoint: string
          keys?: { p256dh: string; auth: string }
        }
        if (!json.keys) return

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json),
        })
      } catch {
        // User denied permission or push not supported — silently ignore
      }
    }

    subscribe()
  // Re-run when session status changes (login/logout)
  }, [status])
}
