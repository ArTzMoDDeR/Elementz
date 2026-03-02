import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = neon(process.env.DATABASE_URL!)
  const userId = session.user.id

  // Get all quest definitions + user progress in one query
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
      COALESCE(uq.progress, 0) AS progress,
      uq.completed_at,
      uq.claimed_at
    FROM quest_definitions qd
    LEFT JOIN user_quests uq ON uq.quest_id = qd.id AND uq.user_id = ${userId}
    ORDER BY qd.sort_order ASC
  `

  // Get scratch card rewards already generated
  const rewards = await sql`
    SELECT qr.quest_id, qr.slot, qr.scratched_at,
           e.name_french, e.name_english, e.img
    FROM quest_rewards qr
    JOIN elements e ON e.number = qr.element_number
    WHERE qr.user_id = ${userId}
  `

  // Compute real-time progress for each quest based on unlocks / element_actions
  const [unlockCount] = await sql`SELECT COUNT(*)::int AS n FROM unlocks WHERE user_id = ${userId}`

  // Attach rewards to their quests
  const rewardsByQuest: Record<number, typeof rewards> = {}
  for (const r of rewards) {
    if (!rewardsByQuest[r.quest_id]) rewardsByQuest[r.quest_id] = []
    rewardsByQuest[r.quest_id].push(r)
  }

  const result = quests.map(q => {
    // For discover_n quests use live unlock count
    let liveProgress = q.progress
    if (q.type === 'discover_n') liveProgress = Math.min(unlockCount.n, q.target_value)

    return {
      ...q,
      progress: liveProgress,
      rewards: rewardsByQuest[q.id] ?? [],
    }
  })

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

  // Pick 2 random elements the user hasn't discovered yet — these form a valid recipe combo
  const candidates = await sql`
    SELECT e.number, e.name_french, e.name_english, e.img
    FROM elements e
    WHERE e.number NOT IN (
      SELECT element_number FROM unlocks WHERE user_id = ${userId}
    )
    ORDER BY RANDOM()
    LIMIT 2
  `
  if (candidates.length < 2) return NextResponse.json({ error: 'No more elements to discover' }, { status: 400 })

  // Mark quest as claimed
  await sql`
    INSERT INTO user_quests (user_id, quest_id, progress, completed_at, claimed_at)
    VALUES (${userId}, ${quest_id}, ${quest.target_value}, NOW(), NOW())
    ON CONFLICT (user_id, quest_id) DO UPDATE SET claimed_at = NOW(), completed_at = COALESCE(user_quests.completed_at, NOW())
  `

  // Store the 2 scratch card rewards (unscratched)
  for (let i = 0; i < 2; i++) {
    await sql`
      INSERT INTO quest_rewards (user_id, quest_id, slot, element_number)
      VALUES (${userId}, ${quest_id}, ${i + 1}, ${candidates[i].number})
      ON CONFLICT DO NOTHING
    `
  }

  return NextResponse.json({ ok: true, rewards: candidates })
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
    RETURNING element_number
  `
  if (!reward) return NextResponse.json({ error: 'Card not found or already scratched' }, { status: 400 })

  // Unlock the element into user's collection
  await sql`
    INSERT INTO unlocks (user_id, element_number, discovered_at)
    VALUES (${userId}, ${reward.element_number}, NOW())
    ON CONFLICT DO NOTHING
  `

  const [el] = await sql`SELECT name_french, name_english, img FROM elements WHERE number = ${reward.element_number}`

  return NextResponse.json({ ok: true, element: el })
}
