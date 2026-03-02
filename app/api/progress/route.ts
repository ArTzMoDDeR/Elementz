import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ discovered: null })

  const sql = neon(process.env.DATABASE_URL!)

  // Read from unlocks table — join elements to get FR name for store compatibility
  const rows = await sql`
    SELECT e.name_french
    FROM unlocks u
    JOIN elements e ON e.number = u.element_number
    WHERE u.user_id = ${session.user.id}
    ORDER BY u.discovered_at ASC
  `
  return NextResponse.json({ discovered: rows.map(r => r.name_french) })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { discovered, combo_ingredients } = await req.json()
  if (!Array.isArray(discovered)) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const sql = neon(process.env.DATABASE_URL!)

  // Insert new unlocks
  if (discovered.length > 0) {
    await sql`
      INSERT INTO unlocks (user_id, element_number, discovered_at)
      SELECT ${session.user.id}, e.number, NOW()
      FROM unnest(${discovered}::text[]) AS d(name)
      JOIN elements e ON e.name_french = d.name OR e.name_english = d.name
      ON CONFLICT DO NOTHING
    `
  }

  // Track element-usage quests (use_water_n, use_fire_n, use_air_n, use_earth_n)
  if (Array.isArray(combo_ingredients) && combo_ingredients.length === 2) {
    const typeMap: Record<string, string> = {
      eau: 'use_water_n', water: 'use_water_n',
      feu: 'use_fire_n',  fire: 'use_fire_n',
      air: 'use_air_n',
      terre: 'use_earth_n', earth: 'use_earth_n',
    }
    const usedTypes = new Set(
      combo_ingredients.map((n: string) => typeMap[n.toLowerCase()]).filter(Boolean)
    )
    for (const questType of usedTypes) {
      // Upsert progress for matching quests (not yet claimed)
      await sql`
        INSERT INTO user_quests (user_id, quest_id, progress, completed_at)
        SELECT ${session.user.id}, qd.id, 1, NULL
        FROM quest_definitions qd
        WHERE qd.type = ${questType}
        ON CONFLICT (user_id, quest_id) DO UPDATE
          SET progress = LEAST(
            user_quests.progress + 1,
            (SELECT target_value FROM quest_definitions WHERE id = user_quests.quest_id)
          ),
          completed_at = CASE
            WHEN user_quests.progress + 1 >= (SELECT target_value FROM quest_definitions WHERE id = user_quests.quest_id)
              AND user_quests.completed_at IS NULL
            THEN NOW()
            ELSE user_quests.completed_at
          END
        WHERE user_quests.claimed_at IS NULL
      `
    }
  }

  // Track daily_combo quest: count new discoveries today
  if (discovered.length > 0) {
    const todayNewCount = await sql`
      SELECT COUNT(*)::int AS n FROM unlocks
      WHERE user_id = ${session.user.id}
        AND discovered_at >= CURRENT_DATE
    `
    const todayCount = todayNewCount[0]?.n ?? 0
    if (todayCount > 0) {
      await sql`
        INSERT INTO user_quests (user_id, quest_id, progress)
        SELECT ${session.user.id}, qd.id, LEAST(${todayCount}, qd.target_value)
        FROM quest_definitions qd WHERE qd.type = 'daily_combo'
        ON CONFLICT (user_id, quest_id) DO UPDATE
          SET progress = LEAST(${todayCount}, (SELECT target_value FROM quest_definitions WHERE id = user_quests.quest_id)),
          completed_at = CASE
            WHEN ${todayCount} >= (SELECT target_value FROM quest_definitions WHERE id = user_quests.quest_id)
              AND user_quests.completed_at IS NULL
            THEN NOW()
            ELSE user_quests.completed_at
          END
        WHERE user_quests.claimed_at IS NULL
      `
    }
  }

  return NextResponse.json({ ok: true })
}
