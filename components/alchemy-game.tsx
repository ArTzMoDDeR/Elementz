'use client'

import { useRef, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Playground } from './playground'
import { useGameStore } from '@/hooks/use-game-store'
import { useHint } from '@/hooks/use-hint'
import { Sparkles, Lightbulb, Trash2, BarChart2, Hand, MousePointer } from 'lucide-react'

const PROGRESS_MILESTONES = [10, 20, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900]

export function AlchemyGame() {
  const [mounted, setMounted] = useState(false)
  const { data: session } = useSession()
  const {
    lang,
    setLang,
    elements,
    frToElement,
    frToEn,
    hapticEnabled,
    setHapticEnabled,
    discovered,
    recipeMap,
    playground,
    newlyDiscovered,
    initialized,
    totalElements,
    lastUnlockTime,
    addToPlayground,
    moveOnPlayground,
    removeFromPlayground,
    clearPlayground,
    tryMerge,
    dropAndMerge,
    resetProgress,
    unlockAll,
  } = useGameStore()

  const { hintsEnabled, setHintsEnabled, hintVisible, currentHint, hintLabel, dismissHint, requestHint } = useHint(
    discovered,
    recipeMap,
    lastUnlockTime,
    lang,
  )

  // Auto-dismiss hint when the hinted element is discovered
  useEffect(() => {
    if (!newlyDiscovered || !currentHint || !hintVisible) return
    // currentHint.result is always FR name, newlyDiscovered is lang-dependent
    // Check both FR and EN names to be safe
    const hintedFr = currentHint.result
    const hintedEn = frToEn.get(hintedFr) ?? hintedFr
    if (newlyDiscovered === hintedFr || newlyDiscovered === hintedEn) {
      dismissHint()
    }
  }, [newlyDiscovered, currentHint, hintVisible, dismissHint])

  // Toast when hints toggled
  const [hintsToast, setHintsToast] = useState<boolean | null>(null)
  const hintsToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleToggleHints = () => {
    const next = !hintsEnabled
    setHintsEnabled(() => next)
    if (hintsToastTimer.current) clearTimeout(hintsToastTimer.current)
    setHintsToast(next)
    hintsToastTimer.current = setTimeout(() => setHintsToast(null), 2000)
  }

  // Tap mode toast
  const [tapModeToast, setTapModeToast] = useState<boolean | null>(null)
  const tapModeToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleTapModeChange = (enabled: boolean) => {
    if (tapModeToastTimer.current) clearTimeout(tapModeToastTimer.current)
    setTapModeToast(enabled)
    tapModeToastTimer.current = setTimeout(() => setTapModeToast(null), 2000)
  }

  // Progress toast — only on milestones
  const [progressToast, setProgressToast] = useState<{ count: number; pct: number } | null>(null)
  const progressToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!newlyDiscovered || !totalElements) return
    const count = discovered.size
    if (!PROGRESS_MILESTONES.includes(count)) return
    const pct = Math.round((count / totalElements) * 100)
    if (progressToastTimer.current) clearTimeout(progressToastTimer.current)
    setProgressToast({ count, pct })
    progressToastTimer.current = setTimeout(() => setProgressToast(null), 2500)
  }, [newlyDiscovered])

  useEffect(() => { setMounted(true) }, [])

  if (!mounted || !initialized) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-8">
        {/* Logo */}
        <div className="relative flex items-center justify-center">
          {/* Outer pulse ring */}
          <div className="absolute w-24 h-24 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }} />
          {/* Inner ring */}
          <div className="absolute w-20 h-20 rounded-full bg-primary/8 animate-pulse" />
          {/* Logo */}
          <img
            src="/logo.png"
            alt="Elementz"
            className="relative w-16 h-16 rounded-2xl shadow-lg"
          />
        </div>

        {/* Title */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-bold text-2xl tracking-tight text-foreground font-sans">Elementz</h1>
          {/* Loading bar */}
          <div className="w-32 h-0.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-[loading_1.5s_ease-in-out_infinite]" />
          </div>
          <p className="text-xs text-muted-foreground tracking-widest uppercase font-sans">Loading</p>
        </div>
      </div>
    )
  }

  return (
    <div className="game-container bg-background">
      <Playground
        items={playground}
        elements={elements}
        discovered={discovered}
        totalElements={totalElements}
        lang={lang}
        onSetLang={setLang}
        onDrop={addToPlayground}
        onMove={moveOnPlayground}
        onMerge={tryMerge}
        onDropAndMerge={dropAndMerge}
        onRemove={removeFromPlayground}
        onClear={clearPlayground}
        onReset={resetProgress}
        onUnlockAll={unlockAll}
        sessionUser={session?.user ? { name: session.user.name, email: session.user.email, image: session.user.image } : null}
        hintsEnabled={hintsEnabled}
        onToggleHints={handleToggleHints}
        onRequestHint={requestHint}
        hapticEnabled={hapticEnabled}
        onToggleHaptic={() => {
          const next = !hapticEnabled
          setHapticEnabled(next)
          if (session?.user?.id) {
            fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ haptic_feedback: next }) })
          }
        }}
        onTapModeChange={handleTapModeChange}
      />

      {/* Clear button — top right of canvas on mobile, safe area aware */}
      {playground.length > 0 && (
        <button
          onClick={clearPlayground}
          className="fixed right-3 md:left-3 md:right-auto z-40 flex items-center justify-center w-9 h-9 rounded-xl bg-card/80 border border-border backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-card transition-colors shadow-sm"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
          title={lang === 'fr' ? 'Vider le terrain' : 'Clear playground'}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Notification stack — top left, below notch */}
      <div
        className="fixed left-3 z-50 flex flex-col gap-2 pointer-events-none"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >

        {/* Hints toggled */}
        {hintsToast !== null && (
          <div className="animate-in slide-in-from-left-4 fade-in duration-200 pointer-events-auto">
            <div className="flex items-center gap-2.5 pl-3 pr-3 py-2.5 bg-card border border-border rounded-xl shadow-lg backdrop-blur-sm">
              <Lightbulb className={`w-3.5 h-3.5 flex-shrink-0 ${hintsToast ? 'text-amber-400' : 'text-muted-foreground'}`} />
              <span className="text-xs text-muted-foreground leading-snug">
                {lang === 'fr'
                  ? hintsToast ? 'Indices activés' : 'Indices désactivés'
                  : hintsToast ? 'Hints enabled' : 'Hints disabled'}
              </span>
            </div>
          </div>
        )}

        {/* New element */}
        {newlyDiscovered && (() => {
          const el = elements.get(newlyDiscovered)
          if (!el) return null
          return (
            <div className="animate-in slide-in-from-left-4 fade-in duration-200 pointer-events-auto">
              <div className="flex items-center gap-2.5 pl-3 pr-3 py-2.5 bg-card border border-border rounded-xl shadow-lg backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="text-xs text-muted-foreground leading-snug">
                  {lang === 'fr' ? 'Nouveau' : 'Discovered'} <span className="font-semibold text-foreground">{el.name}</span>
                </span>
                {el.imageUrl && (
                  <img src={el.imageUrl} alt={el.name} className="w-6 h-6 object-contain flex-shrink-0" />
                )}
              </div>
            </div>
          )
        })()}

        {/* Tap / Grab mode */}
        {tapModeToast !== null && (
          <div className="animate-in slide-in-from-left-4 fade-in duration-200 pointer-events-auto">
            <div className="flex items-center gap-2.5 pl-3 pr-3 py-2.5 bg-card border border-border rounded-xl shadow-lg backdrop-blur-sm">
              {tapModeToast
                ? <MousePointer className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#10d9ae' }} />
                : <Hand className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#fe8f27' }} />
              }
              <span className="text-xs text-muted-foreground leading-snug">
                {lang === 'fr'
                  ? tapModeToast ? 'Mode tap activé' : 'Mode drag activé'
                  : tapModeToast ? 'Tap mode on' : 'Drag mode on'}
              </span>
            </div>
          </div>
        )}

        {/* Progress milestone */}
        {progressToast !== null && (
          <div className="animate-in slide-in-from-left-4 fade-in duration-200 pointer-events-auto">
            <div className="flex items-center gap-2.5 pl-3 pr-3 py-2.5 bg-card border border-border rounded-xl shadow-lg backdrop-blur-sm">
              <BarChart2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#15e9ff' }} />
              <span className="text-xs text-muted-foreground leading-snug">
                {lang === 'fr'
                  ? <><span className="font-semibold text-foreground">{progressToast.count}</span> éléments — <span className="font-semibold text-foreground">{progressToast.pct}%</span> découverts</>
                  : <><span className="font-semibold text-foreground">{progressToast.count}</span> elements — <span className="font-semibold text-foreground">{progressToast.pct}%</span> discovered</>
                }
              </span>
            </div>
          </div>
        )}

        {/* Hint */}
        {hintVisible && currentHint && hintLabel && (() => {
          // currentHint.result is always a French name (recipeMap uses FR keys)
          // Look up image via frToElement, display name via frToEn when in EN mode
          const el = frToElement.get(currentHint.result) ?? elements.get(currentHint.result)
          const displayName = lang === 'en'
            ? (frToEn.get(currentHint.result) ?? currentHint.result)
            : currentHint.result
          return (
            <div
              className="animate-in slide-in-from-left-4 fade-in duration-200 pointer-events-auto cursor-pointer"
              onClick={dismissHint}
            >
              <div className="flex items-center gap-2.5 pl-3 pr-3 py-2.5 bg-card border border-border rounded-xl shadow-lg backdrop-blur-sm">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="text-xs text-muted-foreground leading-snug">
                  {hintLabel} <span className="font-semibold text-foreground">{displayName}</span>
                </span>
                {el?.imageUrl && (
                  <img src={el.imageUrl} alt={currentHint.result} className="w-6 h-6 object-contain flex-shrink-0" />
                )}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
