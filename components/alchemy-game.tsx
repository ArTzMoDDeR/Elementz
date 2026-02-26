'use client'

import { useRef, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Playground } from './playground'
import { useGameStore } from '@/hooks/use-game-store'
import { useHint } from '@/hooks/use-hint'
import { Sparkles, Lightbulb } from 'lucide-react'

export function AlchemyGame() {
  const [mounted, setMounted] = useState(false)
  const { data: session } = useSession()
  const {
    lang,
    setLang,
    elements,
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
        sessionUser={session?.user ?? null}
        hintsEnabled={hintsEnabled}
        onToggleHints={() => setHintsEnabled(h => !h)}
        onRequestHint={requestHint}
      />

      {/* Notification stack — top left */}
      <div className="fixed top-3 left-3 z-50 flex flex-col gap-2 pointer-events-none">

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

        {/* Hint */}
        {hintVisible && currentHint && hintLabel && (() => {
          const el = elements.get(currentHint.result)
          return (
            <div
              className="animate-in slide-in-from-left-4 fade-in duration-200 pointer-events-auto cursor-pointer"
              onClick={dismissHint}
            >
              <div className="flex items-center gap-2.5 pl-3 pr-3 py-2.5 bg-card border border-border rounded-xl shadow-lg backdrop-blur-sm">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="text-xs text-muted-foreground leading-snug">
                  {hintLabel} <span className="font-semibold text-foreground">{currentHint.result}</span>
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
