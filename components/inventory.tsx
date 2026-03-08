'use client'

import { useState, useMemo, RefObject, useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { ElementBadge } from './element-badge'
import type { ElementDef } from '@/lib/game-data'
import { Search, X, ChevronUp, ChevronDown, Moon, Sun, RotateCcw } from 'lucide-react'

interface InventoryProps {
  elements: Map<string, ElementDef>
  discovered: Set<string>
  discoveredCount: number
  totalCount: number
  onReset: () => void
  onAddToPlayground: (element: ElementDef, x: number, y: number) => void
  playgroundRef: RefObject<HTMLDivElement>
}

type SortType = 'name' | 'recent' | 'category'

export function Inventory({
  elements,
  discovered,
  discoveredCount,
  totalCount,
  onReset,
  onAddToPlayground,
  playgroundRef,
}: InventoryProps) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortType>('recent')
  const [sortAsc, setSortAsc] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const { theme, setTheme } = useTheme()

  const discoveredElements = useMemo(() => {
    const list = Array.from(discovered)
      .map(name => elements.get(name))
      .filter((el): el is ElementDef => el !== undefined)

    // Filter by search
    const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    const filtered = search
      ? list.filter(el => n(el.name).includes(n(search)))
      : list

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      } else if (sortBy === 'category') {
        const catCompare = sortAsc
          ? a.category.localeCompare(b.category)
          : b.category.localeCompare(a.category)
        return catCompare !== 0 ? catCompare : a.name.localeCompare(b.name)
      } else {
        // recent: reverse discovery order (most recent first when sortAsc=false)
        return sortAsc
          ? Array.from(discovered).indexOf(a.name) - Array.from(discovered).indexOf(b.name)
          : Array.from(discovered).indexOf(b.name) - Array.from(discovered).indexOf(a.name)
      }
    })

    return sorted
  }, [elements, discovered, search, sortBy, sortAsc])

  const handleSort = (type: SortType) => {
    if (sortBy === type) {
      setSortAsc(!sortAsc)
    } else {
      setSortBy(type)
      setSortAsc(type === 'name') // A-Z by default for name
    }
  }

  const handleDragStart = (e: React.DragEvent, element: ElementDef) => {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('text/element', element.name)
    
    // Prevent page scroll on mobile during drag
    document.body.style.overflow = 'hidden'
    
    // Create custom drag preview matching the actual badge
    const dragTarget = e.currentTarget as HTMLElement
    const badge = dragTarget.querySelector('[data-element-badge]')
    if (badge) {
      const clone = badge.cloneNode(true) as HTMLElement
      clone.style.position = 'absolute'
      clone.style.top = '-9999px'
      clone.style.pointerEvents = 'none'
      document.body.appendChild(clone)
      
      const rect = badge.getBoundingClientRect()
      e.dataTransfer.setDragImage(clone, rect.width / 2, rect.height / 2)
      
      setTimeout(() => document.body.removeChild(clone), 0)
    }
  }
  
  const handleDragEnd = () => {
    // Restore scroll after drag ends
    document.body.style.overflow = ''
  }

  const handleDoubleClick = (element: ElementDef) => {
    const playgroundEl = playgroundRef.current
    if (playgroundEl) {
      const rect = playgroundEl.getBoundingClientRect()
      onAddToPlayground(element, rect.width / 2, rect.height / 2)
    }
  }

  return (
    <div className="flex-shrink-0 w-full lg:w-[420px] h-[50vh] lg:h-full flex flex-col bg-card border-t lg:border-t-0 lg:border-l border-border">
      {/* Header with counter and controls */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tabular-nums text-foreground">
              {discoveredCount}
            </span>
            <span className="text-sm text-muted-foreground">/ {totalCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowReset(!showReset)}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              {showReset && (
                <>
                  <div className="fixed inset-0 z-50" onClick={() => setShowReset(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg p-3 w-52">
                    <p className="text-xs text-foreground mb-2">Reinitialiser la progression ?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onReset()
                          setShowReset(false)
                        }}
                        className="flex-1 px-2 py-1.5 bg-destructive text-destructive-foreground rounded text-xs font-medium hover:opacity-90"
                      >
                        Oui
                      </button>
                      <button
                        onClick={() => setShowReset(false)}
                        className="flex-1 px-2 py-1.5 bg-muted text-foreground rounded text-xs font-medium hover:opacity-90"
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

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full h-10 pl-10 pr-10 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-muted rounded p-1 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Sort buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleSort('name')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              sortBy === 'name'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Nom
            {sortBy === 'name' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </button>
          <button
            onClick={() => handleSort('recent')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              sortBy === 'recent'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Recent
            {sortBy === 'recent' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </button>
          <button
            onClick={() => handleSort('category')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              sortBy === 'category'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Type
            {sortBy === 'category' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </button>
        </div>
      </div>

      {/* Element list - 2 columns */}
      <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin p-3" style={{ touchAction: 'pan-y' }}>
        {discoveredElements.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <p className="text-sm text-muted-foreground">
              {search ? 'Aucun element trouve' : 'Aucun element decouvert'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {discoveredElements.map(element => (
              <div
                key={element.name}
                data-element={element.name}
                draggable
                onDragStart={e => handleDragStart(e, element)}
                onDragEnd={handleDragEnd}
                onDoubleClick={() => handleDoubleClick(element)}
                className="cursor-grab active:cursor-grabbing"
              >
                <div data-element-badge>
                  <ElementBadge element={element} size="lg" className="hover:opacity-80 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
