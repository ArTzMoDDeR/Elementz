import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ number: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'No DB' }, { status: 500 })
    const params = await context.params
    const elementNumber = parseInt(params.number)
    const body = await request.json()
    const sql = neon(process.env.DATABASE_URL)

    await sql`
      UPDATE elements
      SET
        name_french  = COALESCE(${body.name_french  ?? null}, name_french),
        name_english = COALESCE(${body.name_english ?? null}, name_english)
      WHERE number = ${elementNumber}
    `
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ number: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'No DB' }, { status: 500 })
    const params = await context.params
    const elementNumber = parseInt(params.number)
    const sql = neon(process.env.DATABASE_URL)
    await sql`DELETE FROM elements WHERE number = ${elementNumber}`
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
