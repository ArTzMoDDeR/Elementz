'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
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

const STEPS = ['lang', 'theme', 'combine', 'hints-quests', 'username', 'notifications'] as const
type Step = typeof STEPS[number]
// Steps that count toward the progress bar (lang is excluded)
const PROGRESS_STEPS = STEPS.filter(s => s !== 'lang')

const TUTORIAL_COMBOS = [
  { fr_a: 'eau',   en_a: 'water', fr_b: 'air',   en_b: 'air',   fr_result: 'pluie',  en_result: 'rain'  },
  { fr_a: 'pluie', en_a: 'rain',  fr_b: 'terre', en_b: 'earth', fr_result: 'plante', en_result: 'plant' },
] as const

type MiniItem = { id: string; num: number; el: ElementDef; x: number; y: number }
type MiniDrag = { id: string; offsetX: number; offsetY: number; pointerId: number }
const MERGE_DIST_PCT = 22

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
  // Track which inventory items have been placed onto the playground
  const [placed, setPlaced]         = useState<Set<'a' | 'b'>>(new Set())

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

  const buildItems = useCallback((idx: number, which: Set<'a' | 'b'>): MiniItem[] => {
    const combo = TUTORIAL_COMBOS[idx]
    const aEl = getEl(combo.fr_a) ?? getEl(combo.en_a)
    const bEl = getEl(combo.fr_b) ?? getEl(combo.en_b)
    if (!aEl || !bEl) return []
    const result: MiniItem[] = []
    if (which.has('a')) result.push({ id: 'a', num: aEl.number, el: aEl, x: 30, y: 50 })
    if (which.has('b')) result.push({ id: 'b', num: bEl.number, el: bEl, x: 70, y: 50 })
    return result
  }, [getEl])

  useEffect(() => {
    setItems([])
    setPlaced(new Set())
    setMerging(false)
    setNearId(null)
    setAnimKey(k => k + 1)
  }, [comboIndex])

  const handleInventoryTap = useCallback((slot: 'a' | 'b') => {
    if (merging) return
    setPlaced(prev => {
      if (prev.has(slot)) return prev
      const next = new Set(prev).add(slot)
      setItems(buildItems(comboRef.current, next))
      return next
    })
  }, [merging, buildItems])

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

      // Show reveal; timing/skip is managed by the overlay's skipRef + auto-timer
      setPhase('reveal')

      const advanceFromNext = (next: number) => {
        setComboIndex(next)
        setPhase('idle')
      }

      const goToNext = (next: number) => {
        setPhase('next')
        const nextTimer = setTimeout(() => advanceFromNext(next), 3600)
        // Register skip that cancels the auto-timer
        skipRef.current = () => { clearTimeout(nextTimer); advanceFromNext(next) }
      }

      // Auto-advance reveal after 3600ms unless user taps first
      const revealTimer = setTimeout(() => {
        const next = comboRef.current + 1
        if (next >= TUTORIAL_COMBOS.length) {
          setPhase('done')
          setTimeout(() => onAllDone(), 1800)
        } else {
          goToNext(next)
        }
      }, 3600)

      // Register skip for the "reveal" phase (cancels revealTimer)
      skipRef.current = () => {
        clearTimeout(revealTimer)
        const next = comboRef.current + 1
        if (next >= TUTORIAL_COMBOS.length) {
          setPhase('done')
          setTimeout(() => onAllDone(), 1800)
        } else {
          goToNext(next)
        }
      }
    }
  }, [getResult, onTutorialDiscover, onAllDone])

  // Next combo names + element for the "next" phase
  const nextCombo = TUTORIAL_COMBOS[comboIndex + 1]
  const nextResultName = nextCombo
    ? (lang === 'fr' ? nextCombo.fr_result : nextCombo.en_result)
    : null
  const nextResultEl = nextResultName ? (getEl(nextResultName) ?? getEl(lang === 'fr' ? nextCombo!.fr_result : nextCombo!.en_result)) : null

  const isOverlay = phase === 'reveal' || phase === 'next' || phase === 'done'

  // Tap anywhere during overlay to skip to next state
  const skipRef = useRef<(() => void) | null>(null)
  const handleOverlayTap = useCallback(() => {
    if (skipRef.current) { skipRef.current(); skipRef.current = null }
  }, [])

  // Current combo's inventory elements (for the pulse highlight)
  const currentCombo = TUTORIAL_COMBOS[comboIndex]
  const invElA = getEl(currentCombo.fr_a) ?? getEl(currentCombo.en_a)
  const invElB = getEl(currentCombo.fr_b) ?? getEl(currentCombo.en_b)

  return (
    <div className="relative w-full h-full flex flex-col">

      {/* Dynamic title + subtitle based on phase */}
      {!isOverlay && (
        <div className="flex flex-col items-center gap-1.5 text-center mb-4 flex-shrink-0">
          {comboIndex === 0 && placed.size < 2 ? (
            <>
              <h1 key="title-add" className="text-3xl sm:text-4xl font-bold text-foreground text-balance leading-tight onboard-fade-up">
                {t('Ajoute des éléments', 'Add elements')}
              </h1>
              <p className="text-sm text-muted-foreground/60 leading-relaxed">
                {t('Appuie sur les éléments de l\'inventaire', 'Tap elements in the inventory below')}
              </p>
            </>
          ) : comboIndex === 0 ? (
            <>
              <h1 key="title-combine" className="text-3xl sm:text-4xl font-bold text-foreground text-balance leading-tight onboard-fade-up">
                {t('Combine les deux éléments', 'Combine the two elements')}
              </h1>
              <p className="text-sm text-muted-foreground/60 leading-relaxed">
                {t('Glisse l\'un vers l\'autre pour les fusionner', 'Drag one onto the other to merge')}
              </p>
            </>
          ) : (
            <>
              <h1 key="title-yours" className="text-3xl sm:text-4xl font-bold text-foreground text-balance leading-tight onboard-fade-up">
                {t('À ton tour', 'Your turn')}
              </h1>
              <p className="text-sm text-muted-foreground/60 leading-relaxed">
                {placed.size < 2
                  ? t('Ajoute les éléments puis combine-les', 'Add the elements then combine them')
                  : t('Glisse l\'un vers l\'autre pour les fusionner', 'Drag one onto the other to merge')
                }
              </p>
            </>
          )}
        </div>
      )}

      {/* Arena */}
      <div
        ref={areaRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative flex-1 rounded-3xl border border-border/30 overflow-hidden select-none"
        style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', minHeight: 200 }}
      >
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
      </div>

      {/* ── Inventory bar — tappable to place items on playground ── */}
      <div className="flex-shrink-0 mt-3 rounded-2xl border border-border/30 px-4 py-2.5"
        style={{ background: 'color-mix(in oklch, var(--card) 60%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-2 text-center select-none">
          {t('Inventaire', 'Inventory')}
        </p>
        <div className="flex items-center justify-center gap-4">
          {([['a', invElA], ['b', invElB]] as const).map(([slot, el]) => {
            if (!el) return null
            const isPlaced  = placed.has(slot)
            const canPlace  = !isPlaced && !isOverlay && !merging
            const color     = el.color ?? 'oklch(0.7 0.2 200)'
            return (
              <button
                key={slot}
                onClick={() => canPlace && handleInventoryTap(slot)}
                disabled={!canPlace}
                className="relative flex flex-col items-center gap-1 transition-all active:scale-90 disabled:pointer-events-none"
                style={{ opacity: isPlaced ? 0.35 : 1 }}
              >
                <ElementBadge element={el} size="sm" />
                {/* Pulse ring while waiting to be placed */}
                {canPlace && (
                  <span
                    className="absolute inset-0 rounded-2xl animate-ping pointer-events-none"
                    style={{ border: `2px solid ${color}45`, animationDuration: '1.8s' }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Full-screen cinematic overlays ── */}

      {/* Reveal: "Tu viens de créer X" */}
      {phase === 'reveal' && lastResult && (
        <div
          className="fixed inset-0 z-[10001] flex flex-col bg-background px-8 cursor-pointer"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4rem)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 3rem)' }}
          onClick={handleOverlayTap}
        >
          <div className="flex flex-col items-center justify-center gap-8 onboard-fade-up w-full max-w-sm mx-auto flex-1">
            <div className="onboard-pop" style={{ animationDelay: '0.1s' }}>
              {lastResult.imageUrl
                ? <img src={lastResult.imageUrl} alt={lastResult.name} className="w-28 h-28 object-contain" draggable={false} />
                : <div className="w-28 h-28 rounded-3xl bg-muted flex items-center justify-center"><ElementBadge element={lastResult} size="lg" /></div>
              }
            </div>
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-muted-foreground/50 uppercase tracking-widest font-medium">
                {t('Tu viens de créer', 'You just created')}
              </p>
              <h2 className="text-5xl font-bold text-foreground text-balance leading-tight">
                {lastResult.name}
              </h2>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/35 text-center w-full">{t('Appuie pour continuer', 'Tap to continue')}</p>
        </div>
      )}

      {/* Next combo: "Créons X" */}
      {phase === 'next' && nextResultName && (
        <div
          className="fixed inset-0 z-[10001] flex flex-col bg-background px-8 cursor-pointer"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4rem)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 3rem)' }}
          onClick={handleOverlayTap}
        >
          <div className="flex flex-col items-center justify-center gap-8 text-center onboard-slide-in w-full max-w-sm mx-auto flex-1">
            <p className="text-sm text-muted-foreground/50 uppercase tracking-widest font-medium">
              {t('Maintenant, créons', "Now, let's create")}
            </p>
            {nextResultEl?.imageUrl ? (
              <div
                className="w-28 h-28 rounded-3xl flex items-center justify-center onboard-pop"
                style={{ background: `${nextResultEl.color ?? 'oklch(0.72 0.22 200)'}15`, border: `1.5px solid ${nextResultEl.color ?? 'oklch(0.72 0.22 200)'}30`, animationDelay: '0.1s' }}
              >
                <img src={nextResultEl.imageUrl} alt={nextResultName} className="w-18 h-18 object-contain" draggable={false} />
              </div>
            ) : (
              <div className="w-28 h-28 rounded-3xl bg-muted/30 flex items-center justify-center onboard-pop" style={{ animationDelay: '0.1s' }}>
                <ElementBadge element={nextResultEl ?? { name: nextResultName, number: 0, color: 'oklch(0.72 0.22 200)' } as ElementDef} size="lg" />
              </div>
            )}
            <h2 className="text-5xl font-bold text-foreground text-balance leading-tight capitalize">
              {nextResultName}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground/35 text-center w-full">{t('Appuie pour continuer', 'Tap to continue')}</p>
        </div>
      )}

      {/* All done */}
      {phase === 'done' && (
        <div className="fixed inset-0 z-[10001] flex flex-col items-center justify-center bg-background px-8 pointer-events-none">
          <div className="flex flex-col items-center gap-8 text-center onboard-fade-up w-full max-w-sm">
            <div className="w-20 h-20 rounded-full bg-foreground/8 border border-border flex items-center justify-center onboard-pop">
              <Check className="w-10 h-10 text-foreground" />
            </div>
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground/50 uppercase tracking-widest font-medium">
                {t('Voila !', 'Well done!')}
              </p>
              <h2 className="text-5xl font-bold text-foreground text-balance">
                {t('Tu es prêt.', "You're ready.")}
              </h2>
            </div>
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
  const [enablePush, setEnablePush]   = useState(false)
  const { setTheme: applyTheme }      = useTheme()
  const [tutorialDone, setTutorialDone] = useState(false)
  const [langSelected, setLangSelected] = useState(false)
  // Animate step transitions
  const [stepAnim, setStepAnim] = useState<'in' | 'out'>('in')

  const stepIndex = STEPS.indexOf(step)
  const progressIndex = PROGRESS_STEPS.indexOf(step as typeof PROGRESS_STEPS[number])
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  const goToStep = (s: Step) => {
    setStepAnim('out')
    setTimeout(() => {
      setStep(s)
      if (s === 'combine') setTutorialDone(false)
      setStepAnim('in')
    }, 200)
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
    else {
      const fallbackEl = elementsByName.get('feu') ?? elementsByName.get('fire') ?? [...elements.values()][0]
      onComplete({ lang, theme: selectedTheme ?? 'dark', haptic: false, username: username.trim(), avatar: fallbackEl?.name ?? 'feu', enablePush })
    }
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
    setTimeout(() => goToStep('combine'), 350)
  }

  const handlePushSelect = (choice: boolean) => {
    setEnablePush(choice)
    setTimeout(() => {
      const fallbackEl = elementsByName.get('feu') ?? elementsByName.get('fire') ?? [...elements.values()][0]
      onComplete({ lang, theme: selectedTheme ?? 'dark', haptic: false, username: username.trim(), avatar: fallbackEl?.name ?? 'feu', enablePush: choice })
    }, 350)
  }

  const isCombineStep = step === 'combine'
  const animClass = stepAnim === 'in' ? 'onboard-fade-up' : 'onboard-fade-down'

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-background">

      {/* Dot grid — fullscreen, visible only during combine step */}
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
      <div
        className="flex items-center gap-3 px-4 sm:px-8 flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)', paddingBottom: '0.75rem' }}
      >
        {/* Back button — shown on all steps except lang */}
        {step !== 'lang' ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 h-9 pl-2.5 pr-3.5 rounded-full border border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all flex-shrink-0 text-sm font-medium"
            aria-label={t('Retour', 'Back')}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="text-xs">{t('Retour', 'Back')}</span>
          </button>
        ) : (
          <div className="w-16 flex-shrink-0" />
        )}

        {/* Progress bar — only for steps after lang */}
        <div className="flex flex-1 items-center gap-1.5">
          {PROGRESS_STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 rounded-full flex-1 transition-all duration-500 ${
                i < progressIndex  ? 'bg-primary/50' :
                i === progressIndex ? 'bg-primary' :
                'bg-muted/40'
              }`}
            />
          ))}
        </div>

        {/* Spacer to balance back button */}
        <div className="w-16 flex-shrink-0" />
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

          {/* ── COMBINE (fullscreen cinematic arena) ── */}
          {step === 'combine' && (
            <div className="flex flex-col flex-1 min-h-0">
              <CombineArena
                lang={lang}
                elements={elements}
                recipeMap={recipeMap}
                onAllDone={() => {
                  setTutorialDone(true)
                  setTimeout(() => goToStep('hints-quests'), 800)
                }}
                onTutorialDiscover={onTutorialDiscover}
              />
            </div>
          )}

          {/* ── HINTS + QUESTS (merged) ── */}
          {step === 'hints-quests' && (
            <div className="flex flex-col gap-8 justify-center flex-1">
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground text-balance leading-tight">
                  {t('Indices & Quêtes', 'Hints & Quests')}
                </h1>
                <p className="text-base text-muted-foreground/70 leading-relaxed max-w-sm">
                  {t(
                    "Explore, accomplis des quêtes et utilise des indices quand tu bloques.",
                    "Explore, complete quests and use hints when you're stuck."
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { icon: <Ticket className="w-5 h-5 text-amber-400" />, bg: 'bg-amber-500/8', border: 'border-amber-500/20', accent: 'bg-amber-500/15',
                    title: t('Indices', 'Hints'),
                    desc: t("Bloqué ? Regarde une pub ou accomplis une quête pour débloquer un indice.", "Stuck? Watch an ad or complete a quest to unlock a hint.") },
                  { icon: <Scroll className="w-5 h-5 text-emerald-400" />, bg: 'bg-emerald-500/8', border: 'border-emerald-500/20', accent: 'bg-emerald-500/15',
                    title: t('Quêtes quotidiennes', 'Daily quests'),
                    desc: t('Nouvelles quêtes chaque jour pour gagner des récompenses.', 'New quests every day to earn rewards.') },
                  { icon: <Scroll className="w-5 h-5 text-emerald-400" />, bg: 'bg-emerald-500/8', border: 'border-emerald-500/20', accent: 'bg-emerald-500/15',
                    title: t('Défis permanents', 'Permanent challenges'),
                    desc: t('Objectifs à long terme pour les plus curieux.', 'Long-term goals for the most curious.') },
                ].map(item => (
                  <div key={item.title} className={`flex items-start gap-4 p-4 rounded-2xl ${item.bg} border ${item.border}`}>
                    <div className={`w-10 h-10 rounded-xl ${item.accent} flex items-center justify-center flex-shrink-0`}>
                      {item.icon}
                    </div>
                    <div className="space-y-0.5">
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
                  <span className="text-2xl" role="img" aria-label="bell">{'🔔'}</span>
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
                : step === 'hints-quests'
                  ? t('C\'est compris !', 'Got it!')
                  : step === 'username'
                    ? username.trim()
                      ? t('Continuer', 'Continue')
                      : t('J\'en veux un random', 'Give me a random one')
                    : t('Continuer', 'Continue')
              }
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
