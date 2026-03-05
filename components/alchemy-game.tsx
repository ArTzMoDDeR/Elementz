'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { Playground } from './playground'
import { OnboardingModal } from './onboarding-modal'
import { useGameStore } from '@/hooks/use-game-store'
import { useHint } from '@/hooks/use-hint'
import { Sparkles, Lightbulb, Trash2, BarChart2, Hand, MousePointer } from 'lucide-react'

const PROGRESS_MILESTONES = [10, 20, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900]

export function AlchemyGame() {
  const [mounted, setMounted] = useState(false)
  const { data: session } = useSession()
  const { setTheme } = useTheme()
  const [showOnboarding, setShowOnboarding] = useState(false)
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

  const { hintsEnabled, setHintsEnabled, hintVisible, currentHint, hintLabel, dismissHint, requestHint, shouldPulse } = useHint(
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

  // Build mobile header notification (priority: hint > discovery > progress > tapMode > hintsToggle)
  const headerNotification = useMemo(() => {
    // Hint notification (persistent until dismissed)
    if (hintVisible && currentHint && hintLabel) {
      const el = frToElement.get(currentHint.result) ?? elements.get(currentHint.result)
      const displayName = lang === 'en'
        ? (frToEn.get(currentHint.result) ?? currentHint.result)
        : currentHint.result
      return {
        type: 'hint' as const,
        message: `${hintLabel} ${displayName}`,
        icon: <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />,
        image: el?.imageUrl || undefined,
      }
    }
    // New discovery
    if (newlyDiscovered) {
      const el = elements.get(newlyDiscovered)
      if (el) {
        return {
          type: 'discovery' as const,
          message: `${lang === 'fr' ? 'Nouveau' : 'Discovered'} ${el.name}`,
          icon: <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />,
          image: el.imageUrl || undefined,
        }
      }
    }
    // Progress milestone
    if (progressToast) {
      return {
        type: 'progress' as const,
        message: lang === 'fr'
          ? `${progressToast.count} éléments — ${progressToast.pct}% découverts`
          : `${progressToast.count} elements — ${progressToast.pct}% discovered`,
        icon: <BarChart2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#15e9ff' }} />,
      }
    }
    // Tap mode change
    if (tapModeToast !== null) {
      return {
        type: 'tapMode' as const,
        message: lang === 'fr'
          ? tapModeToast ? 'Mode tap activé' : 'Mode drag activé'
          : tapModeToast ? 'Tap mode on' : 'Drag mode on',
        icon: tapModeToast
          ? <MousePointer className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#10d9ae' }} />
          : <Hand className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#fe8f27' }} />,
      }
    }
    // Hints toggled
    if (hintsToast !== null) {
      return {
        type: 'hintsToggle' as const,
        message: lang === 'fr'
          ? hintsToast ? 'Indices activés' : 'Indices désactivés'
          : hintsToast ? 'Hints enabled' : 'Hints disabled',
        icon: <Lightbulb className={`w-3.5 h-3.5 flex-shrink-0 ${hintsToast ? 'text-amber-400' : 'text-muted-foreground'}`} />,
      }
    }
    return null
  }, [hintVisible, currentHint, hintLabel, newlyDiscovered, progressToast, tapModeToast, hintsToast, lang, elements, frToElement, frToEn])

  const handleOnboardingComplete = async (prefs: { lang: 'fr' | 'en'; theme: 'dark' | 'light'; haptic: boolean }) => {
    setShowOnboarding(false)
    setLang(prefs.lang)
    setTheme(prefs.theme)
    setHapticEnabled(prefs.haptic)
    await fetch('/api/lang', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: prefs.lang }) })
    await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: prefs.theme, haptic_feedback: prefs.haptic, onboarding_done: true }) })
  }

  const handleDismissNotification = () => {
    // Dismiss based on type
    if (hintVisible) dismissHint()
    // Toasts auto-dismiss but allow manual clear
    if (hintsToast !== null) setHintsToast(null)
    if (tapModeToast !== null) setTapModeToast(null)
    if (progressToast !== null) setProgressToast(null)
  }

  useEffect(() => { setMounted(true) }, [])

  // Load theme from DB and show onboarding on first login
  useEffect(() => {
    if (!session?.user?.id) return
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        // Apply saved theme
        if (d.theme === 'light' || d.theme === 'dark') setTheme(d.theme)
        // Show onboarding if never done
        if (!d.onboarding_done) setShowOnboarding(true)
      })
      .catch(() => {})
  }, [session?.user?.id])

  if (!mounted || !initialized) {
    return (
      <div className="h-[100dvh] w-screen flex flex-col items-center justify-center bg-background gap-8">
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
      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
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
        hintShouldPulse={shouldPulse}
        hapticEnabled={hapticEnabled}
        onToggleHaptic={() => {
          const next = !hapticEnabled
          setHapticEnabled(next)
          if (session?.user?.id) {
            fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ haptic_feedback: next }) })
          }
        }}
        onTapModeChange={handleTapModeChange}
        headerNotification={headerNotification}
        onDismissNotification={handleDismissNotification}
        playgroundItemsCount={playground.length}
        recipeMap={recipeMap}
      />

      {/* Notification stack — desktop only (mobile shows in inventory header) */}
      <div
        className="hidden md:flex fixed left-3 z-50 flex-col gap-2 pointer-events-none"
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
