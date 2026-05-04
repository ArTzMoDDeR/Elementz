'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Play, Lightbulb, Clock } from 'lucide-react'

// ─── Configuration ────────────────────────────────────────────────────────────
// To plug in a real ad network, replace the body of `runRewardedAd` below.
// The function receives an `onComplete` callback to call when the ad finishes.
//
// Example: Google Ad Manager IMA SDK
//   window.googletag.cmd.push(() => { ... })
//
// For now we simulate a 10-second countdown ad.
const AD_DURATION_SECONDS = 10

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  lang: 'fr' | 'en'
  onComplete: () => void
  onDismiss: () => void
}

type Phase = 'intro' | 'playing' | 'done'

export function RewardedAdModal({ lang, onComplete, onDismiss }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [countdown, setCountdown] = useState(AD_DURATION_SECONDS)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  const startAd = () => {
    setPhase('playing')
    setCountdown(AD_DURATION_SECONDS)

    // ── Plug real ad SDK here ─────────────────────────────────────────────
    // runRewardedAd(() => { setPhase('done') })
    // ─────────────────────────────────────────────────────────────────────

    // Simulated countdown
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          setPhase('done')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={phase === 'playing' ? undefined : onDismiss}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-3xl border border-border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">

        {/* Close — only when not playing */}
        {phase !== 'playing' && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* ── Intro phase ─────────────────────────────────────────────── */}
        {phase === 'intro' && (
          <div className="flex flex-col items-center gap-5 px-6 pt-8 pb-7">
            <div className="w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/20 flex items-center justify-center">
              <Lightbulb className="w-7 h-7 text-amber-400" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-foreground mb-1">
                {t('Débloquer un indice', 'Unlock a hint')}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(
                  `Regardez une courte publicité (${AD_DURATION_SECONDS}s) pour débloquer les indices pendant 5 minutes.`,
                  `Watch a short ad (${AD_DURATION_SECONDS}s) to unlock hints for 5 minutes.`
                )}
              </p>
            </div>
            <button
              onClick={startAd}
              className="w-full h-11 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-black text-sm font-bold transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              {t('Regarder la pub', 'Watch the ad')}
            </button>
            <p className="text-[11px] text-muted-foreground/50">
              {t('Sans pub, les indices sont désactivés.', 'Hints require watching an ad.')}
            </p>
          </div>
        )}

        {/* ── Playing phase ────────────────────────────────────────────── */}
        {phase === 'playing' && (
          <div className="flex flex-col items-center gap-4 px-6 pt-8 pb-7">
            {/* Simulated ad placeholder — replace with real ad slot */}
            <div className="w-full h-36 rounded-2xl bg-muted/60 border border-border flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Play className="w-4 h-4 text-muted-foreground/40 fill-current" />
              </div>
              <p className="text-xs text-muted-foreground/40 font-medium">
                {t('Espace publicitaire', 'Ad placement')}
              </p>
              {/* ── Real ad slot goes here ── */}
              {/* <div id="ad-container" /> */}
            </div>

            {/* Countdown ring */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 relative flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor"
                    className="text-border" strokeWidth="3" />
                  <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor"
                    className="text-amber-400 transition-all duration-1000"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 24}`}
                    strokeDashoffset={`${2 * Math.PI * 24 * (countdown / AD_DURATION_SECONDS)}`}
                  />
                </svg>
                <span className="text-base font-bold text-foreground tabular-nums">{countdown}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('Veuillez patienter…', 'Please wait…')}
              </p>
            </div>
          </div>
        )}

        {/* ── Done phase ───────────────────────────────────────────────── */}
        {phase === 'done' && (
          <div className="flex flex-col items-center gap-5 px-6 pt-8 pb-7">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
              <Lightbulb className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-foreground mb-1">
                {t('Indices débloqués !', 'Hints unlocked!')}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                {t('Valable 5 minutes', 'Valid for 5 minutes')}
              </p>
            </div>
            <button
              onClick={onComplete}
              className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
            >
              <Lightbulb className="w-4 h-4" />
              {t('Voir mon indice', 'Show my hint')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
