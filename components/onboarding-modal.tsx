// onboarding-modal v2
'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Globe, Vibrate, Sun, Moon, ChevronRight, Check, Lightbulb, Trash2, Scroll, ArrowLeft } from 'lucide-react'

type Props = {
  onComplete: (prefs: { lang: 'fr' | 'en'; theme: 'dark' | 'light'; haptic: boolean }) => void
}

const STEPS = ['lang', 'theme', 'haptic', 'combine', 'hint', 'clear', 'quests'] as const
type Step = typeof STEPS[number]

export function OnboardingModal({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('lang')
  const [lang, setLang] = useState<'fr' | 'en'>('en')
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light'>('dark')
  const [haptic, setHaptic] = useState(true)
  const { setTheme: applyTheme } = useTheme()

  const stepIndex = STEPS.indexOf(step)
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  const handleNext = () => {
    if (step === 'theme') applyTheme(selectedTheme)
    const nextIndex = stepIndex + 1
    if (nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex])
    } else {
      onComplete({ lang, theme: selectedTheme, haptic })
    }
  }

  const handleBack = () => {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1])
  }

  const isLast = stepIndex === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-5 pb-1">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === stepIndex ? 'w-6 bg-primary' :
                i < stepIndex ? 'w-1.5 bg-primary/40' :
                'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>

        <div className="px-6 pt-4 pb-8 flex flex-col gap-6">

          {/* STEP: Language */}
          {step === 'lang' && (
            <>
              <div className="flex flex-col gap-1 text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  {lang === 'fr' ? 'Choisis ta langue' : 'Choose your language'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {lang === 'fr' ? 'Tu pourras changer dans les paramètres.' : 'You can change this in settings anytime.'}
                </p>
              </div>
              <div className="flex gap-3">
                {(['fr', 'en'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`flex-1 py-4 rounded-2xl border-2 transition-all font-semibold text-base flex flex-col items-center gap-1.5 ${
                      lang === l
                        ? 'border-primary bg-primary/8 text-primary'
                        : 'border-border bg-muted/40 text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    <span className="text-2xl">{l === 'fr' ? '🇫🇷' : '🇬🇧'}</span>
                    <span>{l === 'fr' ? 'Français' : 'English'}</span>
                    {lang === l && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP: Theme */}
          {step === 'theme' && (
            <>
              <div className="flex flex-col gap-1 text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  {selectedTheme === 'dark' ? <Moon className="w-6 h-6 text-primary" /> : <Sun className="w-6 h-6 text-primary" />}
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  {t('Choisis ton thème', 'Choose your theme')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('Tu pourras changer dans les paramètres.', 'You can change this in settings anytime.')}
                </p>
              </div>
              <div className="flex gap-3">
                {(['dark', 'light'] as const).map(th => (
                  <button
                    key={th}
                    onClick={() => { setSelectedTheme(th); applyTheme(th) }}
                    className={`flex-1 py-4 rounded-2xl border-2 transition-all font-semibold text-base flex flex-col items-center gap-1.5 ${
                      selectedTheme === th
                        ? 'border-primary bg-primary/8 text-primary'
                        : 'border-border bg-muted/40 text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    {th === 'dark' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                    <span>{th === 'dark' ? t('Sombre', 'Dark') : t('Clair', 'Light')}</span>
                    {selectedTheme === th && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP: Haptic */}
          {step === 'haptic' && (
            <>
              <div className="flex flex-col gap-1 text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Vibrate className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  {t('Vibrations', 'Vibrations')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("Vibrer lors d'une nouvelle découverte ?", 'Vibrate when you discover something new?')}
                </p>
              </div>
              <div className="flex gap-3">
                {([true, false] as const).map(h => (
                  <button
                    key={String(h)}
                    onClick={() => setHaptic(h)}
                    className={`flex-1 py-4 rounded-2xl border-2 transition-all font-semibold text-base flex flex-col items-center gap-1.5 ${
                      haptic === h
                        ? 'border-primary bg-primary/8 text-primary'
                        : 'border-border bg-muted/40 text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    <span className="text-xl">{h ? '📳' : '🔕'}</span>
                    <span>{h ? t('Activé', 'On') : t('Désactivé', 'Off')}</span>
                    {haptic === h && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP: Combine (video) */}
          {step === 'combine' && (
            <>
              <div className="flex flex-col gap-1 text-center">
                <h2 className="text-xl font-bold text-foreground">{t('Combine des éléments', 'Combine elements')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t(
                    'Glisse un élément sur un autre pour les combiner et découvrir de nouveaux éléments.',
                    'Drag one element onto another to combine them and discover new ones.'
                  )}
                </p>
              </div>
              <div className="rounded-2xl overflow-hidden border border-border bg-muted/20">
                <video src="/tutohelp.webm" autoPlay loop muted playsInline className="w-full h-auto block" />
              </div>
            </>
          )}

          {/* STEP: Hint */}
          {step === 'hint' && (
            <>
              <div className="flex flex-col gap-1 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-2">
                  <Lightbulb className="w-6 h-6 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-foreground">{t('Indices', 'Hints')}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(
                    "Si tu bloques, une suggestion apparaît automatiquement après 1 minute sans nouvelle découverte. Tu peux aussi demander un indice manuellement.",
                    'If you get stuck, a suggestion appears automatically after 1 minute without a new discovery. You can also request a hint manually.'
                  )}
                </p>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-500/8 border border-amber-500/20">
                <div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-sm text-muted-foreground leading-snug">
                  {t("Bouton en haut à droite de l'écran de jeu", 'Button at the top right of the play screen')}
                </p>
              </div>
            </>
          )}

          {/* STEP: Clear */}
          {step === 'clear' && (
            <>
              <div className="flex flex-col gap-1 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto mb-2">
                  <Trash2 className="w-6 h-6 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-bold text-foreground">{t('Vider le terrain', 'Clear the board')}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(
                    'Tu peux retirer tous les éléments posés sur le terrain en un seul clic grâce au bouton en haut à gauche.',
                    'You can remove all elements placed on the board in one tap using the button at the top left.'
                  )}
                </p>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/40 border border-border">
                <div className="w-11 h-11 rounded-xl bg-muted/60 border border-border flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground leading-snug">
                  {t("Bouton en haut à gauche de l'écran de jeu", 'Button at the top left of the play screen')}
                </p>
              </div>
            </>
          )}

          {/* STEP: Quests */}
          {step === 'quests' && (
            <>
              <div className="flex flex-col gap-1 text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Scroll className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">{t('Quêtes', 'Quests')}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(
                    "Accomplis des quêtes pour gagner des indices sur des recettes inconnues. Certaines quêtes sont quotidiennes, d'autres sont permanentes.",
                    'Complete quests to earn hints on unknown recipes. Some quests are daily, others are permanent.'
                  )}
                </p>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/15">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Scroll className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground leading-snug">
                  {t('Onglet Quêtes dans la barre de navigation', 'Quests tab in the navigation bar')}
                </p>
              </div>
            </>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {stepIndex > 0 && (
              <button
                onClick={handleBack}
                className="h-13 px-4 rounded-2xl bg-muted/50 border border-border text-foreground/70 font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 h-13 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              {isLast
                ? t('Commencer à jouer !', "Let's play!")
                : <>{t('Continuer', 'Continue')} <ChevronRight className="w-4 h-4" /></>
              }
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
