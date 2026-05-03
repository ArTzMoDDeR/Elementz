'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Sparkles, Star, Droplets, Flame, Wind, Mountain, Sun, Compass, Crown,
  Gem, CheckCircle2, Microscope, FlaskConical, Trophy, ArrowLeft,
  Clock, Ticket, Plus, ChevronRight, X,
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

// ─── Daily Reset Timer ────────────────────────────────────────────────────────

function useDailyCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(0)
  useEffect(() => {
    const calc = () => {
      const now = new Date()
      const midnight = new Date()
      midnight.setUTCDate(midnight.getUTCDate() + 1)
      midnight.setUTCHours(0, 0, 0, 0)
      setSecondsLeft(Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000)))
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [])
  const h = Math.floor(secondsLeft / 3600)
  const m = Math.floor((secondsLeft % 3600) / 60)
  const s = secondsLeft % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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
        <div className="w-[100px] h-[100px] rounded-2xl border border-amber-400/30 bg-amber-400/5 flex flex-col items-center justify-center gap-1.5">
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

// ─── Scratch Modal ────────────────────────────────────────────────────────────

function ScratchModal({ quest, lang, onScratch, onClose }: {
  quest: Quest
  lang: 'fr' | 'en'
  onScratch: (questId: number, slot: number) => Promise<void>
  onClose: () => void
}) {
  const title = lang === 'fr' ? quest.title_fr : quest.title_en
  const allScratched = quest.rewards.every(r => !!r.scratched_at)
  const anyReward = quest.rewards[0]
  const resultName = anyReward ? (lang === 'fr' ? anyReward.result_name_french : anyReward.result_name_english) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-3xl bg-card border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest mb-0.5">
              {lang === 'fr' ? 'Récompense' : 'Reward'}
            </p>
            <h3 className="text-base font-bold text-foreground leading-tight">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-foreground/50" />
          </button>
        </div>

        {/* Scratch area */}
        <div className="px-5 pb-6">
          {resultName && !allScratched && (
            <p className="text-[11px] text-muted-foreground text-center mb-4">
              {lang === 'fr' ? 'Pour créer : ' : 'To create: '}
              <span className="font-bold text-foreground">{resultName}</span>
            </p>
          )}

          <div className="flex items-center justify-center gap-3 flex-wrap">
            {quest.rewards.sort((a, b) => a.slot - b.slot).map((r, i) => (
              <div key={r.slot} className="flex items-center gap-3">
                <ScratchCard reward={r} lang={lang} onScratched={(slot) => onScratch(quest.id, slot)} />
                {i < quest.rewards.length - 1 && <Plus className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />}
              </div>
            ))}
          </div>

          {allScratched && (
            <div className="mt-5 flex flex-col items-center gap-3">
              <p className="text-[11px] text-center text-muted-foreground/70 leading-relaxed max-w-[220px]">
                {lang === 'fr'
                  ? 'Retiens cette combinaison et va la créer sur le terrain !'
                  : 'Remember this combo and try it on the field!'}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors active:scale-95"
              >
                {lang === 'fr' ? "J'ai noté !" : 'Got it!'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Scratch CTA Banner ───────────────────────────────────────────────────────

function ScratchBanner({ count, lang, onClick }: {
  count: number
  lang: 'fr' | 'en'
  onClick: () => void
}) {
  const ready = count > 0

  if (!ready) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/50 border border-border">
        <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
          <Ticket className="w-4 h-4 text-muted-foreground/40" />
        </div>
        <p className="text-sm text-muted-foreground/50 font-medium">
          {lang === 'fr' ? 'Termine une quête pour gratter' : 'Complete a quest to scratch'}
        </p>
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] transition-all"
    >
      <div className="w-8 h-8 rounded-xl bg-black/15 flex items-center justify-center flex-shrink-0">
        <Ticket className="w-4 h-4 text-black" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-bold text-black leading-tight">
          {lang === 'fr' ? 'Gratter ma récompense' : 'Scratch my reward'}
        </p>
        <p className="text-[11px] text-black/60 font-medium">
          {count === 1
            ? (lang === 'fr' ? '1 quête à clôturer' : '1 quest to close')
            : (lang === 'fr' ? `${count} quêtes à clôturer` : `${count} quests to close`)}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-black/50 flex-shrink-0" />
    </button>
  )
}

// ─── Quest Row ────────────────────────────────────────────────────────────────

function QuestRow({ quest, lang, onClaim, onScratch }: {
  quest: Quest
  lang: 'fr' | 'en'
  onClaim: (id: number) => Promise<void>
  onScratch?: (id: number) => void
}) {
  const [claiming, setClaiming] = useState(false)
  const [open, setOpen] = useState(false)

  const title = lang === 'fr' ? quest.title_fr : quest.title_en
  const desc = lang === 'fr' ? quest.desc_fr : quest.desc_en
  const pct = Math.min(100, Math.round((quest.progress / quest.target_value) * 100))
  const isReady = quest.progress >= quest.target_value
  const isClaimed = !!quest.claimed_at
  const allScratched = quest.rewards.length > 0 && quest.rewards.every(r => !!r.scratched_at)
  const isDone = isClaimed && allScratched

  const Icon = ICON_MAP[quest.icon] ?? Star

  const handleClaim = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (claiming) return
    setClaiming(true)
    await onClaim(quest.id)
    setClaiming(false)
  }

  // Accent color
  const accent = isDone
    ? 'text-muted-foreground/30'
    : isClaimed
    ? 'text-primary'
    : isReady
    ? 'text-amber-400'
    : quest.is_daily
    ? 'text-sky-400'
    : 'text-muted-foreground'

  const trackColor = quest.is_daily ? 'bg-sky-400' : isReady ? 'bg-amber-400' : 'bg-primary'

  return (
    <div className={`border-b border-border/30 last:border-b-0 ${isDone ? 'opacity-40' : ''}`}>
      {/* Main row — clickable to toggle accordion */}
      <button
        className="w-full flex items-center gap-3 py-3 text-left"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        {/* Icon */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-muted' : isReady ? 'bg-amber-400/10' : quest.is_daily ? 'bg-sky-400/10' : 'bg-muted'}`}>
          {isDone
            ? <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground/30" />
            : <Icon className={`w-3.5 h-3.5 ${accent}`} />
          }
        </div>

        {/* Title + progress */}
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-semibold leading-tight block truncate ${isDone ? 'line-through' : 'text-foreground'}`}>
            {title}
          </span>
          {!isClaimed && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${trackColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground/40 flex-shrink-0">
                {quest.progress}/{quest.target_value}
              </span>
            </div>
          )}
          {isClaimed && !allScratched && (
            <span className="text-[10px] text-primary/70 font-medium">
              {lang === 'fr' ? 'En attente de scratch' : 'Waiting to scratch'}
            </span>
          )}
        </div>

        {/* Action button */}
        {isReady && !isClaimed ? (
          // Not yet claimed — show claim button
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="flex-shrink-0 h-7 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 active:scale-95 text-black text-[11px] font-bold transition-all disabled:opacity-60"
          >
            {claiming ? '...' : (lang === 'fr' ? 'Réclamer' : 'Claim')}
          </button>
        ) : isClaimed && !allScratched ? (
          // Claimed but not yet scratched — show scratch button
          <button
            onClick={e => { e.stopPropagation(); onScratch?.(quest.id) }}
            className="flex-shrink-0 h-7 px-3 rounded-lg bg-amber-400/15 border border-amber-400/30 hover:bg-amber-400/25 active:scale-95 text-amber-400 text-[11px] font-bold transition-all flex items-center gap-1"
          >
            <Ticket className="w-3 h-3" />
            {lang === 'fr' ? 'Gratter' : 'Scratch'}
          </button>
        ) : (
          <ChevronRight
            className={`w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          />
        )}
      </button>

      {/* Accordion description */}
      {open && desc && (
        <div className="pb-3 pl-11 pr-1">
          <p className="text-[11px] text-muted-foreground/60 leading-relaxed">{desc}</p>
        </div>
      )}
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ label, color = 'muted', children }: {
  label: string
  color?: 'amber' | 'sky' | 'muted'
  children: React.ReactNode
}) {
  const cls = { amber: 'text-amber-400', sky: 'text-sky-400', muted: 'text-muted-foreground/40' }[color]
  return (
    <div className="flex flex-col">
      <p className={`text-[10px] font-bold uppercase tracking-widest px-0.5 mb-1 ${cls}`}>{label}</p>
      <div className="rounded-2xl bg-card border border-border/50 px-3">
        {children}
      </div>
    </div>
  )
}

// ─── Daily Reset Chip ─────────────────────────────────────────────────────────

function DailyChip({ lang }: { lang: 'fr' | 'en' }) {
  const countdown = useDailyCountdown()
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-400/10 border border-sky-400/20 self-start">
      <Clock className="w-3 h-3 text-sky-400 flex-shrink-0" />
      <span className="text-[10px] font-bold text-sky-400 tabular-nums">{countdown}</span>
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function QuestInlinePanel({ lang, onGoToPlay }: { lang: 'fr' | 'en'; onGoToPlay?: () => void }) {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  // Which quest is currently open in the scratch modal (cycle through claimable ones)
  const [scratchQuestId, setScratchQuestId] = useState<number | null>(null)

  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  const fetchQuests = useCallback(async () => {
    try {
      const res = await fetch('/api/quests')
      const data = await res.json()
      setQuests(data.quests ?? [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchQuests()
    // Refresh every 30s while the panel is open
    const interval = setInterval(fetchQuests, 30_000)
    // Also refresh when the user comes back to the tab
    const onFocus = () => fetchQuests()
    window.addEventListener('visibilitychange', onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('visibilitychange', onFocus)
    }
  }, [fetchQuests])

  const handleClaim = async (questId: number) => {
    const res = await fetch('/api/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quest_id: questId }),
    })
    await fetchQuests()
    if (res.ok) {
      // Auto-open the scratch modal for the just-claimed quest
      setScratchQuestId(questId)
    }
  }

  const handleScratch = async (questId: number, slot: number) => {
    await fetch('/api/quests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quest_id: questId, slot }),
    })
    await fetchQuests()
  }

  // Quests that are claimed but not fully scratched — the scratch queue
  const scratchable = quests.filter(q => !!q.claimed_at && q.rewards.some(r => !r.scratched_at))

  // Open the first scratchable quest when the user clicks the CTA
  const openScratch = () => {
    if (scratchable.length > 0) setScratchQuestId(scratchable[0].id)
  }

  const closeScratch = async () => {
    setScratchQuestId(null)
    await fetchQuests()
  }

  const scratchQuest = quests.find(q => q.id === scratchQuestId) ?? null

  // Sections
  const daily = quests.filter(q => q.is_daily)
  const permanent = quests.filter(q => !q.is_daily)
  // Include claimed-but-not-yet-scratched quests in their respective sections
  const pendingPermanent = permanent.filter(q => !q.claimed_at || (!!q.claimed_at && q.rewards.some(r => !r.scratched_at))).sort((a, b) => (b.progress / b.target_value) - (a.progress / a.target_value))
  const pendingDaily = daily.filter(q => !q.claimed_at || (!!q.claimed_at && q.rewards.some(r => !r.scratched_at))).sort((a, b) => (b.progress / b.target_value) - (a.progress / a.target_value))
  const done = quests.filter(q => !!q.claimed_at && q.rewards.every(r => !!r.scratched_at))

  const hasPermanent = pendingPermanent.length > 0
  const hasDaily = pendingDaily.length > 0

  return (
    <>
      <div className="flex flex-col gap-4 py-1">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={onGoToPlay}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 active:scale-95 transition-all flex-shrink-0"
            aria-label={lang === 'fr' ? 'Retour' : 'Back'}
          >
            <ArrowLeft className="w-4 h-4 text-foreground/70" />
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground leading-tight">{t('Quêtes', 'Quests')}</h2>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-amber-400/10 border border-amber-400/15 flex items-center justify-center flex-shrink-0">
            <Star className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 border-2 border-border border-t-foreground/40 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">

            {/* Scratch CTA — always visible */}
            <ScratchBanner count={scratchable.length} lang={lang} onClick={openScratch} />

            {/* Daily quests */}
            {hasDaily && (
              <Section label={t('Journalières', 'Daily')} color="sky">
                <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                  <span className="text-[10px] text-sky-400/70 font-medium">{t('Réinitialisation dans', 'Resets in')}</span>
                  <DailyChip lang={lang} />
                </div>
                {pendingDaily.map(q => (
                  <QuestRow key={q.id} quest={q} lang={lang} onClaim={handleClaim} onScratch={setScratchQuestId} />
                ))}
              </Section>
            )}

            {/* Permanent quests */}
            {hasPermanent && (
              <Section label={t('Quêtes', 'Quests')} color="muted">
                {pendingPermanent.map(q => (
                  <QuestRow key={q.id} quest={q} lang={lang} onClaim={handleClaim} onScratch={setScratchQuestId} />
                ))}
              </Section>
            )}

            {/* Done quests */}
            {done.length > 0 && (
              <Section label={t('Terminées', 'Completed')} color="muted">
                {done.map(q => (
                  <QuestRow key={q.id} quest={q} lang={lang} onClaim={handleClaim} onScratch={setScratchQuestId} />
                ))}
              </Section>
            )}

          </div>
        )}
      </div>

      {/* Scratch modal */}
      {scratchQuest && (
        <ScratchModal
          quest={scratchQuest}
          lang={lang}
          onScratch={handleScratch}
          onClose={closeScratch}
        />
      )}
    </>
  )
}
