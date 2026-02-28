import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Discord from 'next-auth/providers/discord'
import Credentials from 'next-auth/providers/credentials'
import { neon } from '@neondatabase/serverless'

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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

        // Mark code as used
        await sql`UPDATE email_otps SET used = TRUE WHERE id = ${rows[0].id}`

        // Return a minimal user object — the jwt callback will upsert into users
        return { id: email, email, name: email.split('@')[0] }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Only hit DB on first sign-in or explicit session update
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
        }
      } else if (trigger === 'update' && token.userId) {
        // Explicit refresh (called via useSession().update()) — re-read is_admin
        const sql = neon(process.env.DATABASE_URL!)
        const rows = await sql`SELECT is_admin FROM users WHERE id = ${token.userId as string}`
        if (rows[0]) token.isAdmin = rows[0].is_admin === 1
      }
      // All other requests: return cached token — zero DB calls
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
