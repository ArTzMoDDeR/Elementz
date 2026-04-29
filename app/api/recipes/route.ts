import { neon } from '@neondatabase/serverless'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const rows = await sql`
      SELECT 
        r.ingredient1_number,
        r.ingredient2_number,
        r.result_number,
        e1.name_french AS ingredient1,
        e2.name_french AS ingredient2,
        e3.name_french AS result,
        COALESCE(e1.name_english, e1.name_french) AS ingredient1_en,
        COALESCE(e2.name_english, e2.name_french) AS ingredient2_en,
        COALESCE(e3.name_english, e3.name_french) AS result_en
      FROM recipes r
      JOIN elements e1 ON e1.number = r.ingredient1_number
      JOIN elements e2 ON e2.number = r.ingredient2_number
      JOIN elements e3 ON e3.number = r.result_number
    `
    return NextResponse.json(rows, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
    })
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
