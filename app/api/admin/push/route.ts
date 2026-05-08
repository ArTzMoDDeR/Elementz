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

  const { title, body, icon, url, lang } = await req.json() as {
    title: string
    body: string
    icon?: string
    url?: string
    lang?: 'fr' | 'en' | 'all'
  }

  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
  }

  // Filter by language if specified
  const subs = lang && lang !== 'all'
    ? await sql`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE lang = ${lang}`
    : await sql`SELECT endpoint, p256dh, auth FROM push_subscriptions`

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

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
        sent++
      } catch (err: unknown) {
        failed++
        // 404/410 = subscription expired — clean it up
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          toDelete.push(sub.endpoint)
        }
      }
    }),
  )

  if (toDelete.length > 0) {
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ANY(${toDelete})`
  }

  return NextResponse.json({ sent, failed, cleaned: toDelete.length })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!(session?.user as { isAdmin?: boolean })?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await sql`
    SELECT lang, COUNT(*)::int AS count
    FROM push_subscriptions
    GROUP BY lang
  `
  const total = rows.reduce((acc: number, r: { count: number }) => acc + r.count, 0)
  const fr = rows.find((r: { lang: string }) => r.lang === 'fr')?.count ?? 0
  const en = rows.find((r: { lang: string }) => r.lang === 'en')?.count ?? 0
  return NextResponse.json({ count: total, fr, en })
}
