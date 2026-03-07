import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'
import { Resend } from 'resend'
import { randomBytes } from 'crypto'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://elementz.fun'
const MAX_RECIPIENTS = 50

async function checkAdmin(session: Awaited<ReturnType<typeof auth>>, sql: ReturnType<typeof neon>) {
  if (!session?.user?.id) return false
  const rows = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
  return !!rows[0]?.is_admin
}

// GET — return list of users with subscription status
export async function GET() {
  const session = await auth()
  const sql = neon(process.env.DATABASE_URL!)
  if (!(await checkAdmin(session, sql))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await sql`
    SELECT id, email, username, name, email_subscribed
    FROM users
    WHERE email IS NOT NULL
    ORDER BY created_at DESC
  `
  return NextResponse.json({
    users: rows.map(u => ({
      id: u.id,
      email: u.email,
      display: u.username ?? u.name ?? u.email,
      email_subscribed: u.email_subscribed ?? true,
    })),
  })
}

// POST — send newsletter with {username}, images, and unsubscribe link
export async function POST(req: NextRequest) {
  const session = await auth()
  const sql = neon(process.env.DATABASE_URL!)
  if (!(await checkAdmin(session, sql))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { to, subject, bodyText, images = [] } = await req.json() as {
    to: string[]; subject: string; bodyText: string; images: string[]
  }

  if (!Array.isArray(to) || to.length === 0) return NextResponse.json({ error: 'No recipients' }, { status: 400 })
  if (!subject?.trim()) return NextResponse.json({ error: 'Subject required' }, { status: 400 })
  if (!bodyText?.trim()) return NextResponse.json({ error: 'Body required' }, { status: 400 })
  if (to.length > MAX_RECIPIENTS) return NextResponse.json({ error: `Max ${MAX_RECIPIENTS} recipients` }, { status: 400 })

  // Only send to subscribed real users
  const rows = await sql`
    SELECT id, email, username, name FROM users
    WHERE email = ANY(${to}::text[]) AND email_subscribed = TRUE
  `
  if (rows.length === 0) return NextResponse.json({ error: 'No valid subscribed recipients' }, { status: 400 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'

  const sent: string[] = []
  const failed: { email: string; error?: string }[] = []

  for (const user of rows) {
    // Unique unsubscribe token per send
    const token = randomBytes(32).toString('hex')
    await sql`INSERT INTO email_unsubscribes (user_id, token) VALUES (${user.id}, ${token}) ON CONFLICT DO NOTHING`
    const unsubUrl = `${APP_URL}/api/unsubscribe?token=${token}`

    const displayName = user.username ?? user.name ?? user.email
    const finalSubject = subject.replace(/\{username\}/gi, displayName)
    const finalBody = bodyText.replace(/\{username\}/gi, displayName)

    // Images block
    const imagesHtml = (images as string[])
      .filter(url => typeof url === 'string' && url.startsWith('http'))
      .map(url => `<img src="${url}" alt="" style="width:100%;max-width:520px;border-radius:12px;display:block;margin:0 auto 24px;" />`)
      .join('')

    // Plain text → HTML paragraphs
    const bodyHtml = finalBody
      .split('\n')
      .map(line => line.trim()
        ? `<p style="margin:0 0 16px;line-height:1.7;font-size:15px;color:#e5e5e5;">${line}</p>`
        : '<div style="height:8px;"></div>')
      .join('')

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${finalSubject}</title>
</head>
<body style="background:#0a0a0a;margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#141414;border-radius:20px;border:1px solid #2a2a2a;overflow:hidden;">
        <tr>
          <td style="padding:28px 36px 24px;border-bottom:1px solid #2a2a2a;">
            <span style="font-size:18px;font-weight:800;color:#e5e5e5;letter-spacing:-0.3px;">Elementz</span>
          </td>
        </tr>
        ${imagesHtml ? `<tr><td style="padding:28px 36px 0;">${imagesHtml}</td></tr>` : ''}
        <tr>
          <td style="padding:28px 36px;">${bodyHtml}</td>
        </tr>
        <tr>
          <td style="padding:20px 36px 28px;border-top:1px solid #2a2a2a;">
            <p style="margin:0 0 6px;font-size:12px;color:#555;line-height:1.6;">
              Tu reçois cet e-mail car tu as un compte sur
              <a href="${APP_URL}" style="color:#777;text-decoration:underline;">elementz.fun</a>.
            </p>
            <p style="margin:0;font-size:12px;">
              <a href="${unsubUrl}" style="color:#555;text-decoration:underline;">Se désabonner</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    try {
      const { error } = await resend.emails.send({
        from, to: user.email, subject: finalSubject, html,
        headers: {
          'List-Unsubscribe': `<${unsubUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      })
      if (error) failed.push({ email: user.email, error: error.message })
      else sent.push(user.email)
    } catch (e) {
      failed.push({ email: user.email, error: e instanceof Error ? e.message : 'Unknown' })
    }
  }

  return NextResponse.json({ sent: sent.length, failed, total: rows.length })
}
