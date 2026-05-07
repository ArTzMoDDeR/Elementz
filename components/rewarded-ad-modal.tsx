'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Lightbulb, Plus, ArrowDown } from 'lucide-react'
import type { HintResult } from '@/hooks/use-hint'

const AD_DURATION_SECONDS = 15

// ── Monetag on-demand interstitial ───────────────────────────────────────────
// Loads the Monetag interstitial script only when the user clicks "Watch ad".
// The script fires the ad immediately on load (one-shot), never auto-plays.
// Zone 237069 — replace with your Interstitial zone ID from Monetag dashboard.
const MONETAG_ZONE = '237069'
const MONETAG_TAG_URL = `https://quge5.com/88/tag.min.js`

function loadMonetagOnce(): Promise<boolean> {
  return new Promise((resolve) => {
    // If already injected, try calling the show function directly
    const w = window as Record<string, unknown>
    const candidates = [`__show_${MONETAG_ZONE}`, `show_${MONETAG_ZONE}`]
    for (const name of candidates) {
      if (typeof w[name] === 'function') {
        const fn = w[name] as (cb?: (ok: boolean) => void) => void
        try { fn((ok) => resolve(!!ok)) } catch { resolve(false) }
        return
      }
    }

    // Inject the script — it auto-fires the interstitial on load
    const existing = document.getElementById('monetag-interstitial-script')
    if (existing) { resolve(false); return }

    const script = document.createElement('script')
    script.id = 'monetag-interstitial-script'
    script.src = MONETAG_TAG_URL
    script.setAttribute('data-zone', MONETAG_ZONE)
    script.setAttribute('data-cfasync', 'false')
    script.async = true
    script.onload = () => {
      // Give the script a tick to register its show function, then call it
      setTimeout(() => {
        for (const name of candidates) {
          if (typeof w[name] === 'function') {
            const fn = w[name] as (cb?: (ok: boolean) => void) => void
            try { fn((ok) => resolve(!!ok)); return } catch { break }
          }
        }
        resolve(false)
      }, 300)
    }
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })
}
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

// ── Tile ──────────────────────────────────────────────────────────────────────
function Tile({ element, hidden = false }: { element: ElementDef | undefined; hidden?: boolean }) {
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

// ── Progress bar ──────────────────────────────────────────────────────────────
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
      <p className="text-[11px] text-muted-foreground/40 tabular-nums text-right">{current}s</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function RewardedAdModal({ lang, hint, elements, onComplete, onDismiss }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [countdown, setCountdown] = useState(AD_DURATION_SECONDS)
  const [canSkip, setCanSkip] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    setPhase('reveal')
  }, [])

  const startCountdown = useCallback(() => {
    setCountdown(AD_DURATION_SECONDS)
    setCanSkip(false)
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
  }, [])

  const startAd = useCallback(async () => {
    setPhase('playing')
    startCountdown()

    // Load + fire Monetag interstitial on-demand (only at user click).
    // If completed → go straight to reveal. If blocked → 15s countdown fallback.
    const completed = await loadMonetagOnce()
    if (completed) goToReveal()
  }, [goToReveal, startCountdown])

  const handleDismiss = () => {
    clearInterval(intervalRef.current!)
    onDismiss()
  }

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/96 backdrop-blur-2xl" />

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center px-6">

        {/* ── INTRO ──────────────────────────────────────────────────────── */}
        {phase === 'intro' && (
          <div className="flex flex-col items-center gap-7 w-full animate-in fade-in slide-in-from-bottom-3 duration-300">
            <button
              onClick={handleDismiss}
              className="absolute -top-2 right-0 w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 rounded-3xl bg-amber-400/10 border border-amber-400/15 flex items-center justify-center">
              <Lightbulb className="w-7 h-7 text-amber-400" />
            </div>

            <div className="text-center space-y-1.5">
              <h2 className="text-xl font-bold text-foreground tracking-tight">
                {t('Débloquer un indice', 'Unlock a hint')}
              </h2>
              <p className="text-sm text-muted-foreground/70 leading-relaxed">
                {t('Regardez une courte pub pour révéler un indice.', 'Watch a short ad to reveal a hint.')}
              </p>
            </div>

            {/* Teaser — all tiles hidden */}
            <div className="w-full rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 flex flex-col items-center gap-4">
              <p className="text-[11px] font-semibold text-muted-foreground/40 uppercase tracking-widest">
                {t('Essayez de créer', 'Try to create')}
              </p>
              <Tile element={resultEl} hidden />
              <ArrowDown className="w-4 h-4 text-muted-foreground/20" />
              <div className="flex items-center gap-3">
                <Tile element={ing1El} hidden />
                <Plus className="w-4 h-4 text-muted-foreground/20 flex-shrink-0" />
                <Tile element={ing2El} hidden />
              </div>
            </div>

            <button
              onClick={startAd}
              className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-[0.97] text-black text-sm font-bold transition-all shadow-lg shadow-amber-400/15"
            >
              {t('Regarder la pub', 'Watch the ad')}
            </button>
            <p className="text-[11px] text-muted-foreground/30">{t('1 pub = 1 indice', '1 ad = 1 hint')}</p>
          </div>
        )}

        {/* ── PLAYING ────────────────────────────────────────────────────── */}
        {phase === 'playing' && (
          <div className="flex flex-col items-center gap-6 w-full animate-in fade-in duration-200">
            {/* Info while ad is showing externally */}
            <div className="w-full rounded-2xl border border-white/[0.07] bg-white/[0.03] p-8 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/15 flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-sm font-medium text-muted-foreground/60 text-center leading-relaxed">
                {t('Pub en cours…', 'Ad playing…')}
              </p>
            </div>

            {/* Progress bar → reveal button */}
            <div className="w-full">
              {canSkip ? (
                <button
                  onClick={goToReveal}
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
            <div className="text-center space-y-1">
              <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest">
                {t('Votre indice', 'Your hint')}
              </p>
              <h2 className="text-xl font-bold text-foreground">
                {t('Vous pouvez créer', 'You can create')}
              </h2>
            </div>

            <Tile element={resultEl} hidden={false} />

            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px bg-white/[0.07]" />
              <p className="text-[11px] text-muted-foreground/40 font-medium uppercase tracking-widest flex-shrink-0">
                {t('avec', 'with')}
              </p>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>

            <div className="flex items-center gap-4">
              <Tile element={ing1El} hidden={false} />
              <Plus className="w-5 h-5 text-muted-foreground/30 flex-shrink-0" />
              <Tile element={ing2El} hidden />
            </div>

            <div className="w-full pt-1">
              <button
                onClick={onComplete}
                className="w-full py-3.5 rounded-2xl bg-foreground text-background text-sm font-bold active:scale-[0.97] transition-all hover:opacity-90"
              >
                {t('OK', 'OK')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
