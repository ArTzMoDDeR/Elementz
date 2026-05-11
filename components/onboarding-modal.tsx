'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Globe, Sun, Moon, ChevronRight, Check, Lightbulb, Trash2, Scroll, ArrowLeft, User, Smile, Bell, Ticket } from 'lucide-react'
import type { ElementDef } from '@/lib/game-data'

type Props = {
  elementsByName: Map<string, ElementDef>
  onComplete: (prefs: { lang: 'fr' | 'en'; theme: 'dark' | 'light'; haptic: boolean; username: string; avatar: string; enablePush: boolean }) => void
}

const STARTERS = ['eau', 'feu', 'terre', 'air'] as const
const STARTER_LABELS: Record<string, { fr: string; en: string; emoji: string }> = {
  eau:   { fr: 'Eau',   en: 'Water', emoji: '💧' },
  feu:   { fr: 'Feu',   en: 'Fire',  emoji: '🔥' },
  terre: { fr: 'Terre', en: 'Earth', emoji: '🌍' },
  air:   { fr: 'Air',   en: 'Air',   emoji: '💨' },
}

const STEPS = ['lang', 'theme', 'combine', 'hint', 'quests', 'username', 'avatar', 'notifications'] as const
type Step = typeof STEPS[number]

// Per-step accent color
const STEP_COLOR: Record<Step, { from: string; icon: string; ring: string; bg: string }> = {
  lang:          { from: 'from-blue-500',   icon: 'text-blue-400',   ring: 'ring-blue-500/30',   bg: 'bg-blue-500/10' },
  theme:         { from: 'from-violet-500', icon: 'text-violet-400', ring: 'ring-violet-500/30', bg: 'bg-violet-500/10' },
  combine:       { from: 'from-cyan-500',   icon: 'text-cyan-400',   ring: 'ring-cyan-500/30',   bg: 'bg-cyan-500/10' },
  hint:          { from: 'from-amber-500',  icon: 'text-amber-400',  ring: 'ring-amber-500/30',  bg: 'bg-amber-500/10' },
  quests:        { from: 'from-emerald-500',icon: 'text-emerald-400',ring: 'ring-emerald-500/30',bg: 'bg-emerald-500/10' },
  username:      { from: 'from-pink-500',   icon: 'text-pink-400',   ring: 'ring-pink-500/30',   bg: 'bg-pink-500/10' },
  avatar:        { from: 'from-orange-500', icon: 'text-orange-400', ring: 'ring-orange-500/30', bg: 'bg-orange-500/10' },
  notifications: { from: 'from-indigo-500', icon: 'text-indigo-400', ring: 'ring-indigo-500/30', bg: 'bg-indigo-500/10' },
}

export function OnboardingModal({ elementsByName, onComplete }: Props) {
  const [step, setStep]               = useState<Step>('lang')
  const [lang, setLang]               = useState<'fr' | 'en'>('en')
  const [selectedTheme, setTheme]     = useState<'dark' | 'light'>('dark')
  const [username, setUsername]       = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [avatar, setAvatar]           = useState<string>('feu')
  const [enablePush, setEnablePush]   = useState(false)
  const { setTheme: applyTheme }      = useTheme()

  const stepIndex = STEPS.indexOf(step)
  const color     = STEP_COLOR[step]
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  const validateUsername = (val: string) => {
    const trimmed = val.trim()
    if (trimmed.length > 20) return t('Max 20 caractères', 'Max 20 characters')
    if (trimmed.length > 0 && !/^[a-zA-Z0-9_\- ]+$/.test(trimmed))
      return t('Lettres, chiffres, _ et - uniquement', 'Letters, numbers, _ and - only')
    return ''
  }

  const handleNext = () => {
    if (step === 'theme') applyTheme(selectedTheme)
    if (step === 'username') {
      const err = validateUsername(username)
      if (err) { setUsernameError(err); return }
    }
    const nextIndex = stepIndex + 1
    if (nextIndex < STEPS.length) setStep(STEPS[nextIndex])
    else onComplete({ lang, theme: selectedTheme, haptic: false, username: username.trim(), avatar, enablePush })
  }

  const handleBack = () => {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1])
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-background">

      {/* ── Top bar: progress ── */}
      <div className="flex items-center gap-1.5 px-4 pt-safe-top pt-4 pb-3 sm:px-8 sm:pt-6">
        {/* Back */}
        {stepIndex > 0 ? (
          <button
            onClick={handleBack}
            className="mr-2 w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : (
          <div className="mr-2 w-9 flex-shrink-0" />
        )}
        {/* Steps bar */}
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1 rounded-full flex-1 transition-all duration-500 ${
              i < stepIndex  ? 'bg-primary/50' :
              i === stepIndex ? 'bg-primary' :
              'bg-muted/40'
            }`}
          />
        ))}
        {/* Step counter */}
        <span className="ml-2 text-xs text-muted-foreground/50 font-medium flex-shrink-0 tabular-nums">
          {stepIndex + 1}/{STEPS.length}
        </span>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 sm:px-0 overflow-y-auto">
        <div className="w-full max-w-lg mx-auto flex flex-col gap-10">

          {/* STEP: Language */}
          {step === 'lang' && (
            <>
              <div className="flex flex-col items-center gap-5 text-center">
                <div className={`w-20 h-20 rounded-3xl ${color.bg} ring-1 ${color.ring} flex items-center justify-center`}>
                  <Globe className={`w-10 h-10 ${color.icon}`} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
                    {lang === 'fr' ? 'Choisis ta langue' : 'Choose your language'}
                  </h1>
                  <p className="text-base text-muted-foreground">
                    {lang === 'fr' ? 'Tu pourras la modifier dans les paramètres.' : 'You can change this in settings anytime.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                {(['fr', 'en'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`flex-1 py-6 rounded-2xl border-2 transition-all font-semibold text-lg flex flex-col items-center gap-3 ${
                      lang === l
                        ? 'border-primary bg-primary/8 text-primary'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    <span className="text-4xl">{l === 'fr' ? '🇫🇷' : '🇬🇧'}</span>
                    <span>{l === 'fr' ? 'Français' : 'English'}</span>
                    {lang === l && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP: Theme */}
          {step === 'theme' && (
            <>
              <div className="flex flex-col items-center gap-5 text-center">
                <div className={`w-20 h-20 rounded-3xl ${color.bg} ring-1 ${color.ring} flex items-center justify-center`}>
                  {selectedTheme === 'dark'
                    ? <Moon className={`w-10 h-10 ${color.icon}`} />
                    : <Sun className={`w-10 h-10 ${color.icon}`} />}
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
                    {t('Choisis ton thème', 'Choose your theme')}
                  </h1>
                  <p className="text-base text-muted-foreground">
                    {t('Tu pourras le modifier dans les paramètres.', 'You can change this in settings anytime.')}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                {(['dark', 'light'] as const).map(th => (
                  <button
                    key={th}
                    onClick={() => { setTheme(th); applyTheme(th) }}
                    className={`flex-1 py-6 rounded-2xl border-2 transition-all font-semibold text-lg flex flex-col items-center gap-3 ${
                      selectedTheme === th
                        ? 'border-primary bg-primary/8 text-primary'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    {th === 'dark' ? <Moon className="w-8 h-8" /> : <Sun className="w-8 h-8" />}
                    <span>{th === 'dark' ? t('Sombre', 'Dark') : t('Clair', 'Light')}</span>
                    {selectedTheme === th && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP: Combine */}
          {step === 'combine' && (
            <>
              <div className="flex flex-col items-center gap-5 text-center">
                <div className={`w-20 h-20 rounded-3xl ${color.bg} ring-1 ${color.ring} flex items-center justify-center text-4xl`}>
                  ✨
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
                    {t('Combine des éléments', 'Combine elements')}
                  </h1>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {t(
                      'Glisse un élément sur un autre pour les combiner et découvrir de nouveaux éléments. Il y en a plus de 700 à découvrir !',
                      'Drag one element onto another to combine them and discover new ones. There are over 700 to find!'
                    )}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden border border-border bg-muted/20 shadow-xl">
                <video src="/tutohelp.webm" autoPlay loop muted playsInline className="w-full h-auto block" />
              </div>
            </>
          )}

          {/* STEP: Hint */}
          {step === 'hint' && (
            <>
              <div className="flex flex-col items-center gap-5 text-center">
                <div className={`w-20 h-20 rounded-3xl ${color.bg} ring-1 ${color.ring} flex items-center justify-center`}>
                  <Lightbulb className={`w-10 h-10 ${color.icon}`} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
                    {t('Indices', 'Hints')}
                  </h1>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {t(
                      "Bloqué ? Tu peux demander un indice pour révéler une combinaison que tu n'as pas encore découverte.",
                      "Stuck? You can request a hint to reveal a combination you haven't found yet."
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-amber-500/8 border border-amber-500/20">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{t('Regarder une pub', 'Watch an ad')}</p>
                    <p className="text-sm text-muted-foreground leading-snug">
                      {t(
                        "Regarde une courte publicité pour obtenir un indice gratuit à tout moment.",
                        "Watch a short ad to get a free hint anytime you need one."
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-amber-500/8 border border-amber-500/20">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <Scroll className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{t('Accomplir des quêtes', 'Complete quests')}</p>
                    <p className="text-sm text-muted-foreground leading-snug">
                      {t(
                        "Certaines quêtes récompensent avec des indices. Consulte l'onglet Quêtes régulièrement.",
                        "Some quests reward you with hints. Check the Quests tab regularly."
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* STEP: Quests */}
          {step === 'quests' && (
            <>
              <div className="flex flex-col items-center gap-5 text-center">
                <div className={`w-20 h-20 rounded-3xl ${color.bg} ring-1 ${color.ring} flex items-center justify-center`}>
                  <Scroll className={`w-10 h-10 ${color.icon}`} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
                    {t('Quêtes', 'Quests')}
                  </h1>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {t(
                      "Accomplis des quêtes pour gagner des récompenses. Certaines sont quotidiennes, d'autres permanentes.",
                      "Complete quests to earn rewards. Some are daily, others are permanent challenges."
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  {
                    icon: '🌅',
                    title: t('Quêtes quotidiennes', 'Daily quests'),
                    desc: t('Nouvelles quêtes chaque jour. Un moyen simple de progresser chaque session.', 'New quests every day — a great way to make progress each session.'),
                  },
                  {
                    icon: '🏆',
                    title: t('Défis permanents', 'Permanent challenges'),
                    desc: t('Des objectifs à long terme qui récompensent les explorateurs les plus curieux.', 'Long-term goals that reward the most curious explorers.'),
                  },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-4 p-5 rounded-2xl bg-emerald-500/8 border border-emerald-500/20">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0 text-2xl">
                      {item.icon}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground leading-snug">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* STEP: Username */}
          {step === 'username' && (
            <>
              <div className="flex flex-col items-center gap-5 text-center">
                <div className={`w-20 h-20 rounded-3xl ${color.bg} ring-1 ${color.ring} flex items-center justify-center`}>
                  <User className={`w-10 h-10 ${color.icon}`} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
                    {t('Choisis ton pseudo', 'Choose your username')}
                  </h1>
                  <p className="text-base text-muted-foreground">
                    {t("Il apparaîtra dans le classement. Tu pourras le modifier plus tard.", "It will appear in the leaderboard. You can change it later.")}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={username}
                  maxLength={20}
                  placeholder={t('Ton pseudo...', 'Your username...')}
                  onChange={e => { setUsername(e.target.value); setUsernameError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleNext()}
                  className="w-full h-14 px-5 rounded-2xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 text-base font-medium focus:outline-none focus:border-primary transition-colors"
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {usernameError && (
                  <p className="text-sm text-red-400 px-1">{usernameError}</p>
                )}
                <p className="text-xs text-muted-foreground/50 px-1">
                  {t('Lettres, chiffres, _ et - uniquement. Max 20 caractères. Optionnel.', 'Letters, numbers, _ and - only. Max 20 characters. Optional.')}
                </p>
              </div>
            </>
          )}

          {/* STEP: Avatar */}
          {step === 'avatar' && (
            <>
              <div className="flex flex-col items-center gap-5 text-center">
                <div className={`w-20 h-20 rounded-3xl ${color.bg} ring-1 ${color.ring} flex items-center justify-center`}>
                  <Smile className={`w-10 h-10 ${color.icon}`} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
                    {t('Choisis ton avatar', 'Choose your avatar')}
                  </h1>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {t(
                      "Commence avec un élément de base. Tu pourras le changer par n'importe quel élément débloqué depuis ton profil.",
                      "Start with a base element. You can change it to any unlocked element from your profile."
                    )}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {STARTERS.map(key => {
                  const info = STARTER_LABELS[key]
                  const el = elementsByName.get(lang === 'fr' ? info.fr.toLowerCase() : info.en.toLowerCase())
                    ?? elementsByName.get(info.fr.toLowerCase())
                    ?? elementsByName.get(info.en.toLowerCase())
                  const selected = avatar === key
                  return (
                    <button
                      key={key}
                      onClick={() => setAvatar(key)}
                      className={`flex flex-col items-center gap-3 py-5 rounded-2xl border-2 transition-all ${
                        selected
                          ? 'border-primary bg-primary/8'
                          : 'border-border bg-muted/30 hover:border-border/80'
                      }`}
                    >
                      {el?.imageUrl ? (
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center p-2"
                          style={{ background: `${el.color}25` }}
                        >
                          <img
                            src={el.imageUrl}
                            alt={el.name}
                            className="w-full h-full object-contain pointer-events-none"
                            draggable={false}
                          />
                        </div>
                      ) : (
                        <span className="text-4xl leading-none">{info.emoji}</span>
                      )}
                      <span className={`text-xs font-semibold ${selected ? 'text-primary' : 'text-muted-foreground'}`}>
                        {lang === 'fr' ? info.fr : info.en}
                      </span>
                      {selected && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* STEP: Notifications */}
          {step === 'notifications' && (
            <>
              <div className="flex flex-col items-center gap-5 text-center">
                <div className={`w-20 h-20 rounded-3xl ${color.bg} ring-1 ${color.ring} flex items-center justify-center`}>
                  <Bell className={`w-10 h-10 ${color.icon}`} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
                    {t('Notifications', 'Notifications')}
                  </h1>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {t(
                      "Reçois une alerte quand de nouveaux éléments sont ajoutés. Tu peux désactiver à tout moment dans les paramètres.",
                      "Get notified when new elements are added. You can disable this anytime in settings."
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                {([true, false] as const).map(choice => (
                  <button
                    key={String(choice)}
                    onClick={() => setEnablePush(choice)}
                    className={`flex-1 py-6 rounded-2xl border-2 transition-all font-semibold flex flex-col items-center gap-3 ${
                      enablePush === choice
                        ? 'border-indigo-500 bg-indigo-500/8 text-indigo-400'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    <span className="text-4xl">{choice ? '🔔' : '🔕'}</span>
                    <span className="text-base">{choice ? t('Activer', 'Enable') : t('Non merci', 'No thanks')}</span>
                    {enablePush === choice && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </>
          )}

        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="px-6 pb-safe-bottom pb-8 pt-4 sm:px-8 sm:pb-10">
        <div className="w-full max-w-lg mx-auto">
          <button
            onClick={handleNext}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg"
          >
            {step === 'notifications'
              ? t('Commencer à jouer !', "Let's play!")
              : <>{t('Continuer', 'Continue')} <ChevronRight className="w-5 h-5" /></>
            }
          </button>
        </div>
      </div>

    </div>
  )
}
