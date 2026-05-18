import NextAuth from 'next-auth'
import Apple from 'next-auth/providers/apple'
import Discord from 'next-auth/providers/discord'
import Credentials from 'next-auth/providers/credentials'
import { neon } from '@neondatabase/serverless'

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Apple({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name
            ? `${(profile.name as { firstName?: string; lastName?: string }).firstName ?? ''} ${(profile.name as { firstName?: string; lastName?: string }).lastName ?? ''}`.trim()
            : profile.email?.split('@')[0] ?? 'Apple User',
          email: profile.email,
          image: null,
        }
      },
    }),
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
    Credentials({
      id: 'email-otp',
      name: 'Email OTP',
      credentials: {
        email: { label: 'Email', type: 'email' },
        code: { label: 'Code', type: 'text' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string
        const code = credentials?.code as string
        if (!email || !code) return null

        const sql = neon(process.env.DATABASE_URL!)

        const rows = await sql`
          SELECT id FROM email_otps
          WHERE email = ${email}
            AND code = ${code}
            AND used = FALSE
            AND expires_at > NOW()
          ORDER BY created_at DESC
          LIMIT 1
        `
        if (!rows.length) return null

        await sql`UPDATE email_otps SET used = TRUE WHERE id = ${rows[0].id}`

        return { id: email, email, name: email.split('@')[0] }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.email) {
        const sql = neon(process.env.DATABASE_URL!)

        const rows = await sql`
          INSERT INTO users (id, name, email, image)
          VALUES (gen_random_uuid()::text, ${user.name ?? ''}, ${user.email}, ${user.image ?? null})
          ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, image = EXCLUDED.image
          RETURNING id, is_admin
        `
        if (rows[0]) {
          token.userId = rows[0].id as string
          token.isAdmin = rows[0].is_admin === 1

          const existing = await sql`SELECT user_id FROM user_progress WHERE user_id = ${rows[0].id as string}`
          if (!existing.length) {
            let username: string | null = null
            for (let n = 1; n <= 9999; n++) {
              const candidate = `Hunter${n}`
              const taken = await sql`SELECT 1 FROM user_progress WHERE LOWER(username) = LOWER(${candidate}) LIMIT 1`
              if (!taken.length) { username = candidate; break }
            }
            const starters = ['eau', 'feu', 'terre', 'air']
            const avatar = starters[Math.floor(Math.random() * starters.length)]
            await sql`
              INSERT INTO user_progress (user_id, username, avatar, show_in_leaderboard)
              VALUES (${rows[0].id as string}, ${username}, ${avatar}, true)
              ON CONFLICT (user_id) DO NOTHING
            `
            await sql`
              INSERT INTO unlocks (user_id, element_number, discovered_at)
              SELECT ${rows[0].id as string}, number, NOW()
              FROM elements
              WHERE name_french IN ('eau', 'feu', 'terre', 'air')
              ON CONFLICT DO NOTHING
            `
          }
        }
      } else if (trigger === 'update' && token.userId) {
        const sql = neon(process.env.DATABASE_URL!)
        const rows = await sql`SELECT is_admin FROM users WHERE id = ${token.userId as string}`
        if (rows[0]) token.isAdmin = rows[0].is_admin === 1
      }
      return token
    },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId as string
      if (token.isAdmin !== undefined) session.user.isAdmin = token.isAdmin as boolean
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
