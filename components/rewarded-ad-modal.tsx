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

// ── Horizontal progress bar ────────────────────────────────────────────────
function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round(((total - current) / total) * 100)
  return (
    <div className="w-full flex flex-col gap-2">
      <div className="w-full h-2 rounded-full bg-white/[0.07] overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground/40 tabular-nums text-right">
        {current}s
      </p>
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

  const goToReveal = useCallback(() => {
    clearInterval(intervalRef.current!)
    clearTimeout(skipTimerRef.current!)
    setPhase('reveal')
  }, [])

  const startAd = () => {
    setPhase('playing')
    setCountdown(AD_DURATION_SECONDS)
    setCanSkip(false)

    // Countdown for visual feedback. At 0, show "Voir mon indice" fallback.
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
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

  // Listen for postMessage from the AppLixir iframe sandbox
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'applixir_status' && e.data.status === 'ad-watched') {
        goToReveal()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [goToReveal])

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
          <div className="flex flex-col items-center gap-6 w-full animate-in fade-in duration-200">
            {/* Ad slot — AppLixir runs in a sandboxed iframe so it can't go fullscreen */}
            <div className="w-full rounded-2xl border border-white/[0.07] bg-black overflow-hidden relative" style={{ aspectRatio: '16/9' }}>
              <iframe
                src={`/api/applixir-player?apiKey=${encodeURIComponent(process.env.NEXT_PUBLIC_APPLIXIR_API_KEY ?? '')}&lang=${lang}`}
                className="absolute inset-0 w-full h-full border-0"
                allow="autoplay; encrypted-media"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                title={t('Publicité', 'Advertisement')}
              />
            </div>

            {/* Progress bar → becomes reveal button when countdown ends */}
            <div className="w-full">
              {canSkip ? (
                <button
                  onClick={handleRevealAfterCountdown}
                  className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-[0.97] text-black text-sm font-bold transition-all animate-in fade-in zoom-in-95 duration-300"
                >
                  {t('Voir mon indice', 'See my hint')}
                </button>
              ) : (
                <ProgressBar current={countdown} total={AD_DURATION_SECONDS} />
              )}
            </div>
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
