'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Play, Lightbulb, Plus } from 'lucide-react'
import type { HintResult } from '@/hooks/use-hint'

// ─── Configuration ────────────────────────────────────────────────────────────
// To plug in a real ad network, replace the body of `startAd` below.
// Call `onAdFinished()` when the ad completes to proceed to the hint reveal.
const AD_DURATION_SECONDS = 15   // total ad length
const SKIP_UNLOCK_SECONDS  = 5   // seconds before skip button appears

// ─────────────────────────────────────────────────────────────────────────────

type ElementDef = { number: number; name: string; imageUrl?: string; color?: string }

interface Props {
  lang: 'fr' | 'en'
  hint: HintResult
  elements: Map<string, ElementDef>
  onComplete: () => void
  onDismiss: () => void
}

type Phase = 'intro' | 'playing' | 'reveal'

function ElementTile({
  element,
  hidden = false,
}: {
  element: ElementDef | undefined
  hidden?: boolean
}) {
  if (hidden || !element) {
    return (
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-muted/40 border-2 border-dashed border-border flex items-center justify-center flex-shrink-0">
        <span className="text-3xl font-black text-muted-foreground/30 select-none">?</span>
      </div>
    )
  }
  return (
    <div
      className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-2 border-border flex flex-col items-center justify-center gap-2 flex-shrink-0 p-3 animate-in zoom-in-90 fade-in duration-300"
      style={{ background: element.color ? `${element.color}18` : 'rgba(255,255,255,0.04)', borderColor: element.color ? `${element.color}40` : undefined }}
    >
      {element.imageUrl ? (
        <img
          src={element.imageUrl}
          alt={element.name}
          className="w-12 h-12 sm:w-14 sm:h-14 object-contain pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
          <span className="text-2xl font-bold text-muted-foreground">{element.name[0]}</span>
        </div>
      )}
      <span className="text-[11px] sm:text-xs font-semibold text-center leading-tight text-foreground/80 truncate w-full text-center">
        {element.name}
      </span>
    </div>
  )
}

// Circular countdown ring
function CountdownRing({ current, total }: { current: number; total: number }) {
  const r = 26
  const circ = 2 * Math.PI * r
  const progress = current / total
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor"
          className="text-border" strokeWidth="3" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor"
          className="text-amber-400 transition-all duration-1000 ease-linear"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * progress}
        />
      </svg>
      <span className="text-lg font-bold tabular-nums text-foreground">{current}</span>
    </div>
  )
}

export function RewardedAdModal({ lang, hint, elements, onComplete, onDismiss }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [countdown, setCountdown] = useState(AD_DURATION_SECONDS)
  const [canSkip, setCanSkip] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  // Resolve elements by number
  const getEl = useCallback((num: number): ElementDef | undefined => {
    for (const el of elements.values()) {
      if (el.number === num) return el
    }
    return undefined
  }, [elements])

  const ing1El  = getEl(hint.ing1)
  const ing2El  = getEl(hint.ing2)

  const startAd = () => {
    setPhase('playing')
    setCountdown(AD_DURATION_SECONDS)
    setCanSkip(false)

    // Skip button unlocks after SKIP_UNLOCK_SECONDS
    skipTimerRef.current = setTimeout(() => setCanSkip(true), SKIP_UNLOCK_SECONDS * 1000)

    // ── Google AdSense Rewarded Ad ─────────────────────────────────────────
    // adsbygoogle.js is loaded globally via layout.tsx.
    // Push a rewarded ad request; when the user earns the reward, move to reveal.
    try {
      const adsbygoogle = ((window as unknown as Record<string, unknown>).adsbygoogle ?? []) as { push: (cfg: unknown) => void }
      adsbygoogle.push({
        google_ad_client: 'ca-pub-2003923325493504',
        enable_page_level_ads: false,
        // Reward callback — ad completed successfully
        reward_callback: () => {
          clearInterval(intervalRef.current!)
          clearTimeout(skipTimerRef.current!)
          setPhase('reveal')
        },
      })
    } catch {
      // SDK not ready — fall back to simulated countdown so UX never breaks
    }
    // ─────────────────────────────────────────────────────────────────────

    // Simulated countdown (also acts as fallback if SDK is not available)
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          setPhase('reveal')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleSkip = () => {
    if (!canSkip) return
    clearInterval(intervalRef.current!)
    clearTimeout(skipTimerRef.current!)
    setPhase('reveal')
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current)
    }
  }, [])

  return (
    // Full-screen overlay — sits above the game but below the admin sidebar on desktop
    <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center">
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-xl" />

      {/* Content wrapper — constrained width on desktop, full height always */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6 py-10 max-w-lg mx-auto">

        {/* ── INTRO ──────────────────────────────────────────────────────── */}
        {phase === 'intro' && (
          <div className="flex flex-col items-center gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Close */}
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="w-20 h-20 rounded-3xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <Lightbulb className="w-9 h-9 text-amber-400" />
            </div>

            {/* Text */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {t('Débloquer un indice', 'Unlock a hint')}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                {t(
                  `Regardez une courte publicité pour révéler un des ingrédients d'une combinaison possible.`,
                  `Watch a short ad to reveal one ingredient from a possible combination.`
                )}
              </p>
            </div>

            {/* Teaser tiles — both hidden */}
            <div className="flex items-center gap-4">
              <ElementTile element={ing1El} hidden />
              <div className="flex flex-col items-center gap-1">
                <Plus className="w-5 h-5 text-muted-foreground/30" />
              </div>
              <ElementTile element={ing2El} hidden />
            </div>

            {/* CTA */}
            <button
              onClick={startAd}
              className="w-full max-w-xs h-13 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-[0.97] text-black text-sm font-bold transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-amber-400/20"
            >
              <Play className="w-4 h-4 fill-current" />
              {t('Regarder la pub', 'Watch the ad')}
            </button>

            <p className="text-[11px] text-muted-foreground/40 text-center">
              {t('1 pub = 1 indice', '1 ad = 1 hint')}
            </p>
          </div>
        )}

        {/* ── PLAYING ────────────────────────────────────────────────────── */}
        {phase === 'playing' && (
          <div className="flex flex-col items-center gap-8 w-full animate-in fade-in duration-200">
            {/* Ad slot placeholder */}
            <div className="w-full max-w-sm rounded-3xl border border-border bg-muted/30 overflow-hidden">
              <div className="aspect-video flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                  <Play className="w-6 h-6 text-muted-foreground/30 fill-current" />
                </div>
                <p className="text-xs font-medium text-muted-foreground/30 uppercase tracking-widest">
                  {t('Espace publicitaire', 'Ad placement')}
                </p>
                {/* ── Real ad slot: <div id="ad-container" className="w-full h-full" /> */}
              </div>
            </div>

            {/* Countdown + skip */}
            <div className="flex flex-col items-center gap-3">
              <CountdownRing current={countdown} total={AD_DURATION_SECONDS} />
              <button
                onClick={handleSkip}
                disabled={!canSkip}
                className={`h-9 px-5 rounded-xl text-sm font-semibold transition-all ${
                  canSkip
                    ? 'bg-foreground/10 text-foreground hover:bg-foreground/15 active:scale-[0.97]'
                    : 'text-muted-foreground/30 cursor-not-allowed'
                }`}
              >
                {canSkip
                  ? t('Passer la pub', 'Skip ad')
                  : t(`Passer dans ${Math.max(0, SKIP_UNLOCK_SECONDS - (AD_DURATION_SECONDS - countdown))}s`, `Skip in ${Math.max(0, SKIP_UNLOCK_SECONDS - (AD_DURATION_SECONDS - countdown))}s`)
                }
              </button>
            </div>
          </div>
        )}

        {/* ── REVEAL ─────────────────────────────────────────────────────── */}
        {phase === 'reveal' && (
          <div className="flex flex-col items-center gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-400">
            {/* Header */}
            <div className="text-center space-y-1.5">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">
                {t('Essayez de créer', 'Try to create')}
              </p>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {t('Votre indice', 'Your hint')}
              </h2>
            </div>

            {/* Tiles — ing1 revealed, ing2 hidden */}
            <div className="flex items-center gap-5">
              <div className="flex flex-col items-center gap-2">
                <ElementTile element={ing1El} hidden={false} />
                <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                  {t('Ingrédient', 'Ingredient')}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1 pb-5">
                <Plus className="w-6 h-6 text-muted-foreground/40" />
              </div>

              <div className="flex flex-col items-center gap-2">
                <ElementTile element={ing2El} hidden />
                <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                  {t('Mystère', 'Mystery')}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground/50 text-center max-w-xs">
              {t(
                `Combinez cet élément avec autre chose pour découvrir quelque chose de nouveau.`,
                `Combine this element with something else to discover something new.`
              )}
            </p>

            {/* Actions */}
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <button
                onClick={onComplete}
                className="w-full py-3.5 rounded-2xl bg-foreground text-background text-sm font-bold active:scale-[0.97] transition-all hover:opacity-90"
              >
                {t('Commencer à jouer', "Let's play")}
              </button>
              <button
                onClick={onDismiss}
                className="text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                {t('Fermer', 'Close')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
