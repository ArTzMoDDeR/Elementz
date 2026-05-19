'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  Sparkles, Star, Droplets, Flame, Wind, Mountain, Sun, Compass, Crown,
  Gem, CheckCircle2, Microscope, FlaskConical, Trophy, ArrowLeft,
  Clock, Ticket, Plus, ChevronRight, X,
  Shield, Medal, Atom as AtomIcon, Lightbulb, Gift,
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
  difficulty: 'easy' | 'medium' | 'hard' | 'impossible'
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


// ─── Section ─────────────────────────────────────────────────────────────────

function Section({ label, children, dot }: {
  label: string
  children: React.ReactNode
  dot?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 px-0.5">
        {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">{label}</p>
      </div>
      <div className="rounded-2xl bg-card border border-border/40 px-3">
        {children}
      </div>
    </div>
  )
}

// ─── DailyChip ───────────────────────────────────────────────────────────────

function DailyChip({ lang }: { lang: 'fr' | 'en' }) {
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
  const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return (
    <span className="text-[10px] font-mono font-semibold text-foreground/50 tabular-nums">{time}</span>
  )
}

// ─── ScratchBanner ───────────────────────────────────────────────────────────

function ScratchBanner({ count, lang, onClick }: { count: number; lang: 'fr' | 'en'; onClick: () => void }) {
  if (count === 0) return null
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-amber-400/10 border border-amber-400/25 active:scale-[0.98] transition-all cursor-pointer"
    >
      <div className="text-left">
        <p className="text-sm font-bold text-amber-400 leading-tight">
          {lang === 'fr'
            ? `${count} récompense${count > 1 ? 's' : ''} à révéler`
            : `${count} reward${count > 1 ? 's' : ''} to reveal`}
        </p>
        <p className="text-xs text-amber-400/60 mt-0.5 font-medium">
          {lang === 'fr' ? 'Appuie pour découvrir ton élément' : 'Tap to discover your element'}
        </p>
      </div>
      <ChevronRight className="w-5 h-5 text-amber-400/60 flex-shrink-0" />
    </button>
  )
}

// ─── QuestRow ────────────────────────────────────────────────────────────────

function QuestRow({ quest, lang, onClaim, onScratch, diffDot }: {
  quest: Quest
  lang: 'fr' | 'en'
  onClaim: (id: number) => Promise<void>
  onScratch?: (id: number) => void
  diffDot?: string
}) {
  const [claiming, setClaiming] = useState(false)
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  const isClaimed = !!quest.claimed_at
  const allScratched = quest.rewards.every(r => !!r.scratched_at)
  const isDone = isClaimed && allScratched
  const isReady = quest.progress >= quest.target_value && !isClaimed
  const isIconUrl = quest.icon?.startsWith('http') || quest.icon?.startsWith('/')
  const pct = Math.min(100, Math.round((quest.progress / quest.target_value) * 100))

  const iconMap: Record<string, React.ElementType> = {
    star: Star, shield: Shield, trophy: Trophy, medal: Medal, atom: AtomIcon, lightbulb: Lightbulb,
  }
  const Icon = iconMap[quest.icon] ?? Star

  const handleClaim = async () => {
    if (claiming || isClaimed || !isReady) return
    setClaiming(true)
    try {
      await onClaim(quest.id)
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className={`border-b border-border/20 last:border-b-0 transition-opacity ${isDone ? 'opacity-30' : ''}`}>
      <div className="flex items-center gap-3 py-3">
        {/* Icon */}
        <div className="relative flex-shrink-0">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center overflow-hidden ${isDone ? 'bg-muted/30' : isReady ? 'bg-muted/60' : 'bg-muted/40'}`}>
            {isDone ? (
              <CheckCircle2 className="w-4 h-4 text-muted-foreground/25" />
            ) : isIconUrl ? (
              <img src={quest.icon} alt="" className="w-6 h-6 object-contain" draggable={false} />
            ) : (
              <Icon className={`w-4 h-4 ${isReady ? 'text-foreground/70' : 'text-muted-foreground/50'}`} />
            )}
          </div>
          {diffDot && !isDone && (
            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${diffDot}`} />
          )}
        </div>

        {/* Text + progress */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-snug truncate ${isDone ? 'text-muted-foreground/40' : 'text-foreground'}`}>
            {lang === 'fr' ? quest.title_fr : quest.title_en}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-[3px] rounded-full bg-muted/60 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${isReady ? '' : 'bg-foreground/25'}`}
                style={{ width: `${pct}%`, ...(isReady ? { background: '#818cf8' } : {}) }}
              />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/40 flex-shrink-0 tabular-nums">
              {quest.progress}/{quest.target_value}
            </span>
          </div>
        </div>

        {/* Action */}
        <div className="flex-shrink-0">
          {isClaimed && !allScratched ? (
            <button
              onClick={() => onScratch?.(quest.id)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400/15 border border-amber-400/30 text-xs font-bold text-amber-400 active:scale-95 transition-all cursor-pointer"
            >
              {t('Révéler', 'Reveal')}
            </button>
          ) : isReady ? (
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-foreground/10 text-xs font-semibold text-foreground active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {claiming ? <div className="w-3 h-3 border border-foreground/40 border-t-foreground rounded-full animate-spin" /> : <Gift className="w-3 h-3" />}
              {t('Réclamer', 'Claim')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── Scratch Card ─────────────────────────────────────────────────────────────

function ScratchCard({ reward, lang, onScratched }: {
  reward: QuestReward
  lang: 'fr' | 'en'
  onScratched: (slot: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [revealed, setRevealed] = useState(!!reward.scratched_at)
  // Track whether the canvas has been painted so we hide the bg until ready
  const [canvasPainted, setCanvasPainted] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const notifiedRef = useRef(false)
  const SIZE = 100

  const paintCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, SIZE, SIZE)
    // Use a silver/light color that contrasts in both light and dark mode
    const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE)
    grad.addColorStop(0, '#c8c8d0')
    grad.addColorStop(1, '#a8a8b8')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, SIZE, SIZE)
    // ? marks visible on light background
    ctx.fillStyle = 'rgba(0,0,0,0.12)'
    ctx.font = 'bold 12px sans-serif'
    for (let x = 10; x < SIZE; x += 22)
      for (let y = 18; y < SIZE; y += 22)
        ctx.fillText('?', x, y)
    setCanvasPainted(true)
  }, [])

  useEffect(() => {
    if (revealed) return
    paintCanvas()
  }, [revealed, paintCanvas])

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
      <div className="flex flex-col items-center gap-2">
        <div className="w-[100px] h-[100px] rounded-2xl border border-border/60 bg-card flex flex-col items-center justify-center gap-2 shadow-sm">
          {reward.img
            ? <img src={reward.img} alt={name} className="w-14 h-14 object-contain" draggable={false} />
            : <Sparkles className="w-10 h-10 text-foreground/40" />}
          {name && <span className="text-[9px] font-semibold text-foreground/60 text-center px-1.5 leading-tight">{name}</span>}
        </div>
        <p className="text-[9px] text-muted-foreground/30 uppercase tracking-wide">{lang === 'fr' ? 'Révélé' : 'Revealed'}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[100px] h-[100px] rounded-2xl overflow-hidden cursor-crosshair select-none" style={{ touchAction: 'none' }}>
        {/* Background shown only after canvas covers it, to avoid flash */}
        <div className={`absolute inset-0 bg-muted flex items-center justify-center transition-opacity duration-150 ${canvasPainted ? 'opacity-100' : 'opacity-0'}`}>
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
      <p className="text-[9px] text-muted-foreground/40 animate-pulse">{lang === 'fr' ? 'Gratte ici' : 'Scratch here'}</p>
    </div>
  )
}

// ─── Scratch Modal ──────────────────────────────────────���─────────────────────

function ScratchModal({ quest, lang, onScratch, onClose, onGoToPlay }: {
  quest: Quest
  lang: 'fr' | 'en'
  onScratch: (questId: number, slot: number) => void
  onClose: () => void
  onGoToPlay?: () => void
}) {
  const allScratched = quest.rewards.every(r => !!r.scratched_at)
  const anyReward = quest.rewards[0]
  const resultName = anyReward
    ? (lang === 'fr' ? anyReward.result_name_french : anyReward.result_name_english)
    : null
  const resultImg = anyReward?.result_img ?? null

  const handleDone = () => { onClose(); onGoToPlay?.() }

  return (
    <div
      className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="fixed inset-0 sm:static sm:inset-auto sm:w-full sm:max-w-sm sm:h-auto sm:rounded-3xl bg-card border-0 sm:border sm:border-border overflow-y-auto flex flex-col">
        {/* Close button */}
        <div
          className="flex items-start justify-between px-5 pb-2"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        >
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-muted-foreground/20 sm:hidden" />
          <div />
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors flex-shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4 text-foreground/50" />
          </button>
        </div>

        {/* Element hero — image + name only, no quest title */}
        <div className="flex flex-col items-center gap-3 px-5 pt-2 pb-6">
          <div className="w-28 h-28 rounded-3xl bg-muted/40 flex items-center justify-center">
            {resultImg
              ? <img src={resultImg} alt={resultName ?? ''} className="w-20 h-20 object-contain" draggable={false} />
              : <Sparkles className="w-12 h-12 text-foreground/20" />
            }
          </div>
          {resultName && (
            <h2 className="text-3xl font-bold text-foreground text-balance text-center leading-tight">
              {resultName}
            </h2>
          )}
        </div>

        {/* Scratch area */}
        <div
          className="px-5 pb-6 flex flex-col items-center gap-5"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 28px)' }}
        >
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {quest.rewards.sort((a, b) => a.slot - b.slot).map((r, i) => (
              <div key={r.slot} className="flex items-center gap-4">
                <ScratchCard reward={r} lang={lang} onScratched={(slot) => onScratch(quest.id, slot)} />
                {i < quest.rewards.length - 1 && <Plus className="w-3.5 h-3.5 text-muted-foreground/20 flex-shrink-0" />}
              </div>
            ))}
          </div>

          {!allScratched && (
            <p className="text-[10px] text-muted-foreground/25 uppercase tracking-widest animate-pulse">
              {lang === 'fr' ? 'Gratte pour révéler' : 'Scratch to reveal'}
            </p>
          )}

          {allScratched && (
            <div className="flex flex-col items-center gap-3 w-full max-w-[260px]">
              <p className="text-xs text-center text-muted-foreground/50 leading-relaxed">
                {lang === 'fr'
                  ? 'Retiens cette combinaison et va la créer sur le terrain !'
                  : 'Remember this combo and try it on the field!'}
              </p>
              <button
                onClick={handleDone}
                className="w-full h-11 rounded-2xl bg-foreground text-background text-sm font-semibold active:scale-95 transition-all cursor-pointer"
              >
                {lang === 'fr' ? "J'y vais !" : "Let's go!"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── QuestInlinePanel ─────────────────────────────────────────────────────────

// ─── Local quest definitions for guests (no DB needed) ───────────────────────
import { quests as ALL_QUESTS } from '@/lib/data/quests'

const GUEST_QUESTS_KEY = 'alchemy-guest-quests-v1'
const GUEST_DISCOVERED_KEY = 'alchemy-discovered-v4'
const GUEST_COMBOS_KEY = 'alchemy-combos-v1'

type RawQuest = {
  id: number; type: string; title_fr: string; title_en: string
  desc_fr: string; desc_en: string; target_value: number; icon: string
  sort_order: number; is_daily: boolean; required_element: number | null
  reset_hours: number | null; difficulty: string
}

function getGuestQuests(): Quest[] {
  if (typeof window === 'undefined') return []

  const discoveredIds: number[] = JSON.parse(localStorage.getItem(GUEST_DISCOVERED_KEY) ?? '[]')
  const discoveredSet = new Set(discoveredIds)
  const discoveredCount = discoveredIds.length
  const comboCount: number = JSON.parse(localStorage.getItem(GUEST_COMBOS_KEY) ?? '0')
  const claimedIds: number[] = JSON.parse(localStorage.getItem(GUEST_QUESTS_KEY) ?? '[]')
  const todayKey = `alchemy-daily-${new Date().toISOString().slice(0, 10)}`
  const dailyCount: number = JSON.parse(localStorage.getItem(todayKey) ?? '0')

  return (ALL_QUESTS as unknown as RawQuest[]).map(q => {
    let progress = 0
    let visible = true

    if (q.type === 'discover_n') {
      progress = Math.min(discoveredCount, q.target_value)
    } else if (q.type === 'discover_n_daily') {
      progress = Math.min(dailyCount, q.target_value)
    } else if (q.type === 'discover_element') {
      const needed = q.required_element
      visible = needed == null || discoveredSet.has(needed)
      progress = needed != null && discoveredSet.has(needed) ? 1 : 0
    } else if (q.type === 'combinations_n') {
      const needed = q.required_element
      visible = needed == null || discoveredSet.has(needed)
      progress = visible ? Math.min(comboCount, q.target_value) : 0
    }

    if (!visible) return null

    const completed = progress >= q.target_value
    return {
      ...q,
      difficulty: q.difficulty as Quest['difficulty'],
      progress,
      completed_at: completed ? 'local' : null,
      claimed_at: claimedIds.includes(q.id) ? 'local' : null,
      reset_at: null,
      rewards: [],
      is_expired: false,
    }
  }).filter(Boolean) as Quest[]
}

export function QuestInlinePanel({ lang, onGoToPlay }: { lang: 'fr' | 'en'; onGoToPlay?: () => void }) {
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en
  const { data: session } = useSession()
  const isGuest = !session?.user?.id

  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [scratchQuestId, setScratchQuestId] = useState<number | null>(null)

  const fetchQuests = useCallback(async () => {
    if (isGuest) {
      setQuests(getGuestQuests())
      setLoading(false)
      return getGuestQuests()
    }
    const res = await fetch('/api/quests')
    if (res.ok) {
      const data = await res.json()
      const list: Quest[] = Array.isArray(data) ? data : (data.quests ?? [])
      setQuests(list)
      setLoading(false)
      return list
    }
    setLoading(false)
    return [] as Quest[]
  }, [isGuest])

  useEffect(() => {
    fetchQuests()
    // Only refetch when the tab becomes visible again — NOT on every visibility event
    const handler = () => { if (document.visibilityState === 'visible') fetchQuests() }
    document.addEventListener('visibilitychange', handler)
    // Poll every 2 minutes — quests don't change that often
    const id = setInterval(() => { if (document.visibilityState === 'visible') fetchQuests() }, 120000)
    return () => {
      document.removeEventListener('visibilitychange', handler)
      clearInterval(id)
    }
  }, [fetchQuests])

  const handleClaim = async (questId: number) => {
    if (isGuest) {
      // Save claimed quest to localStorage
      const claimed: number[] = JSON.parse(localStorage.getItem(GUEST_QUESTS_KEY) ?? '[]')
      if (!claimed.includes(questId)) {
        localStorage.setItem(GUEST_QUESTS_KEY, JSON.stringify([...claimed, questId]))
      }
      await fetchQuests()
      return
    }
    const res = await fetch('/api/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quest_id: questId }),
    })
    const fresh = await fetchQuests()
    if (res.ok) {
      const claimed = fresh.find(q => q.id === questId)
      if (claimed && claimed.rewards.some(r => !r.scratched_at)) {
        setScratchQuestId(questId)
      }
    }
  }

  const handleScratch = async (questId: number, slot: number) => {
    if (isGuest) {
      await fetchQuests()
      return
    }
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

  const [diffFilter, setDiffFilter] = useState<'all' | 'easy' | 'medium' | 'hard' | 'impossible'>('all')

  type Difficulty = 'easy' | 'medium' | 'hard' | 'impossible'

  const DIFF_CONFIG: { value: 'all' | Difficulty; labelFr: string; labelEn: string; color: string }[] = [
    { value: 'all',        labelFr: 'Tout',        labelEn: 'All',        color: 'text-foreground/70'        },
    { value: 'easy',       labelFr: 'Facile',      labelEn: 'Easy',       color: 'text-emerald-400'          },
    { value: 'medium',     labelFr: 'Moyen',       labelEn: 'Medium',     color: 'text-amber-400'            },
    { value: 'hard',       labelFr: 'Difficile',   labelEn: 'Hard',       color: 'text-orange-400'           },
    { value: 'impossible', labelFr: 'Impossible',  labelEn: 'Impossible', color: 'text-rose-500'             },
  ]

  const DIFF_DOT: Record<Difficulty, string> = {
    easy:       'bg-emerald-400',
    medium:     'bg-amber-400',
    hard:       'bg-orange-400',
    impossible: 'bg-rose-500',
  }

  // A quest is "fully done" when claimed + all rewards scratched
  const isDone = (q: Quest) => !!q.claimed_at && q.rewards.every(r => !!r.scratched_at)

  const daily = quests.filter(q => q.is_daily)
  const permanent = quests.filter(q => !q.is_daily)

  const DIFF_ORDER: Difficulty[] = ['easy', 'medium', 'hard', 'impossible']

  // Sort: ready (progress >= target, not yet claimed) first → claimed (pending scratch) → then by progress % desc
  const questSort = (a: Quest, b: Quest) => {
    const isReady = (q: Quest) => q.progress >= q.target_value && !q.claimed_at
    const isClaimed = (q: Quest) => !!q.claimed_at
    const rank = (q: Quest) => isReady(q) ? 0 : isClaimed(q) ? 1 : 2
    const ra = rank(a), rb = rank(b)
    if (ra !== rb) return ra - rb
    // Within same rank: sort by progress % desc
    return (b.progress / b.target_value) - (a.progress / a.target_value)
  }

  const pendingDaily = daily
    .filter(q => !isDone(q))
    .filter(q => diffFilter === 'all' || q.difficulty === diffFilter)
    .sort(questSort)

  const pendingPermanent = permanent
    .filter(q => !isDone(q))
    .filter(q => diffFilter === 'all' || q.difficulty === diffFilter)
    .sort((a, b) => {
      if (diffFilter === 'all') {
        const da = DIFF_ORDER.indexOf(a.difficulty)
        const db = DIFF_ORDER.indexOf(b.difficulty)
        if (da !== db) return da - db
      }
      return questSort(a, b)
    })

  // When showing "All", group permanent quests by difficulty section
  const permanentByDiff: Record<Difficulty, Quest[]> = {
    easy: [], medium: [], hard: [], impossible: [],
  }
  pendingPermanent.forEach(q => permanentByDiff[q.difficulty].push(q))
  DIFF_ORDER.forEach(d => permanentByDiff[d].sort(questSort))

  const hasPermanent = pendingPermanent.length > 0
  const hasDaily = pendingDaily.length > 0
  const allDone = !hasPermanent && !hasDaily && quests.length > 0

  // ── Inline scratch view — replaces the quest list entirely ──────────────
  if (scratchQuest) {
    const allScratched = scratchQuest.rewards.every(r => !!r.scratched_at)
    const anyReward = scratchQuest.rewards[0]
    const resultName = anyReward
      ? (lang === 'fr' ? anyReward.result_name_french : anyReward.result_name_english)
      : null
    const resultImg = anyReward?.result_img ?? null

    return (
      <div className="h-full flex flex-col">
        {/* Back */}
        <button
          onClick={closeScratch}
          className="flex items-center gap-1.5 text-muted-foreground/60 hover:text-foreground text-sm font-medium mb-8 w-fit cursor-pointer active:opacity-60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('Quêtes', 'Quests')}
        </button>

        <div className="flex-1 flex flex-col items-center justify-center gap-8 pb-10">
          {/* Element hero — image + name only */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-28 h-28 rounded-3xl bg-muted/40 flex items-center justify-center">
              {resultImg
                ? <img src={resultImg} alt={resultName ?? ''} className="w-20 h-20 object-contain" draggable={false} />
                : <Sparkles className="w-12 h-12 text-foreground/20" />
              }
            </div>
            {resultName && (
              <h2 className="text-3xl font-bold text-foreground leading-tight text-balance">{resultName}</h2>
            )}
          </div>

          {/* Scratch cards */}
          <div className="flex flex-col items-center gap-5">
            <div className="flex items-center justify-center gap-5 flex-wrap">
              {scratchQuest.rewards.sort((a, b) => a.slot - b.slot).map((r, i) => (
                <div key={r.slot} className="flex items-center gap-5">
                  <ScratchCard reward={r} lang={lang} onScratched={(slot) => handleScratch(scratchQuest.id, slot)} />
                  {i < scratchQuest.rewards.length - 1 && (
                    <Plus className="w-3.5 h-3.5 text-muted-foreground/20 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {!allScratched && (
              <p className="text-[10px] text-muted-foreground/25 tracking-widest uppercase animate-pulse">
                {t('Gratte pour révéler', 'Scratch to reveal')}
              </p>
            )}
          </div>

          {/* Post-scratch */}
          {allScratched && (
            <div className="flex flex-col items-center gap-5 w-full max-w-[260px]">
              <div className="w-full rounded-2xl bg-card border border-border/50 px-5 py-4 text-center">
                <p className="text-xs text-muted-foreground/60 leading-relaxed">
                  {t(
                    'Retiens cette combinaison et va la créer sur le terrain !',
                    'Remember this combo and try it on the field!'
                  )}
                </p>
              </div>
              <button
                onClick={() => { closeScratch(); onGoToPlay?.() }}
                className="w-full h-11 rounded-2xl bg-foreground text-background text-sm font-semibold active:scale-95 transition-all cursor-pointer"
              >
                {t("J'y vais !", "Let's go!")}
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

        {/* Header — iOS style with inline difficulty picker */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">{t('Quêtes', 'Quests')}</h2>
            <p className="text-xs text-muted-foreground/40">{t('Objectifs & récompenses', 'Goals & rewards')}</p>
          </div>

          {/* Compact difficulty selector */}
          <div className="relative flex-shrink-0 mt-1">
            <select
              value={diffFilter}
              onChange={e => setDiffFilter(e.target.value as typeof diffFilter)}
              className="appearance-none cursor-pointer pl-6 pr-5 py-1.5 rounded-xl bg-muted/60 border border-border/40 text-xs font-semibold text-foreground focus:outline-none"
            >
              {DIFF_CONFIG.map(d => (
                <option key={d.value} value={d.value}>
                  {lang === 'fr' ? d.labelFr : d.labelEn}
                </option>
              ))}
            </select>
            {/* Colored dot for active filter */}
            {diffFilter !== 'all' && (
              <span className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${DIFF_DOT[diffFilter as Difficulty]}`} />
            )}
            {diffFilter === 'all' && (
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-foreground/30" />
            )}
            <ChevronRight className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 rotate-90" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 border-2 border-border border-t-foreground/40 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">

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
                  <QuestRow key={q.id} quest={q} lang={lang} onClaim={handleClaim} onScratch={setScratchQuestId} diffDot={DIFF_DOT[q.difficulty]} />
                ))}
              </Section>
            )}

            {/* Permanent quests — grouped by difficulty in All mode, flat otherwise */}
            {hasPermanent && diffFilter === 'all' && DIFF_ORDER.map(diff => {
              const group = permanentByDiff[diff]
              if (!group.length) return null
              const labels: Record<Difficulty, [string, string]> = {
                easy:       ['Facile',     'Easy'],
                medium:     ['Moyen',      'Medium'],
                hard:       ['Difficile',  'Hard'],
                impossible: ['Impossible', 'Impossible'],
              }
              return (
                <Section key={diff} label={lang === 'fr' ? labels[diff][0] : labels[diff][1]} dot={DIFF_DOT[diff]}>
                  {group.map(q => (
                    <QuestRow key={q.id} quest={q} lang={lang} onClaim={handleClaim} onScratch={setScratchQuestId} diffDot={DIFF_DOT[q.difficulty]} />
                  ))}
                </Section>
              )
            })}
            {hasPermanent && diffFilter !== 'all' && (
              <Section label={DIFF_CONFIG.find(d => d.value === diffFilter)?.[lang === 'fr' ? 'labelFr' : 'labelEn'] ?? ''} dot={DIFF_DOT[diffFilter as Difficulty]}>
                {pendingPermanent.map(q => (
                  <QuestRow key={q.id} quest={q} lang={lang} onClaim={handleClaim} onScratch={setScratchQuestId} diffDot={DIFF_DOT[q.difficulty]} />
                ))}
              </Section>
            )}

            {/* Empty / all done */}
            {allDone && (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Trophy className="w-8 h-8 text-amber-400/50" />
                <p className="text-sm font-semibold text-foreground/60">{t('Toutes les quêtes terminées !', 'All quests completed!')}</p>
                <p className="text-xs text-muted-foreground/40">{t('Reviens demain pour les journalières.', 'Come back tomorrow for daily quests.')}</p>
              </div>
            )}
            {!allDone && !hasPermanent && !hasDaily && !loading && (
              <p className="text-sm text-muted-foreground/40 text-center py-10">
                {t('Aucune quête dans cette catégorie.', 'No quests in this category.')}
              </p>
            )}

          </div>
        )}
      </div>

    </>
  )
}
