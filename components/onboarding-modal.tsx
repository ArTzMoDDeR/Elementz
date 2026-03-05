'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Globe, Vibrate, Sun, Moon, ChevronRight, Check } from 'lucide-react'

type Props = {
  onComplete: (prefs: { lang: 'fr' | 'en'; theme: 'dark' | 'light'; haptic: boolean }) => void
}

const STEPS = ['lang', 'theme', 'haptic'] as const
type Step = typeof STEPS[number]

export function OnboardingModal({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('lang')
  const [lang, setLang] = useState<'fr' | 'en'>('en')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [haptic, setHaptic] = useState(true)
  const { setTheme: applyTheme } = useTheme()

  const stepIndex = STEPS.indexOf(step)

  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  const handleNext = () => {
    if (step === 'theme') applyTheme(theme)
    const nextIndex = stepIndex + 1
    if (nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex])
    } else {
      onComplete({ lang, theme, haptic })
    }
  }

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
                  {theme === 'dark' ? <Moon className="w-6 h-6 text-primary" /> : <Sun className="w-6 h-6 text-primary" />}
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
                    onClick={() => { setTheme(th); applyTheme(th) }}
                    className={`flex-1 py-4 rounded-2xl border-2 transition-all font-semibold text-base flex flex-col items-center gap-1.5 ${
                      theme === th
                        ? 'border-primary bg-primary/8 text-primary'
                        : 'border-border bg-muted/40 text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    {th === 'dark'
                      ? <Moon className="w-6 h-6" />
                      : <Sun className="w-6 h-6" />
                    }
                    <span>{th === 'dark' ? t('Sombre', 'Dark') : t('Clair', 'Light')}</span>
                    {theme === th && <Check className="w-3.5 h-3.5" />}
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
                  {t('Vibrer lors d\'une nouvelle découverte ?', 'Vibrate when you discover something new?')}
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

          {/* CTA button */}
          <button
            onClick={handleNext}
            className="w-full h-13 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            {stepIndex < STEPS.length - 1
              ? <>{t('Continuer', 'Continue')} <ChevronRight className="w-4 h-4" /></>
              : t('Commencer à jouer !', "Let's play!")
            }
          </button>
        </div>
      </div>
    </div>
  )
}
