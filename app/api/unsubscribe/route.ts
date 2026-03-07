import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return new NextResponse('Token manquant.', { status: 400 })

  const sql = neon(process.env.DATABASE_URL!)

  const rows = await sql`
    SELECT user_id FROM email_unsubscribes WHERE token = ${token}
  `
  if (!rows[0]) return new NextResponse('Lien invalide ou déjà utilisé.', { status: 404 })

  await sql`UPDATE users SET email_subscribed = FALSE WHERE id = ${rows[0].user_id}`
  await sql`DELETE FROM email_unsubscribes WHERE token = ${token}`

  return new NextResponse(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Désabonnement — Elementz</title>
      <style>
        body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #e5e5e5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 20px; padding: 40px 32px; max-width: 400px; text-align: center; }
        h1 { font-size: 20px; font-weight: 700; margin: 0 0 8px; }
        p { font-size: 14px; color: #888; margin: 0 0 24px; line-height: 1.6; }
        a { display: inline-block; background: #e5e5e5; color: #0a0a0a; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 24px; border-radius: 12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Tu t'es désabonné</h1>
        <p>Tu ne recevras plus d'e-mails d'Elementz. Tu peux te réabonner à tout moment depuis ton profil.</p>
        <a href="https://elementz.fun">Retour au jeu</a>
      </div>
    </body>
    </html>
  `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
