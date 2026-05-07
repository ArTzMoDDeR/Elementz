'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Lightbulb, Plus, ArrowDown, ExternalLink } from 'lucide-react'
import type { HintResult } from '@/hooks/use-hint'

// ── Config ────────────────────────────────────────────────────────────────────
const ADS_REQUIRED   = 5   // number of ad clicks required
const DWELL_MS       = 2000 // ms user must wait before the confirm button appears

// Storage key — per hint so progress resets for each new hint request
const storageKey = (hintKey: string) => `hint_ad_progress_${hintKey}`

// ── Monetag on-demand interstitial ───────────────────────────────────────────
// Injects the Monetag tag script only at click time, never globally.
const MONETAG_ZONE    = '237069'
const MONETAG_TAG_URL = 'https://quge5.com/88/tag.min.js'

function openMonetagAd(): void {
  const w = window as Record<string, unknown>
  const candidates = [`__show_${MONETAG_ZONE}`, `show_${MONETAG_ZONE}`]

  const tryShow = () => {
    for (const name of candidates) {
      if (typeof w[name] === 'function') {
        const fn = w[name] as () => void
        try { fn() } catch { /* ignore */ }
        return
      }
    }
  }

  // Script already injected — just call the show function
  if (document.getElementById('monetag-tag')) { tryShow(); return }

  const s = document.createElement('script')
  s.id   = 'monetag-tag'
  s.src  = MONETAG_TAG_URL
  s.setAttribute('data-zone', MONETAG_ZONE)
  s.setAttribute('data-cfasync', 'false')
  s.async = true
  s.onload = () => setTimeout(tryShow, 200)
  document.head.appendChild(s)
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

type Phase = 'intro' | 'watching' | 'dwell' | 'reveal'

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

// ── Progress dots ─────────────────────────────────────────────────────────────
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`transition-all duration-300 rounded-full ${
            i < current
              ? 'w-3 h-3 bg-amber-400'
              : i === current
              ? 'w-3 h-3 bg-amber-400/40 ring-2 ring-amber-400/30'
              : 'w-2.5 h-2.5 bg-white/10'
          }`}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function RewardedAdModal({ lang, hint, elements, onComplete, onDismiss }: Props) {
  const hintKey = `${hint.result}_${hint.ing1}_${hint.ing2}`

  // Restore progress from session — persists if user closes & reopens modal
  const [adsDone, setAdsDone] = useState<number>(() => {
    try { return Math.min(parseInt(sessionStorage.getItem(storageKey(hintKey)) ?? '0', 10), ADS_REQUIRED) }
    catch { return 0 }
  })

  const [phase,         setPhase]        = useState<Phase>('intro')
  const [canConfirm,    setCanConfirm]   = useState(false)
  const dwellRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  const getEl = useCallback((num: number): ElementDef | undefined => {
    for (const el of elements.values()) if (el.number === num) return el
    return undefined
  }, [elements])

  const resultEl = getEl(hint.result)
  const ing1El   = getEl(hint.ing1)
  const ing2El   = getEl(hint.ing2)

  // Save progress to session whenever adsDone changes
  useEffect(() => {
    try { sessionStorage.setItem(storageKey(hintKey), String(adsDone)) } catch { /* ignore */ }
  }, [adsDone, hintKey])

  // When dwell phase starts, unlock the confirm button after DWELL_MS
  useEffect(() => {
    if (phase !== 'dwell') return
    setCanConfirm(false)
    dwellRef.current = setTimeout(() => setCanConfirm(true), DWELL_MS)
    return () => { if (dwellRef.current) clearTimeout(dwellRef.current) }
  }, [phase])

  const creditAd = useCallback(() => {
    setAdsDone(prev => {
      const next = prev + 1
      if (next >= ADS_REQUIRED) {
        setPhase('reveal')
      } else {
        setPhase('intro')
      }
      return next
    })
    setDwellElapsed(0)
  }, [])

  const handleAdClick = useCallback(() => {
    openMonetagAd()
    setPhase('dwell')
  }, [])

  const handleConfirm = useCallback(() => {
    creditAd()
  }, [creditAd])

  const handleDismiss = () => {
    if (dwellRef.current) clearTimeout(dwellRef.current)
    onDismiss()
  }

  useEffect(() => () => {
    if (dwellRef.current) clearTimeout(dwellRef.current)
  }, [])

  const isComplete = adsDone >= ADS_REQUIRED

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/96 backdrop-blur-2xl" />

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center px-6">

        {/* ── INTRO / between ads ────────────────────────────────────────── */}
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

            {/* Progress indicator */}
            <div className="flex flex-col items-center gap-2">
              <ProgressDots current={adsDone} total={ADS_REQUIRED} />
              <p className="text-xs font-semibold text-muted-foreground/50 tabular-nums">
                {adsDone > 0
                  ? t(`${adsDone}/${ADS_REQUIRED} — encore ${ADS_REQUIRED - adsDone}`, `${adsDone}/${ADS_REQUIRED} — ${ADS_REQUIRED - adsDone} more`)
                  : t(`${ADS_REQUIRED} pubs pour débloquer`, `${ADS_REQUIRED} ads to unlock`)}
              </p>
            </div>

            <div className="text-center space-y-1.5">
              <h2 className="text-xl font-bold text-foreground tracking-tight">
                {adsDone === 0
                  ? t('Débloquer un indice', 'Unlock a hint')
                  : t('Continue !', 'Keep going!')}
              </h2>
              <p className="text-sm text-muted-foreground/70 leading-relaxed">
                {t(
                  `Clique sur ${ADS_REQUIRED} pubs (2s chacune) pour révéler ton indice.`,
                  `Click ${ADS_REQUIRED} ads (2s each) to reveal your hint.`
                )}
              </p>
            </div>

            {/* Teaser */}
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
              onClick={handleAdClick}
              className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-[0.97] text-black text-sm font-bold transition-all shadow-lg shadow-amber-400/15 flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              {adsDone === 0 ? t('Voir la pub', 'View ad') : t('Pub suivante', 'Next ad')}
            </button>
            <p className="text-[11px] text-muted-foreground/30">
              {t('Reste 2s sur la pub pour qu\'elle compte', 'Stay 2s on the ad for it to count')}
            </p>
          </div>
        )}

        {/* ── DWELL — confirm after 2s ───────────────────────────────────── */}
        {phase === 'dwell' && (
          <div className="flex flex-col items-center gap-7 w-full animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-3xl bg-amber-400/10 border border-amber-400/15 flex items-center justify-center">
              <ExternalLink className="w-7 h-7 text-amber-400" />
            </div>

            <div className="text-center space-y-1.5">
              <h2 className="text-lg font-bold text-foreground">
                {t('Pub ouverte !', 'Ad opened!')}
              </h2>
              <p className="text-sm text-muted-foreground/60 leading-relaxed">
                {canConfirm
                  ? t('Clique sur le bouton ci-dessous pour valider.', 'Click the button below to confirm.')
                  : t('Patiente 2s sur la pub…', 'Wait 2s on the ad…')}
              </p>
            </div>

            <ProgressDots current={adsDone} total={ADS_REQUIRED} />

            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.97] flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              style={{
                background: canConfirm ? '#fbbf24' : 'rgba(251,191,36,0.15)',
                color: canConfirm ? '#000' : 'rgba(251,191,36,0.4)',
              }}
            >
              {canConfirm ? t('Compter cette pub', 'Count this ad') : t('Patiente…', 'Wait…')}
            </button>

            <button
              onClick={handleDismiss}
              className="text-xs text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
            >
              {t('Annuler', 'Cancel')}
            </button>
          </div>
        )}

        {/* ── REVEAL ─────────────────────────────────────────────────────── */}
        {(phase === 'reveal' || isComplete) && (
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
