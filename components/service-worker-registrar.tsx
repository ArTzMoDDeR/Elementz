'use client'

import { useEffect } from 'react'
import { usePushSubscription } from '@/hooks/use-push-subscription'

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Kill any stale Monetag SWs that may still be sending empty push notifications
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const reg of registrations) {
        const url = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL ?? ''
        if (
          url.includes('monetag') ||
          url.includes('5gvci') ||
          url.includes('quge5') ||
          url.includes('al5sm') ||
          url.includes('ophoacln')
        ) {
          reg.unregister()
        }
      }
    })

    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  usePushSubscription()

  return null
}
