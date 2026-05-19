import { neon } from '@neondatabase/serverless'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id ?? null

  const body = await req.json()
  const { endpoint, keys, lang, fcm_token } = body as {
    endpoint?: string
    keys?: { p256dh: string; auth: string }
    lang?: string
    fcm_token?: string
  }

  // Resolve lang: use provided lang, or fetch from users table, fallback to 'en'
  let resolvedLang = lang === 'fr' ? 'fr' : 'en'
  if (userId && !lang) {
    const rows = await sql`SELECT lang FROM users WHERE id = ${userId} LIMIT 1`
    if (rows[0]?.lang === 'fr') resolvedLang = 'fr'
  }

  // Native FCM path — no endpoint/keys needed
  if (fcm_token) {
    await sql`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, fcm_token, lang, last_seen)
      VALUES (${userId}, ${fcm_token}, '', '', ${fcm_token}, ${resolvedLang}, NOW())
      ON CONFLICT (endpoint) DO UPDATE SET
        user_id   = EXCLUDED.user_id,
        fcm_token = EXCLUDED.fcm_token,
        lang      = EXCLUDED.lang,
        last_seen = NOW()
    `
    return NextResponse.json({ ok: true, type: 'fcm' })
  }

  // Web push path — requires endpoint + keys
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, lang, last_seen)
    VALUES (${userId}, ${endpoint}, ${keys.p256dh}, ${keys.auth}, ${resolvedLang}, NOW())
    ON CONFLICT (endpoint) DO UPDATE SET
      user_id   = EXCLUDED.user_id,
      lang      = EXCLUDED.lang,
      last_seen = NOW()
  `

  return NextResponse.json({ ok: true, type: 'web' })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id ?? null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { fcm_token?: string }

  if (body.fcm_token) {
    await sql`DELETE FROM push_subscriptions WHERE fcm_token = ${body.fcm_token}`
  } else {
    await sql`DELETE FROM push_subscriptions WHERE user_id = ${userId} AND fcm_token IS NULL`
  }

  return NextResponse.json({ ok: true })
}
