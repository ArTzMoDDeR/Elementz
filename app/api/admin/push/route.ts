import { neon } from '@neondatabase/serverless'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { getMessaging } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  const sql = neon(process.env.DATABASE_URL!)
  webpush.setVapidDetails(
    `mailto:${process.env.EMAIL_FROM ?? 'admin@elementz.fun'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
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

  const baseQuery = `
    SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth, ps.fcm_token, ps.lang,
           COALESCE(up.username, u.email, 'Utilisateur') as label
    FROM push_subscriptions ps
    LEFT JOIN users u ON u.id = ps.user_id
    LEFT JOIN user_progress up ON up.user_id = ps.user_id
  `

  const subs = targetIds?.length
    ? await sql`SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth, ps.fcm_token, ps.lang, COALESCE(up.username, u.email, 'Utilisateur') as label FROM push_subscriptions ps LEFT JOIN users u ON u.id = ps.user_id LEFT JOIN user_progress up ON up.user_id = ps.user_id WHERE ps.id = ANY(${targetIds})`
    : lang && lang !== 'all'
      ? await sql`SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth, ps.fcm_token, ps.lang, COALESCE(up.username, u.email, 'Utilisateur') as label FROM push_subscriptions ps LEFT JOIN users u ON u.id = ps.user_id LEFT JOIN user_progress up ON up.user_id = ps.user_id WHERE ps.lang = ${lang}`
      : await sql`SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth, ps.fcm_token, ps.lang, COALESCE(up.username, u.email, 'Utilisateur') as label FROM push_subscriptions ps LEFT JOIN users u ON u.id = ps.user_id LEFT JOIN user_progress up ON up.user_id = ps.user_id`

  void baseQuery // silence unused var

  const webPayload = JSON.stringify({
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
        if (sub.fcm_token && sub.p256dh === '') {
          // Native FCM subscriber
          await getMessaging().send({
            token: sub.fcm_token,
            notification: {
              title,
              body,
              imageUrl: icon || undefined,
            },
            apns: {
              payload: {
                aps: {
                  badge: 1,
                  sound: 'default',
                },
              },
              fcmOptions: {
                imageUrl: icon || undefined,
              },
            },
            data: {
              url: url || 'https://elementz.fun',
            },
          })
        } else {
          // Web push subscriber
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            webPayload,
          )
        }
        sent++
        results.push({ id: sub.id, label: sub.label, lang: sub.lang, status: 'sent' })
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        const code = (err as { code?: string }).code
        // FCM token no longer valid
        if (status === 404 || status === 410 || code === 'messaging/registration-token-not-registered') {
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
  const sql = neon(process.env.DATABASE_URL!)
  const session = await auth()
  if (!(session?.user as { isAdmin?: boolean })?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subscribers = await sql`
    SELECT
      ps.id,
      ps.lang,
      ps.last_seen,
      ps.fcm_token IS NOT NULL AND ps.p256dh = '' AS is_native,
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
  const native = subscribers.filter((s: { is_native: boolean }) => s.is_native).length
  return NextResponse.json({ count: total, fr, en, native, subscribers })
}
