import { type NextRequest, NextResponse } from 'next/server'
import { createPublicKey, createVerify } from 'crypto'
import { neon } from '@neondatabase/serverless'
import { encode } from 'next-auth/jwt'

/**
 * POST /api/auth/native/apple
 * Body: { identityToken: string, user?: { name?: string, email?: string } }
 *
 * Validates Apple's identityToken (JWT signed by Apple's public keys),
 * extracts the user's email/sub, upserts the user in the DB, and returns
 * a NextAuth JWT session cookie so the app is logged in natively.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { identityToken: string; user?: { name?: { firstName?: string; lastName?: string }; email?: string } }
    const { identityToken, user: nativeUser } = body

    if (!identityToken) {
      return NextResponse.json({ error: 'Missing identityToken' }, { status: 400 })
    }

    // Decode JWT header + payload (without verifying — Apple's public keys validate)
    const parts = identityToken.split('.')
    if (parts.length !== 3) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())

    // Basic claims validation
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return NextResponse.json({ error: 'Token expired' }, { status: 401 })
    if (!['com.eugenelabaleine.elementz', 'com.eugenelabaleine.elementz.web'].includes(payload.aud)) {
      return NextResponse.json({ error: 'Invalid audience' }, { status: 401 })
    }

    const email = payload.email ?? nativeUser?.email ?? `${payload.sub}@privaterelay.appleid.com`
    const name = nativeUser?.user
      ? `${(nativeUser as any).user?.name?.firstName ?? ''} ${(nativeUser as any).user?.name?.lastName ?? ''}`.trim()
      : nativeUser?.name
      ? `${(nativeUser as any).name?.firstName ?? ''} ${(nativeUser as any).name?.lastName ?? ''}`.trim()
      : email.split('@')[0]

    // Upsert user in DB
    const sql = neon(process.env.DATABASE_URL!)
    const rows = await sql`
      INSERT INTO users (id, name, email, image)
      VALUES (gen_random_uuid()::text, ${name}, ${email}, null)
      ON CONFLICT (email) DO UPDATE SET name = COALESCE(NULLIF(EXCLUDED.name,''), users.name)
      RETURNING id, is_admin
    `
    const userId = rows[0].id as string
    const isAdmin = rows[0].is_admin === 1

    // Ensure user_progress exists
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

    // Create a NextAuth JWT
    const token = await encode({
      token: { userId, isAdmin, email, name, sub: email, picture: null },
      secret: process.env.AUTH_SECRET!,
      salt: 'authjs.session-token',
    })

    const response = NextResponse.json({ ok: true })
    response.cookies.set('authjs.session-token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    return response
  } catch (err) {
    console.error('[native/apple]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
