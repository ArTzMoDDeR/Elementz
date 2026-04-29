import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ discovered: null })

  const sql = neon(process.env.DATABASE_URL!)

  // Return element numbers — stable across language changes
  const rows = await sql`
    SELECT element_number
    FROM unlocks
    WHERE user_id = ${session.user.id}
    ORDER BY discovered_at ASC
  `
  return NextResponse.json({ discovered: rows.map(r => r.element_number) })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { discovered, combo_ingredients } = await req.json()
  if (!Array.isArray(discovered)) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  // Allow batched discoveries (multiple combos per flush)
  if (discovered.length > 500) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const sql = neon(process.env.DATABASE_URL!)

  // Validate: only insert element numbers that actually exist AND are valid recipe results.
  // The JOIN against recipes ensures the client cannot invent arbitrary unlocks.
  if (discovered.length > 0) {
    const nums = discovered.map(Number).filter(n => Number.isInteger(n) && n > 0)
    if (nums.length > 0) {
      await sql`
        INSERT INTO unlocks (user_id, element_number, discovered_at)
        SELECT ${session.user.id}, e.number, NOW()
        FROM unnest(${nums}::int[]) AS d(num)
        JOIN elements e ON e.number = d.num
        WHERE EXISTS (
          SELECT 1 FROM recipes r WHERE r.result_number = e.number
        )
        ON CONFLICT DO NOTHING
      `
    }
  }

  // Track element-usage quests (use_water_n, use_fire_n, use_air_n, use_earth_n)
  // combo_ingredients is an array of pairs [[n1, n2], [n3, n4], ...]
  if (Array.isArray(combo_ingredients) && combo_ingredients.length > 0) {
    // Flatten all ingredient numbers from all pairs in this batch
    const allNums: number[] = combo_ingredients
      .flat()
      .map(Number)
      .filter(n => Number.isInteger(n) && n > 0)

    if (allNums.length > 0) {
      // Look up which base elements (feu/eau/air/terre) were used, mapped to quest types
      const baseRows = await sql`
        SELECT e.number,
          CASE e.name_french
            WHEN 'eau'   THEN 'use_water_n'
            WHEN 'feu'   THEN 'use_fire_n'
            WHEN 'air'   THEN 'use_air_n'
            WHEN 'terre' THEN 'use_earth_n'
          END AS quest_type
        FROM elements e
        WHERE e.name_french IN ('eau', 'feu', 'air', 'terre')
          AND e.number = ANY(${allNums}::int[])
      `

      const usedTypes = new Set(baseRows.map(r => r.quest_type).filter(Boolean) as string[])

      for (const questType of usedTypes) {
        // Count how many times this base element was used in this batch
        const baseNum = baseRows.find(r => r.quest_type === questType)?.number
        const useCount = allNums.filter(n => n === baseNum).length

        await sql`
          INSERT INTO user_quests (user_id, quest_id, progress, completed_at)
          SELECT ${session.user.id}, qd.id, ${useCount}, NULL
          FROM quest_definitions qd
          WHERE qd.type = ${questType}
          ON CONFLICT (user_id, quest_id) DO UPDATE
            SET progress = LEAST(
              user_quests.progress + ${useCount},
              (SELECT target_value FROM quest_definitions WHERE id = user_quests.quest_id)
            ),
            completed_at = CASE
              WHEN user_quests.progress + ${useCount} >= (SELECT target_value FROM quest_definitions WHERE id = user_quests.quest_id)
                AND user_quests.completed_at IS NULL
              THEN NOW()
              ELSE user_quests.completed_at
            END
          WHERE user_quests.claimed_at IS NULL
        `
      }
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
