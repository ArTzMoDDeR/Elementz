import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'
import { Resend } from 'resend'

async function checkAdmin(session: Awaited<ReturnType<typeof auth>>, sql: ReturnType<typeof neon>) {
  if (!session?.user?.id) return false
  const rows = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
  return !!rows[0]?.is_admin
}

// GET — return list of user emails
export async function GET() {
  const session = await auth()
  const sql = neon(process.env.DATABASE_URL!)
  if (!(await checkAdmin(session, sql))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await sql`
    SELECT u.id, u.email, u.name, COALESCE(up.username, u.name, u.email) AS display
    FROM users u
    LEFT JOIN user_progress up ON up.user_id = u.id
    ORDER BY u.created_at DESC
  `
  return NextResponse.json({ users: rows })
}

// POST — send email to selected recipients
export async function POST(req: NextRequest) {
  const session = await auth()
  const sql = neon(process.env.DATABASE_URL!)
  if (!(await checkAdmin(session, sql))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { to, subject, body } = await req.json()

  if (!Array.isArray(to) || to.length === 0) {
    return NextResponse.json({ error: 'No recipients selected' }, { status: 400 })
  }
  if (!subject?.trim()) return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
  if (!body?.trim()) return NextResponse.json({ error: 'Body is required' }, { status: 400 })
  if (to.length > 50) return NextResponse.json({ error: 'Max 50 recipients at once' }, { status: 400 })

  // Validate all emails belong to real users
  const placeholders = to.map((e: string) => e.toLowerCase())
  const valid = await sql`
    SELECT email FROM users WHERE LOWER(email) = ANY(${placeholders}::text[])
  `
  const validEmails = valid.map((r: { email: string }) => r.email)
  if (validEmails.length === 0) return NextResponse.json({ error: 'No valid recipients' }, { status: 400 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'

  const htmlBody = body
    .split('\n')
    .map((line: string) => `<p style="margin:0 0 12px;line-height:1.6">${line || '&nbsp;'}</p>`)
    .join('')

  const results: { email: string; ok: boolean; error?: string }[] = []

  for (const email of validEmails) {
    const { error } = await resend.emails.send({
      from,
      to: email,
      subject: subject.trim(),
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111">
          ${htmlBody}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
          <p style="font-size:12px;color:#9ca3af;margin:0">
            Tu reçois cet e-mail car tu as un compte sur <a href="https://elementz.fun" style="color:#6b7280">elementz.fun</a>.
          </p>
        </div>
      `,
    })
    results.push({ email, ok: !error, error: error?.message })
  }

  const sent = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok)
  return NextResponse.json({ sent, failed, total: validEmails.length })
}
