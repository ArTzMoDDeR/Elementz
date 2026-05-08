'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { Playground } from './playground'
import { OnboardingModal } from './onboarding-modal'
import { RewardedAdModal } from './rewarded-ad-modal'
import { useGameStore } from '@/hooks/use-game-store'
import { useHint } from '@/hooks/use-hint'
import { subscribeToPush, unsubscribeFromPush } from '@/hooks/use-push-subscription'
import { Sparkles, Lightbulb, Trash2, BarChart2, Hand, MousePointer } from 'lucide-react'

const PROGRESS_MILESTONES = [10, 20, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900]

function PushPromptModal({ lang, onAccept, onDecline }: { lang: string; onAccept: () => void; onDecline: () => void }) {
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en
  return (
    <div className="fixed inset-0 z-[9998] flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="w-full max-w-sm bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden mx-4 sm:mx-0 mb-4 sm:mb-0">
        <div className="px-6 pt-6 pb-8 flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <span className="text-2xl">🔔</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{t('Activer les notifications ?', 'Enable notifications?')}</h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {t(
                  "Reçois une alerte quand de nouveaux éléments sont ajoutés ou quand il y a une mise à jour.",
                  "Get notified when new elements are added or when there's an update."
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onDecline}
              className="flex-1 h-12 rounded-2xl bg-muted/50 border border-border text-foreground/60 font-semibold text-sm active:scale-[0.98] transition-transform">
              {t('Non merci', 'No thanks')}
            </button>
            <button onClick={onAccept}
              className="flex-1 h-12 rounded-2xl bg-indigo-500 text-white font-semibold text-sm active:scale-[0.98] transition-transform">
              {t('Activer', 'Enable')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AlchemyGame() {
  const [mounted, setMounted] = useState(false)
  const { data: session } = useSession()
  const { setTheme } = useTheme()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showPushPrompt, setShowPushPrompt] = useState(false)
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true)
  const {
    lang,
    setLang,
    elements,
    elementsByName,
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

  const {
    hintsEnabled, setHintsEnabled,
    hintVisible, currentHint, hintLabel, dismissHint,
    requestHint, shouldPulse,
    showAdModal, onAdComplete, onAdDismiss,
    isAdUnlocked,
  } = useHint(
    discovered,
    recipeMap,
    lastUnlockTime,
    lang,
  )

  // Preload all element images once the elements map is ready so they are
  // already cached when rendered in the inventory, playground, or codex tab.
  useEffect(() => {
    if (!elements || elements.size === 0) return
    elements.forEach(el => {
      if (el.imageUrl) {
        const img = new Image()
        img.src = el.imageUrl
      }
    })
  }, [elements])

  useEffect(() => {
    // Both newlyDiscovered and currentHint.result are element numbers now — direct comparison
    if (newlyDiscovered == null || !currentHint || !hintVisible) return
    if (newlyDiscovered === currentHint.result) dismissHint()
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

  // Build mobile header notification (priority: discovery > progress > tapMode > hintsToggle)
  const headerNotification = useMemo(() => {
    // New discovery
    if (newlyDiscovered != null) {
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
  }, [hintVisible, currentHint, hintLabel, newlyDiscovered, progressToast, tapModeToast, hintsToast, lang, elements])

  const handleOnboardingComplete = async (prefs: { lang: 'fr' | 'en'; theme: 'dark' | 'light'; haptic: boolean; username: string; avatar: string; enablePush: boolean }) => {
    setShowOnboarding(false)
    setLang(prefs.lang)
    setTheme(prefs.theme)
    setHapticEnabled(prefs.haptic)
    await fetch('/api/lang', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: prefs.lang }) })
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: prefs.theme,
        haptic_feedback: prefs.haptic,
        onboarding_done: true,
        push_prompt_shown: true,
        push_notifications: prefs.enablePush,
        username: prefs.username || null,
        avatar: prefs.avatar,
      }),
    })
    if (prefs.enablePush) {
      const ok = await subscribeToPush(prefs.lang)
      setPushNotificationsEnabled(ok)
    } else {
      setPushNotificationsEnabled(false)
    }
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
        // Apply saved push notifications preference
        if (typeof d.push_notifications === 'boolean') setPushNotificationsEnabled(d.push_notifications)
        // Show one-time push prompt for existing users who haven't been asked yet
        if (d.onboarding_done && !d.push_prompt_shown && typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'default') {
            // Never asked — show the popup
            setShowPushPrompt(true)
          } else if (Notification.permission === 'granted') {
            // Already granted in browser — silently re-subscribe and mark as shown
            subscribeToPush(d.lang === 'fr' ? 'fr' : 'en').then(ok => {
              setPushNotificationsEnabled(ok)
              fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ push_prompt_shown: true, push_notifications: ok }) })
            })
          } else {
            // Denied — just mark as shown, no popup
            fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ push_prompt_shown: true, push_notifications: false }) })
          }
        }
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
      {showOnboarding && <OnboardingModal elementsByName={elementsByName} onComplete={handleOnboardingComplete} />}

      {/* One-time push notification permission prompt for existing users */}
      {showPushPrompt && (
        <PushPromptModal
          lang={lang}
          onAccept={async () => {
            setShowPushPrompt(false)
            const ok = await subscribeToPush(lang as 'fr' | 'en')
            setPushNotificationsEnabled(ok)
            fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ push_prompt_shown: true, push_notifications: ok }) })
          }}
          onDecline={() => {
            setShowPushPrompt(false)
            fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ push_prompt_shown: true, push_notifications: false }) })
          }}
        />
      )}

      {/* Rewarded ad modal — shown when user clicks hint button (1 ad = 1 hint) */}
      {showAdModal && currentHint && (
        <RewardedAdModal
          lang={lang}
          hint={currentHint}
          elements={elements}
          onComplete={onAdComplete}
          onDismiss={onAdDismiss}
        />
      )}

      <Playground
        items={playground}
        elements={elements}
        elementsByName={elementsByName}
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
        sessionUser={session?.user ? { id: session.user.id, name: session.user.name, email: session.user.email, image: session.user.image } : null}
        hintsEnabled={hintsEnabled}
        onToggleHints={handleToggleHints}
        onRequestHint={requestHint}
        hintShouldPulse={shouldPulse}
        hintAdLocked={!isAdUnlocked}
        hapticEnabled={hapticEnabled}
        onToggleHaptic={() => {
          const next = !hapticEnabled
          setHapticEnabled(next)
          if (session?.user?.id) {
            fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ haptic_feedback: next }) })
          }
        }}
        pushNotificationsEnabled={pushNotificationsEnabled}
        onTogglePushNotifications={async () => {
          const next = !pushNotificationsEnabled
          if (next) {
            const ok = await subscribeToPush(lang as 'fr' | 'en')
            if (!ok) return // permission denied — don't toggle on
          } else {
            await unsubscribeFromPush()
          }
          setPushNotificationsEnabled(next)
          if (session?.user?.id) {
            fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ push_notifications: next }) })
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

        {/* Desktop-only discovery toast (no sheet on desktop) */}
        {newlyDiscovered != null && (() => {
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


      </div>

      {/* ── iOS Discovery Bottom Sheet (mobile only) ───────────────── */}
      {newlyDiscovered != null && (() => {
        const el = elements.get(newlyDiscovered)
        if (!el) return null
        return (
          <div
            className="md:hidden fixed inset-x-0 bottom-0 z-[200] pointer-events-none"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 72px)' }}
          >
            <div
              className="mx-4 pointer-events-auto sheet-enter"
              onClick={handleDismissNotification}
            >
              <div
                className="glass rounded-3xl border border-white/[0.08] shadow-2xl px-4 py-4 flex items-center gap-4"
                style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.06) inset' }}
              >
                {/* Element image */}
                <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                  {el.imageUrl
                    ? <img src={el.imageUrl} alt={el.name} className="w-10 h-10 object-contain" draggable={false} />
                    : <Sparkles className="w-6 h-6 text-amber-400" />
                  }
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                    {lang === 'fr' ? 'Nouvel élément' : 'New element'}
                  </p>
                  <p className="text-lg font-bold text-foreground leading-tight mt-0.5 truncate">{el.name}</p>
                  <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                    {discovered.size}<span className="opacity-50">/{totalElements}</span>
                  </p>
                </div>
                {/* Sparkle icon */}
                <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0 opacity-70" />
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
