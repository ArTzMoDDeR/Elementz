import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { neon } from '@neondatabase/serverless'

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      // Only hit DB on first sign-in (when `user` is present)
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
