'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Monetag verification + push ads SW (must stay at /sw.js)
      navigator.serviceWorker.register('/sw.js').catch(() => {})
      // App caching + push notifications SW
      navigator.serviceWorker.register('/app-sw.js').catch(() => {})
    }
  }, [])
  return null
}
