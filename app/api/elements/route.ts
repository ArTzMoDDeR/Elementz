import { neon } from '@neondatabase/serverless'
import { NextResponse } from 'next/server'

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const elements = await sql`SELECT * FROM elements ORDER BY name`
    return NextResponse.json(elements)
  } catch (error) {
    console.error('[v0] Error fetching elements:', error)
    return NextResponse.json({ error: 'Failed to fetch elements' }, { status: 500 })
  }
}
