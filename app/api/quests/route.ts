import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = neon(process.env.DATABASE_URL!)
  const userId = session.user.id

  const quests = await sql`
    SELECT
      qd.id,
      qd.type,
      qd.title_fr,
      qd.title_en,
      qd.desc_fr,
      qd.desc_en,
      qd.target_value,
      qd.icon,
      qd.sort_order,
      qd.is_daily,
      qd.reset_hours,
      qd.required_element,
      COALESCE(uq.progress, 0) AS progress,
      uq.completed_at,
      uq.claimed_at,
      uq.reset_at
    FROM quest_definitions qd
    LEFT JOIN user_quests uq ON uq.quest_id = qd.id AND uq.user_id = ${userId}
    ORDER BY qd.sort_order ASC
  `

  const rewards = await sql`
    SELECT qr.quest_id, qr.slot, qr.scratched_at,
           e.name_french AS name_french, e.name_english AS name_english, e.img,
           er.name_french AS result_name_french, er.name_english AS result_name_english, er.img AS result_img,
           qr.result_number
    FROM quest_rewards qr
    JOIN elements e ON e.number = qr.element_number
    LEFT JOIN elements er ON er.number = qr.result_number
    WHERE qr.user_id = ${userId}
  `

  // Live counts
  const [unlockCount] = await sql`SELECT COUNT(*)::int AS n FROM unlocks WHERE user_id = ${userId}`
  const [comboCount] = await sql`SELECT COUNT(*)::int AS n FROM element_actions WHERE user_id = ${userId}`
  const [sessionCount] = await sql`
    SELECT COUNT(DISTINCT DATE_TRUNC('day', discovered_at))::int AS n
    FROM unlocks WHERE user_id = ${userId}
  `

  const rewardsByQuest: Record<number, typeof rewards> = {}
  for (const r of rewards) {
    if (!rewardsByQuest[r.quest_id]) rewardsByQuest[r.quest_id] = []
    rewardsByQuest[r.quest_id].push(r)
  }

  const now = new Date()

  const result = quests.map((q: any) => {
    let liveProgress = q.progress

    // For daily quests: reset if reset_at is past
    const isExpired = q.is_daily && q.reset_at && new Date(q.reset_at) <= now
    if (isExpired) liveProgress = 0

    if (q.type === 'discover_n' || q.type === 'discover_n_daily') {
      liveProgress = isExpired ? 0 : Math.min(unlockCount.n, q.target_value)
    } else if (q.type === 'combinations_n') {
      liveProgress = Math.min(comboCount.n, q.target_value)
    } else if (q.type === 'session_n') {
      liveProgress = Math.min(sessionCount.n, q.target_value)
    } else if (q.type === 'specific_element') {
      // Check if the required element is in unlocks
      // required_element holds the element number
      liveProgress = q.required_element ? 0 : 0 // resolved below
    }

    return {
      ...q,
      progress: liveProgress,
      rewards: rewardsByQuest[q.id] ?? [],
      is_expired: isExpired,
    }
  })

  // Resolve specific_element progress (batch)
  const specificQuests = result.filter((q: any) => q.type === 'specific_element' && q.required_element)
  if (specificQuests.length > 0) {
    const elementNums = specificQuests.map((q: any) => q.required_element)
    const unlocked = await sql`
      SELECT element_number FROM unlocks
      WHERE user_id = ${userId} AND element_number = ANY(${elementNums})
    `
    const unlockedSet = new Set(unlocked.map((r: any) => r.element_number))
    for (const q of result as any[]) {
      if (q.type === 'specific_element' && q.required_element) {
        q.progress = unlockedSet.has(q.required_element) ? 1 : 0
      }
    }
  }

  return NextResponse.json({ quests: result })
}


// POST /api/quests — claim a completed quest (generate scratch cards)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { quest_id } = await req.json()
  if (!quest_id) return NextResponse.json({ error: 'Missing quest_id' }, { status: 400 })

  const sql = neon(process.env.DATABASE_URL!)
  const userId = session.user.id

  // Verify quest exists
  const [quest] = await sql`SELECT * FROM quest_definitions WHERE id = ${quest_id}`
  if (!quest) return NextResponse.json({ error: 'Quest not found' }, { status: 404 })

  // Verify completion — for discover_n check live count
  const [unlockCount] = await sql`SELECT COUNT(*)::int AS n FROM unlocks WHERE user_id = ${userId}`
  let completed = false
  if (quest.type === 'discover_n') completed = unlockCount.n >= quest.target_value
  // For usage-based quests, trust the stored progress
  else {
    const [uq] = await sql`SELECT progress FROM user_quests WHERE user_id = ${userId} AND quest_id = ${quest_id}`
    completed = uq && uq.progress >= quest.target_value
  }
  if (!completed) return NextResponse.json({ error: 'Quest not completed' }, { status: 400 })

  // Check not already claimed
  const [existing] = await sql`SELECT claimed_at FROM user_quests WHERE user_id = ${userId} AND quest_id = ${quest_id}`
  if (existing?.claimed_at) return NextResponse.json({ error: 'Already claimed' }, { status: 400 })

  // Pick a recipe where BOTH ingredients are already unlocked but result is NOT yet discovered
  const candidates = await sql`
    SELECT r.ingredient1_number, r.ingredient2_number, r.result_number,
           e1.name_french AS ing1_fr, e1.name_english AS ing1_en, e1.img AS ing1_img,
           e2.name_french AS ing2_fr, e2.name_english AS ing2_en, e2.img AS ing2_img,
           er.name_french AS result_fr, er.name_english AS result_en, er.img AS result_img
    FROM recipes r
    JOIN elements e1 ON e1.number = r.ingredient1_number
    JOIN elements e2 ON e2.number = r.ingredient2_number
    JOIN elements er ON er.number = r.result_number
    WHERE
      -- both ingredients already unlocked
      r.ingredient1_number IN (SELECT element_number FROM unlocks WHERE user_id = ${userId})
      AND r.ingredient2_number IN (SELECT element_number FROM unlocks WHERE user_id = ${userId})
      -- result not yet discovered
      AND r.result_number NOT IN (SELECT element_number FROM unlocks WHERE user_id = ${userId})
      -- not already given as a quest reward for this user
      AND r.result_number NOT IN (SELECT result_number FROM quest_rewards WHERE user_id = ${userId} AND result_number IS NOT NULL)
    ORDER BY RANDOM()
    LIMIT 1
  `
  if (candidates.length === 0) return NextResponse.json({ error: 'No recipes available to hint' }, { status: 400 })

  const recipe = candidates[0]

  // Mark quest as claimed
  await sql`
    INSERT INTO user_quests (user_id, quest_id, progress, completed_at, claimed_at)
    VALUES (${userId}, ${quest_id}, ${quest.target_value}, NOW(), NOW())
    ON CONFLICT (user_id, quest_id) DO UPDATE SET claimed_at = NOW(), completed_at = COALESCE(user_quests.completed_at, NOW())
  `

  // Store slot 1 = ingredient1, slot 2 = ingredient2, both with result_number
  await sql`
    INSERT INTO quest_rewards (user_id, quest_id, slot, element_number, result_number)
    VALUES (${userId}, ${quest_id}, 1, ${recipe.ingredient1_number}, ${recipe.result_number})
    ON CONFLICT DO NOTHING
  `
  await sql`
    INSERT INTO quest_rewards (user_id, quest_id, slot, element_number, result_number)
    VALUES (${userId}, ${quest_id}, 2, ${recipe.ingredient2_number}, ${recipe.result_number})
    ON CONFLICT DO NOTHING
  `

  return NextResponse.json({ ok: true })
}

// PATCH /api/quests — scratch a card
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { quest_id, slot } = await req.json()
  if (!quest_id || !slot) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const sql = neon(process.env.DATABASE_URL!)
  const userId = session.user.id

  const [reward] = await sql`
    UPDATE quest_rewards
    SET scratched_at = NOW()
    WHERE user_id = ${userId} AND quest_id = ${quest_id} AND slot = ${slot} AND scratched_at IS NULL
    RETURNING element_number, result_number
  `
  if (!reward) return NextResponse.json({ error: 'Card not found or already scratched' }, { status: 400 })

  const [el] = await sql`SELECT name_french, name_english, img FROM elements WHERE number = ${reward.element_number}`

  return NextResponse.json({ ok: true, element: el })
}
