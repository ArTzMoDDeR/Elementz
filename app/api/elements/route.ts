import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'No DB' }, { status: 500 })
    const sql = neon(process.env.DATABASE_URL)
    const elements = await sql`SELECT number, name_english, name_french, img FROM elements ORDER BY number`
    return NextResponse.json(elements)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch elements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'No DB' }, { status: 500 })
    const body = await request.json()
    const sql = neon(process.env.DATABASE_URL)
    const [{ max }] = await sql`SELECT MAX(number) as max FROM elements`
    const nextNumber = (max ?? 0) + 1
    const [el] = await sql`
      INSERT INTO elements (number, name_french, name_english)
      VALUES (${nextNumber}, ${body.name_french}, ${body.name_english ?? ''})
      RETURNING *
    `
    return NextResponse.json(el)
  } catch (error) {
    return NextResponse.json({ error: 'Create failed' }, { status: 500 })
  }
}
