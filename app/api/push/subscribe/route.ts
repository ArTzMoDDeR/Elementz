import { neon } from '@neondatabase/serverless'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id ?? null

  const body = await req.json()
  const { endpoint, keys } = body as {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, last_seen)
    VALUES (${userId}, ${endpoint}, ${keys.p256dh}, ${keys.auth}, NOW())
    ON CONFLICT (endpoint) DO UPDATE SET
      user_id   = EXCLUDED.user_id,
      last_seen = NOW()
  `

  return NextResponse.json({ ok: true })
}
