'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, ArrowLeft, Ticket, Scroll, Check } from 'lucide-react'
import type { ElementDef } from '@/lib/game-data'
import { ElementBadge } from '@/components/element-badge'

type Props = {
  elementsByName: Map<string, ElementDef>
  elements: Map<number, ElementDef>
  recipeMap: Map<string, number[]>
  onComplete: (prefs: { lang: 'fr' | 'en'; theme: 'dark' | 'light'; haptic: boolean; username: string; avatar: string; enablePush: boolean }) => void
  onTutorialDiscover: (nums: number[]) => void
  onLangChange?: (lang: 'fr' | 'en') => void
}

const STARTERS = ['eau', 'feu', 'terre', 'air'] as const
const STARTER_LABELS: Record<string, { fr: string; en: string; emoji: string }> = {
  eau:   { fr: 'Eau',   en: 'Water', emoji: '💧' },
  feu:   { fr: 'Feu',   en: 'Fire',  emoji: '🔥' },
  terre: { fr: 'Terre', en: 'Earth', emoji: '🌍' },
  air:   { fr: 'Air',   en: 'Air',   emoji: '💨' },
}

const STEPS = ['lang', 'theme', 'tap', 'combine', 'hint', 'quests', 'username', 'avatar', 'notifications'] as const
type Step = typeof STEPS[number]

const TUTORIAL_COMBOS = [
  { fr_a: 'eau',    en_a: 'water', fr_b: 'air',    en_b: 'air',   fr_result: 'pluie',      en_result: 'rain' },
  { fr_a: 'pluie',  en_a: 'rain',  fr_b: 'terre',  en_b: 'earth', fr_result: 'plante',     en_result: 'plant' },
  { fr_a: 'plante', en_a: 'plant', fr_b: 'pluie',  en_b: 'rain',  fr_result: 'champignon', en_result: 'mushroom' },
] as const

type MiniItem = { id: string; num: number; el: ElementDef; x: number; y: number }
type MiniDrag = { id: string; offsetX: number; offsetY: number; pointerId: number }
const MERGE_DIST_PCT = 22

// ── Tap-to-add step ───────────────────────────────────────────────────────────
// A mini fake-game: inventory bar at bottom, playground canvas above.
// Tapping an inventory item "adds" it to the playground with a drop animation.
type TapItem = { key: string; label: string; el: ElementDef | null; x: number; y: number }

function TapArena({
  lang,
  elements,
  onAllAdded,
}: {
  lang: 'fr' | 'en'
  elements: Map<number, ElementDef>
  onAllAdded: () => void
}) {
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  // Resolve elements by name
  const getEl = useCallback((names: string[]): ElementDef | null => {
    for (const n of names) {
      const found = [...elements.values()].find(el => el.name.toLowerCase() === n.toLowerCase())
      if (found) return found
    }
    return null
  }, [elements])

  const targets = useMemo(() => [
    { key: 'air',   label: t('Air', 'Air'),   el: getEl(['air']) },
    { key: 'eau',   label: t('Eau', 'Water'), el: getEl(['eau', 'water']) },
  ], [getEl, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  // playground items placed so far
  const [placed, setPlaced]       = useState<TapItem[]>([])
  const [celebrate, setCelebrate] = useState(false)
  // keys in inventory that are greyed out (added to playground)
  const addedKeys = new Set(placed.map(p => p.key))

  const POSITIONS = [
    { x: 30, y: 45 },
    { x: 68, y: 38 },
  ]

  const handleTap = (key: string, el: ElementDef | null, label: string) => {
    if (addedKeys.has(key)) return
    const idx = placed.length
    const pos = POSITIONS[idx] ?? { x: 50, y: 50 }
    const next = [...placed, { key, label, el, ...pos }]
    setPlaced(next)
    if (next.length >= targets.length) {
      setCelebrate(true)
      setTimeout(() => onAllAdded(), 2200)
    }
  }

  return (
    <div className="relative w-full flex flex-col flex-1 min-h-0">

      {/* ── Playground canvas ── */}
      <div className="relative flex-1 min-h-0 rounded-3xl overflow-hidden border border-border/30">

        {/* Items placed on playground */}
        {placed.map(item => (
          <div
            key={item.key}
            className="absolute flex flex-col items-center gap-1.5 -translate-x-1/2 -translate-y-1/2 onboard-pop"
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: `${item.el?.color ?? 'oklch(0.72 0.17 200)'}18`,
                border: `2px solid ${item.el?.color ?? 'oklch(0.72 0.17 200)'}45`,
                boxShadow: `0 0 16px ${item.el?.color ?? 'oklch(0.72 0.17 200)'}20`,
              }}
            >
              {item.el?.imageUrl
                ? <img src={item.el.imageUrl} alt={item.label} className="w-10 h-10 object-contain" draggable={false} />
                : <span className="text-2xl font-bold text-foreground/60">{item.label[0]}</span>
              }
            </div>
            <span className="text-[11px] font-semibold text-foreground/70 select-none">{item.label}</span>
          </div>
        ))}

        {/* Instruction overlay in the center when playground is empty */}
        {placed.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-muted-foreground/30 text-center px-8 select-none">
              {t('Appuie sur un élément ci-dessous', 'Tap an element below')}
            </p>
          </div>
        )}

        {/* Celebrate message */}
        {celebrate && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-base font-bold text-emerald-400 text-center px-6 onboard-fade-up drop-shadow-lg">
              {t('Parfait ! Maintenant créons un élément', "Perfect! Now let's create an element")}
            </p>
          </div>
        )}
      </div>

      {/* ── Inventory bar ── */}
      <div
        className="flex-shrink-0 rounded-2xl border border-border/40 mt-3 px-4 py-3"
        style={{ background: 'color-mix(in oklch, var(--card) 85%, transparent)' }}
      >
        {/* Label */}
        <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-2.5 text-center select-none">
          {t('Inventaire', 'Inventory')}
        </p>
        <div className="flex gap-3 justify-center">
          {targets.map(({ key, label, el }) => {
            const isAdded = addedKeys.has(key)
            const color = el?.color ?? 'oklch(0.72 0.17 200)'
            return (
              <button
                key={key}
                onClick={() => handleTap(key, el, label)}
                disabled={isAdded || celebrate}
                className="flex flex-col items-center gap-1.5 transition-all active:scale-90 disabled:pointer-events-none"
                style={{ opacity: isAdded ? 0.35 : 1 }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center relative transition-all"
                  style={{
                    background: isAdded ? 'var(--muted)' : `${color}18`,
                    border: isAdded ? '2px solid var(--border)' : `2px solid ${color}50`,
                    boxShadow: isAdded ? 'none' : `0 0 14px ${color}22`,
                  }}
                >
                  {el?.imageUrl
                    ? <img src={el.imageUrl} alt={label} className="w-9 h-9 object-contain" draggable={false} />
                    : <span className="text-xl font-bold text-foreground/60">{label[0]}</span>
                  }
                  {/* Pulse ring on un-tapped items */}
                  {!isAdded && !celebrate && (
                    <span
                      className="absolute inset-0 rounded-2xl animate-ping"
                      style={{ border: `2px solid ${color}35`, animationDuration: '2s' }}
                    />
                  )}
                </div>
                <span className="text-[11px] font-semibold text-foreground/60 select-none">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Cinematic combine arena ────────────────────────────────────────────────────
function CombineArena({
  lang,
  elements,
  recipeMap,
  onAllDone,
  onTutorialDiscover,
}: {
  lang: 'fr' | 'en'
  elements: Map<number, ElementDef>
  recipeMap: Map<string, number[]>
  onAllDone: () => void
  onTutorialDiscover: (nums: number[]) => void
}) {
  const areaRef    = useRef<HTMLDivElement>(null)
  const drag       = useRef<MiniDrag | null>(null)
  const t          = (fr: string, en: string) => lang === 'fr' ? fr : en

  const byName = useRef<Map<string, ElementDef>>(new Map())
  useEffect(() => {
    const m = new Map<string, ElementDef>()
    elements.forEach(el => m.set(el.name.toLowerCase(), el))
    byName.current = m
  }, [elements])

  const getEl = useCallback((name: string): ElementDef | null =>
    byName.current.get(name.toLowerCase())
    ?? [...elements.values()].find(el => el.name.toLowerCase() === name.toLowerCase())
    ?? null
  , [elements])

  const getResult = useCallback((aEl: ElementDef, bEl: ElementDef): ElementDef | null => {
    const r = recipeMap.get(`${aEl.number}|${bEl.number}`)
      ?? recipeMap.get(`${bEl.number}|${aEl.number}`)
    if (!r || r.length === 0) return null
    return elements.get(r[0]) ?? null
  }, [recipeMap, elements])

  const [comboIndex, setComboIndex] = useState(0)
  const [items, setItems]           = useState<MiniItem[]>([])
  const [merging, setMerging]       = useState(false)
  const [nearId, setNearId]         = useState<string | null>(null)

  // Cinematic states
  // 'idle'   — waiting for drag
  // 'reveal' — "Super! Tu viens de créer X" full-screen
  // 'next'   — "Maintenant créons Y" message before new arena
  // 'done'   — all 3 done
  const [phase, setPhase] = useState<'idle' | 'reveal' | 'next' | 'done'>('idle')
  const [lastResult, setLastResult] = useState<ElementDef | null>(null)
  const [animKey, setAnimKey] = useState(0) // key to re-trigger animations

  const itemsRef   = useRef<MiniItem[]>([])
  const mergingRef = useRef(false)
  const comboRef   = useRef(0)
  useEffect(() => { itemsRef.current   = items   }, [items])
  useEffect(() => { mergingRef.current = merging }, [merging])
  useEffect(() => { comboRef.current   = comboIndex }, [comboIndex])

  const buildItems = useCallback((idx: number): MiniItem[] => {
    const combo = TUTORIAL_COMBOS[idx]
    const aEl = getEl(combo.fr_a) ?? getEl(combo.en_a)
    const bEl = getEl(combo.fr_b) ?? getEl(combo.en_b)
    if (!aEl || !bEl) return []
    return [
      { id: 'a', num: aEl.number, el: aEl, x: 30, y: 50 },
      { id: 'b', num: bEl.number, el: bEl, x: 70, y: 50 },
    ]
  }, [getEl])

  useEffect(() => {
    setItems(buildItems(comboIndex))
    setMerging(false)
    setNearId(null)
    setAnimKey(k => k + 1)
  }, [comboIndex, buildItems])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (mergingRef.current) return
    const area = areaRef.current
    if (!area) return
    const rect = area.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * 100
    const py = ((e.clientY - rect.top)  / rect.height) * 100
    let closest: MiniItem | null = null
    let closestDist = Infinity
    for (const item of itemsRef.current) {
      const d = Math.hypot(item.x - px, item.y - py)
      if (d < closestDist) { closestDist = d; closest = item }
    }
    if (!closest || closestDist > 18) return
    try { area.setPointerCapture(e.pointerId) } catch {}
    drag.current = { id: closest.id, pointerId: e.pointerId, offsetX: px - closest.x, offsetY: py - closest.y }
    e.preventDefault()
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || mergingRef.current) return
    if (drag.current.pointerId !== e.pointerId) return
    const area = areaRef.current
    if (!area) return
    const rect = area.getBoundingClientRect()
    const nx = Math.max(8, Math.min(92, ((e.clientX - rect.left) / rect.width)  * 100 - drag.current.offsetX))
    const ny = Math.max(8, Math.min(92, ((e.clientY - rect.top)  / rect.height) * 100 - drag.current.offsetY))
    const id = drag.current.id
    setItems(prev => prev.map(i => i.id === id ? { ...i, x: nx, y: ny } : i))
    const other = itemsRef.current.find(i => i.id !== id)
    if (other) {
      const dist = Math.hypot(nx - other.x, ny - other.y)
      setNearId(dist < MERGE_DIST_PCT ? other.id : null)
    }
    e.preventDefault()
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || mergingRef.current) return
    if (drag.current.pointerId !== e.pointerId) return
    drag.current = null
    setNearId(null)
    const [itemA, itemB] = itemsRef.current
    if (!itemA || !itemB) return
    const dist = Math.hypot(itemA.x - itemB.x, itemA.y - itemB.y)
    if (dist > MERGE_DIST_PCT) return

    const resultEl = getResult(itemA.el, itemB.el)
    mergingRef.current = true
    setMerging(true)

    if (resultEl) {
      onTutorialDiscover([resultEl.number])
      const cx = (itemA.x + itemB.x) / 2
      const cy = (itemA.y + itemB.y) / 2
      setItems([{ id: 'r', num: resultEl.number, el: resultEl, x: cx, y: cy }])
      setLastResult(resultEl)

      // Go directly to reveal — no flash
      setPhase('reveal')
      setTimeout(() => {
        const next = comboRef.current + 1
        if (next >= TUTORIAL_COMBOS.length) {
          // All done
          setPhase('done')
          setTimeout(() => onAllDone(), 1800)
        } else {
          // "Maintenant créons Y"
          setPhase('next')
          setTimeout(() => {
            setComboIndex(next)
            setPhase('idle')
          }, 3200)
        }
      }, 2200)
    }
  }, [getResult, onTutorialDiscover, onAllDone])

  // Next combo names + element for the "next" phase
  const nextCombo = TUTORIAL_COMBOS[comboIndex + 1]
  const nextResultName = nextCombo
    ? (lang === 'fr' ? nextCombo.fr_result : nextCombo.en_result)
    : null
  const nextResultEl = nextResultName ? (getEl(nextResultName) ?? getEl(lang === 'fr' ? nextCombo!.fr_result : nextCombo!.en_result)) : null

  const isOverlay = phase === 'reveal' || phase === 'next' || phase === 'done'

  return (
    <div className="relative w-full h-full flex flex-col">

      {/* Combo progress dots */}
      <div className="flex items-center justify-center gap-3 mb-6 mt-2">
        {TUTORIAL_COMBOS.map((_, i) => {
          const done   = i < comboIndex || phase === 'done' || (i === comboIndex && (phase === 'reveal' || phase === 'next'))
          const active = i === comboIndex && !isOverlay
          return (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500 text-xs font-bold ${
                done   ? 'bg-emerald-500/25 border border-emerald-500/50 text-emerald-400' :
                active ? 'bg-primary/20 border border-primary/50 text-primary' :
                         'bg-muted/30 border border-border/40 text-muted-foreground/30'
              }`}>
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {i < TUTORIAL_COMBOS.length - 1 && (
                <div className={`w-8 h-0.5 rounded-full transition-all duration-500 ${done ? 'bg-emerald-500/40' : 'bg-border/30'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Instruction label */}
      <div className="flex items-center justify-center mb-4 min-h-[32px]">
        {!isOverlay && (
          <p key={`inst-${comboIndex}`} className="text-sm text-muted-foreground/70 onboard-fade-up">
            {t('Glisse un élément sur l\'autre', 'Drag one onto the other')}
          </p>
        )}
      </div>

      {/* Arena */}
      <div
        ref={areaRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative flex-1 rounded-3xl border border-border/30 overflow-hidden select-none"
        style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', minHeight: 220 }}
      >
        {/* Subtle dot grid — slight opacity since the modal-level grid already covers the background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, oklch(0.6 0.01 250 / 0.06) 1.5px, transparent 1.5px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Items */}
        {items.map(item => {
          const isDragging = drag.current?.id === item.id
          const isNear     = nearId === item.id
          return (
            <div
              key={item.id}
              className="absolute pointer-events-none select-none"
              style={{
                left: `${item.x}%`,
                top:  `${item.y}%`,
                transform: `translate(-50%, -50%) scale(${isDragging ? 1.1 : isNear ? 1.07 : 1})`,
                zIndex: isDragging ? 20 : 5,
                transition: isDragging ? 'none' : 'left 0.12s, top 0.12s, transform 0.12s',
              }}
            >
              <ElementBadge element={item.el} size="md" />
            </div>
          )
        })}

        {/* Cinematic overlays — sit inside arena but cover the whole screen via fixed */}
      </div>

      {/* ── Full-screen cinematic overlays ── */}

      {/* Reveal: "Super ! Tu viens de créer X" */}
      {(phase === 'reveal') && lastResult && (
        <div className="fixed inset-0 z-[10001] flex flex-col items-center justify-center bg-background pointer-events-none px-8">
          <div className="flex flex-col items-center gap-6 onboard-fade-up">
            <div className="onboard-pop" style={{ animationDelay: '0.1s' }}>
              {lastResult.imageUrl
                ? <img src={lastResult.imageUrl} alt={lastResult.name} className="w-24 h-24 object-contain" draggable={false} />
                : <div className="w-24 h-24 rounded-3xl bg-muted flex items-center justify-center"><ElementBadge element={lastResult} size="lg" /></div>
              }
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-lg font-semibold text-emerald-400">
                {t('Super !', 'Amazing!')}
              </p>
              <h2 className="text-4xl font-bold text-foreground text-balance leading-tight">
                {t('Tu viens de créer', 'You just created')}
              </h2>
              <h2 className="text-4xl font-bold text-balance leading-tight" style={{ color: lastResult.color ?? 'oklch(0.72 0.17 145)' }}>
                {lastResult.name}
              </h2>
            </div>
          </div>
        </div>
      )}

      {/* Next combo: "Maintenant, créons X" */}
      {phase === 'next' && nextResultName && (
        <div className="fixed inset-0 z-[10001] flex flex-col items-center justify-center bg-background pointer-events-none px-8">
          <div className="flex flex-col items-center gap-6 text-center onboard-slide-in">
            <p className="text-base text-muted-foreground/60 font-medium tracking-wide uppercase text-xs">
              {t('Prochain objectif', 'Next up')}
            </p>
            {/* Element icon */}
            {nextResultEl?.imageUrl ? (
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center onboard-pop" style={{ background: `${nextResultEl.color ?? 'oklch(0.72 0.22 200)'}18`, animationDelay: '0.1s' }}>
                <img src={nextResultEl.imageUrl} alt={nextResultName} className="w-16 h-16 object-contain" draggable={false} />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-3xl bg-muted/30 flex items-center justify-center onboard-pop" style={{ animationDelay: '0.1s' }}>
                <ElementBadge element={nextResultEl ?? { name: nextResultName, number: 0, color: 'oklch(0.72 0.22 200)' } as ElementDef} size="lg" />
              </div>
            )}
            <div className="flex flex-col items-center gap-1">
              <h2 className="text-4xl font-bold text-foreground text-balance leading-tight">
                {t('Créons', "Let's create")}
              </h2>
              <h2 className="text-4xl font-bold text-balance leading-tight capitalize" style={{ color: nextResultEl?.color ?? 'oklch(0.72 0.22 200)' }}>
                {nextResultName}
              </h2>
            </div>
          </div>
        </div>
      )}

      {/* All done */}
      {phase === 'done' && (
        <div className="fixed inset-0 z-[10001] flex flex-col items-center justify-center bg-background pointer-events-none px-8">
          <div className="flex flex-col items-center gap-5 text-center onboard-fade-up">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center onboard-pop">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-4xl font-bold text-foreground text-balance">
              {t('Tu es prêt !', "You're ready!")}
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              {t('Il y a plus de 700 éléments �� découvrir.', 'There are over 700 elements to discover.')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main OnboardingModal ─────────────────────────────────────────────────────

export function OnboardingModal({ elementsByName, elements, recipeMap, onComplete, onTutorialDiscover, onLangChange }: Props) {
  const [step, setStep]               = useState<Step>('lang')
  const [lang, setLang]               = useState<'fr' | 'en'>('fr')
  const [selectedTheme, setTheme]     = useState<'dark' | 'light' | null>(null)
  const [username, setUsername]       = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [avatar, setAvatar]           = useState<string | null>(null)
  const [enablePush, setEnablePush]   = useState(false)
  const { setTheme: applyTheme }      = useTheme()
  const [tutorialDone, setTutorialDone] = useState(false)
  const [langSelected, setLangSelected] = useState(false)
  // Animate step transitions
  const [stepAnim, setStepAnim] = useState<'in' | 'out'>('in')

  const stepIndex = STEPS.indexOf(step)
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  const goToStep = (s: Step) => {
    setStepAnim('out')
    setTimeout(() => {
      setStep(s)
      if (s === 'combine') setTutorialDone(false)
      setStepAnim('in')
    }, 220)
  }

  const BANWORDS = ['fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'pussy', 'nigger', 'nigga', 'fag', 'faggot', 'retard', 'bastard', 'whore', 'slut', 'puta', 'merde', 'connard', 'connasse', 'salope', 'putain', 'fdp', 'enculé', 'encule', 'Nazi', 'hitler', 'pédophile', 'pedophile', 'rape']

  const validateUsername = (val: string) => {
    const trimmed = val.trim()
    if (trimmed.length > 20) return t('Max 20 caractères', 'Max 20 characters')
    if (trimmed.length > 0 && !/^[a-zA-Z0-9_\- ]+$/.test(trimmed))
      return t('Lettres, chiffres, _ et - uniquement', 'Letters, numbers, _ and - only')
    if (trimmed.length > 0 && BANWORDS.some(w => trimmed.toLowerCase().includes(w.toLowerCase())))
      return t('Ce pseudo n\'est pas autorisé', 'This username is not allowed')
    return ''
  }

  const handleNext = async () => {
    if (step === 'username') {
      const err = validateUsername(username)
      if (err) { setUsernameError(err); return }
      const trimmed = username.trim()
      if (trimmed) {
        setUsernameChecking(true)
        try {
          const res = await fetch('/api/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: trimmed }),
          })
          if (res.status === 409) {
            setUsernameError(t('Ce pseudo est déjà pris', 'This username is already taken'))
            setUsernameChecking(false)
            return
          }
        } catch {}
        setUsernameChecking(false)
      }
    }
    const nextIndex = stepIndex + 1
    if (nextIndex < STEPS.length) goToStep(STEPS[nextIndex])
    else onComplete({ lang, theme: selectedTheme ?? 'dark', haptic: false, username: username.trim(), avatar: avatar ?? 'feu', enablePush })
  }

  const handleBack = () => {
    if (stepIndex > 0) goToStep(STEPS[stepIndex - 1])
  }

  // Auto-advance for lang and theme on selection
  const handleLangSelect = (l: 'fr' | 'en') => {
    setLang(l)
    setLangSelected(true)
    onLangChange?.(l)
    setTimeout(() => goToStep('theme'), 350)
  }

  const handleThemeSelect = (th: 'dark' | 'light') => {
    setTheme(th as 'dark' | 'light')
    applyTheme(th)
    setTimeout(() => goToStep('tap'), 350)
  }

  const handlePushSelect = (choice: boolean) => {
    setEnablePush(choice)
    setTimeout(() => {
      onComplete({ lang, theme: selectedTheme ?? 'dark', haptic: false, username: username.trim(), avatar: avatar ?? 'feu', enablePush: choice })
    }, 350)
  }

  const isCombineStep = step === 'combine' || step === 'tap'
  const animClass = stepAnim === 'in' ? 'onboard-fade-up' : 'onboard-fade-down'

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-background">

      {/* Dot grid — fullscreen, visible only during tap/combine steps */}
      {isCombineStep && (
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: 'radial-gradient(circle, oklch(0.6 0.01 250 / 0.13) 1.5px, transparent 1.5px)',
            backgroundSize: '32px 32px',
          }}
        />
      )}

      {/* ── Top bar ── */}
      <div className="flex items-center gap-1.5 px-4 pb-3 sm:px-8 flex-shrink-0" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        {stepIndex > 0 && !isCombineStep ? (
          <button
            onClick={handleBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-9 flex-shrink-0" />
        )}
        <div className="flex flex-1 items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 rounded-full flex-1 transition-all duration-500 ${
                i < stepIndex  ? 'bg-primary/50' :
                i === stepIndex ? 'bg-primary' :
                'bg-muted/40'
              }`}
            />
          ))}
        </div>
        <span className="ml-1.5 w-9 text-right text-xs text-muted-foreground/50 font-medium flex-shrink-0 tabular-nums">
          {stepIndex + 1}/{STEPS.length}
        </span>
      </div>

      {/* ── Main content ── */}
      <div className={`flex-1 flex flex-col min-h-0 px-6 sm:px-8 ${isCombineStep ? 'pb-4' : 'py-8 overflow-y-auto'}`}>
        <div className={`w-full max-w-lg mx-auto flex flex-col h-full ${animClass}`} key={step}>

          {/* ── LANG ── */}
          {step === 'lang' && (
            <div className="flex flex-col gap-10 justify-center flex-1">
              <div className="flex flex-col items-center gap-3 text-center">
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground text-balance leading-tight">
                  {lang === 'fr' ? 'Choisis ta langue' : 'Choose your language'}
                </h1>
                <p className="text-base text-muted-foreground/70">
                  {lang === 'fr' ? 'Tu pourras la modifier dans les paramètres.' : 'You can change this in settings anytime.'}
                </p>
              </div>
              <div className="flex gap-4">
                {(['fr', 'en'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => handleLangSelect(l)}
                    className={`flex-1 py-8 rounded-3xl border-2 transition-all font-semibold text-lg flex flex-col items-center gap-4 active:scale-[0.97] ${
                      langSelected && lang === l
                        ? 'border-primary bg-primary/8 text-primary'
                        : 'border-border/50 bg-muted/20 text-muted-foreground hover:border-border'
                    }`}
                  >
                    <span className="text-5xl">{l === 'fr' ? '🇫🇷' : '🇺🇸'}</span>
                    <span className="text-base">{l === 'fr' ? 'Français' : 'English'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── THEME ── */}
          {step === 'theme' && (
            <div className="flex flex-col gap-10 justify-center flex-1">
              <div className="flex flex-col items-center gap-3 text-center">
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground text-balance leading-tight">
                  {t('Choisis ton thème', 'Choose your theme')}
                </h1>
                <p className="text-base text-muted-foreground/70">
                  {t('Tu pourras le modifier dans les paramètres.', 'You can change this in settings anytime.')}
                </p>
              </div>
              <div className="flex gap-4">
                {(['dark', 'light'] as const).map(th => (
                  <button
                    key={th}
                    onClick={() => handleThemeSelect(th)}
                    className={`flex-1 py-8 rounded-3xl border-2 transition-all font-semibold flex flex-col items-center gap-4 active:scale-[0.97] ${
                      selectedTheme !== null && selectedTheme === th
                        ? 'border-primary bg-primary/8 text-primary'
                        : 'border-border/50 bg-muted/20 text-muted-foreground hover:border-border'
                    }`}
                  >
                    {th === 'dark' ? <Moon className="w-10 h-10" /> : <Sun className="w-10 h-10" />}
                    <span className="text-base">{th === 'dark' ? t('Sombre', 'Dark') : t('Clair', 'Light')}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── TAP step: learn to add elements to playground ── */}
          {step === 'tap' && (
            <div className="flex flex-col flex-1 min-h-0 gap-4">
              <div className="flex flex-col items-center gap-1.5 text-center flex-shrink-0">
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance leading-tight">
                  {t('Le terrain de jeu', 'The playground')}
                </h1>
                <p className="text-sm text-muted-foreground/60 leading-relaxed">
                  {t('Appuie sur un élément pour le poser sur le terrain', 'Tap an element to place it on the field')}
                </p>
              </div>
              <TapArena
                lang={lang}
                elements={elements}
                onAllAdded={() => goToStep('combine')}
              />
            </div>
          )}

          {/* ── COMBINE (fullscreen cinematic arena) ── */}
          {step === 'combine' && (
            <div className="flex flex-col flex-1 min-h-0 gap-4">
              <div className="flex flex-col items-center gap-2 text-center flex-shrink-0">
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance leading-tight">
                  {t('Combine des éléments', 'Combine elements')}
                </h1>
                <p className="text-sm text-muted-foreground/60 leading-relaxed">
                  {t('Glisse un élément sur un autre pour les fusionner', 'Drag one element onto another to combine them')}
                </p>
              </div>
              <CombineArena
                lang={lang}
                elements={elements}
                recipeMap={recipeMap}
                onAllDone={() => {
                  setTutorialDone(true)
                  setTimeout(() => goToStep('hint'), 800)
                }}
                onTutorialDiscover={onTutorialDiscover}
              />
            </div>
          )}

          {/* ── HINT ── */}
          {step === 'hint' && (
            <div className="flex flex-col gap-10 justify-center flex-1">
              <div className="flex flex-col items-center gap-3 text-center">
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground text-balance leading-tight">
                  {t('Les indices', 'Hints')}
                </h1>
                <p className="text-base text-muted-foreground/70 leading-relaxed max-w-sm">
                  {t(
                    "Bloqué ? Demande un indice pour révéler une combinaison inconnue.",
                    "Stuck? Get a hint to reveal a combination you haven't found yet."
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { icon: <Ticket className="w-6 h-6 text-amber-400" />, bg: 'bg-amber-500/8', border: 'border-amber-500/20',
                    title: t('Regarder une pub', 'Watch an ad'),
                    desc:  t("Regarde une courte publicité pour obtenir un indice gratuit.", "Watch a short ad to get a free hint anytime.") },
                  { icon: <Scroll className="w-6 h-6 text-amber-400" />, bg: 'bg-amber-500/8', border: 'border-amber-500/20',
                    title: t('Accomplir des quêtes', 'Complete quests'),
                    desc:  t("Certaines quêtes récompensent avec des indices.", "Some quests reward you with hints.") },
                ].map(item => (
                  <div key={item.title} className={`flex items-start gap-4 p-5 rounded-2xl ${item.bg} border ${item.border}`}>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground leading-snug">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── QUESTS ── */}
          {step === 'quests' && (
            <div className="flex flex-col gap-10 justify-center flex-1">
              <div className="flex flex-col items-center gap-3 text-center">
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground text-balance leading-tight">
                  {t('Les quêtes', 'Quests')}
                </h1>
                <p className="text-base text-muted-foreground/70 leading-relaxed max-w-sm">
                  {t(
                    "Accomplis des quêtes pour gagner des récompenses et des indices.",
                    "Complete quests to earn rewards and hints."
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { emoji: '🌅', bg: 'bg-emerald-500/8', border: 'border-emerald-500/20',
                    title: t('Quêtes quotidiennes', 'Daily quests'),
                    desc: t('Nouvelles quêtes chaque jour. Progressez à chaque session.', 'New quests every day — make progress every session.') },
                  { emoji: '🏆', bg: 'bg-emerald-500/8', border: 'border-emerald-500/20',
                    title: t('Défis permanents', 'Permanent challenges'),
                    desc: t('Objectifs à long terme pour les explorateurs les plus curieux.', 'Long-term goals for the most curious explorers.') },
                ].map(item => (
                  <div key={item.title} className={`flex items-start gap-4 p-5 rounded-2xl ${item.bg} border ${item.border}`}>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0 text-2xl">
                      {item.emoji}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground leading-snug">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── USERNAME ── */}
          {step === 'username' && (
            <div className="flex flex-col gap-10 justify-center flex-1">
              <div className="flex flex-col items-center gap-3 text-center">
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground text-balance leading-tight">
                  {t('Ton pseudo', 'Your username')}
                </h1>
                <p className="text-base text-muted-foreground/70">
                  {t("Il apparaîtra dans le classement.", "It will appear on the leaderboard.")}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={username}
                  maxLength={20}
                  placeholder={t('Ton pseudo...', 'Your username...')}
                  onChange={e => { setUsername(e.target.value); setUsernameError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleNext()}
                  className="w-full h-14 px-5 rounded-2xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 text-base font-medium focus:outline-none focus:border-primary transition-colors"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {usernameError && <p className="text-sm text-red-400 px-1">{usernameError}</p>}
                <p className="text-xs text-muted-foreground/40 px-1">
                  {t('Lettres, chiffres, _ et -. Max 20 caractères. Optionnel.', 'Letters, numbers, _ and -. Max 20 characters. Optional.')}
                </p>
              </div>
            </div>
          )}

          {/* ── AVATAR ── */}
          {step === 'avatar' && (
            <div className="flex flex-col gap-10 justify-center flex-1">
              <div className="flex flex-col items-center gap-3 text-center">
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground text-balance leading-tight">
                  {t('Ton avatar', 'Your avatar')}
                </h1>
                <p className="text-base text-muted-foreground/70 leading-relaxed">
                  {t(
                    "Choisis un élément de base. Tu pourras le changer depuis ton profil.",
                    "Pick a base element. You can change it from your profile anytime."
                  )}
                </p>
              </div>
              {(() => {
                const TUTORIAL_KEYS = [
                  { key: 'pluie',      fr: 'Pluie',      en: 'Rain' },
                  { key: 'plante',     fr: 'Plante',      en: 'Plant' },
                  { key: 'champignon', fr: 'Champignon',  en: 'Mushroom' },
                ]
                const allOptions = [
                  ...STARTERS.map(key => {
                    const info = STARTER_LABELS[key]
                    const el = elementsByName.get(lang === 'fr' ? info.fr.toLowerCase() : info.en.toLowerCase())
                      ?? elementsByName.get(info.fr.toLowerCase())
                      ?? elementsByName.get(info.en.toLowerCase())
                    return { key, label: lang === 'fr' ? info.fr : info.en, el }
                  }),
                  ...TUTORIAL_KEYS.map(({ key, fr, en }) => {
                    const el = elementsByName.get(lang === 'fr' ? fr.toLowerCase() : en.toLowerCase())
                      ?? elementsByName.get(fr.toLowerCase())
                      ?? elementsByName.get(en.toLowerCase())
                    return { key, label: lang === 'fr' ? fr : en, el }
                  }).filter(o => o.el !== undefined),
                ]
                return (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {allOptions.map(({ key, label, el }) => {
                      const selected = avatar === key
                      const elColor = el?.color ?? '#818cf8'
                      return (
                        <button
                          key={key}
                          onClick={() => setAvatar(key)}
                          className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all relative overflow-hidden active:scale-[0.96]"
                          style={{
                            background: selected ? `${elColor}18` : 'rgba(255,255,255,0.03)',
                            border: selected ? `2px solid ${elColor}70` : '2px solid rgba(255,255,255,0.07)',
                          }}
                        >
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center p-2 transition-all"
                            style={{ background: selected ? `${elColor}25` : `${elColor}12` }}
                          >
                            {el?.imageUrl ? (
                              <img src={el.imageUrl} alt={label} className="w-full h-full object-contain" draggable={false} />
                            ) : (
                              <span className="text-2xl leading-none">{STARTER_LABELS[key]?.emoji ?? '?'}</span>
                            )}
                          </div>
                          <span className={`text-xs font-semibold transition-colors ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {step === 'notifications' && (
            <div className="flex flex-col gap-10 justify-center flex-1">
              <div className="flex flex-col items-center gap-3 text-center">
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground text-balance leading-tight">
                  {t('Notifications', 'Notifications')}
                </h1>
                <p className="text-base text-muted-foreground/70 leading-relaxed max-w-sm">
                  {t(
                    "Reçois une alerte quand de nouveaux éléments sont ajoutés.",
                    "Get notified when new elements are added."
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {/* Enable — primary, prominent */}
                <button
                  onClick={() => handlePushSelect(true)}
                  className="w-full py-5 rounded-3xl border-2 transition-all font-bold flex items-center justify-center gap-3 active:scale-[0.97] text-white"
                  style={{ background: '#6366f1', borderColor: '#6366f1', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}
                >
                  <span className="text-2xl">🔔</span>
                  <span className="text-base">{t('Activer les notifications', 'Enable notifications')}</span>
                </button>
                {/* Dismiss — subtle */}
                <button
                  onClick={() => handlePushSelect(false)}
                  className="w-full py-3.5 rounded-2xl border border-border/40 transition-all font-medium flex items-center justify-center gap-2 text-muted-foreground/60 hover:text-muted-foreground active:scale-[0.98] text-sm bg-transparent"
                >
                  {t('Non merci', 'No thanks')}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Bottom CTA — hidden for auto-advance steps and combine ── */}
      {step !== 'lang' && step !== 'theme' && step !== 'combine' && step !== 'notifications' && (
        <div className="px-6 pt-4 sm:px-8 flex-shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}>
          <div className="w-full max-w-lg mx-auto">
            <button
              onClick={handleNext}
              disabled={usernameChecking}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg disabled:opacity-60"
            >
              {usernameChecking
                ? t('Vérification…', 'Checking…')
                : step === 'hint'
                  ? t('C\'est compris !', 'Got it!')
                  : step === 'quests'
                    ? t('Allons-y !', 'Let\'s go!')
                      : step === 'username'
                        ? username.trim()
                          ? t('Continuer', 'Continue')
                          : t('J\'en veux un random', 'Give me a random one')
                      : step === 'avatar'
                        ? t('Parfait !', 'Perfect!')
                        : t('Continuer', 'Continue')
              }
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
