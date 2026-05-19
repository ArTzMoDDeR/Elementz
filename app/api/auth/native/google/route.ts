import { type NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { encode } from 'next-auth/jwt'

/**
 * POST /api/auth/native/google
 * Body: { idToken: string }
 *
 * Validates Google's idToken via Google's tokeninfo endpoint,
 * upserts the user, and returns a NextAuth JWT session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { idToken: string }
    const { idToken } = body

    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 })
    }

    // Validate via Google's public endpoint
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`)
    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 })
    }

    const info = await verifyRes.json() as {
      email: string
      name: string
      picture: string
      sub: string
      aud: string
      exp: string
    }

    // Validate audience — must be one of our client IDs
    const validAudiences = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
    ].filter(Boolean)

    if (!validAudiences.includes(info.aud)) {
      return NextResponse.json({ error: 'Invalid audience' }, { status: 401 })
    }

    const now = Math.floor(Date.now() / 1000)
    if (parseInt(info.exp) < now) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 })
    }

    const { email, name, picture } = info

    // Upsert user in DB
    const sql = neon(process.env.DATABASE_URL!)
    const rows = await sql`
      INSERT INTO users (id, name, email, image)
      VALUES (gen_random_uuid()::text, ${name}, ${email}, ${picture ?? null})
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, image = EXCLUDED.image
      RETURNING id, is_admin
    `
    const userId = rows[0].id as string
    const isAdmin = rows[0].is_admin === 1

    const existing = await sql`SELECT user_id FROM user_progress WHERE user_id = ${userId}`
    if (!existing.length) {
      let username: string | null = null
      for (let n = 1; n <= 9999; n++) {
        const candidate = `Hunter${n}`
        const taken = await sql`SELECT 1 FROM user_progress WHERE LOWER(username) = LOWER(${candidate}) LIMIT 1`
        if (!taken.length) { username = candidate; break }
      }
      const starters = ['eau', 'feu', 'terre', 'air']
      const avatar = starters[Math.floor(Math.random() * starters.length)]
      await sql`INSERT INTO user_progress (user_id, username, avatar, show_in_leaderboard) VALUES (${userId}, ${username}, ${avatar}, true) ON CONFLICT (user_id) DO NOTHING`
      await sql`INSERT INTO unlocks (user_id, element_number, discovered_at) SELECT ${userId}, number, NOW() FROM elements WHERE name_french IN ('eau','feu','terre','air') ON CONFLICT DO NOTHING`
    }

    // Create a NextAuth JWT session cookie
    const token = await encode({
      token: { userId, isAdmin, email, name, picture: picture ?? null, sub: email },
      secret: process.env.AUTH_SECRET!,
      salt: 'authjs.session-token',
    })

    const response = NextResponse.json({ ok: true })
    response.cookies.set('authjs.session-token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
    return response
  } catch (err) {
    console.error('[native/google]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
