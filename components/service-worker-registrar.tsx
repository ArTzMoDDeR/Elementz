'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // App service worker
      navigator.serviceWorker.register('/sw.js').catch(() => {})
      // Monetag push notifications / ad service worker
      navigator.serviceWorker.register('/monetag-sw.js', { scope: '/' }).catch(() => {})
    }
  }, [])
  return null
}
