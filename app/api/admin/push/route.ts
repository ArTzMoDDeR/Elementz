import { neon } from '@neondatabase/serverless'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'

const sql = neon(process.env.DATABASE_URL!)

webpush.setVapidDetails(
  `mailto:${process.env.EMAIL_FROM ?? 'admin@elementz.fun'}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, body, icon, url } = await req.json() as {
    title: string
    body: string
    icon?: string
    url?: string
  }

  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
  }

  const subs = await sql`SELECT endpoint, p256dh, auth FROM push_subscriptions`

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
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM push_subscriptions`
  return NextResponse.json({ count })
}
