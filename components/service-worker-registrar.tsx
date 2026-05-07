'use client'

import { useEffect } from 'react'
import { usePushSubscription } from '@/hooks/use-push-subscription'

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  usePushSubscription()

  return null
}
