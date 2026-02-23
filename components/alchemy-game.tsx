'use client'

import { useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { Playground } from './playground'
import { Inventory } from './inventory'
import { useGameStore } from '@/hooks/use-game-store'
import { ElementBadge } from './element-badge'
import { RotateCcw, Sparkles, Moon, Sun } from 'lucide-react'

export function AlchemyGame() {
  const {
    elements,
    discovered,
    playground,
    newlyDiscovered,
    initialized,
    totalElements,
    addToPlayground,
    moveOnPlayground,
    removeFromPlayground,
    clearPlayground,
    tryMerge,
    resetProgress,
  } = useGameStore()

  const playgroundRef = useRef<HTMLDivElement>(null)
  const [showReset, setShowReset] = useState(false)
  const { theme, setTheme } = useTheme()

  if (!initialized) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh flex flex-col lg:flex-row bg-background overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-foreground" />
          <h1 className="text-sm font-bold tracking-tight text-foreground">Alchimie</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium tabular-nums">
            {discovered.size}<span className="text-muted-foreground/50">/{totalElements}</span>
          </span>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowReset(!showReset)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Reinitialiser"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            {showReset && (
              <>
                <div className="fixed inset-0 z-50" onClick={() => setShowReset(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg p-3 w-52">
                  <p className="text-xs text-foreground mb-2">Reinitialiser toute la progression ?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { resetProgress(); setShowReset(false) }}
                      className="flex-1 px-2 py-1 bg-destructive text-destructive-foreground rounded text-xs font-medium hover:opacity-90"
                    >
                      Oui
                    </button>
                    <button
                      onClick={() => setShowReset(false)}
                      className="flex-1 px-2 py-1 bg-muted text-foreground rounded text-xs font-medium hover:opacity-90"
                    >
                      Non
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Playground area */}
      <div ref={playgroundRef} className="flex-1 pt-10 flex flex-col min-h-0">
        <Playground
          items={playground}
          elements={elements}
          onDrop={addToPlayground}
          onMove={moveOnPlayground}
          onMerge={tryMerge}
          onRemove={removeFromPlayground}
          onClear={clearPlayground}
        />
      </div>

      {/* Inventory sidebar (bottom on mobile, right on desktop) */}
      <Inventory
        elements={elements}
        discovered={discovered}
        totalElements={totalElements}
        onAddToPlayground={addToPlayground}
        playgroundRef={playgroundRef}
      />

      {/* New discovery popup */}
      {newlyDiscovered && elements.get(newlyDiscovered) && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-popover border border-border rounded-xl shadow-lg">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-foreground">Nouveau !</span>
            <ElementBadge element={elements.get(newlyDiscovered)!} size="sm" />
          </div>
        </div>
      )}
    </div>
  )
}
