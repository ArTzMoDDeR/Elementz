'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Sparkles, Star, Droplets, Flame, Wind, Mountain, Sun, Compass, Crown,
  Gem, CheckCircle2, Microscope, FlaskConical, Plus, Lock, Trophy, ArrowLeft,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  is_daily: boolean
  reset_hours: number | null
  required_element: number | null
  progress: number
  completed_at: string | null
  claimed_at: string | null
  reset_at: string | null
  rewards: QuestReward[]
  is_expired?: boolean
}

const ICON_MAP: Record<string, React.ElementType> = {
  sparkles: Sparkles, star: Star, droplets: Droplets, flame: Flame,
  wind: Wind, mountain: Mountain, sun: Sun, compass: Compass,
  crown: Crown, gem: Gem, microscope: Microscope, flask: FlaskConical,
  trophy: Trophy,
}

// ─── Scratch Card ─────────────────────────────────────────────────────────────

function ScratchCard({ reward, lang, onScratched }: {
  reward: QuestReward
  lang: 'fr' | 'en'
  onScratched: (slot: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [revealed, setRevealed] = useState(!!reward.scratched_at)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const notifiedRef = useRef(false)
  const SIZE = 100

  useEffect(() => {
    if (revealed) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#1c1c28'
    ctx.fillRect(0, 0, SIZE, SIZE)
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.font = 'bold 11px sans-serif'
    for (let x = 12; x < SIZE; x += 22)
      for (let y = 18; y < SIZE; y += 22)
        ctx.fillText('?', x, y)
  }, [revealed])

  const getPos = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const sx = canvas.width / rect.width, sy = canvas.height / rect.height
    if ('touches' in e) return { x: (e.touches[0].clientX - rect.left) * sx, y: (e.touches[0].clientY - rect.top) * sy }
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy }
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
      ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.stroke()
    }
    ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill()
    lastPos.current = { x, y }
    const data = ctx.getImageData(0, 0, SIZE, SIZE).data
    let t = 0; for (let i = 3; i < data.length; i += 4) if (data[i] < 128) t++
    if (t / (SIZE * SIZE) > 0.55 && !notifiedRef.current) {
      ctx.clearRect(0, 0, SIZE, SIZE)
      notifiedRef.current = true
      setRevealed(true)
      onScratched(reward.slot)
    }
  }, [reward.slot, onScratched])

  const name = lang === 'fr' ? reward.name_french : reward.name_english

  if (revealed) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-[100px] h-[100px] rounded-2xl border border-amber-400/30 bg-amber-400/5 flex flex-col items-center justify-center gap-1.5 relative">
          {reward.img
            ? <img src={reward.img} alt={name} className="w-12 h-12 object-contain" draggable={false} />
            : <Sparkles className="w-9 h-9 text-amber-400" />}
          <span className="text-[9px] font-bold text-amber-400 text-center px-1 leading-tight">{name}</span>
        </div>
        <p className="text-[9px] text-muted-foreground/60">{lang === 'fr' ? 'Révélé' : 'Revealed'}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[100px] h-[100px] rounded-2xl overflow-hidden cursor-crosshair select-none" style={{ touchAction: 'none' }}>
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          {reward.img && <img src={reward.img} alt="" className="w-12 h-12 object-contain opacity-40" draggable={false} />}
        </div>
        <canvas
          ref={canvasRef} width={SIZE} height={SIZE}
          className="absolute inset-0 w-full h-full rounded-2xl"
          onMouseDown={e => { lastPos.current = null; scratch(...Object.values(getPos(e, e.currentTarget)) as [number, number]) }}
          onMouseMove={e => { if (e.buttons === 1) scratch(...Object.values(getPos(e, e.currentTarget)) as [number, number]) }}
          onMouseUp={() => { lastPos.current = null }}
          onTouchStart={e => { e.preventDefault(); lastPos.current = null; scratch(...Object.values(getPos(e, e.currentTarget)) as [number, number]) }}
          onTouchMove={e => { e.preventDefault(); scratch(...Object.values(getPos(e, e.currentTarget)) as [number, number]) }}
          onTouchEnd={() => { lastPos.current = null }}
        />
      </div>
      <p className="text-[9px] text-muted-foreground/50 animate-pulse">{lang === 'fr' ? 'Gratte ici' : 'Scratch here'}</p>
    </div>
  )
}

// ─── Quest Card ───────────────────────────────────────────────────────────────

function QuestCard({ quest, lang, onClaim, onScratch, pinned, onDismiss }: {
  quest: Quest
  lang: 'fr' | 'en'
  onClaim: (id: number) => Promise<void>
  onScratch: (questId: number, slot: number) => Promise<void>
  pinned?: boolean
  onDismiss?: () => void
}) {
  const [claiming, setClaiming] = useState(false)
  const [scratchOpen, setScratchOpen] = useState(pinned ?? false)

  const title = lang === 'fr' ? quest.title_fr : quest.title_en
  const desc = lang === 'fr' ? quest.desc_fr : quest.desc_en
  const pct = Math.min(100, Math.round((quest.progress / quest.target_value) * 100))
  const isReady = quest.progress >= quest.target_value
  const isClaimed = !!quest.claimed_at
  const hasRewards = quest.rewards.length > 0
  const allScratched = hasRewards && quest.rewards.every(r => !!r.scratched_at)
  const isDone = !pinned && isClaimed && allScratched
  const showScratch = isClaimed && (pinned || scratchOpen || !allScratched)

  const Icon = ICON_MAP[quest.icon] ?? Star

  const handleClaim = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (claiming) return
    setClaiming(true)
    await onClaim(quest.id)
    setClaiming(false)
    setScratchOpen(true)
  }

  // State-based accent stripe color
  const stripeClass = isDone
    ? 'bg-muted-foreground/20'
    : isClaimed && !allScratched
    ? 'bg-primary'
    : isReady
    ? 'bg-amber-400'
    : quest.is_daily
    ? 'bg-sky-400'
    : 'bg-transparent'

  // Icon bg
  const iconBg = isDone
    ? 'bg-muted text-muted-foreground/30'
    : isClaimed
    ? 'bg-primary/10 text-primary'
    : isReady
    ? 'bg-amber-400/15 text-amber-400'
    : quest.is_daily
    ? 'bg-sky-400/10 text-sky-400'
    : 'bg-muted text-muted-foreground'

  return (
    <div className={`rounded-2xl bg-card overflow-hidden ${isDone ? 'opacity-50' : ''}`}>
      <div className="flex items-stretch">
        {/* Accent stripe */}
        <div className={`w-1 flex-shrink-0 ${stripeClass} rounded-l-2xl`} />

        <div className="flex-1 min-w-0 px-3.5 py-3">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${iconBg}`}>
              {isDone
                ? <CheckCircle2 className="w-4 h-4" />
                : <Icon className="w-4 h-4" />}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-sm font-semibold leading-tight ${isDone ? 'line-through' : 'text-foreground'}`}>
                  {title}
                </span>
                {quest.is_daily && !isClaimed && (
                  <span className="text-[9px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-widest leading-none">
                    {lang === 'fr' ? '24h' : '24h'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-snug line-clamp-1">{desc}</p>
            </div>

            {/* Right side */}
            <div className="flex-shrink-0 flex items-center gap-2">
              {isClaimed && !allScratched ? (
                <button
                  onClick={() => setScratchOpen(v => !v)}
                  className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full transition-colors hover:bg-primary/20"
                >
                  {lang === 'fr' ? 'Gratter' : 'Scratch'}
                </button>
              ) : isDone ? null : isReady ? null : (
                <span className="text-xs font-bold tabular-nums text-muted-foreground/60">
                  {quest.progress}<span className="opacity-40">/{quest.target_value}</span>
                </span>
              )}
            </div>
          </div>

          {/* Progress bar — only when in progress */}
          {!isClaimed && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: isReady
                      ? 'rgb(251 191 36)'
                      : quest.is_daily
                      ? 'rgb(56 189 248)'
                      : 'var(--primary)',
                  }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground/50 w-7 text-right flex-shrink-0">
                {pct}%
              </span>
            </div>
          )}

          {/* Claim button — full width when ready */}
          {isReady && !isClaimed && (
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="mt-2.5 w-full h-9 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-black text-xs font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5" />
              {claiming ? (lang === 'fr' ? 'En cours...' : 'Claiming...') : (lang === 'fr' ? 'Réclamer la récompense' : 'Claim reward')}
            </button>
          )}
        </div>
      </div>

      {/* Scratch panel */}
      {showScratch && hasRewards && (
        <div className="border-t border-border/40 mx-3 pt-3 pb-4">
          {(() => {
            const anyReward = quest.rewards[0]
            const resultName = anyReward ? (lang === 'fr' ? anyReward.result_name_french : anyReward.result_name_english) : null
            return resultName ? (
              <p className="text-[11px] text-muted-foreground mb-3 text-center">
                {lang === 'fr' ? 'Pour créer : ' : 'To create: '}
                <span className="font-bold text-foreground">{resultName}</span>
              </p>
            ) : null
          })()}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {quest.rewards.sort((a, b) => a.slot - b.slot).map((r, i) => (
              <div key={r.slot} className="flex items-center gap-3">
                <ScratchCard reward={r} lang={lang} onScratched={(slot) => onScratch(quest.id, slot)} />
                {i < quest.rewards.length - 1 && <Plus className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />}
              </div>
            ))}
          </div>
          {allScratched && (
            <div className="mt-4 flex flex-col items-center gap-2.5">
              <p className="text-[11px] text-center text-muted-foreground/60 leading-relaxed max-w-[220px]">
                {lang === 'fr'
                  ? 'Retiens cette combinaison et va la créer sur le terrain !'
                  : 'Remember this combo and try it on the field!'}
              </p>
              <button
                onClick={() => { setScratchOpen(false); onDismiss?.() }}
                className="px-5 py-2 rounded-xl bg-primary/10 border border-primary/20 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors active:scale-95"
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

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ label, count, color = 'muted' }: { label: string; count?: number; color?: 'amber' | 'sky' | 'primary' | 'muted' }) {
  const colorClass = {
    amber: 'text-amber-400',
    sky: 'text-sky-400',
    primary: 'text-primary',
    muted: 'text-muted-foreground/50',
  }[color]

  return (
    <div className={`flex items-center gap-2 px-0.5 ${colorClass}`}>
      <div className="flex-1 h-px bg-current opacity-20" />
      <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
        {label}{count !== undefined ? ` · ${count}` : ''}
      </span>
      <div className="flex-1 h-px bg-current opacity-20" />
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function QuestInlinePanel({ lang, onGoToPlay }: { lang: 'fr' | 'en'; onGoToPlay?: () => void }) {  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
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
    const res = await fetch('/api/quests')
    const data = await res.json()
    const updated: Quest[] = data.quests ?? []
    setQuests(updated)
    const q = updated.find(q => q.id === questId)
    if (q && q.rewards.length > 0 && q.rewards.every(r => !!r.scratched_at)) {
      setPinnedIds(prev => new Set(prev).add(questId))
    }
  }

  const handleDismiss = (questId: number) => {
    setPinnedIds(prev => { const next = new Set(prev); next.delete(questId); return next })
    onGoToPlay?.()
  }

  const sortByPct = (a: Quest, b: Quest) =>
    (b.progress / b.target_value) - (a.progress / a.target_value)

  const daily = quests.filter(q => q.is_daily)
  const permanent = quests.filter(q => !q.is_daily)

  const readyDaily = daily.filter(q => !q.claimed_at && q.progress >= q.target_value)
  const readyPermanent = permanent.filter(q => !q.claimed_at && q.progress >= q.target_value)
  const pendingDaily = daily.filter(q => !q.claimed_at && q.progress < q.target_value).sort(sortByPct)
  const pendingPermanent = permanent.filter(q => !q.claimed_at && q.progress < q.target_value).sort(sortByPct)
  const claimedQuests = permanent.filter(q => !!q.claimed_at)
  const unscratched = claimedQuests.filter(q => pinnedIds.has(q.id) || q.rewards.some(r => !r.scratched_at))
  const done = claimedQuests.filter(q => !pinnedIds.has(q.id) && q.rewards.every(r => !!r.scratched_at))

  const totalReady = readyDaily.length + readyPermanent.length

  return (
    <div className="flex flex-col gap-5 py-1">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onGoToPlay}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 active:scale-95 transition-all flex-shrink-0"
            aria-label={lang === 'fr' ? 'Retour' : 'Back'}
          >
            <ArrowLeft className="w-4 h-4 text-foreground/70" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-foreground leading-tight">{t('Quêtes', 'Quests')}</h2>
            <p className="text-xs text-muted-foreground">
              {loading ? '—' : totalReady > 0
                ? <span className="text-amber-400 font-semibold">{totalReady} {t(totalReady > 1 ? 'récompenses prêtes' : 'récompense prête', totalReady > 1 ? 'rewards ready' : 'reward ready')}</span>
                : t(`${pendingPermanent.length + pendingDaily.length} en cours`, `${pendingPermanent.length + pendingDaily.length} in progress`)
              }
            </p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/15 flex items-center justify-center flex-shrink-0">
          <Star className="w-4.5 h-4.5 text-amber-400" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-5 h-5 border-2 border-border border-t-foreground/40 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-5">

          {/* Scratch rewards — highest priority */}
          {unscratched.length > 0 && (
            <div className="flex flex-col gap-2">
              <SectionLabel label={t('À gratter', 'Scratch rewards')} count={unscratched.length} color="primary" />
              {unscratched.map(q => (
                <QuestCard key={q.id} quest={q} lang={lang} onClaim={handleClaim} onScratch={handleScratch}
                  pinned={pinnedIds.has(q.id)} onDismiss={() => handleDismiss(q.id)} />
              ))}
            </div>
          )}

          {/* Ready permanent — claim now */}
          {readyPermanent.length > 0 && (
            <div className="flex flex-col gap-2">
              <SectionLabel label={t('Prêtes', 'Ready')} count={readyPermanent.length} color="amber" />
              {readyPermanent.map(q => (
                <QuestCard key={q.id} quest={q} lang={lang} onClaim={handleClaim} onScratch={handleScratch} />
              ))}
            </div>
          )}

          {/* Daily */}
          {(pendingDaily.length > 0 || readyDaily.length > 0) && (
            <div className="flex flex-col gap-2">
              <SectionLabel label={t('Journalières', 'Daily')} color="sky" />
              {readyDaily.map(q => (
                <QuestCard key={q.id} quest={q} lang={lang} onClaim={handleClaim} onScratch={handleScratch} />
              ))}
              {pendingDaily.map(q => (
                <QuestCard key={q.id} quest={q} lang={lang} onClaim={handleClaim} onScratch={handleScratch} />
              ))}
            </div>
          )}

          {/* In progress — sorted by % */}
          {pendingPermanent.length > 0 && (
            <div className="flex flex-col gap-2">
              <SectionLabel label={t('En cours', 'In progress')} count={pendingPermanent.length} />
              {pendingPermanent.map(q => (
                <QuestCard key={q.id} quest={q} lang={lang} onClaim={handleClaim} onScratch={handleScratch} />
              ))}
            </div>
          )}

          {/* Completed */}
          {done.length > 0 && (
            <div className="flex flex-col gap-2">
              <SectionLabel label={t('Terminées', 'Completed')} count={done.length} />
              {done.map(q => (
                <QuestCard key={q.id} quest={q} lang={lang} onClaim={handleClaim} onScratch={handleScratch} />
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
