import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { neon } from '@neondatabase/serverless'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  // Always check is_admin directly from DB in the layout (server-side, no overhead on game routes)
  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
  const isAdmin = rows[0]?.is_admin === 1

  if (!isAdmin) {
    redirect('/')
  }

  return <>{children}</>
}
