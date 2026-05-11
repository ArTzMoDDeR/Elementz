'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Globe, Sun, Moon, ChevronRight, Lightbulb, Scroll, ArrowLeft, User, Smile, Bell, Ticket, Check } from 'lucide-react'
import type { ElementDef } from '@/lib/game-data'
import { ElementBadge } from '@/components/element-badge'

type Props = {
  elementsByName: Map<string, ElementDef>
  /** Map<number, ElementDef> — for number-based recipe lookups */
  elements: Map<number, ElementDef>
  /** RecipeMap keyed by "n1|n2" */
  recipeMap: Map<string, number[]>
  onComplete: (prefs: { lang: 'fr' | 'en'; theme: 'dark' | 'light'; haptic: boolean; username: string; avatar: string; enablePush: boolean }) => void
  /** Called when the tutorial discovers new elements — saves to inventory */
  onTutorialDiscover: (nums: number[]) => void
}

const STARTERS = ['eau', 'feu', 'terre', 'air'] as const
const STARTER_LABELS: Record<string, { fr: string; en: string; emoji: string }> = {
  eau:   { fr: 'Eau',   en: 'Water', emoji: '💧' },
  feu:   { fr: 'Feu',   en: 'Fire',  emoji: '🔥' },
  terre: { fr: 'Terre', en: 'Earth', emoji: '🌍' },
  air:   { fr: 'Air',   en: 'Air',   emoji: '💨' },
}

const STEPS = ['lang', 'theme', 'combine', 'hint', 'quests', 'username', 'avatar', 'notifications'] as const
type Step = typeof STEPS[number]

// Per-step accent color
const STEP_COLOR: Record<Step, { from: string; icon: string; ring: string; bg: string }> = {
  lang:          { from: 'from-blue-500',   icon: 'text-blue-400',   ring: 'ring-blue-500/30',   bg: 'bg-blue-500/10' },
  theme:         { from: 'from-violet-500', icon: 'text-violet-400', ring: 'ring-violet-500/30', bg: 'bg-violet-500/10' },
  combine:       { from: 'from-cyan-500',   icon: 'text-cyan-400',   ring: 'ring-cyan-500/30',   bg: 'bg-cyan-500/10' },
  hint:          { from: 'from-amber-500',  icon: 'text-amber-400',  ring: 'ring-amber-500/30',  bg: 'bg-amber-500/10' },
  quests:        { from: 'from-emerald-500',icon: 'text-emerald-400',ring: 'ring-emerald-500/30',bg: 'bg-emerald-500/10' },
  username:      { from: 'from-pink-500',   icon: 'text-pink-400',   ring: 'ring-pink-500/30',   bg: 'bg-pink-500/10' },
  avatar:        { from: 'from-orange-500', icon: 'text-orange-400', ring: 'ring-orange-500/30', bg: 'bg-orange-500/10' },
  notifications: { from: 'from-indigo-500', icon: 'text-indigo-400', ring: 'ring-indigo-500/30', bg: 'bg-indigo-500/10' },
}

// ─── Mini tutorial playground for combine step ────────────────────────────────

// The 3 tutorial combos — both fr and en names so we can find them regardless of active lang
const TUTORIAL_COMBOS = [
  { fr_a: 'eau',    en_a: 'water', fr_b: 'air',    en_b: 'air',   fr_result: 'pluie',      en_result: 'rain' },
  { fr_a: 'pluie',  en_a: 'rain',  fr_b: 'terre',  en_b: 'earth', fr_result: 'plante',     en_result: 'plant' },
  { fr_a: 'plante', en_a: 'plant', fr_b: 'pluie',  en_b: 'rain',  fr_result: 'champignon', en_result: 'mushroom' },
] as const

type MiniItem = {
  id: string
  num: number
  el: ElementDef
  x: number  // percent of container width
  y: number  // percent of container height
}

// Drag state stored in a ref — id of dragged item + touch offset from its center
type MiniDrag = { id: string; offsetX: number; offsetY: number; pointerId: number }

const MERGE_DIST_PCT = 22 // % of container width

function MiniPlayground({
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
  const areaRef = useRef<HTMLDivElement>(null)
  // All drag state lives in a ref — never in React state — so pointer handlers
  // can read it synchronously without stale-closure issues on mobile.
  const drag = useRef<MiniDrag | null>(null)
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  // name → ElementDef lookup rebuilt when elements change
  const byName = useRef<Map<string, ElementDef>>(new Map())
  useEffect(() => {
    const m = new Map<string, ElementDef>()
    elements.forEach(el => m.set(el.name.toLowerCase(), el))
    byName.current = m
  }, [elements])

  const getEl = useCallback((name: string): ElementDef | null => {
    return byName.current.get(name.toLowerCase())
      ?? [...elements.values()].find(el => el.name.toLowerCase() === name.toLowerCase())
      ?? null
  }, [elements])

  const getResult = useCallback((aEl: ElementDef, bEl: ElementDef): ElementDef | null => {
    const r = recipeMap.get(`${aEl.number}|${bEl.number}`)
      ?? recipeMap.get(`${bEl.number}|${aEl.number}`)
    if (!r || r.length === 0) return null
    return elements.get(r[0]) ?? null
  }, [recipeMap, elements])

  const [comboIndex, setComboIndex] = useState(0)
  const [items, setItems]           = useState<MiniItem[]>([])
  const [merging, setMerging]       = useState(false)
  const [flash, setFlash]           = useState(false)
  const [justMerged, setJustMerged] = useState<ElementDef | null>(null)
  const [doneList, setDoneList]     = useState<ElementDef[]>([])
  const [allDone, setAllDone]       = useState(false)
  // id of the item that is the merge target while dragging (proximity glow)
  const [nearId, setNearId]         = useState<string | null>(null)

  // Refs for use inside stable pointer handlers
  const itemsRef    = useRef<MiniItem[]>([])
  const mergingRef  = useRef(false)
  const allDoneRef  = useRef(false)
  const comboRef    = useRef(0)
  useEffect(() => { itemsRef.current   = items },    [items])
  useEffect(() => { mergingRef.current = merging },  [merging])
  useEffect(() => { allDoneRef.current = allDone },  [allDone])
  useEffect(() => { comboRef.current   = comboIndex },[comboIndex])

  // Reset nearId when combo resets
  useEffect(() => { setNearId(null) }, [comboIndex])

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
    setFlash(false)
    setJustMerged(null)
  }, [comboIndex, buildItems])

  // ── All pointer handlers go on the ARENA element (not the badge divs).
  // This avoids the iOS bug where setPointerCapture on a child element throws
  // when the element is inside a non-capturing scroll container.
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (mergingRef.current || allDoneRef.current) return
    const area = areaRef.current
    if (!area) return

    // Find which item the pointer landed on by checking proximity to each item center
    const rect = area.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * 100
    const py = ((e.clientY - rect.top) / rect.height) * 100

    let closest: MiniItem | null = null
    let closestDist = Infinity
    for (const item of itemsRef.current) {
      const d = Math.hypot(item.x - px, item.y - py)
      if (d < closestDist) { closestDist = d; closest = item }
    }
    // Only start drag if within ~18% of the container size from an item center
    if (!closest || closestDist > 18) return

    // Capture pointer on the arena itself — safe on all browsers/iOS
    try { area.setPointerCapture(e.pointerId) } catch {}

    drag.current = {
      id: closest.id,
      pointerId: e.pointerId,
      offsetX: px - closest.x,
      offsetY: py - closest.y,
    }
    e.preventDefault()
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || mergingRef.current || allDoneRef.current) return
    if (drag.current.pointerId !== e.pointerId) return
    const area = areaRef.current
    if (!area) return
    const rect = area.getBoundingClientRect()
    const nx = Math.max(8, Math.min(92, ((e.clientX - rect.left) / rect.width)  * 100 - drag.current.offsetX))
    const ny = Math.max(8, Math.min(92, ((e.clientY - rect.top)  / rect.height) * 100 - drag.current.offsetY))
    const id = drag.current.id
    setItems(prev => prev.map(i => i.id === id ? { ...i, x: nx, y: ny } : i))

    // Proximity glow: find the other item and check distance
    const other = itemsRef.current.find(i => i.id !== id)
    if (other) {
      const dist = Math.hypot(nx - other.x, ny - other.y)
      setNearId(dist < MERGE_DIST_PCT ? other.id : null)
    }

    e.preventDefault()
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || mergingRef.current || allDoneRef.current) return
    if (drag.current.pointerId !== e.pointerId) return
    drag.current = null
    setNearId(null)

    const current = itemsRef.current
    const [itemA, itemB] = current
    if (!itemA || !itemB) return

    const dist = Math.hypot(itemA.x - itemB.x, itemA.y - itemB.y)
    if (dist > MERGE_DIST_PCT) return

    // Merge!
    const resultEl = getResult(itemA.el, itemB.el)
    mergingRef.current = true
    setMerging(true)
    setFlash(true)
    setTimeout(() => setFlash(false), 350)

    if (resultEl) {
      onTutorialDiscover([resultEl.number])
      const cx = (itemA.x + itemB.x) / 2
      const cy = (itemA.y + itemB.y) / 2
      setItems([{ id: 'r', num: resultEl.number, el: resultEl, x: cx, y: cy }])
      setJustMerged(resultEl)
      setDoneList(prev => [...prev, resultEl])

      setTimeout(() => {
        const next = comboRef.current + 1
        if (next >= TUTORIAL_COMBOS.length) {
          allDoneRef.current = true
          setAllDone(true)
          onAllDone()
        } else {
          setComboIndex(next)
        }
      }, 1800)
    }
  }, [getResult, onTutorialDiscover, onAllDone])

  return (
    <div className="flex flex-col gap-3">

      {/* Progress row */}
      <div className="flex items-center justify-center gap-2">
        {TUTORIAL_COMBOS.map((_, i) => {
          const done   = i < comboIndex || allDone || (i === comboIndex && justMerged !== null)
          const active = i === comboIndex && !allDone
          return (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all text-xs font-bold ${
                done   ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' :
                active ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400' :
                         'bg-muted/30 border border-border text-muted-foreground/40'
              }`}>
                {done ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              {i < TUTORIAL_COMBOS.length - 1 && (
                <div className={`w-5 h-0.5 rounded-full transition-all ${done ? 'bg-emerald-500/40' : 'bg-border'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Instruction */}
      <div className="flex items-center justify-center min-h-[28px]">
        {allDone ? (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-xs font-semibold text-emerald-400">
              {t('Parfait ! Tu maîtrises les combinaisons.', "Perfect! You've mastered combining.")}
            </span>
          </div>
        ) : justMerged ? (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-xs font-semibold text-emerald-400">
              {justMerged.name} {t('découvert !', 'discovered!')}
            </span>
          </div>
        ) : (
          <div className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <span className="text-xs font-semibold text-cyan-400 animate-pulse">
              {t("Glisse un élément sur l'autre", 'Drag one element onto the other')}
            </span>
          </div>
        )}
      </div>

      {/* Arena — all pointer events handled HERE, not on child elements */}
      <div
        ref={areaRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-full rounded-2xl border overflow-hidden select-none transition-colors ${
          flash      ? 'border-cyan-400/60' :
          allDone    ? 'border-emerald-500/40 bg-emerald-500/5' :
          justMerged ? 'border-emerald-500/30' :
                       'border-border'
        }`}
        style={{ height: 260, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, oklch(0.6 0.01 250 / 0.18) 1.5px, transparent 1.5px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Merge flash */}
        {flash && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'oklch(0.72 0.17 145 / 0.12)', animation: 'mergeFlash 0.35s ease-out forwards' }}
          />
        )}

        {/* Items — pointer events disabled so all events bubble up to arena */}
        {items.map(item => {
          const isDragging = drag.current?.id === item.id
          const isNear     = nearId === item.id
          const scale      = isDragging ? 1.08 : isNear ? 1.06 : 1
          return (
            <div
              key={item.id}
              className="absolute pointer-events-none select-none"
              style={{
                left: `${item.x}%`,
                top:  `${item.y}%`,
                transform: `translate(-50%, -50%) scale(${scale})`,
                zIndex: isDragging ? 20 : 5,
                transition: isDragging ? 'none' : 'left 0.12s, top 0.12s, transform 0.1s',
                filter: isNear ? `drop-shadow(0 0 8px ${item.el.color ?? 'oklch(0.72 0.17 145)'}aa)` : undefined,
              }}
            >
              <ElementBadge element={item.el} size="md" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main OnboardingModal ─────────────────────────────────────────────────────

export function OnboardingModal({ elementsByName, elements, recipeMap, onComplete, onTutorialDiscover }: Props) {
  const [step, setStep]               = useState<Step>('lang')
  const [lang, setLang]               = useState<'fr' | 'en'>('en')
  const [selectedTheme, setTheme]     = useState<'dark' | 'light'>('dark')
  const [username, setUsername]       = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [avatar, setAvatar]           = useState<string>('feu')
  const [enablePush, setEnablePush]   = useState(false)
  const { setTheme: applyTheme }      = useTheme()

  // Combine step: track GIF plays and whether user combined
  const [gifPlayCount, setGifPlayCount] = useState(0)
  const [tutorialPhase, setTutorialPhase] = useState<'gif' | 'playground'>('gif')
  const [tutorialDone, setTutorialDone] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const stepIndex = STEPS.indexOf(step)
  const color     = STEP_COLOR[step]
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  // Reset combine state when re-entering the step
  const handleSetStep = (s: Step) => {
    if (s === 'combine') {
      setGifPlayCount(0)
      setTutorialPhase('gif')
      setTutorialDone(false)
    }
    setStep(s)
  }

  const handleVideoEnded = () => {
    const next = gifPlayCount + 1
    setGifPlayCount(next)
    if (next >= 2) {
      setTutorialPhase('playground')
    } else {
      videoRef.current?.play()
    }
  }

  const validateUsername = (val: string) => {
    const trimmed = val.trim()
    if (trimmed.length > 20) return t('Max 20 caractères', 'Max 20 characters')
    if (trimmed.length > 0 && !/^[a-zA-Z0-9_\- ]+$/.test(trimmed))
      return t('Lettres, chiffres, _ et - uniquement', 'Letters, numbers, _ and - only')
    return ''
  }

  const handleNext = () => {
    if (step === 'theme') applyTheme(selectedTheme)
    if (step === 'username') {
      const err = validateUsername(username)
      if (err) { setUsernameError(err); return }
    }
    const nextIndex = stepIndex + 1
    if (nextIndex < STEPS.length) handleSetStep(STEPS[nextIndex])
    else onComplete({ lang, theme: selectedTheme, haptic: false, username: username.trim(), avatar, enablePush })
  }

  const handleBack = () => {
    if (stepIndex > 0) handleSetStep(STEPS[stepIndex - 1])
  }

  // Next button is disabled on combine step until user completes the tutorial (played 2x GIF + combined)
  const nextDisabled = step === 'combine' && !tutorialDone

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-background">

      {/* ── Top bar: progress ── */}
      <div className="flex items-center gap-1.5 px-4 pb-3 sm:px-8" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        {/* Back */}
        {stepIndex > 0 ? (
          <button
            onClick={handleBack}
            className="mr-2 w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : (
          <div className="mr-2 w-9 flex-shrink-0" />
        )}
        {/* Steps bar */}
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
        {/* Step counter */}
        <span className="ml-2 text-xs text-muted-foreground/50 font-medium flex-shrink-0 tabular-nums">
          {stepIndex + 1}/{STEPS.length}
        </span>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 sm:px-0 overflow-y-auto">
        <div className="w-full max-w-lg mx-auto flex flex-col gap-10">

          {/* STEP: Language */}
          {step === 'lang' && (
            <>
              <div className="flex flex-col items-center gap-5 text-center">
                <div className={`w-20 h-20 rounded-3xl ${color.bg} ring-1 ${color.ring} flex items-center justify-center`}>
                  <Globe className={`w-10 h-10 ${color.icon}`} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
                    {lang === 'fr' ? 'Choisis ta langue' : 'Choose your language'}
                  </h1>
                  <p className="text-base text-muted-foreground">
                    {lang === 'fr' ? 'Tu pourras la modifier dans les paramètres.' : 'You can change this in settings anytime.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                {(['fr', 'en'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`flex-1 py-6 rounded-2xl border-2 transition-all font-semibold text-lg flex flex-col items-center gap-3 ${
                      lang === l
                        ? 'border-primary bg-primary/8 text-primary'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    {/* US flag for English, FR flag for French */}
                    <span className="text-4xl">{l === 'fr' ? '🇫🇷' : '🇺🇸'}</span>
                    <span>{l === 'fr' ? 'Français' : 'English'}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP: Theme */}
          {step === 'theme' && (
            <>
              <div className="flex flex-col items-center gap-5 text-center">
                <div className={`w-20 h-20 rounded-3xl ${color.bg} ring-1 ${color.ring} flex items-center justify-center`}>
                  {selectedTheme === 'dark'
                    ? <Moon className={`w-10 h-10 ${color.icon}`} />
                    : <Sun className={`w-10 h-10 ${color.icon}`} />}
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
                    {t('Choisis ton thème', 'Choose your theme')}
                  </h1>
                  <p className="text-base text-muted-foreground">
                    {t('Tu pourras le modifier dans les paramètres.', 'You can change this in settings anytime.')}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                {(['dark', 'light'] as const).map(th => (
                  <button
                    key={th}
                    onClick={() => { setTheme(th); applyTheme(th) }}
                    className={`flex-1 py-6 rounded-2xl border-2 transition-all font-semibold text-lg flex flex-col items-center gap-3 ${
                      selectedTheme === th
                        ? 'border-primary bg-primary/8 text-primary'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    {th === 'dark' ? <Moon className="w-8 h-8" /> : <Sun className="w-8 h-8" />}
                    <span>{th === 'dark' ? t('Sombre', 'Dark') : t('Clair', 'Light')}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP: Combine */}
          {step === 'combine' && (
            <>
              <div className="flex flex-col items-center gap-5 text-center">
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
                    {t('Combine des éléments', 'Combine elements')}
                  </h1>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {t(
                      'Glisse un élément sur un autre pour les combiner et découvrir de nouveaux éléments.',
                      'Drag one element onto another to combine them and discover new ones.'
                    )}
                    <br />
                    {t('Il y en a plus de 700 à découvrir !', 'There are over 700 to find!')}
                  </p>
                </div>
              </div>

              {/* Phase 1: GIF tutorial (plays 2x) */}
              {tutorialPhase === 'gif' && (
                <div className="flex flex-col gap-3">
                  <div className="rounded-2xl overflow-hidden border border-border bg-muted/20 shadow-xl">
                    <video
                      ref={videoRef}
                      src="/tutohelp.webm"
                      autoPlay
                      muted
                      playsInline
                      onEnded={handleVideoEnded}
                      className="w-full h-auto block"
                    />
                  </div>
                  <div className="flex justify-center gap-1.5">
                    {[0, 1].map(i => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${
                          gifPlayCount > i ? 'w-6 bg-primary/60' : i === gifPlayCount ? 'w-6 bg-primary' : 'w-3 bg-muted/40'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-center text-xs text-muted-foreground/60">
                    {t(
                      gifPlayCount === 0 ? 'Regarde comment combiner des éléments…' : 'Encore une fois…',
                      gifPlayCount === 0 ? 'Watch how to combine elements…' : 'One more time…'
                    )}
                  </p>
                </div>
              )}

              {/* Phase 2: Interactive mini-playground */}
              {tutorialPhase === 'playground' && (
                <MiniPlayground
                  lang={lang}
                  elements={elements}
                  recipeMap={recipeMap}
                  onAllDone={() => setTutorialDone(true)}
                  onTutorialDiscover={onTutorialDiscover}
                />
              )}
            </>
          )}

          {/* STEP: Hint */}
          {step === 'hint' && (
            <>
              <div className="flex flex-col items-center gap-5 text-center">
                <div className={`w-20 h-20 rounded-3xl ${color.bg} ring-1 ${color.ring} flex items-center justify-center`}>
                  <Lightbulb className={`w-10 h-10 ${color.icon}`} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
                    {t('Indices', 'Hints')}
                  </h1>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {t(
                      "Bloqué ? Tu peux demander un indice pour révéler une combinaison que tu n'as pas encore découverte.",
                      "Stuck? You can request a hint to reveal a combination you haven't found yet."
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-amber-500/8 border border-amber-500/20">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{t('Regarder une pub', 'Watch an ad')}</p>
                    <p className="text-sm text-muted-foreground leading-snug">
                      {t(
                        "Regarde une courte publicité pour obtenir un indice gratuit à tout moment.",
                        "Watch a short ad to get a free hint anytime you need one."
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-amber-500/8 border border-amber-500/20">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <Scroll className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{t('Accomplir des quêtes', 'Complete quests')}</p>
                    <p className="text-sm text-muted-foreground leading-snug">
                      {t(
                        "Certaines quêtes récompensent avec des indices. Consulte l'onglet Quêtes régulièrement.",
                        "Some quests reward you with hints. Check the Quests tab regularly."
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* STEP: Quests */}
          {step === 'quests' && (
            <>
              <div className="flex flex-col items-center gap-5 text-center">
                <div className={`w-20 h-20 rounded-3xl ${color.bg} ring-1 ${color.ring} flex items-center justify-center`}>
                  <Scroll className={`w-10 h-10 ${color.icon}`} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
                    {t('Quêtes', 'Quests')}
                  </h1>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {t(
                      "Accomplis des quêtes pour gagner des récompenses. Certaines sont quotidiennes, d'autres permanentes.",
                      "Complete quests to earn rewards. Some are daily, others are permanent challenges."
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  {
                    icon: '🌅',
                    title: t('Quêtes quotidiennes', 'Daily quests'),
                    desc: t('Nouvelles quêtes chaque jour. Un moyen simple de progresser chaque session.', 'New quests every day — a great way to make progress each session.'),
                  },
                  {
                    icon: '🏆',
                    title: t('Défis permanents', 'Permanent challenges'),
                    desc: t('Des objectifs à long terme qui récompensent les explorateurs les plus curieux.', 'Long-term goals that reward the most curious explorers.'),
                  },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-4 p-5 rounded-2xl bg-emerald-500/8 border border-emerald-500/20">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0 text-2xl">
                      {item.icon}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground leading-snug">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* STEP: Username */}
          {step === 'username' && (
            <>
              <div className="flex flex-col items-center gap-5 text-center">
                <div className={`w-20 h-20 rounded-3xl ${color.bg} ring-1 ${color.ring} flex items-center justify-center`}>
                  <User className={`w-10 h-10 ${color.icon}`} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
                    {t('Choisis ton pseudo', 'Choose your username')}
                  </h1>
                  <p className="text-base text-muted-foreground">
                    {t("Il apparaîtra dans le classement. Tu pourras le modifier plus tard.", "It will appear in the leaderboard. You can change it later.")}
                  </p>
                </div>
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
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {usernameError && (
                  <p className="text-sm text-red-400 px-1">{usernameError}</p>
                )}
                <p className="text-xs text-muted-foreground/50 px-1">
                  {t('Lettres, chiffres, _ et - uniquement. Max 20 caractères. Optionnel.', 'Letters, numbers, _ and - only. Max 20 characters. Optional.')}
                </p>
              </div>
            </>
          )}

          {/* STEP: Avatar */}
          {step === 'avatar' && (
            <>
              <div className="flex flex-col items-center gap-5 text-center">
                <div className={`w-20 h-20 rounded-3xl ${color.bg} ring-1 ${color.ring} flex items-center justify-center`}>
                  <Smile className={`w-10 h-10 ${color.icon}`} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
                    {t('Choisis ton avatar', 'Choose your avatar')}
                  </h1>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {t(
                      "Commence avec un élément de base. Tu pourras le changer par n'importe quel élément débloqué depuis ton profil.",
                      "Start with a base element. You can change it to any unlocked element from your profile."
                    )}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {STARTERS.map(key => {
                  const info = STARTER_LABELS[key]
                  const el = elementsByName.get(lang === 'fr' ? info.fr.toLowerCase() : info.en.toLowerCase())
                    ?? elementsByName.get(info.fr.toLowerCase())
                    ?? elementsByName.get(info.en.toLowerCase())
                  const selected = avatar === key
                  const elColor = el?.color ?? '#818cf8'
                  return (
                    <button
                      key={key}
                      onClick={() => setAvatar(key)}
                      className="flex flex-col items-center gap-4 py-7 rounded-3xl transition-all relative overflow-hidden"
                      style={{
                        background: selected
                          ? `linear-gradient(145deg, ${elColor}22, ${elColor}0a)`
                          : 'rgba(255,255,255,0.03)',
                        border: selected
                          ? `2px solid ${elColor}80`
                          : '2px solid rgba(255,255,255,0.07)',
                        boxShadow: selected
                          ? `0 0 28px ${elColor}30, inset 0 1px 0 ${elColor}25`
                          : 'none',
                      }}
                    >
                      {/* Glow blob behind icon when selected */}
                      {selected && (
                        <div
                          className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full blur-2xl opacity-30 pointer-events-none"
                          style={{ background: elColor }}
                        />
                      )}
                      <div
                        className="relative w-16 h-16 rounded-2xl flex items-center justify-center p-2.5 transition-all"
                        style={{
                          background: selected ? `${elColor}25` : `${elColor}12`,
                          boxShadow: selected ? `0 0 0 3px ${elColor}35` : 'none',
                        }}
                      >
                        {el?.imageUrl ? (
                          <img
                            src={el.imageUrl}
                            alt={el.name}
                            className="w-full h-full object-contain pointer-events-none"
                            draggable={false}
                          />
                        ) : (
                          <span className="text-4xl leading-none">{info.emoji}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-sm font-bold transition-colors ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {lang === 'fr' ? info.fr : info.en}
                        </span>
                        {selected && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: `${elColor}25`, color: elColor }}
                          >
                            {lang === 'fr' ? 'Sélectionné' : 'Selected'}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* STEP: Notifications */}
          {step === 'notifications' && (
            <>
              <div className="flex flex-col items-center gap-5 text-center">
                <div className={`w-20 h-20 rounded-3xl ${color.bg} ring-1 ${color.ring} flex items-center justify-center`}>
                  <Bell className={`w-10 h-10 ${color.icon}`} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
                    {t('Notifications', 'Notifications')}
                  </h1>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {t(
                      "Reçois une alerte quand de nouveaux éléments sont ajoutés. Tu peux désactiver à tout moment dans les paramètres.",
                      "Get notified when new elements are added. You can disable this anytime in settings."
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                {([true, false] as const).map(choice => (
                  <button
                    key={String(choice)}
                    onClick={() => setEnablePush(choice)}
                    className={`flex-1 py-6 rounded-2xl border-2 transition-all font-semibold flex flex-col items-center gap-3 ${
                      enablePush === choice
                        ? 'border-indigo-500 bg-indigo-500/8 text-indigo-400'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    <span className="text-4xl">{choice ? '🔔' : '🔕'}</span>
                    <span className="text-base">{choice ? t('Activer', 'Enable') : t('Non merci', 'No thanks')}</span>
                  </button>
                ))}
              </div>
            </>
          )}

        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="px-6 pt-4 sm:px-8" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}>
        <div className="w-full max-w-lg mx-auto">
          <button
            onClick={handleNext}
            disabled={nextDisabled}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg disabled:opacity-40 disabled:pointer-events-none"
          >
            {step === 'notifications'
              ? t('Commencer à jouer !', "Let's play!")
              : step === 'combine' && tutorialPhase === 'gif'
                ? <>{t('Regarde d\'abord…', 'Watch first…')}</>
                : <>{t('Continuer', 'Continue')} <ChevronRight className="w-5 h-5" /></>
            }
          </button>
        </div>
      </div>

    </div>
  )
}
