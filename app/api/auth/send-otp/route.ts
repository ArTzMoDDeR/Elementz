import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const OTP_RATE_LIMIT = 3        // max requests per window
const OTP_WINDOW_MINUTES = 10   // rolling window in minutes

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  const sql = neon(process.env.DATABASE_URL!)

  // Rate limit: count recent OTP requests for this email in the rolling window
  const [rateCheck] = await sql`
    SELECT COUNT(*)::int AS n FROM email_otps
    WHERE email = ${email}
      AND created_at > NOW() - INTERVAL '${OTP_WINDOW_MINUTES} minutes'
  `
  if ((rateCheck?.n ?? 0) >= OTP_RATE_LIMIT) {
    return NextResponse.json(
      { error: `Too many requests. Please wait before requesting a new code.` },
      { status: 429 }
    )
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + OTP_WINDOW_MINUTES * 60 * 1000)

  await sql`UPDATE email_otps SET used = TRUE WHERE email = ${email} AND used = FALSE`
  await sql`INSERT INTO email_otps (email, code, expires_at) VALUES (${email}, ${code}, ${expiresAt.toISOString()})`

  const from = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'

  const { data, error } = await resend.emails.send({
    from,
    to: email,
    subject: `${code} — ton code Elementz`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:400px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:24px;font-weight:700;margin:0 0 8px">Elementz</h1>
        <p style="color:#666;margin:0 0 32px;font-size:15px">Ton code de connexion :</p>
        <div style="background:#f4f4f5;border-radius:12px;padding:24px;text-align:center;letter-spacing:8px;font-size:36px;font-weight:700;margin:0 0 32px">
          ${code}
        </div>
        <p style="color:#999;font-size:13px;margin:0">Valable 10 minutes. Ne partage pas ce code.</p>
      </div>
    `,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
