import { neon } from '@neondatabase/serverless'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'

const sql = neon(process.env.DATABASE_URL!)

webpush.setVapidDetails(
  `mailto:${process.env.EMAIL_FROM ?? 'admin@elementz.fun'}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!(session?.user as { isAdmin?: boolean })?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const reqBody = await req.json() as {
    title: string
    body: string
    icon?: string
    url?: string
    lang?: 'fr' | 'en' | 'all'
    targetIds?: number[]
  }
  const { title, body, icon, url, lang, targetIds } = reqBody

  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
  }

  // Filter by language and/or specific IDs
  const subs = targetIds?.length
    ? await sql`SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth, ps.lang, COALESCE(up.username, u.email, 'Utilisateur') as label FROM push_subscriptions ps LEFT JOIN users u ON u.id = ps.user_id LEFT JOIN user_progress up ON up.user_id = ps.user_id WHERE ps.id = ANY(${targetIds})`
    : lang && lang !== 'all'
      ? await sql`SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth, ps.lang, COALESCE(up.username, u.email, 'Utilisateur') as label FROM push_subscriptions ps LEFT JOIN users u ON u.id = ps.user_id LEFT JOIN user_progress up ON up.user_id = ps.user_id WHERE ps.lang = ${lang}`
      : await sql`SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth, ps.lang, COALESCE(up.username, u.email, 'Utilisateur') as label FROM push_subscriptions ps LEFT JOIN users u ON u.id = ps.user_id LEFT JOIN user_progress up ON up.user_id = ps.user_id`

  const payload = JSON.stringify({
    title,
    body,
    icon: icon || '/logo.png',
    badge: '/logo.png',
    url: url || 'https://elementz.fun',
  })

  let sent = 0
  let failed = 0
  const toDelete: string[] = []
  const results: { id: number; label: string; lang: string; status: 'sent' | 'failed' | 'expired' }[] = []

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
        sent++
        results.push({ id: sub.id, label: sub.label, lang: sub.lang, status: 'sent' })
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          toDelete.push(sub.endpoint)
          results.push({ id: sub.id, label: sub.label, lang: sub.lang, status: 'expired' })
        } else {
          results.push({ id: sub.id, label: sub.label, lang: sub.lang, status: 'failed' })
        }
        failed++
      }
    }),
  )

  if (toDelete.length > 0) {
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ANY(${toDelete})`
  }

  return NextResponse.json({ sent, failed, cleaned: toDelete.length, results })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!(session?.user as { isAdmin?: boolean })?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subscribers = await sql`
    SELECT
      ps.id,
      ps.lang,
      ps.last_seen,
      COALESCE(up.username, u.email, 'Utilisateur') as label,
      u.email
    FROM push_subscriptions ps
    LEFT JOIN users u ON u.id = ps.user_id
    LEFT JOIN user_progress up ON up.user_id = ps.user_id
    ORDER BY ps.last_seen DESC
  `
  const total = subscribers.length
  const fr = subscribers.filter((s: { lang: string }) => s.lang === 'fr').length
  const en = subscribers.filter((s: { lang: string }) => s.lang === 'en').length
  return NextResponse.json({ count: total, fr, en, subscribers })
}
