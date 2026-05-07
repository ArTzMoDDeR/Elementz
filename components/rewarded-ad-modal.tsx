'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Lightbulb, Plus, Lock } from 'lucide-react'
import type { HintResult } from '@/hooks/use-hint'

// ── Config ────────────────────────────────────────────────────────────────────
const ADS_REQUIRED = 5
const DWELL_MS     = 2000 // ms before confirm button unlocks after returning

// Monetag direct link (OnClick) — NO script injected, zero auto-ads.
// Replace with your actual OnClick direct link URL from Monetag dashboard.
const DIRECT_LINK_URL = 'https://otieu.com/4/9565180'

const storageKey = (k: string) => `hint_ad_v2_${k}`
// ─────────────────────────────────────────────────────────────────────────────

type ElementDef = { number: number; name: string; imageUrl?: string; color?: string }

interface Props {
  lang: 'fr' | 'en'
  hint: HintResult
  elements: Map<string, ElementDef>
  onComplete: () => void
  onDismiss: () => void
}

const t = (lang: 'fr' | 'en', fr: string, en: string) => lang === 'fr' ? fr : en

// ── Element tile ──────────────────────────────────────────────────────────────
function Tile({ el, hidden = false, size = 'md' }: {
  el: ElementDef | undefined
  hidden?: boolean
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'w-16 h-16' : 'w-20 h-20'
  const imgDim = size === 'sm' ? 'w-7 h-7' : 'w-10 h-10'

  if (hidden || !el) {
    return (
      <div className={`${dim} rounded-2xl bg-white/[0.04] border-2 border-dashed border-white/10 flex items-center justify-center flex-shrink-0`}>
        <Lock className="w-4 h-4 text-white/15" />
      </div>
    )
  }
  return (
    <div
      className={`${dim} rounded-2xl border flex flex-col items-center justify-center gap-1 flex-shrink-0 p-2 animate-in zoom-in-95 fade-in duration-300`}
      style={{
        background: el.color ? `${el.color}12` : 'rgba(255,255,255,0.05)',
        borderColor: el.color ? `${el.color}30` : 'rgba(255,255,255,0.08)',
      }}
    >
      {el.imageUrl
        ? <img src={el.imageUrl} alt={el.name} className={`${imgDim} object-contain pointer-events-none`} draggable={false} />
        : <span className="text-lg font-bold text-muted-foreground">{el.name[0]}</span>
      }
      <span className="text-[9px] font-semibold text-center leading-tight text-foreground/60 w-full truncate px-0.5">
        {el.name}
      </span>
    </div>
  )
}

// ── 5-dot progress bar ────────────────────────────────────────────────────────
function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 w-full">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-1.5 rounded-full transition-all duration-500"
          style={{
            background: i < current
              ? '#fbbf24'
              : i === current
              ? 'rgba(251,191,36,0.2)'
              : 'rgba(255,255,255,0.07)',
          }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function RewardedAdModal({ lang, hint, elements, onComplete, onDismiss }: Props) {
  const hintKey = `${hint.result}_${hint.ing1}_${hint.ing2}`

  const [adsDone, setAdsDone] = useState<number>(() => {
    try { return Math.min(parseInt(sessionStorage.getItem(storageKey(hintKey)) ?? '0', 10), ADS_REQUIRED) }
    catch { return 0 }
  })

  // Whether the user has ever clicked the ad button (hides the hint schema)
  const [started, setStarted] = useState(() => {
    try { return parseInt(sessionStorage.getItem(storageKey(hintKey)) ?? '0', 10) > 0 }
    catch { return false }
  })

  // 'idle' | 'waiting' | 'ready'
  const [btnState, setBtnState]     = useState<'idle' | 'waiting' | 'ready'>('idle')
  const dwellRef                     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isComplete                   = adsDone >= ADS_REQUIRED

  const getEl = useCallback((num: number) => {
    for (const el of elements.values()) if (el.number === num) return el
    return undefined
  }, [elements])

  const resultEl = getEl(hint.result)
  const ing1El   = getEl(hint.ing1)
  const ing2El   = getEl(hint.ing2)

  // Persist progress
  useEffect(() => {
    try { sessionStorage.setItem(storageKey(hintKey), String(adsDone)) } catch {}
  }, [adsDone, hintKey])

  useEffect(() => () => { if (dwellRef.current) clearTimeout(dwellRef.current) }, [])

  // On tab-focus return while in 'waiting' state, auto-transition to 'ready'
  useEffect(() => {
    if (btnState !== 'waiting') return
    const onFocus = () => setBtnState(s => s === 'waiting' ? 'ready' : s)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onFocus()
    })
    return () => window.removeEventListener('focus', onFocus)
  }, [btnState])

  const handleAdClick = useCallback(() => {
    if (btnState === 'waiting') return
    // Open the direct link in a new tab — no script, no popup blocker issue
    window.open(DIRECT_LINK_URL, '_blank', 'noopener,noreferrer')
    setStarted(true)
    setBtnState('waiting')
    // Fallback: unlock confirm after DWELL_MS even if focus event doesn't fire
    if (dwellRef.current) clearTimeout(dwellRef.current)
    dwellRef.current = setTimeout(() => setBtnState(s => s === 'waiting' ? 'ready' : s), DWELL_MS)
  }, [btnState])

  const handleConfirm = useCallback(() => {
    if (dwellRef.current) clearTimeout(dwellRef.current)
    setBtnState('idle')
    setAdsDone(prev => Math.min(prev + 1, ADS_REQUIRED))
  }, [])

  // ── REVEAL ──────────────────────────────────────────────────────────────
  if (isComplete) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center">
        <div className="absolute inset-0 bg-background/95 backdrop-blur-2xl" onClick={onComplete} />
        <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center px-6 gap-7 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 bg-amber-400/10 px-3 py-1 rounded-full mb-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest">
                {t(lang, 'Votre indice', 'Your hint')}
              </span>
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {t(lang, 'Essayez de créer', 'Try to create')}
            </h2>
          </div>

          {/* Result revealed */}
          <Tile el={resultEl} hidden={false} />

          <div className="w-full flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] text-muted-foreground/30 font-medium uppercase tracking-widest">
              {t(lang, 'avec', 'with')}
            </span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Ingredients: one revealed, one still hidden */}
          <div className="flex items-center gap-4">
            <Tile el={ing1El} hidden={false} />
            <Plus className="w-5 h-5 text-muted-foreground/20 flex-shrink-0" />
            <Tile el={ing2El} hidden />
          </div>

          <button
            onClick={onComplete}
            className="w-full py-3.5 rounded-2xl bg-foreground text-background text-sm font-bold active:scale-[0.97] transition-all"
          >
            {t(lang, "J'ai compris !", 'Got it!')}
          </button>
        </div>
      </div>
    )
  }

  // ── MAIN ─────────────────────────────────────────────────────────────────
  const isReady   = btnState === 'ready'
  const isWaiting = btnState === 'waiting'

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      <div className="absolute inset-0 bg-background/95 backdrop-blur-2xl" />

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center px-6 gap-6 animate-in fade-in duration-200">

        {/* Close button — never triggers an ad */}
        <button
          onClick={onDismiss}
          className="absolute -top-2 right-0 w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-white/10 transition-colors"
          aria-label={t(lang, 'Fermer', 'Close')}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1 pt-2">
          <div className="inline-flex items-center gap-1.5 bg-amber-400/10 px-3 py-1 rounded-full mb-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest">
              {t(lang, 'Indice', 'Hint')}
            </span>
          </div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            {t(lang, 'Débloquer un indice', 'Unlock a hint')}
          </h2>
        </div>

        {/* Hint schema — only shown before first ad click */}
        {!started && (
          <div className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col items-center gap-3 animate-in fade-in duration-300">
            <p className="text-[10px] font-semibold text-muted-foreground/30 uppercase tracking-widest">
              {t(lang, 'Votre prochain indice', 'Your next hint')}
            </p>
            <Tile el={resultEl} hidden size="sm" />
            <div className="w-px h-4 bg-white/[0.08]" />
            <div className="flex items-center gap-3">
              <Tile el={ing1El} hidden size="sm" />
              <Plus className="w-3.5 h-3.5 text-white/15 flex-shrink-0" />
              <Tile el={ing2El} hidden size="sm" />
            </div>
          </div>
        )}

        {/* Progress — always visible */}
        <div className="w-full space-y-2.5">
          <ProgressBar current={adsDone} total={ADS_REQUIRED} />
          <p className="text-center text-[11px] text-muted-foreground/30 tabular-nums">
            {adsDone}/{ADS_REQUIRED} {t(lang, 'pubs regardées', 'ads watched')}
          </p>
        </div>

        {/* Single action button */}
        <button
          onClick={isReady ? handleConfirm : handleAdClick}
          disabled={isWaiting}
          className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed"
          style={{
            background: isWaiting
              ? 'rgba(251,191,36,0.10)'
              : '#fbbf24',
            color: isWaiting ? 'rgba(251,191,36,0.3)' : '#000',
          }}
        >
          {isWaiting
            ? t(lang, 'Reviens sur la page…', 'Come back to this page…')
            : isReady
            ? t(lang, 'Compter cette pub', 'Count this ad')
            : adsDone === 0
            ? t(lang, 'Voir une pub', 'View an ad')
            : t(lang, 'Voir une autre pub', 'View another ad')
          }
        </button>

        <p className="text-[10px] text-muted-foreground/20 text-center pb-2">
          {t(lang, 'La pub s\'ouvre dans un nouvel onglet', 'The ad opens in a new tab')}
        </p>
      </div>
    </div>
  )
}
