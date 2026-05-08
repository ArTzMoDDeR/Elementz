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

  const isGameData = GAME_DATA_ROUTES.some(r => url.pathname === r || url.pathname.startsWith(r + '?'))
  if (isGameData) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async cache => {
        const cached = await cache.match(event.request)
        const networkFetch = fetch(event.request)
          .then(res => {
            if (res.ok) cache.put(event.request, res.clone())
            return res
          })
          .catch(() => null)

        if (cached) {
          networkFetch.catch(() => {})
          return cached
        }
        return networkFetch || new Response('{"error":"offline"}', {
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
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone))
          }
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
      const networkFetch = fetch(event.request).then(res => {
        if (res.ok) cache.put(event.request, res.clone())
        return res
      }).catch(() => null)
      return cached || networkFetch
    })
  )
})

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = {}
  try { data = event.data.json() } catch { data = { title: 'Elementz', body: event.data.text() } }

  const { title = '', body = '', icon = '/apple-icon.png', badge = '/apple-icon.png', url = '/' } = data

  // Use "Elementz" as the notification title (app name).
  // Combine the actual title + body so Android doesn't show "from Elementz" as a subtitle.
  const notifTitle = 'Elementz'
  const notifBody = title ? (body ? `${title}\n${body}` : title) : body

  event.waitUntil(
    self.registration.showNotification(notifTitle, {
      body: notifBody,
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
