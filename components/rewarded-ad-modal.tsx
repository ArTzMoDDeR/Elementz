'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Play, Lightbulb, Plus, ArrowDown } from 'lucide-react'
import type { HintResult } from '@/hooks/use-hint'

const AD_DURATION_SECONDS = 15
// Skip button only appears once the full countdown has elapsed
const SKIP_UNLOCK_SECONDS  = AD_DURATION_SECONDS

type ElementDef = { number: number; name: string; imageUrl?: string; color?: string }

interface Props {
  lang: 'fr' | 'en'
  hint: HintResult
  elements: Map<string, ElementDef>
  onComplete: () => void
  onDismiss: () => void
}

type Phase = 'intro' | 'playing' | 'reveal'

// ── Unified tile — name always inside, same structure for all sizes ────────
function Tile({
  element,
  hidden = false,
}: {
  element: ElementDef | undefined
  hidden?: boolean
}) {
  if (hidden || !element) {
    return (
      <div className="w-20 h-20 rounded-2xl bg-muted/40 border-2 border-dashed border-white/10 flex items-center justify-center flex-shrink-0">
        <span className="text-2xl font-black text-white/20 select-none">?</span>
      </div>
    )
  }

  return (
    <div
      className="w-20 h-20 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-1 flex-shrink-0 p-2 animate-in zoom-in-95 fade-in duration-300"
      style={{
        background: element.color ? `${element.color}15` : 'rgba(255,255,255,0.05)',
        borderColor: element.color ? `${element.color}35` : undefined,
      }}
    >
      {element.imageUrl ? (
        <img src={element.imageUrl} alt={element.name} className="w-10 h-10 object-contain pointer-events-none flex-shrink-0" draggable={false} />
      ) : (
        <span className="text-xl font-bold text-muted-foreground flex-shrink-0">{element.name[0]}</span>
      )}
      <span className="text-[10px] font-semibold text-center leading-tight text-foreground/80 w-full truncate px-0.5">
        {element.name}
      </span>
    </div>
  )
}

// ── Circular countdown ─────────────────────────────────────────────────────
function CountdownRing({ current, total }: { current: number; total: number }) {
  const r = 26
  const circ = 2 * Math.PI * r
  const progress = current / total
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" className="text-white/10" strokeWidth="3" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor"
          className="text-amber-400 transition-all duration-1000 ease-linear"
          strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * progress}
        />
      </svg>
      <span className="text-base font-bold tabular-nums text-foreground">{current}</span>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────

export function RewardedAdModal({ lang, hint, elements, onComplete, onDismiss }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [countdown, setCountdown] = useState(AD_DURATION_SECONDS)
  const [canSkip, setCanSkip] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  const getEl = useCallback((num: number): ElementDef | undefined => {
    for (const el of elements.values()) if (el.number === num) return el
    return undefined
  }, [elements])

  const resultEl = getEl(hint.result)
  const ing1El   = getEl(hint.ing1)
  const ing2El   = getEl(hint.ing2)

  // Whether AppLixir SDK is available (not blocked by ad blocker)
  const sdkAvailableRef = useRef(false)

  const goToReveal = useCallback(() => {
    clearInterval(intervalRef.current!)
    clearTimeout(skipTimerRef.current!)
    setPhase('reveal')
  }, [])

  const startAd = () => {
    setPhase('playing')
    setCountdown(AD_DURATION_SECONDS)
    setCanSkip(false)

    // ── AppLixir rewarded video ad ─────────────────────────────────────────
    const w = window as unknown as Record<string, unknown>
    const initPlayer = w.initializeAndOpenPlayer as ((opts: unknown) => void) | undefined

    console.log('[v0] AppLixir SDK available:', typeof initPlayer === 'function')
    console.log('[v0] AppLixir API key set:', !!(process.env.NEXT_PUBLIC_APPLIXIR_API_KEY))

    if (typeof initPlayer === 'function') {
      sdkAvailableRef.current = true
      try {
        initPlayer({
          apiKey: process.env.NEXT_PUBLIC_APPLIXIR_API_KEY ?? '',
          adStatusCallbackFn: (status: string) => {
            console.log('[v0] AppLixir ad status callback:', status)
            if (status === 'ad-watched') {
              // Only grant reward on full completion
              goToReveal()
            }
            // ad-skipped, ad-error, no-ad-available → do nothing, fallback timer handles it
          },
        })
        console.log('[v0] AppLixir initializeAndOpenPlayer called')
      } catch (err) {
        console.log('[v0] AppLixir initializeAndOpenPlayer threw:', err)
        sdkAvailableRef.current = false
      }
    } else {
      console.log('[v0] AppLixir SDK not found on window — likely blocked by ad blocker. Falling back to countdown.')
    }
    // ─────────────────────────────────────────────────────────────────────

    // Countdown ring — always runs for visual feedback
    // When it reaches 0, auto-reveal as fallback (SDK blocked or no fill)
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          // If SDK handled it (callback already fired), don't double-reveal
          // setPhase is idempotent so calling it twice is safe
          setCanSkip(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleRevealAfterCountdown = () => {
    clearTimeout(skipTimerRef.current!)
    goToReveal()
  }

  const handleDismiss = () => {
    clearInterval(intervalRef.current!)
    clearTimeout(skipTimerRef.current!)
    onDismiss()
  }

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (skipTimerRef.current) clearTimeout(skipTimerRef.current)
  }, [])



  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/96 backdrop-blur-2xl" />

      {/* Panel — wider on desktop for bigger ad */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-lg mx-auto flex flex-col items-center px-6">

        {/* ── INTRO ──────────────────────────────────────────────────────── */}
        {phase === 'intro' && (
          <div className="flex flex-col items-center gap-7 w-full animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Close */}
            <button onClick={handleDismiss}
              className="absolute -top-2 right-0 w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="w-16 h-16 rounded-3xl bg-amber-400/10 border border-amber-400/15 flex items-center justify-center">
              <Lightbulb className="w-7 h-7 text-amber-400" />
            </div>

            {/* Title */}
            <div className="text-center space-y-1.5">
              <h2 className="text-xl font-bold text-foreground tracking-tight">
                {t('Débloquer un indice', 'Unlock a hint')}
              </h2>
              <p className="text-sm text-muted-foreground/70 leading-relaxed">
                {t('Regardez une courte pub pour révéler un indice.', 'Watch a short ad to reveal a hint.')}
              </p>
            </div>

            {/* Teaser — result hidden, ingredients hidden */}
            <div className="w-full rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 flex flex-col items-center gap-4">
              <p className="text-[11px] font-semibold text-muted-foreground/40 uppercase tracking-widest">
                {t('Essayez de créer', 'Try to create')}
              </p>
              <Tile element={resultEl} hidden />
              <div className="flex items-center gap-2 text-muted-foreground/20">
                <ArrowDown className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-3">
                <Tile element={ing1El} hidden />
                <Plus className="w-4 h-4 text-muted-foreground/20 flex-shrink-0" />
                <Tile element={ing2El} hidden />
              </div>
            </div>

            {/* CTA */}
            <button onClick={startAd}
              className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-[0.97] text-black text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-400/15">
              <Play className="w-4 h-4 fill-current" />
              {t('Regarder la pub', 'Watch the ad')}
            </button>
            <p className="text-[11px] text-muted-foreground/30">{t('1 pub = 1 indice', '1 ad = 1 hint')}</p>
          </div>
        )}

        {/* ── PLAYING ────────────────────────────────────────────────────── */}
        {phase === 'playing' && (
          <div className="flex flex-col items-center gap-7 w-full animate-in fade-in duration-200">
            {/* Ad slot */}
            <div className="w-full rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
              <div className="aspect-video flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <Play className="w-5 h-5 text-white/20 fill-current" />
                </div>
                <p className="text-[11px] font-medium text-white/20 uppercase tracking-widest">
                  {t('Publicité', 'Advertisement')}
                </p>
                {/* Real ad slot goes here: <div id="ad-rewarded" className="w-full h-full" /> */}
              </div>
            </div>

            {/* Countdown */}
            <CountdownRing current={countdown} total={AD_DURATION_SECONDS} />

            {/* After countdown: show reveal button + dismiss option */}
            {canSkip && (
              <div className="flex flex-col items-center gap-3 w-full animate-in fade-in duration-300">
                <button onClick={handleRevealAfterCountdown}
                  className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-[0.97] text-black text-sm font-bold transition-all">
                  {t('Voir mon indice', 'See my hint')}
                </button>
                <button onClick={handleDismiss}
                  className="text-sm text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                  {t('Annuler', 'Cancel')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── REVEAL ─────────────────────────────────────────────────────── */}
        {phase === 'reveal' && (
          <div className="flex flex-col items-center gap-7 w-full animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Label */}
            <div className="text-center space-y-1">
              <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest">
                {t('Votre indice', 'Your hint')}
              </p>
              <h2 className="text-xl font-bold text-foreground">
                {t('Vous pouvez créer', 'You can create')}
              </h2>
            </div>

            {/* Result tile — revealed, name already inside tile */}
            <Tile element={resultEl} hidden={false} />

            {/* Separator */}
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px bg-white/[0.07]" />
              <p className="text-[11px] text-muted-foreground/40 font-medium uppercase tracking-widest flex-shrink-0">
                {t('avec', 'with')}
              </p>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>

            {/* Ingredients row — ing1 revealed, ing2 hidden. Names inside tiles. */}
            <div className="flex items-center gap-4">
              <Tile element={ing1El} hidden={false} />
              <Plus className="w-5 h-5 text-muted-foreground/30 flex-shrink-0" />
              <Tile element={ing2El} hidden />
            </div>

            {/* Action */}
            <div className="w-full pt-1">
              <button onClick={onComplete}
                className="w-full py-3.5 rounded-2xl bg-foreground text-background text-sm font-bold active:scale-[0.97] transition-all hover:opacity-90">
                {t('OK', 'OK')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
