'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────
const WATER = { id: 168, img: '/elements/168.webp', name_fr: 'Eau',    name_en: 'Water' }
const SEA   = { id: 609, img: '/elements/609.webp', name_fr: 'Mer',    name_en: 'Sea'   }
const MERGE_DIST_PCT = 18

type Lang   = 'fr' | 'en'
type Step   = 'lang' | 'add-first' | 'add-second' | 'merge' | 'result' | 'signup'

function t(lang: Lang, fr: string, en: string) { return lang === 'fr' ? fr : en }

// ── Mini item on playground ───────────────────────────────────────────────────
type Item = { id: 'a' | 'b'; x: number; y: number }
type DragState = { id: 'a' | 'b'; pointerId: number; ox: number; oy: number }

// ── Combine Arena ─────────────────────────────────────────────────────────────
function CombineArena({ lang, onDone }: { lang: Lang; onDone: () => void }) {
  const [step, setStep] = useState<Step>('add-first')
  const [items, setItems] = useState<Item[]>([])
  const [nearId, setNearId] = useState<'a' | 'b' | null>(null)
  const [merging, setMerging] = useState(false)
  const [showResult, setShowResult] = useState(false)

  const areaRef   = useRef<HTMLDivElement>(null)
  const drag      = useRef<DragState | null>(null)
  const itemsRef  = useRef<Item[]>([])
  const mergingRef = useRef(false)

  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => { mergingRef.current = merging }, [merging])

  // ── Tap inventory item to place on playground
  function handleInventoryTap(slot: 'a' | 'b') {
    if (mergingRef.current) return
    setItems(prev => {
      if (prev.find(i => i.id === slot)) return prev
      const existing = prev[0]
      // Spawn items at different positions
      const x = slot === 'a' ? 28 : 72
      const y = 50
      const next = [...prev, { id: slot, x, y }]
      if (next.length === 2) setStep('merge')
      return next
    })
    if (slot === 'a') setStep('add-second')
  }

  // ── Pointer drag on playground
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (mergingRef.current) return
    const rect = areaRef.current!.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * 100
    const py = ((e.clientY - rect.top) / rect.height) * 100
    const hit = itemsRef.current.find(i => Math.hypot(px - i.x, py - i.y) < 12)
    if (!hit) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { id: hit.id, pointerId: e.pointerId, ox: px - hit.x, oy: py - hit.y }
    e.preventDefault()
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || mergingRef.current) return
    if (drag.current.pointerId !== e.pointerId) return
    const rect = areaRef.current!.getBoundingClientRect()
    const nx = Math.max(8, Math.min(92, ((e.clientX - rect.left) / rect.width) * 100 - drag.current.ox))
    const ny = Math.max(8, Math.min(92, ((e.clientY - rect.top) / rect.height) * 100 - drag.current.oy))
    const id = drag.current.id
    setItems(prev => prev.map(i => i.id === id ? { ...i, x: nx, y: ny } : i))
    const other = itemsRef.current.find(i => i.id !== id)
    if (other) setNearId(Math.hypot(nx - other.x, ny - other.y) < MERGE_DIST_PCT ? other.id : null)
    e.preventDefault()
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || mergingRef.current) return
    if (drag.current.pointerId !== e.pointerId) return
    drag.current = null
    setNearId(null)
    const [a, b] = itemsRef.current
    if (!a || !b) return
    if (Math.hypot(a.x - b.x, a.y - b.y) > MERGE_DIST_PCT) return
    // Trigger merge
    mergingRef.current = true
    setMerging(true)
    const cx = (a.x + b.x) / 2
    const cy = (a.y + b.y) / 2
    setItems([{ id: 'a', x: cx, y: cy }])
    setTimeout(() => {
      setMerging(false)
      setShowResult(true)
      setStep('result')
    }, 900)
    e.preventDefault()
  }, [])

  const showInventory = step === 'add-first' || step === 'add-second'
  const slotAPlaced = items.some(i => i.id === 'a')
  const slotBPlaced = items.some(i => i.id === 'b')

  return (
    <div className="flex flex-col items-center gap-5 w-full px-4">

      {/* Instruction header */}
      <div className="text-center space-y-1 min-h-[56px] flex flex-col items-center justify-center">
        {step === 'add-first' && (
          <>
            <h2 className="text-xl font-bold text-foreground animate-in fade-in duration-300">
              {t(lang, 'Ajoute au terrain', 'Add to the field')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(lang, "Appuie sur l'Eau dans l'inventaire", 'Tap Water in your inventory')}
            </p>
          </>
        )}
        {step === 'add-second' && (
          <>
            <h2 className="text-xl font-bold text-foreground animate-in fade-in duration-300">
              {t(lang, 'Encore une fois !', 'One more time!')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(lang, "Appuie encore sur l'Eau", 'Tap Water one more time')}
            </p>
          </>
        )}
        {step === 'merge' && (
          <>
            <h2 className="text-xl font-bold text-foreground animate-in fade-in duration-300">
              {t(lang, 'Fusionne-les !', 'Merge them!')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(lang, 'Glisse un élément sur l\'autre', 'Drag one element onto the other')}
            </p>
          </>
        )}
        {(step === 'merge' && merging) && (
          <p className="text-sm text-amber-400 font-semibold animate-in fade-in duration-200">
            {t(lang, 'Fusion…', 'Merging…')}
          </p>
        )}
        {step === 'result' && (
          <div className="flex items-center gap-2 animate-in zoom-in fade-in duration-400">
            <CheckCircle size={18} className="text-amber-400 flex-shrink-0" />
            <h2 className="text-xl font-bold text-foreground">
              {t(lang, 'Tu as créé la Mer !', 'You created the Sea!')}
            </h2>
          </div>
        )}
      </div>

      {/* Playground arena */}
      {step !== 'result' && (
        <div
          ref={areaRef}
          className="relative w-full max-w-xs rounded-3xl border border-border/50 bg-muted/10 overflow-hidden touch-none select-none"
          style={{ height: 200 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Merge target hint ring */}
          {step === 'merge' && !merging && items.length === 2 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-amber-400/30" />
            </div>
          )}

          {/* Merging spinner */}
          {merging && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <Loader2 size={28} className="text-amber-400 animate-spin" />
            </div>
          )}

          {/* Items */}
          {!merging && items.map(item => (
            <div
              key={item.id}
              className={`absolute transition-none ${nearId === item.id ? 'scale-110' : ''}`}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: 'translate(-50%, -50%)',
                willChange: 'left, top',
              }}
            >
              <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center bg-muted/30 shadow-md
                ${nearId === item.id ? 'border-amber-400/70 bg-amber-400/10 shadow-[0_0_12px_2px_rgba(251,191,36,0.25)]' : 'border-border/50'}`}
              >
                <img src={WATER.img} alt="water" className="w-10 h-10 object-contain" draggable={false} />
              </div>
            </div>
          ))}

          {/* Empty state hint */}
          {items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-xs text-muted-foreground/40">{t(lang, 'Terrain vide', 'Empty field')}</p>
            </div>
          )}
        </div>
      )}

      {/* Result card */}
      {step === 'result' && showResult && (
        <div className="flex flex-col items-center gap-4 animate-in zoom-in fade-in duration-500">
          <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-amber-400/30 bg-amber-400/10">
            <img src={SEA.img} alt={t(lang, SEA.name_fr, SEA.name_en)} className="w-16 h-16 object-contain drop-shadow-lg" draggable={false} />
            <div>
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-0.5">
                {t(lang, 'Nouveau !', 'New!')}
              </p>
              <p className="text-lg font-bold text-foreground">{t(lang, SEA.name_fr, SEA.name_en)}</p>
              <p className="text-xs text-muted-foreground">{t(lang, 'Eau + Eau', 'Water + Water')}</p>
            </div>
          </div>
          <button
            onClick={onDone}
            className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-foreground text-background text-sm font-bold active:scale-[0.97] transition-transform cursor-pointer"
          >
            {t(lang, 'Continuer', 'Continue')}
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Inventory */}
      {showInventory && (
        <div className="flex flex-col items-center gap-2 w-full mt-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {t(lang, 'Inventaire', 'Inventory')}
          </p>
          <div className="w-full max-w-xs rounded-2xl border border-border/40 bg-muted/20 p-3 flex justify-center">
            <button
              onClick={() => handleInventoryTap(slotAPlaced ? 'b' : 'a')}
              disabled={slotBPlaced}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform cursor-pointer disabled:opacity-40 disabled:cursor-default group"
            >
              <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all
                ${!slotBPlaced
                  ? 'border-amber-400/60 bg-amber-400/10 shadow-[0_0_12px_2px_rgba(251,191,36,0.18)] group-active:shadow-[0_0_18px_4px_rgba(251,191,36,0.30)]'
                  : 'border-border/40 bg-muted/30'}`}
              >
                <img src={WATER.img} alt={t(lang, WATER.name_fr, WATER.name_en)} className="w-10 h-10 object-contain" draggable={false} />
              </div>
              <span className="text-xs font-medium text-foreground/80">
                {t(lang, WATER.name_fr, WATER.name_en)}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sign-up step ──────────────────────────────────────────────────────────────
function SignupStep({ lang, onSkip }: { lang: Lang; onSkip: () => void }) {
  return (
    <div className="flex flex-col items-center gap-8 w-full px-6">
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold text-foreground text-balance">
          {t(lang, "C'est parti !", "You're all set!")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
          {t(
            lang,
            'Connecte-toi depuis le menu profil pour sauvegarder ta progression et apparaître dans le classement.',
            'Sign in from the profile menu to save your progress and appear in the leaderboard.'
          )}
        </p>
      </div>

      <button
        onClick={onSkip}
        className="w-full max-w-xs py-3.5 rounded-2xl bg-foreground text-background text-sm font-bold active:scale-[0.97] transition-transform cursor-pointer"
      >
        {t(lang, 'Jouer', 'Play')}
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WelcomePage() {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('en')
  const [step, setStep] = useState<Step>('lang')

  function finish() {
    try { localStorage.setItem('alchemy-welcome-done', '1') } catch {}
    router.push('/')
  }

  const STEPS = ['lang', 'combine', 'signup'] as const
  const stepIdx = STEPS.indexOf(step === 'add-first' || step === 'add-second' || step === 'merge' || step === 'result'
    ? 'combine' : step as typeof STEPS[number])

  return (
    <div
      className="fixed inset-0 bg-background flex flex-col overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
        <Image src="/logo.svg" alt="Elementz" width={26} height={26} className="opacity-70" />
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-400 ${
                i === stepIdx ? 'w-6 bg-foreground' :
                i < stepIdx  ? 'w-1.5 bg-foreground/40' :
                               'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>
        <div className="w-7" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto overflow-hidden">

        {/* STEP: lang */}
        {step === 'lang' && (
          <div className="flex flex-col items-center gap-8 w-full px-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="flex flex-col items-center gap-3">
              <Image src="/logo.svg" alt="Elementz" width={72} height={72} className="drop-shadow-lg" />
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Elementz</h1>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <p className="text-center text-sm text-muted-foreground mb-1">
                Choose your language / Choisis ta langue
              </p>
              <button
                onClick={() => { setLang('en'); setTimeout(() => setStep('add-first'), 220) }}
                className="w-full py-4 rounded-2xl border border-border bg-muted/30 text-foreground text-sm font-bold active:scale-[0.97] transition-all cursor-pointer hover:border-foreground/30 hover:bg-muted/50"
              >
                English
              </button>
              <button
                onClick={() => { setLang('fr'); setTimeout(() => setStep('add-first'), 220) }}
                className="w-full py-4 rounded-2xl border border-border bg-muted/30 text-foreground text-sm font-bold active:scale-[0.97] transition-all cursor-pointer hover:border-foreground/30 hover:bg-muted/50"
              >
                Français
              </button>
            </div>
          </div>
        )}

        {/* STEPS: combine (add-first, add-second, merge, result) */}
        {['add-first', 'add-second', 'merge', 'result'].includes(step) && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-400">
            <CombineArena lang={lang} onDone={() => setStep('signup')} />
          </div>
        )}

        {/* STEP: signup */}
        {step === 'signup' && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-400">
            <SignupStep lang={lang} onSkip={finish} />
          </div>
        )}
      </div>

      <div className="h-4 flex-shrink-0" />
    </div>
  )
}
