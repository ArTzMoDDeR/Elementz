'use client'

import { useRef, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { Playground } from './playground'
import { OnboardingModal } from './onboarding-modal'
import { RewardedAdModal } from './rewarded-ad-modal'
import { useGameStore } from '@/hooks/use-game-store'
import { useHint } from '@/hooks/use-hint'
import { capacitorSubscribeToPush, capacitorUnsubscribeFromPush, isPushDenied } from '@/hooks/use-capacitor-push'
import { Lightbulb, Trash2, BarChart2, Hand, MousePointer } from 'lucide-react'
import { type ElementDef } from '@/lib/game-data'

const PROGRESS_MILESTONES = [10, 20, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900]

function PushPromptModal({ lang, onAccept, onDecline }: { lang: string; onAccept: () => void; onDecline: () => void }) {
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en
  const isDenied = typeof Notification !== 'undefined' && Notification.permission === 'denied'

  return (
    <div className="fixed inset-0 z-[9998] flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="w-full max-w-sm bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden mx-4 sm:mx-0 mb-4 sm:mb-0">
        <div className="px-6 pt-6 pb-8 flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${isDenied ? 'bg-red-500/10 border border-red-500/20' : 'bg-indigo-500/10 border border-indigo-500/20'}`}>
              {isDenied ? '🔕' : '🔔'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {isDenied
                  ? t('Notifications bloquées', 'Notifications blocked')
                  : t('Activer les notifications ?', 'Enable notifications?')}
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {isDenied
                  ? t(
                      "Tu as bloqué les notifications. Pour les activer, va dans les réglages de ton navigateur et autorise les notifications pour ce site.",
                      "You've blocked notifications. To enable them, go to your browser settings and allow notifications for this site."
                    )
                  : t(
                      "Reçois une alerte quand de nouveaux éléments sont ajoutés ou quand il y a une mise à jour.",
                      "Get notified when new elements are added or when there's an update."
                    )}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onDecline}
              className="flex-1 h-12 rounded-2xl bg-muted/50 border border-border text-foreground/60 font-semibold text-sm active:scale-[0.98] transition-transform cursor-pointer">
              {t('Fermer', 'Close')}
            </button>
            {!isDenied && (
              <button onClick={onAccept}
                className="flex-1 h-12 rounded-2xl bg-indigo-500 text-white font-semibold text-sm active:scale-[0.98] transition-transform cursor-pointer">
                {t('Activer', 'Enable')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Quest element fullscreen reveal ─────────────────────────────────────────
// Shown once (ever) when the player discovers an element tied to a discover_element quest.
function QuestElementReveal({
  element,
  questTitle,
  lang,
  onDismiss,
}: {
  element: ElementDef
  questTitle: string
  lang: 'fr' | 'en'
  onDismiss: () => void
}) {
  const skipRef = useRef<(() => void) | null>(null)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const dismiss = () => {
      setExiting(true)
      setTimeout(onDismiss, 380)
    }
    const t = setTimeout(dismiss, 4000)
    skipRef.current = () => { clearTimeout(t); dismiss() }
    return () => clearTimeout(t)
  }, [onDismiss])

  const handleTap = () => {
    const fn = skipRef.current
    skipRef.current = null
    if (fn) fn()
  }

  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  return (
    <div
      className="fixed inset-0 z-[10010] flex flex-col cursor-pointer select-none"
      style={{
        background: 'var(--background)',
        paddingTop:    'calc(env(safe-area-inset-top, 0px) + 4rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 3rem)',
        animation: exiting
          ? 'questRevealOut 0.38s cubic-bezier(0.4,0,1,1) forwards'
          : 'questRevealIn 0.42s cubic-bezier(0.22,1,0.36,1) forwards',
      }}
      onClick={handleTap}
    >
      <div className="flex flex-col items-center justify-center gap-8 w-full max-w-sm mx-auto flex-1">
        {/* Glowing ring behind the element image */}
        <div className="relative flex items-center justify-center onboard-pop" style={{ animationDelay: '0.05s' }}>
          <div
            className="absolute w-44 h-44 rounded-full"
            style={{
              background: `radial-gradient(circle, ${element.color ?? 'oklch(0.72 0.22 200)'}22 0%, transparent 70%)`,
              animation: 'questRingPulse 2.2s ease-in-out infinite',
            }}
          />
          <div
            className="w-32 h-32 rounded-3xl flex items-center justify-center"
            style={{
              background: `${element.color ?? 'oklch(0.72 0.22 200)'}18`,
              border: `1.5px solid ${element.color ?? 'oklch(0.72 0.22 200)'}40`,
              boxShadow: `0 0 40px ${element.color ?? 'oklch(0.72 0.22 200)'}25`,
            }}
          >
            {element.imageUrl
              ? <img src={element.imageUrl} alt={element.name} className="w-20 h-20 object-contain" draggable={false} />
              : <span className="text-5xl">{element.name[0]}</span>
            }
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-3 text-center onboard-fade-up" style={{ animationDelay: '0.12s' }}>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
            {t('Quête débloquée', 'Quest unlocked')}
          </p>
          <h2 className="text-5xl font-bold text-foreground text-balance leading-tight">
            {element.name}
          </h2>
          <p className="text-sm text-muted-foreground/60 leading-relaxed text-pretty">
            {questTitle}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground/30 text-center w-full">{t('Appuie pour continuer', 'Tap to continue')}</p>
    </div>
  )
}

// ─── iOS-style top discovery pill ────────────────────────────────────────────

const DISCOVERY_MESSAGES_FR = [
  (name: string) => `Bravo ! Tu viens de découvrir ${name}`,
  (name: string) => `Incroyable ! ${name} est maintenant débloqué`,
  (name: string) => `Bien joué ! Tu as trouvé ${name}`,
  (name: string) => `Nouveau ! ${name} rejoint ta collection`,
  (name: string) => `Excellent ! Tu as créé ${name}`,
  (name: string) => `Super ! ${name} vient d'apparaître`,
  (name: string) => `Magnifique ! ${name} est découvert`,
  (name: string) => `Impressionnant ! Tu as débloqué ${name}`,
  (name: string) => `Parfait ! ${name} est à toi`,
  (name: string) => `Génial ! Tu viens de créer ${name}`,
]

const DISCOVERY_MESSAGES_EN = [
  (name: string) => `Bravo! You just discovered ${name}`,
  (name: string) => `Incredible! ${name} is now unlocked`,
  (name: string) => `Nice one! You found ${name}`,
  (name: string) => `New! ${name} joins your collection`,
  (name: string) => `Excellent! You created ${name}`,
  (name: string) => `Amazing! ${name} just appeared`,
  (name: string) => `Wonderful! ${name} is discovered`,
  (name: string) => `Impressive! You unlocked ${name}`,
  (name: string) => `Perfect! ${name} is yours`,
  (name: string) => `Awesome! You just created ${name}`,
]

function DiscoveryPill({
  newlyDiscovered,
  lastComboIngredients,
  elements,
  lang,
  onDismiss,
}: {
  newlyDiscovered: number | null
  lastComboIngredients: [number, number] | null
  elements: Map<number, ElementDef>
  lang: 'fr' | 'en'
  onDismiss: () => void
}) {
  const pillRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ y: number; startTranslate: number } | null>(null)
  const [translateY, setTranslateY]   = useState(0)
  const [exiting, setExiting]         = useState(false)
  const [msgIndex, setMsgIndex]       = useState(0)

  // Reset on new discovery and pick a fresh random message variant
  useEffect(() => {
    if (newlyDiscovered != null) {
      setTranslateY(0)
      setExiting(false)
      setMsgIndex(Math.floor(Math.random() * 10))
    }
  }, [newlyDiscovered])

  const dismiss = () => {
    setExiting(true)
    setTimeout(onDismiss, 260)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    dragStart.current = { y: e.clientY, startTranslate: translateY }
    pillRef.current?.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return
    const dy = e.clientY - dragStart.current.y
    // Only allow upward drag (negative direction)
    setTranslateY(Math.min(0, dragStart.current.startTranslate + dy))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragStart.current) return
    const dy = e.clientY - dragStart.current.y
    dragStart.current = null
    if (dy < -40) { dismiss(); return }
    // Snap back
    setTranslateY(0)
  }

  if (newlyDiscovered == null) return null
  const el = elements.get(newlyDiscovered)
  if (!el) return null

  const messages = lang === 'fr' ? DISCOVERY_MESSAGES_FR : DISCOVERY_MESSAGES_EN
  const message  = messages[msgIndex]?.(el.name) ?? `${lang === 'fr' ? 'Nouveau' : 'New'}: ${el.name}`

  return (
    <div
      className="fixed inset-x-0 top-0 z-[200] flex justify-center pointer-events-none md:mt-[5px]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div
        ref={pillRef}
        className="pointer-events-auto"
        style={{ width: '90%', maxWidth: 420 }}
        onClick={dismiss}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className={`w-full rounded-2xl px-4 py-3 flex flex-row items-center gap-3 ${exiting ? 'ios-notif-exit' : 'ios-notif-enter'}`}
          style={{
            background: 'light-dark(rgba(255,255,255,0.38), rgba(18,18,24,0.42))',
            backdropFilter: 'blur(28px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
            boxShadow: 'light-dark(0 4px 24px rgba(0,0,0,0.08), 0 4px 24px rgba(0,0,0,0.38))',
            transform: `translateY(${translateY}px)`,
            transition: dragStart.current ? 'none' : 'transform 0.2s cubic-bezier(0.32,0.72,0,1)',
          }}
        >
          {/* Element icon */}
          {el.imageUrl && (
            <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src={el.imageUrl} alt={el.name} className="w-6 h-6 object-contain" draggable={false} />
            </div>
          )}
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 leading-none select-none">
              {lang === 'fr' ? 'Nouveau' : 'New'}
            </span>
            <span className="text-[13px] font-semibold text-foreground leading-snug select-none">
              {message}
            </span>
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
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0)
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false)


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
    lastComboIngredients,
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
    discoverElements,
  } = useGameStore()

  // Quest element reveal — fullscreen, shown once per element per device
  const [questReveal, setQuestReveal] = useState<{ element: ElementDef; questTitle: string } | null>(null)
  const discoverQuestsRef = useRef<{ required_element: number; title_fr: string; title_en: string }[]>([])
  const shownQuestRevealRef = useRef<Set<number>>(new Set())

  // Load discover_element quests once
  useEffect(() => {
    fetch('/api/quests')
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return
        discoverQuestsRef.current = data
          .filter((q: any) => q.type === 'discover_element' && q.required_element)
          .map((q: any) => ({ required_element: Number(q.required_element), title_fr: q.title_fr, title_en: q.title_en }))
        try {
          const raw = localStorage.getItem('quest-reveals-shown')
          if (raw) JSON.parse(raw).forEach((n: number) => shownQuestRevealRef.current.add(n))
        } catch {}
      })
      .catch(() => {})
  }, [])

  // Trigger reveal when a relevant element is newly discovered
  useEffect(() => {
    if (newlyDiscovered == null) return
    const match = discoverQuestsRef.current.find(q => q.required_element === newlyDiscovered)
    if (!match) return
    if (shownQuestRevealRef.current.has(newlyDiscovered)) return
    const el = elements.get(newlyDiscovered)
    if (!el) return
    shownQuestRevealRef.current.add(newlyDiscovered)
    try { localStorage.setItem('quest-reveals-shown', JSON.stringify([...shownQuestRevealRef.current])) } catch {}
    setQuestReveal({ element: el, questTitle: lang === 'fr' ? match.title_fr : match.title_en })
  }, [newlyDiscovered, elements, lang])

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
  // Preload only discovered element images — avoids flooding mobile with 700 requests at startup.
  // New discoveries are added to the preload set incrementally via the discovered dep.
  useEffect(() => {
    if (!elements || elements.size === 0 || !discovered || discovered.size === 0) return
    discovered.forEach(num => {
      const el = elements.get(num)
      if (el?.imageUrl) {
        const img = new Image()
        img.src = el.imageUrl
      }
    })
  }, [elements, discovered])

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

  const handleOnboardingComplete = async (prefs: { lang: 'fr' | 'en'; theme: 'dark' | 'light'; haptic: boolean; username: string; avatar: string; enablePush: boolean }) => {
    setShowOnboarding(false)
    setLang(prefs.lang)
    setTheme(prefs.theme)
    setHapticEnabled(prefs.haptic)
    // Mark onboarding as done in localStorage so we can recover if the PATCH
    // fails (e.g. guest flow — no session yet) and avoid re-showing on next sign-in.
    try { localStorage.setItem('onboarding-done', '1') } catch {}
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
    // Force the nav avatar to re-fetch now that the new avatar is saved
    setAvatarRefreshKey(k => k + 1)
    if (prefs.enablePush) {
      const ok = await capacitorSubscribeToPush(prefs.lang)
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

  // Initialize AdMob on native platforms (iOS / Android)
  useEffect(() => {
    async function initAdMob() {
      try {
        // @ts-ignore
        if (typeof window === 'undefined' || !window.Capacitor?.isNativePlatform?.()) return
        const { AdMob } = await import('@capacitor-community/admob')

        // On iOS, explicitly request ATT before initializing AdMob so the system
        // popup appears at the right moment (required for iOS 14+).
        // @ts-ignore
        const isIos = window.Capacitor?.getPlatform?.() === 'ios'
        if (isIos) {
          await AdMob.requestTrackingAuthorization()
        }

        await AdMob.initialize({
          requestTrackingAuthorization: false, // already handled above
          testingDevices: [],
          initializeForTesting: false,
        })
      } catch (err) {
        console.error('[admob] init error', err)
      }
    }
    initAdMob()
  }, [])

  // Load theme from DB and show onboarding on first login
  useEffect(() => {
    if (!session?.user?.id) return
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        // Apply saved theme
        if (d.theme === 'light' || d.theme === 'dark') setTheme(d.theme)
        // Apply push notifications state
        if (typeof d.push_notifications === 'boolean') {
          setPushNotificationsEnabled(d.push_notifications)
        }

        // Show one-time push prompt for users who haven't been asked yet
        // Skip if onboarding is pending — onboarding already has its own notifications step
        if (!d.push_prompt_shown && d.onboarding_done) {
          isPushDenied().then(denied => {
            if (denied) {
              // Already denied — mark as shown silently
              fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ push_prompt_shown: true, push_notifications: false }) })
            } else {
              // Show the push prompt after a short delay
              setTimeout(() => setShowPushPrompt(true), 1500)
            }
          })
        }
        // Show onboarding if never done (onboarding handles push prompt internally via its last step).
        // If the localStorage flag is set, the user completed onboarding as a guest but the PATCH
        // failed (no session). Silently save it now and skip re-showing the modal.
        let guestMigrated = false
        try { guestMigrated = localStorage.getItem('alchemy-guest-migrated') === '1' } catch {}

        if (!d.onboarding_done || guestMigrated) {
          // Consume migration flag immediately
          if (guestMigrated) {
            try { localStorage.removeItem('alchemy-guest-migrated') } catch {}
          }
          let guestDone = false
          try { guestDone = localStorage.getItem('onboarding-done') === '1' } catch {}
          if (guestDone && !guestMigrated) {
            // Guest already did onboarding but PATCH failed — save silently
            try { localStorage.removeItem('onboarding-done') } catch {}
            fetch('/api/profile', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ onboarding_done: true }),
            }).catch(() => {})
          } else {
            setShowOnboarding(true)
          }
        }
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
      {showOnboarding && (
        <OnboardingModal
          elementsByName={elementsByName}
          elements={elements}
          recipeMap={recipeMap}
          onComplete={handleOnboardingComplete}
          onTutorialDiscover={discoverElements}
          onLangChange={setLang}
        />
      )}

      {/* One-time push notification permission prompt for existing users */}
      {showPushPrompt && (
        <PushPromptModal
          lang={lang}
          onAccept={async () => {
            setShowPushPrompt(false)
            const ok = await capacitorSubscribeToPush(lang as 'fr' | 'en')
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
        onTutorialDiscover={discoverElements}
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
            const denied = await isPushDenied()
            if (denied) {
              setShowPushPrompt(true)
              return
            }
            const ok = await capacitorSubscribeToPush(lang as 'fr' | 'en')
            if (!ok) { setShowPushPrompt(true); return }
            setPushNotificationsEnabled(true)
            if (session?.user?.id) {
              fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ push_notifications: true }) })
            }
          } else {
            await capacitorUnsubscribeFromPush()
            setPushNotificationsEnabled(false)
            if (session?.user?.id) {
              fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ push_notifications: false }) })
            }
          }
        }}

        onTapModeChange={handleTapModeChange}

        playgroundItemsCount={playground.length}
        recipeMap={recipeMap}
        avatarRefreshKey={avatarRefreshKey}
      />

      {/* Notification stack — top-left on desktop, centered on mobile */}
      <div
        className="fixed z-50 flex flex-col gap-2 pointer-events-none
          inset-x-0 flex items-center
          md:inset-x-auto md:left-3 md:items-start"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)', paddingLeft: 0 }}
      >
        {/* Hints toggled */}
        {hintsToast !== null && (
          <div className="animate-in slide-in-from-top-2 fade-in duration-200 pointer-events-auto flex justify-center md:justify-start w-full md:w-auto px-4 md:px-0">
            <div
              className="flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-xl"
              style={{
                background: 'light-dark(rgba(255,255,255,0.35), rgba(18,18,24,0.38))',
                backdropFilter: 'blur(16px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
              }}
            >
              <Lightbulb className={`w-3.5 h-3.5 flex-shrink-0 ${hintsToast ? 'text-amber-400' : 'text-muted-foreground'}`} />
              <span className="text-xs text-foreground/70 leading-snug">
                {lang === 'fr'
                  ? hintsToast ? 'Indices activés' : 'Indices désactivés'
                  : hintsToast ? 'Hints enabled' : 'Hints disabled'}
              </span>
            </div>
          </div>
        )}

        {/* Tap / Grab mode */}
        {tapModeToast !== null && (
          <div className="animate-in slide-in-from-top-2 fade-in duration-200 pointer-events-auto flex justify-center md:justify-start w-full md:w-auto px-4 md:px-0">
            <div
              className="flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-xl"
              style={{
                background: 'light-dark(rgba(255,255,255,0.35), rgba(18,18,24,0.38))',
                backdropFilter: 'blur(16px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
              }}
            >
              {tapModeToast
                ? <MousePointer className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#10d9ae' }} />
                : <Hand className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#fe8f27' }} />
              }
              <span className="text-xs text-foreground/70 leading-snug">
                {lang === 'fr'
                  ? tapModeToast ? 'Mode tap activé' : 'Mode drag activé'
                  : tapModeToast ? 'Tap mode on' : 'Drag mode on'}
              </span>
            </div>
          </div>
        )}

        {/* Progress milestone */}
        {progressToast !== null && (
          <div className="animate-in slide-in-from-top-2 fade-in duration-200 pointer-events-auto flex justify-center md:justify-start w-full md:w-auto px-4 md:px-0">
            <div
              className="flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-xl"
              style={{
                background: 'light-dark(rgba(255,255,255,0.35), rgba(18,18,24,0.38))',
                backdropFilter: 'blur(16px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
              }}
            >
              <BarChart2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#15e9ff' }} />
              <span className="text-xs text-foreground/70 leading-snug">
                {lang === 'fr'
                  ? <><span className="font-semibold text-foreground">{progressToast.count}</span> éléments — <span className="font-semibold text-foreground">{progressToast.pct}%</span> découverts</>
                  : <><span className="font-semibold text-foreground">{progressToast.count}</span> elements — <span className="font-semibold text-foreground">{progressToast.pct}%</span> discovered</>
                }
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Quest element fullscreen reveal ─────────────────────────── */}
      {questReveal && (
        <QuestElementReveal
          element={questReveal.element}
          questTitle={questReveal.questTitle}
          lang={lang as 'fr' | 'en'}
          onDismiss={() => setQuestReveal(null)}
        />
      )}



    </div>
  )
}
