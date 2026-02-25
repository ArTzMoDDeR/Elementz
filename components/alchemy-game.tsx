'use client'

import { useRef, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Playground } from './playground'
import { useGameStore } from '@/hooks/use-game-store'
import { useHint } from '@/hooks/use-hint'
import { ElementBadge } from './element-badge'
import { Sparkles, Lightbulb, X } from 'lucide-react'

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
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
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
        {newlyDiscovered && elements.get(newlyDiscovered) && (
          <div className="animate-in slide-in-from-left-4 fade-in duration-200 pointer-events-auto">
            <div className="flex items-center gap-2.5 pl-3 pr-3 py-2.5 bg-card border border-border rounded-xl shadow-lg backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-xs text-muted-foreground">{lang === 'fr' ? 'Nouveau' : 'Discovered'}</span>
              <ElementBadge element={elements.get(newlyDiscovered)!} size="sm" />
            </div>
          </div>
        )}

        {/* Hint */}
        {hintVisible && currentHint && hintLabel && (() => {
          const el = elements.get(currentHint.result)
          return (
            <div
              className="animate-in slide-in-from-left-4 fade-in duration-200 pointer-events-auto cursor-pointer"
              onClick={dismissHint}
            >
              <div className="flex items-center gap-2.5 pl-3 pr-2.5 py-2.5 bg-card border border-border rounded-xl shadow-lg backdrop-blur-sm">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="text-xs text-muted-foreground leading-snug">
                  {hintLabel} <span className="font-semibold text-foreground">{currentHint.result}</span>
                </span>
                {el?.imageUrl && (
                  <img src={el.imageUrl} alt={el.name} className="w-6 h-6 object-contain flex-shrink-0" />
                )}
                <button
                  onClick={e => { e.stopPropagation(); dismissHint() }}
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
