const CACHE_NAME = 'elementz-v1'
const STATIC_ASSETS = [
  '/',
  '/logo.png',
  '/manifest.json',
]

// Install — cache static assets immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch strategy:
// - API routes → Network first, fallback to cache
// - Static assets → Cache first, revalidate in background (stale-while-revalidate)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET and cross-origin
  if (event.request.method !== 'GET') return
  if (url.origin !== self.location.origin) return
  // Skip auth/progress — always need fresh data
  if (url.pathname.startsWith('/api/auth') || url.pathname.startsWith('/api/progress')) return

  if (url.pathname.startsWith('/api/')) {
    // API: network first, fallback to cache (works on flaky connections)
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
          return res
        })
        .catch(() => caches.match(event.request))
    )
  } else {
    // Static: stale-while-revalidate
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request)
        const fetchPromise = fetch(event.request).then(res => {
          cache.put(event.request, res.clone())
          return res
        }).catch(() => null)
        return cached || fetchPromise
      })
    )
  }
})
