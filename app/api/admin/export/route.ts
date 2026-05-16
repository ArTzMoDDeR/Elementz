import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (val: unknown) => {
    const s = val == null ? '' : String(val)
    // Wrap in quotes if contains comma, newline or quote
    if (s.includes(',') || s.includes('\n') || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ]
  // Prepend UTF-8 BOM so Excel/Numbers/LibreOffice decode accents correctly
  return '\uFEFF' + lines.join('\n')
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'DATABASE_URL missing' }, { status: 500 })

    const sql = neon(process.env.DATABASE_URL)

    const adminCheck = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
    if (!adminCheck[0]?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const type = req.nextUrl.searchParams.get('type') ?? 'elements'

    if (type === 'elements') {
      const rows = await sql`
        SELECT
          number,
          name_french,
          name_english,
          img
        FROM elements
        ORDER BY number
      `
      const csv = toCSV(rows as Record<string, unknown>[])
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="elements.csv"',
        },
      })
    }

    if (type === 'recipes') {
      const rows = await sql`
        SELECT
          r.id,
          r.ingredient1_number,
          e1.name_french AS ingredient1_fr,
          e1.name_english AS ingredient1_en,
          r.ingredient2_number,
          e2.name_french AS ingredient2_fr,
          e2.name_english AS ingredient2_en,
          r.result_number,
          er.name_french AS result_fr,
          er.name_english AS result_en
        FROM recipes r
        JOIN elements e1 ON e1.number = r.ingredient1_number
        JOIN elements e2 ON e2.number = r.ingredient2_number
        JOIN elements er ON er.number = r.result_number
        ORDER BY r.result_number, r.id
      `
      const csv = toCSV(rows as Record<string, unknown>[])
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="recipes.csv"',
        },
      })
    }

    if (type === 'quests') {
      const rows = await sql`
        SELECT
          qd.id,
          qd.title_fr,
          qd.title_en,
          qd.description_fr,
          qd.description_en,
          qd.target_count,
          qd.quest_type,
          qd.reward_element_number,
          qd.reset_type,
          qd.is_active,
          qd.created_at
        FROM quest_definitions qd
        ORDER BY qd.id
      `
      const csv = toCSV(rows as Record<string, unknown>[])
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="quests.csv"',
        },
      })
    }

    return NextResponse.json({ error: 'Invalid type. Use ?type=elements, ?type=recipes or ?type=quests' }, { status: 400 })

  } catch (err) {
    console.error('[v0] export: unexpected error =', err)
    return NextResponse.json({
      error: 'Internal server error',
      detail: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
