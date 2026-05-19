'use client'

import { useState } from 'react'
import { Ticket, Scroll, X } from 'lucide-react'
import type { ElementDef } from '@/lib/game-data'
import { CombineArena } from '@/components/onboarding-modal'

type Step = 'combine' | 'hints-quests' | 'signup'

type Props = {
  elements: Map<number, ElementDef>
  recipeMap: Map<string, number[]>
  lang: 'fr' | 'en'
  onTutorialDiscover: (nums: number[]) => void
  onSignUp: () => void
  onClose: () => void
}

export function GuestOnboardingModal({ elements, recipeMap, lang, onTutorialDiscover, onSignUp, onClose }: Props) {
  const [step, setStep] = useState<Step>('combine')
  const [stepAnim, setStepAnim] = useState<'in' | 'out'>('in')
  const [combinePhase, setCombinePhase] = useState<'idle' | 'reveal' | 'next' | 'done'>('idle')

  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  const goTo = (s: Step) => {
    setStepAnim('out')
    setTimeout(() => { setStep(s); setStepAnim('in') }, 200)
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        {/* Step indicator */}
        <div className="flex items-center gap-1.5">
          {(['combine', 'hints-quests', 'signup'] as Step[]).map(s => (
            <div
              key={s}
              className="rounded-full transition-all duration-300"
              style={{
                width: step === s ? 20 : 6,
                height: 6,
                background: step === s ? 'var(--primary)' : 'var(--border)',
              }}
            />
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-muted/40 border border-border/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label={t('Fermer', 'Close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div
        className="flex-1 min-h-0 flex flex-col px-5 pb-5 transition-all duration-200"
        style={{ opacity: stepAnim === 'in' ? 1 : 0, transform: stepAnim === 'in' ? 'translateY(0)' : 'translateY(8px)' }}
      >
        {/* ── COMBINE ── */}
        {step === 'combine' && (
          <CombineArena
            lang={lang}
            elements={elements}
            recipeMap={recipeMap}
            onAllDone={() => setTimeout(() => goTo('hints-quests'), 800)}
            onTutorialDiscover={onTutorialDiscover}
            onPhaseChange={setCombinePhase}
          />
        )}

        {/* ── HINTS + QUESTS ── */}
        {step === 'hints-quests' && (
          <div className="flex flex-col gap-8 justify-center flex-1">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground text-balance leading-tight">
                {t('Indices & Quêtes', 'Hints & Quests')}
              </h1>
              <p className="text-base text-muted-foreground/70 leading-relaxed max-w-sm">
                {t(
                  "Explore, accomplis des quêtes et utilise des indices quand tu bloques.",
                  "Explore, complete quests and use hints when you're stuck."
                )}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {[
                {
                  icon: <Ticket className="w-5 h-5 text-amber-400" />,
                  bg: 'bg-amber-500/8', border: 'border-amber-500/20', accent: 'bg-amber-500/15',
                  title: t('Indices', 'Hints'),
                  desc: t("Bloqué ? Regarde une pub ou accomplis une quête pour débloquer un indice.", "Stuck? Watch an ad or complete a quest to unlock a hint."),
                },
                {
                  icon: <Scroll className="w-5 h-5 text-emerald-400" />,
                  bg: 'bg-emerald-500/8', border: 'border-emerald-500/20', accent: 'bg-emerald-500/15',
                  title: t('Quêtes quotidiennes', 'Daily quests'),
                  desc: t('Nouvelles quêtes chaque jour pour gagner des récompenses.', 'New quests every day to earn rewards.'),
                },
                {
                  icon: <Scroll className="w-5 h-5 text-blue-400" />,
                  bg: 'bg-blue-500/8', border: 'border-blue-500/20', accent: 'bg-blue-500/15',
                  title: t('Défis permanents', 'Permanent challenges'),
                  desc: t('Objectifs à long terme pour les plus curieux.', 'Long-term goals for the most curious.'),
                },
              ].map(item => (
                <div key={item.title} className={`flex items-start gap-4 p-4 rounded-2xl ${item.bg} border ${item.border}`}>
                  <div className={`w-10 h-10 rounded-xl ${item.accent} flex items-center justify-center flex-shrink-0`}>
                    {item.icon}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground leading-snug">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => goTo('signup')}
              className="w-full py-4 rounded-2xl bg-foreground text-background text-base font-bold active:scale-[0.97] transition-transform cursor-pointer"
            >
              {t('Continuer', 'Continue')}
            </button>
          </div>
        )}

        {/* ── SIGNUP ── */}
        {step === 'signup' && (
          <div className="flex flex-col gap-8 justify-center flex-1">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-2">
                <span className="text-3xl">✦</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground text-balance leading-tight">
                {t('Sauvegarde ta progression', 'Save your progress')}
              </h1>
              <p className="text-base text-muted-foreground/70 leading-relaxed max-w-sm">
                {t(
                  "Crée un compte gratuit pour retrouver tes éléments depuis n'importe quel appareil et apparaître dans le classement.",
                  "Create a free account to access your elements from any device and appear on the leaderboard."
                )}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={onSignUp}
                className="w-full py-4 rounded-2xl bg-foreground text-background text-base font-bold active:scale-[0.97] transition-transform cursor-pointer"
              >
                {t("Créer un compte", "Create an account")}
              </button>
              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl bg-transparent text-muted-foreground text-base font-medium active:scale-[0.97] transition-transform cursor-pointer"
              >
                {t("Pas maintenant", "Not now")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
