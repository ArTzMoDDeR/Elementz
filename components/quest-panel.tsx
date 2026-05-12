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
      className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Mobile: true fullscreen. Desktop: centered card */}
      <div className="fixed inset-0 sm:static sm:inset-auto sm:w-full sm:max-w-sm sm:h-auto sm:rounded-3xl bg-card border-0 sm:border sm:border-border overflow-y-auto flex flex-col">
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pb-4"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}
        >
          {/* Drag handle visual — mobile only */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-muted-foreground/20 sm:hidden" />
          <div>
            <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest mb-0.5">
              {lang === 'fr' ? 'Récompense' : 'Reward'}
            </p>
            <h3 className="text-base font-bold text-foreground leading-tight">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors flex-shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4 text-foreground/50" />
          </button>
        </div>

        {/* Scratch area */}
        <div className="px-5 flex-1 flex flex-col justify-center sm:block sm:pb-6"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
        >
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
                className="px-6 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors active:scale-95 cursor-pointer"
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
  if (count === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/30 border border-border/40">
        <div className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
          <Ticket className="w-4 h-4 text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground/40 font-medium">
          {lang === 'fr' ? 'Termine une quête pour gratter' : 'Complete a quest to scratch'}
        </p>
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-5 py-4 rounded-2xl active:scale-[0.98] transition-all cursor-pointer"
      style={{
        background: 'rgba(99,102,241,0.18)',
        border: '3px solid #6366f1',
        boxShadow: '0 4px 20px rgba(99,102,241,0.15)',
      }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.25)' }}>
        <Ticket className="w-4 h-4" style={{ color: '#818cf8' }} />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-bold leading-tight" style={{ color: '#818cf8' }}>
          {lang === 'fr' ? 'Gratter ma récompense' : 'Scratch my reward'}
        </p>
        <p className="text-[11px] font-medium mt-0.5" style={{ color: '#818cf880' }}>
          {count === 1
            ? (lang === 'fr' ? '1 quête terminée' : '1 quest ready')
            : (lang === 'fr' ? `${count} quêtes terminées` : `${count} quests ready`)}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#818cf860' }} />
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

  const iconBg = isDone ? 'bg-muted/50' : isClaimed ? 'bg-muted/50' : isReady ? 'bg-foreground/8' : quest.is_daily ? 'bg-muted/50' : 'bg-muted/50'
  const iconColor = isDone ? 'text-muted-foreground/25' : isClaimed ? 'text-muted-foreground/40' : isReady ? 'text-foreground/80' : quest.is_daily ? 'text-foreground/60' : 'text-muted-foreground/60'
  const trackColor = isReady ? '' : 'bg-muted-foreground/30'
  const trackStyle = isReady ? { background: '#818cf8' } : {}

  return (
    <div className={`border-b border-border/20 last:border-b-0 ${isDone ? 'opacity-35' : ''}`}>
      <button
        className="w-full flex items-center gap-3 py-3.5 text-left cursor-pointer"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {isDone
            ? <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground/25" />
            : <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
          }
        </div>

        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium leading-tight block truncate ${isDone ? 'line-through text-muted-foreground/40' : 'text-foreground'}`}>
            {title}
          </span>
          {!isClaimed && (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-[3px] rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${trackColor}`}
                  style={{ width: `${pct}%`, ...trackStyle }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground/35 flex-shrink-0">
                {quest.progress}/{quest.target_value}
              </span>
            </div>
          )}
          {isClaimed && !allScratched && (
            <span className="text-[10px] text-muted-foreground/50 font-medium mt-0.5 block">
              {lang === 'fr' ? 'Prête à gratter' : 'Ready to scratch'}
            </span>
          )}
        </div>

        {/* Dot or chevron — self-center aligns with the row midpoint */}
        {isReady && !isClaimed ? (
          <div className="flex-shrink-0 self-center w-1.5 h-1.5 rounded-full" style={{ background: '#818cf8' }} />
        ) : (
          <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 self-center transition-transform duration-200 ${open ? 'rotate-90' : ''} text-muted-foreground/25`} />
        )}
      </button>

      {open && desc && (
        <div className="pb-3.5 pl-11 pr-1">
          <p className="text-[11px] text-muted-foreground/50 leading-relaxed">{desc}</p>
        </div>
      )}
    </div>
  )
}

// ─── Section ───��──────────────────────────────────────────────────────────────

function Section({ label, children }: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest px-0.5 text-muted-foreground/40">{label}</p>
      <div className="rounded-2xl bg-card border border-border/40 px-3">
        {children}
      </div>
    </div>
  )
}

// ─── Daily Reset Chip ─────────────────────────────────────────────────────────

function DailyChip({ lang }: { lang: 'fr' | 'en' }) {
  const countdown = useDailyCountdown()
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/60 border border-border/40 self-start">
      <Clock className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
      <span className="text-[10px] font-semibold text-muted-foreground/70 tabular-nums">{countdown}</span>
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

  const fetchQuests = useCallback(async (): Promise<Quest[]> => {
    try {
      const res = await fetch('/api/quests')
      const data = await res.json()
      const list: Quest[] = data.quests ?? []
      setQuests(list)
      setLoading(false)
      return list
    } catch {}
    setLoading(false)
    return []
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
    // Fetch fresh quests first, then open the scratch modal with confirmed data
    const fresh = await fetchQuests()
    if (res.ok) {
      const claimed = fresh.find(q => q.id === questId)
      if (claimed && claimed.rewards.some(r => !r.scratched_at)) {
        setScratchQuestId(questId)
      }
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

  // Quests ready to scratch: either already claimed-but-not-scratched, or complete-but-not-yet-claimed
  const scratchable = quests.filter(q =>
    (!!q.claimed_at && q.rewards.some(r => !r.scratched_at)) ||
    (!q.claimed_at && q.progress >= q.target_value)
  )

  // Open the first scratchable quest — claim it first if needed
  const openScratch = async () => {
    const first = scratchable[0]
    if (!first) return
    if (!first.claimed_at) {
      // Claim first, then open modal with fresh data
      await handleClaim(first.id)
    } else {
      setScratchQuestId(first.id)
    }
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

  // ── Inline scratch view — replaces the quest list entirely ──────────────
  if (scratchQuest) {
    const title = lang === 'fr' ? scratchQuest.title_fr : scratchQuest.title_en
    const allScratched = scratchQuest.rewards.every(r => !!r.scratched_at)
    const anyReward = scratchQuest.rewards[0]
    const resultName = anyReward
      ? (lang === 'fr' ? anyReward.result_name_french : anyReward.result_name_english)
      : null

    return (
      <div className="h-full flex flex-col gap-0 py-1">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest mb-0.5">
              {t('Récompense', 'Reward')}
            </p>
            <h2 className="text-lg font-bold text-foreground leading-tight">{title}</h2>
          </div>
          <button
            onClick={closeScratch}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 active:scale-95 transition-all flex-shrink-0 cursor-pointer"
            aria-label={lang === 'fr' ? 'Retour' : 'Back'}
          >
            <ArrowLeft className="w-4 h-4 text-foreground/70" />
          </button>
        </div>

        {/* Scratch area — centered vertically in remaining space */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {resultName && !allScratched && (
            <p className="text-[11px] text-muted-foreground text-center">
              {t('Pour créer : ', 'To create: ')}
              <span className="font-bold text-foreground">{resultName}</span>
            </p>
          )}

          <div className="flex items-center justify-center gap-3 flex-wrap">
            {scratchQuest.rewards.sort((a, b) => a.slot - b.slot).map((r, i) => (
              <div key={r.slot} className="flex items-center gap-3">
                <ScratchCard reward={r} lang={lang} onScratched={(slot) => handleScratch(scratchQuest.id, slot)} />
                {i < scratchQuest.rewards.length - 1 && (
                  <Plus className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          {allScratched && (
            <div className="flex flex-col items-center gap-3 mt-2">
              <p className="text-[11px] text-center text-muted-foreground/70 leading-relaxed max-w-[220px]">
                {t(
                  'Retiens cette combinaison et va la créer sur le terrain !',
                  'Remember this combo and try it on the field!'
                )}
              </p>
              <button
                onClick={closeScratch}
                className="px-6 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors active:scale-95 cursor-pointer"
              >
                {t("J'ai noté !", 'Got it!')}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Default quest list ────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col gap-4 py-1">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={onGoToPlay}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 active:scale-95 transition-all flex-shrink-0 cursor-pointer"
            aria-label={lang === 'fr' ? 'Retour' : 'Back'}
          >
            <ArrowLeft className="w-4 h-4 text-foreground/70" />
          </button>
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#818cf8' }}>
              {t('Objectifs', 'Objectives')}
            </p>
            <h2 className="text-lg font-bold text-foreground leading-tight">{t('Quêtes', 'Quests')}</h2>
          </div>

        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 border-2 border-border border-t-foreground/40 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">

            {/* Scratch CTA — always at top */}
            <ScratchBanner count={scratchable.length} lang={lang} onClick={openScratch} />

            {/* Daily quests */}
            {hasDaily && (
              <Section label={t('Journalières', 'Daily')}>
                <div className="flex items-center justify-between py-2.5 border-b border-border/20">
                  <span className="text-[10px] text-muted-foreground/40 font-medium">{t('Réinitialisation dans', 'Resets in')}</span>
                  <DailyChip lang={lang} />
                </div>
                {pendingDaily.map(q => (
                  <QuestRow key={q.id} quest={q} lang={lang} onClaim={handleClaim} onScratch={setScratchQuestId} />
                ))}
              </Section>
            )}

            {/* Permanent quests */}
            {hasPermanent && (
              <Section label={t('Quêtes', 'Quests')}>
                {pendingPermanent.map(q => (
                  <QuestRow key={q.id} quest={q} lang={lang} onClaim={handleClaim} onScratch={setScratchQuestId} />
                ))}
              </Section>
            )}

            {/* Done quests */}
            {done.length > 0 && (
              <Section label={t('Terminées', 'Completed')}>
                {done.map(q => (
                  <QuestRow key={q.id} quest={q} lang={lang} onClaim={handleClaim} onScratch={setScratchQuestId} />
                ))}
              </Section>
            )}

          </div>
        )}
      </div>

    </>
  )
}
