const CACHE_VERSION = 'elementz-v4'
const DATA_CACHE = 'elementz-data-v4'

const STATIC_ASSETS = [
  '/',
  '/logo.png',
  '/logo.svg',
  '/manifest.json',
  '/apple-icon.png',
  '/favicon.png',
]

const GAME_DATA_ROUTES = [
  '/api/elements',
  '/api/recipes',
]

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// ── Activate — purge old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (event.request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  if (
    url.pathname.startsWith('/api/auth') ||
    url.pathname.startsWith('/api/progress') ||
    url.pathname.startsWith('/api/quests') ||
    url.pathname.startsWith('/api/leaderboard') ||
    url.pathname.startsWith('/api/profile') ||
    url.pathname.startsWith('/api/lang') ||
    url.pathname.startsWith('/admin')
  ) return

  // Helper: only cache complete (non-partial) successful responses
  function safePut(cache, request, response) {
    if (response && response.ok && response.status !== 206) {
      cache.put(request, response.clone()).catch(() => {})
    }
  }

  const isGameData = GAME_DATA_ROUTES.some(r => url.pathname === r || url.pathname.startsWith(r + '?'))
  if (isGameData) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async cache => {
        const cached = await cache.match(event.request)
        const networkFetch = fetch(event.request)
          .then(res => { safePut(cache, event.request, res); return res })
          .catch(() => null)

        if (cached) {
          networkFetch.catch(() => {})
          return cached
        }
        const res = await networkFetch
        return res || new Response('{"error":"offline"}', {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      })
    )
    return
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          caches.open(CACHE_VERSION).then(cache => safePut(cache, event.request, res))
          return res
        })
        .catch(() => caches.match(event.request).then(cached =>
          cached || new Response('{"error":"offline"}', {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          })
        ))
    )
    return
  }

  event.respondWith(
    caches.open(CACHE_VERSION).then(async cache => {
      const cached = await cache.match(event.request)
      const networkFetch = fetch(event.request)
        .then(res => { safePut(cache, event.request, res); return res })
        .catch(() => null)
      if (cached) return cached
      const res = await networkFetch
      return res || new Response('', { status: 503 })
    })
  )
})

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = {}
  try { data = event.data.json() } catch { data = { title: 'Elementz', body: event.data.text() } }

  const { title = 'Elementz', body = '', icon = '/apple-icon.png', badge = '/apple-icon.png', url = '/' } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url },
      vibrate: [100, 50, 100],
      tag: 'elementz-notif',
      renotify: true,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl)
    })
  )
})
