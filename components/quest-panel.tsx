'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Sparkles, Star, Droplets, Flame, Wind, Mountain, Sun, Compass, Crown, Gem, CheckCircle2, Microscope, FlaskConical, Plus } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type QuestReward = {
  quest_id: number
  slot: number
  scratched_at: string | null
  name_french: string
  name_english: string
  img: string | null
  result_name_french: string | null
  result_name_english: string | null
  result_img: string | null
  result_number: number | null
}

type Quest = {
  id: number
  type: string
  title_fr: string
  title_en: string
  desc_fr: string
  desc_en: string
  target_value: number
  icon: string
  sort_order: number
  progress: number
  completed_at: string | null
  claimed_at: string | null
  rewards: QuestReward[]
}

const ICON_MAP: Record<string, React.ElementType> = {
  sparkles: Sparkles, star: Star, droplets: Droplets, flame: Flame,
  wind: Wind, mountain: Mountain, sun: Sun, compass: Compass,
  crown: Crown, gem: Gem, microscope: Microscope, flask: FlaskConical,
}

// ─── Scratch Card ─────────────────────────────────────────────────────────────

function ScratchCard({ reward, lang, onScratched }: {
  reward: QuestReward
  lang: 'fr' | 'en'
  onScratched: (slot: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [revealed, setRevealed] = useState(!!reward.scratched_at)
  const [dismissed, setDismissed] = useState(false)
  const [scratching, setScratching] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const scratchedPct = useRef(0)
  const notifiedRef = useRef(false)

  const COVER_COLOR = '#1a1a2e'
  const SIZE = 120

  useEffect(() => {
    if (revealed) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = COVER_COLOR
    ctx.fillRect(0, 0, SIZE, SIZE)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    for (let x = 10; x < SIZE; x += 20) {
      for (let y = 10; y < SIZE; y += 20) {
        ctx.font = '12px sans-serif'
        ctx.fillText('?', x, y)
      }
    }
  }, [revealed])

  const getPos = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const scratch = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    if (lastPos.current) {
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(x, y)
      ctx.lineWidth = 28
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()
    }
    ctx.arc(x, y, 14, 0, Math.PI * 2)
    ctx.fill()
    lastPos.current = { x, y }

    const data = ctx.getImageData(0, 0, SIZE, SIZE).data
    let transparent = 0
    for (let i = 3; i < data.length; i += 4) if (data[i] < 128) transparent++
    scratchedPct.current = transparent / (SIZE * SIZE)
    if (scratchedPct.current > 0.55 && !notifiedRef.current) {
      ctx.clearRect(0, 0, SIZE, SIZE)
      notifiedRef.current = true
      setRevealed(true)
      onScratched(reward.slot)
    }
  }, [reward.slot, onScratched])

  const name = lang === 'fr' ? reward.name_french : reward.name_english

  if (revealed) {
    return (
      <div className={`flex flex-col items-center gap-2 w-[120px] transition-opacity duration-300 ${dismissed ? 'opacity-30' : ''}`}>
        <div className="w-[120px] h-[120px] rounded-2xl border-2 border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-2 relative overflow-hidden">
          {reward.img
            ? <img src={reward.img} alt={name} className="w-14 h-14 object-contain" draggable={false} />
            : <Sparkles className="w-10 h-10 text-primary" />
          }
          <span className="text-[10px] font-bold text-primary text-center px-1 leading-tight">{name}</span>
        </div>
        <p className="text-[10px] text-muted-foreground text-center leading-tight">
          {lang === 'fr' ? 'Ingrédient' : 'Ingredient'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 w-[120px]">
      <div className="relative w-[120px] h-[120px] rounded-2xl overflow-hidden cursor-crosshair select-none" style={{ touchAction: 'none' }}>
        <div className="absolute inset-0 rounded-2xl border border-border bg-muted flex flex-col items-center justify-center gap-2">
          {reward.img
            ? <img src={reward.img} alt="" className="w-14 h-14 object-contain opacity-60" draggable={false} />
            : <Sparkles className="w-10 h-10 text-muted-foreground" />
          }
        </div>
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="absolute inset-0 w-full h-full rounded-2xl"
          onMouseDown={e => { setScratching(true); lastPos.current = null; scratch(...Object.values(getPos(e, e.currentTarget)) as [number, number]) }}
          onMouseMove={e => { if (scratching) scratch(...Object.values(getPos(e, e.currentTarget)) as [number, number]) }}
          onMouseUp={() => { setScratching(false); lastPos.current = null }}
          onMouseLeave={() => { setScratching(false); lastPos.current = null }}
          onTouchStart={e => { e.preventDefault(); lastPos.current = null; scratch(...Object.values(getPos(e, e.currentTarget)) as [number, number]) }}
          onTouchMove={e => { e.preventDefault(); scratch(...Object.values(getPos(e, e.currentTarget)) as [number, number]) }}
          onTouchEnd={() => { lastPos.current = null }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground animate-pulse">{lang === 'fr' ? 'Gratte pour révéler' : 'Scratch to reveal'}</p>
    </div>
  )
}

// ─── Quest Card ───────────────────────────────────────────────────────────────

function QuestCard({ quest, lang, onClaim, onScratch, pinned, onDismiss }: {
  quest: Quest
  lang: 'fr' | 'en'
  onClaim: (id: number) => Promise<void>
  onScratch: (questId: number, slot: number) => Promise<void>
  pinned?: boolean       // stay open even if allScratched
  onDismiss?: () => void // called when user clicks "J'ai noté"
}) {
  const [claiming, setClaiming] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const title = lang === 'fr' ? quest.title_fr : quest.title_en
  const desc = lang === 'fr' ? quest.desc_fr : quest.desc_en
  const pct = Math.min(100, Math.round((quest.progress / quest.target_value) * 100))
  const isCompleted = quest.progress >= quest.target_value
  const isClaimed = !!quest.claimed_at
  const hasRewards = quest.rewards.length > 0
  const allScratched = hasRewards && quest.rewards.every(r => !!r.scratched_at)

  const Icon = ICON_MAP[quest.icon] ?? Star

  const handleClaim = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (claiming) return
    setClaiming(true)
    await onClaim(quest.id)
    setClaiming(false)
    setExpanded(true)
  }

  const statusColor = isClaimed
    ? (!pinned && allScratched) ? 'border-border' : 'border-primary/40 bg-primary/3'
    : isCompleted ? 'border-amber-400/40 bg-amber-400/5' : 'border-border'

  const isDone = !pinned && allScratched

  return (
    <div className={`rounded-2xl border overflow-hidden transition-colors ${statusColor}`}>
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 bg-card cursor-pointer active:bg-muted/40"
        onClick={() => (isClaimed || !isCompleted) && setExpanded(v => !v)}
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isDone ? 'bg-muted' : isClaimed ? 'bg-primary/10' : isCompleted ? 'bg-amber-400/15' : 'bg-muted'
        }`}>
          {isDone
            ? <CheckCircle2 className="w-4.5 h-4.5 text-muted-foreground/40" />
            : isClaimed
            ? <Icon className="w-4.5 h-4.5 text-primary" />
            : isCompleted
            ? <Icon className="w-4.5 h-4.5 text-amber-400" />
            : <Icon className="w-4.5 h-4.5 text-muted-foreground" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-tight ${isDone ? 'text-muted-foreground/50 line-through' : 'text-foreground'}`}>
            {title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{desc}</p>
        </div>

        {isClaimed && !allScratched ? (
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
            {lang === 'fr' ? 'À gratter' : 'Scratch'}
          </span>
        ) : isDone ? (
          <CheckCircle2 className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
        ) : isClaimed && pinned ? (
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
            {lang === 'fr' ? 'Gratté' : 'Scratched'}
          </span>
        ) : isCompleted ? (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="px-3 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-bold flex-shrink-0 hover:bg-amber-300 transition-colors disabled:opacity-60 active:scale-95"
          >
            {claiming ? '...' : lang === 'fr' ? 'Réclamer' : 'Claim'}
          </button>
        ) : (
          <span className="text-xs font-bold tabular-nums text-muted-foreground flex-shrink-0">
            {quest.progress}/{quest.target_value}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {!isClaimed && !isCompleted && (
        <div className="px-4 pb-3">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: pct === 100 ? 'rgb(251 191 36)' : 'var(--primary)' }}
            />
          </div>
        </div>
      )}

      {/* Scratch cards panel — show when pinned (freshly scratched) or has unscratched cards */}
      {isClaimed && (pinned || expanded || !allScratched) && hasRewards && (
        <div className="px-4 pb-4 border-t border-border/50 pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            {lang === 'fr' ? 'Ta recette secrète' : 'Your secret recipe'}
          </p>
          {(() => {
            const anyReward = quest.rewards[0]
            const resultName = anyReward ? (lang === 'fr' ? anyReward.result_name_french : anyReward.result_name_english) : null
            if (!resultName) return null
            return (
              <p className="text-xs text-muted-foreground mb-4">
                {lang === 'fr' ? 'Pour créer : ' : 'To create: '}
                <span className="font-semibold text-foreground">{resultName}</span>
              </p>
            )
          })()}
          <div className="flex items-center justify-center gap-3">
            {quest.rewards.sort((a, b) => a.slot - b.slot).map((r, i) => (
              <div key={r.slot} className="flex items-center gap-3">
                <ScratchCard reward={r} lang={lang} onScratched={(slot) => onScratch(quest.id, slot)} />
                {i < quest.rewards.length - 1 && (
                  <Plus className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
          {/* "J'ai noté" — only after all scratched */}
          {allScratched && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-[11px] text-center text-muted-foreground/60 leading-relaxed">
                {lang === 'fr'
                  ? 'Retiens bien cette combinaison et va créer cet élément sur le terrain !'
                  : 'Remember this combo and create the element on the field!'}
              </p>
              <button
                onClick={() => { setExpanded(false); onDismiss?.() }}
                className="mt-1 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-sm font-semibold text-primary active:bg-primary/20 transition-colors"
              >
                {lang === 'fr' ? "J'ai noté !" : 'Got it!'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function QuestInlinePanel({ lang, onGoToPlay }: { lang: 'fr' | 'en'; onGoToPlay?: () => void }) {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  // Quest IDs that were just fully scratched — stay pinned open until user clicks "J'ai noté"
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(new Set())

  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  const fetchQuests = useCallback(async () => {
    try {
      const res = await fetch('/api/quests')
      const data = await res.json()
      setQuests(data.quests ?? [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchQuests() }, [fetchQuests])

  const handleClaim = async (questId: number) => {
    await fetch('/api/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quest_id: questId }),
    })
    await fetchQuests()
  }

  const handleScratch = async (questId: number, slot: number) => {
    await fetch('/api/quests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quest_id: questId, slot }),
    })
    // Refresh data but pin this quest so it doesn't vanish
    const res = await fetch('/api/quests')
    const data = await res.json()
    const updated: Quest[] = data.quests ?? []
    setQuests(updated)
    // If all cards are now scratched, pin it
    const q = updated.find(q => q.id === questId)
    if (q && q.rewards.length > 0 && q.rewards.every(r => !!r.scratched_at)) {
      setPinnedIds(prev => new Set(prev).add(questId))
    }
  }

  const handleDismiss = (questId: number) => {
    setPinnedIds(prev => { const next = new Set(prev); next.delete(questId); return next })
    onGoToPlay?.()
  }
  }

  const pending = quests.filter(q => !q.claimed_at && q.progress < q.target_value)
  const ready = quests.filter(q => !q.claimed_at && q.progress >= q.target_value)
  const claimed = quests.filter(q => !!q.claimed_at)
  const unscratched = claimed.filter(q => pinnedIds.has(q.id) || q.rewards.some(r => !r.scratched_at))
  const done = claimed.filter(q => !pinnedIds.has(q.id) && q.rewards.every(r => !!r.scratched_at))

  return (
    <div className="flex flex-col gap-4 py-1">

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
          <Star className="w-4.5 h-4.5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">{t('Quêtes', 'Quests')}</h2>
          <p className="text-xs text-muted-foreground">
            {ready.length > 0
              ? t(`${ready.length} quête${ready.length > 1 ? 's' : ''} à réclamer`, `${ready.length} quest${ready.length > 1 ? 's' : ''} ready`)
              : t(`${pending.length} en cours`, `${pending.length} in progress`)
            }
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-border border-t-foreground/40 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* To scratch — highest priority */}
          {unscratched.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide px-1">
                {t('Récompenses à gratter', 'Scratch rewards')}
              </p>
              {unscratched.map(q => (
                <QuestCard key={q.id} quest={q} lang={lang} onClaim={handleClaim} onScratch={handleScratch}
                  pinned={pinnedIds.has(q.id)} onDismiss={() => handleDismiss(q.id)} />
              ))}
            </div>
          )}

          {/* Ready to claim */}
          {ready.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide px-1">
                {t('Prêtes à réclamer', 'Ready to claim')}
              </p>
              {ready.map(q => (
                <QuestCard key={q.id} quest={q} lang={lang} onClaim={handleClaim} onScratch={handleScratch} />
              ))}
            </div>
          )}

          {/* In progress */}
          {pending.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                {t('En cours', 'In progress')}
              </p>
              {pending.map(q => (
                <QuestCard key={q.id} quest={q} lang={lang} onClaim={handleClaim} onScratch={handleScratch} />
              ))}
            </div>
          )}

          {/* Completed */}
          {done.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-muted-foreground/40 uppercase tracking-wide px-1">
                {t('Terminées', 'Completed')}
              </p>
              {done.map(q => (
                <QuestCard key={q.id} quest={q} lang={lang} onClaim={handleClaim} onScratch={handleScratch} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
