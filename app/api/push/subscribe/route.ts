import { neon } from '@neondatabase/serverless'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id ?? null

  const body = await req.json()
  const { endpoint, keys, lang } = body as {
    endpoint: string
    keys: { p256dh: string; auth: string }
    lang?: string
  }

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  // Resolve lang: use provided lang, or fetch from users table, fallback to 'en'
  let resolvedLang = lang === 'fr' ? 'fr' : 'en'
  if (userId && !lang) {
    const rows = await sql`SELECT lang FROM users WHERE id = ${userId} LIMIT 1`
    if (rows[0]?.lang === 'fr') resolvedLang = 'fr'
  }

  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, lang, last_seen)
    VALUES (${userId}, ${endpoint}, ${keys.p256dh}, ${keys.auth}, ${resolvedLang}, NOW())
    ON CONFLICT (endpoint) DO UPDATE SET
      user_id   = EXCLUDED.user_id,
      lang      = EXCLUDED.lang,
      last_seen = NOW()
  `

  return NextResponse.json({ ok: true })
}
