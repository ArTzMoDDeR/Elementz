'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { ElementBadge } from './element-badge'
import type { ElementDef } from '@/lib/game-data'
import { Search, X, ArrowUpAZ, Clock, Grid3x3 } from 'lucide-react'

interface InventoryProps {
  elements: Map<string, ElementDef>
  discovered: Set<string>
  totalElements: number
  onAddToPlayground: (element: string, x: number, y: number) => void
  playgroundRef?: React.RefObject<HTMLDivElement | null>
}

type SortMode = 'name' | 'recent' | 'category'

export function Inventory({ elements, discovered, totalElements, onAddToPlayground, playgroundRef }: InventoryProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('name')
  const touchStartRef = useRef<{ element: string; startX: number; startY: number } | null>(null)
  const ghostRef = useRef<HTMLDivElement | null>(null)

  const discoveredElements = useMemo(() => {
    let els = [...discovered]
      .map(name => elements.get(name))
      .filter((e): e is ElementDef => !!e)

    if (search) {
      const q = search.toLowerCase()
      els = els.filter(e => e.name.toLowerCase().includes(q))
    }

    if (sort === 'name') {
      els.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    } else if (sort === 'category') {
      els.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name, 'fr'))
    }
    // 'recent' keeps discovery order (default)

    return els
  }, [elements, discovered, search, sort])

  const handleDragStart = useCallback((e: React.DragEvent, elementName: string) => {
    e.dataTransfer.setData('text/element', elementName)
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent, elementName: string) => {
    const touch = e.touches[0]
    touchStartRef.current = { element: elementName, startX: touch.clientX, startY: touch.clientY }

    const ghost = document.createElement('div')
    ghost.id = 'drag-ghost'
    ghost.style.cssText = `
      position: fixed; z-index: 9999; pointer-events: none; opacity: 0.9;
      transform: translate(-50%, -50%);
      left: ${touch.clientX}px; top: ${touch.clientY}px;
    `
    const el = elements.get(elementName)
    if (el) {
      ghost.innerHTML = `<div style="
        background: ${el.color}18; border: 1.5px solid ${el.color}40;
        padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500;
        color: ${el.color}; white-space: nowrap;
      ">${el.name}</div>`
    }
    document.body.appendChild(ghost)
    ghostRef.current = ghost
  }, [elements])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!ghostRef.current) return
    e.preventDefault()
    const touch = e.touches[0]
    ghostRef.current.style.left = `${touch.clientX}px`
    ghostRef.current.style.top = `${touch.clientY}px`
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !ghostRef.current) return

    const touch = e.changedTouches[0]
    const element = touchStartRef.current.element

    ghostRef.current.remove()
    ghostRef.current = null

    if (playgroundRef?.current) {
      const rect = playgroundRef.current.getBoundingClientRect()
      if (
        touch.clientX >= rect.left && touch.clientX <= rect.right &&
        touch.clientY >= rect.top && touch.clientY <= rect.bottom
      ) {
        onAddToPlayground(element, touch.clientX - rect.left - 40, touch.clientY - rect.top - 20)
      }
    }

    touchStartRef.current = null
  }, [onAddToPlayground, playgroundRef])

  return (
    <div className="h-[45vh] lg:h-full lg:w-80 flex flex-col border-t lg:border-t-0 lg:border-l border-border bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Inventaire</h2>
          <span className="text-sm font-medium text-muted-foreground tabular-nums">
            {discovered.size} / {totalElements}
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un element..."
            className="w-full h-10 pl-10 pr-10 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-muted rounded-md p-1 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Sort buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setSort('name')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              sort === 'name'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground border border-border'
            }`}
          >
            <ArrowUpAZ className="w-4 h-4" />
            <span>Nom</span>
          </button>
          <button
            onClick={() => setSort('recent')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              sort === 'recent'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground border border-border'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Recent</span>
          </button>
          <button
            onClick={() => setSort('category')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              sort === 'category'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground border border-border'
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
            <span>Type</span>
          </button>
        </div>
      </div>

      {/* Element list */}
      <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin p-3 space-y-2">
        {discoveredElements.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground text-center px-6">
              {search ? 'Aucun element trouve' : 'Combinez des elements pour en decouvrir de nouveaux'}
            </p>
          </div>
        ) : (
          discoveredElements.map(el => (
            <div
              key={el.name}
              draggable
              onDragStart={(e) => handleDragStart(e, el.name)}
              onTouchStart={(e) => handleTouchStart(e, el.name)}
              onTouchMove={(e) => handleTouchMove(e)}
              onTouchEnd={(e) => handleTouchEnd(e)}
              className="cursor-grab active:cursor-grabbing"
            >
              <ElementBadge 
                element={el} 
                size="md" 
                className="w-full hover:bg-accent/50 transition-colors" 
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
