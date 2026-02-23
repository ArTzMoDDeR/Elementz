'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { ElementBadge } from './element-badge'
import type { ElementDef } from '@/lib/game-data'
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react'

interface InventoryProps {
  elements: Map<string, ElementDef>
  discovered: Set<string>
  totalElements: number
  onAddToPlayground: (element: string, x: number, y: number) => void
  playgroundRef?: React.RefObject<HTMLDivElement | null>
}

const SORT_OPTIONS = [
  { value: 'name', label: 'Nom' },
  { value: 'recent', label: 'Recent' },
  { value: 'category', label: 'Categorie' },
]

export function Inventory({ elements, discovered, totalElements, onAddToPlayground, playgroundRef }: InventoryProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name')
  const [isCollapsed, setIsCollapsed] = useState(false)
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
    // 'recent' keeps discovery order (default set order)

    return els
  }, [elements, discovered, search, sort])

  const handleDragStart = useCallback((e: React.DragEvent, elementName: string) => {
    e.dataTransfer.setData('text/element', elementName)
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  // Touch-based dragging for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent, elementName: string) => {
    const touch = e.touches[0]
    touchStartRef.current = { element: elementName, startX: touch.clientX, startY: touch.clientY }

    // Create ghost element
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
        padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 500;
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

    // Remove ghost
    ghostRef.current.remove()
    ghostRef.current = null

    // Check if dropped over playground
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
    <div className={`flex flex-col border-t lg:border-t-0 lg:border-l border-border bg-card transition-all ${
      isCollapsed ? 'h-12 lg:h-auto lg:w-12' : 'h-[40vh] lg:h-auto lg:w-72'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          {!isCollapsed && (
            <span>{discovered.size} / {totalElements}</span>
          )}
          <span className="lg:hidden">
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
          <span className="hidden lg:inline">
            {isCollapsed ? <ChevronUp className="w-4 h-4 rotate-90" /> : <ChevronDown className="w-4 h-4 -rotate-90" />}
          </span>
        </button>
        {!isCollapsed && (
          <div className="flex items-center gap-1">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  sort === opt.value
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!isCollapsed && (
        <>
          {/* Search */}
          <div className="px-3 py-2 border-b border-border">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full h-8 pl-8 pr-8 bg-background border border-input rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 hover:bg-muted rounded p-0.5 transition-colors"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Element list */}
          <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin p-2 gap-1.5 flex flex-row flex-wrap lg:flex-col lg:flex-nowrap content-start">
            {discoveredElements.map(el => (
              <div
                key={el.name}
                draggable
                onDragStart={(e) => handleDragStart(e, el.name)}
                onTouchStart={(e) => handleTouchStart(e, el.name)}
                onTouchMove={(e) => handleTouchMove(e)}
                onTouchEnd={(e) => handleTouchEnd(e)}
                className="cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity shrink-0"
              >
                <ElementBadge element={el} size="sm" />
              </div>
            ))}
            {discoveredElements.length === 0 && search && (
              <p className="text-muted-foreground text-xs text-center py-4">
                Aucun element trouve
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
