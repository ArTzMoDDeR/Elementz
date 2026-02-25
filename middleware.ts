// Middleware is intentionally minimal — admin auth is checked server-side in app/admin/layout.tsx
// This avoids running DB queries on every request via the jwt callback
export { auth as default } from '@/auth'

export const config = {
  matcher: [],
}

