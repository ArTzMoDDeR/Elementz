'use client'

import { useRef } from 'react'
import { Playground } from './playground'
import { Inventory } from './inventory'
import { useGameStore } from '@/hooks/use-game-store'
import { ElementBadge } from './element-badge'
import { Sparkles } from 'lucide-react'

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

  if (!initialized) {
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
    <div className="h-screen flex flex-col lg:flex-row bg-background overflow-hidden">
      {/* Playground area */}
      <div ref={playgroundRef} className="flex-1 flex flex-col min-h-0">
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

      {/* Inventory sidebar */}
      <Inventory
        elements={elements}
        discovered={discovered}
        discoveredCount={discovered.size}
        totalCount={totalElements}
        onReset={resetProgress}
        onAddToPlayground={addToPlayground}
        playgroundRef={playgroundRef}
      />

      {/* New discovery popup */}
      {newlyDiscovered && elements.get(newlyDiscovered) && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
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
