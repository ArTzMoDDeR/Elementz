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

  const { hintsEnabled, setHintsEnabled, hintVisible, hintText, dismissHint, requestHint } = useHint(
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

      {/* New element notification */}
      {newlyDiscovered && elements.get(newlyDiscovered) && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-popover border border-border rounded-xl shadow-lg">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-foreground">
              {lang === 'fr' ? 'Nouveau !' : 'New!'}
            </span>
            <ElementBadge element={elements.get(newlyDiscovered)!} size="sm" />
          </div>
        </div>
      )}

      {/* Hint notification */}
      {hintVisible && hintText && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300 max-w-xs w-full px-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-popover border border-amber-500/40 rounded-xl shadow-lg">
            <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-xs font-medium text-foreground flex-1">{hintText}</span>
            <button onClick={dismissHint} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
