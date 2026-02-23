'use client'

import { useRef, useCallback, useState, useMemo } from 'react'
import { useTheme } from 'next-themes'
import { ElementBadge } from './element-badge'
import type { PlaygroundItem } from '@/hooks/use-game-store'
import type { ElementDef } from '@/lib/game-data'
import { Trash2, Search, X, ChevronUp, ChevronDown, Moon, Sun, RotateCcw } from 'lucide-react'

const MERGE_DISTANCE = 80

interface PlaygroundProps {
  items: PlaygroundItem[]
  elements: Map<string, ElementDef>
  discovered: Set<string>
  discoveredCount: number
  totalCount: number
  onDrop: (element: string, x: number, y: number) => void
  onMove: (id: string, x: number, y: number) => void
  onMerge: (id1: string, id2: string) => string | null
  onRemove: (id: string) => void
  onClear: () => void
  onReset: () => void
}

type SortType = 'name' | 'recent' | 'category'

export function Playground({
  items,
  elements,
  discovered,
  discoveredCount,
  totalCount,
  onDrop,
  onMove,
  onMerge,
  onRemove,
  onClear,
  onReset,
}: PlaygroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [ghostDrag, setGhostDrag] = useState<{ element: string; x: number; y: number } | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const [mergeAnimation, setMergeAnimation] = useState<{ x: number; y: number; element: string } | null>(null)
  const [shakeId, setShakeId] = useState<string | null>(null)
  const [nearMergeId, setNearMergeId] = useState<string | null>(null)
  
  // Inventory state
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortType>('recent')
  const [sortAsc, setSortAsc] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const { theme, setTheme } = useTheme()

  const discoveredElements = useMemo(() => {
    const list = Array.from(discovered)
      .map(name => elements.get(name))
      .filter((el): el is ElementDef => el !== undefined)

    const filtered = search
      ? list.filter(el => el.name.toLowerCase().includes(search.toLowerCase()))
      : list

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      } else if (sortBy === 'category') {
        const catCompare = sortAsc
          ? a.category.localeCompare(b.category)
          : b.category.localeCompare(a.category)
        return catCompare !== 0 ? catCompare : a.name.localeCompare(b.name)
      } else {
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
      setSortAsc(type === 'name')
    }
  }

  const getRelativePos = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  // Unified drag system - works for both inventory and playground items
  const handlePointerDown = useCallback((e: React.PointerEvent, element: string, isInventoryItem: boolean, itemId?: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (isInventoryItem) {
      // Dragging from inventory - create ghost that follows cursor
      const pos = getRelativePos(e.clientX, e.clientY)
      setGhostDrag({ element, x: pos.x - 45, y: pos.y - 18 })
      containerRef.current?.setPointerCapture(e.pointerId)
    } else if (itemId) {
      // Dragging existing playground item
      const item = items.find(i => i.id === itemId)
      if (!item) return
      const pos = getRelativePos(e.clientX, e.clientY)
      dragOffsetRef.current = { x: pos.x - item.x, y: pos.y - item.y }
      setDraggingId(itemId)
      containerRef.current?.setPointerCapture(e.pointerId)
    }
  }, [getRelativePos, items])

  const findNearestItem = useCallback((dragItem: PlaygroundItem) => {
    let closest: { item: PlaygroundItem; dist: number } | null = null
    for (const other of items) {
      if (other.id === dragItem.id) continue
      const dx = dragItem.x - other.x
      const dy = dragItem.y - other.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < MERGE_DISTANCE && (!closest || dist < closest.dist)) {
        closest = { item: other, dist }
      }
    }
    return closest?.item || null
  }, [items])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingId && !ghostDrag) return
    e.preventDefault()
    const pos = getRelativePos(e.clientX, e.clientY)
    
    if (ghostDrag) {
      // Moving ghost from inventory
      setGhostDrag({ ...ghostDrag, x: pos.x - 45, y: pos.y - 18 })
    } else if (draggingId) {
      // Moving existing playground item
      let newX = pos.x - dragOffsetRef.current.x
      let newY = pos.y - dragOffsetRef.current.y
      
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        newX = Math.max(-50, Math.min(newX, rect.width - 40))
        newY = Math.max(-50, Math.min(newY, rect.height - 30))
      }
      
      onMove(draggingId, newX, newY)

      const dragItem = items.find(i => i.id === draggingId)
      if (dragItem) {
        const updatedItem = { ...dragItem, x: newX, y: newY }
        const near = findNearestItem(updatedItem)
        setNearMergeId(near?.id || null)
      }
    }
  }, [draggingId, ghostDrag, getRelativePos, onMove, items, findNearestItem])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId)
    }

    if (ghostDrag) {
      // Dropped ghost from inventory - check if on playground area
      const inventoryEl = document.querySelector('[data-inventory]')
      const dropTarget = document.elementFromPoint(e.clientX, e.clientY)
      
      // If dropped on inventory, cancel
      if (inventoryEl && inventoryEl.contains(dropTarget)) {
        setGhostDrag(null)
        return
      }
      
      // Create element on playground
      onDrop(ghostDrag.element, ghostDrag.x, ghostDrag.y)
      setGhostDrag(null)
      return
    }

    if (draggingId) {
      setNearMergeId(null)
      const dragItem = items.find(i => i.id === draggingId)
      
      if (dragItem) {
        const nearest = findNearestItem(dragItem)
        if (nearest) {
          const result = onMerge(draggingId, nearest.id)
          if (result) {
            setMergeAnimation({
              x: (dragItem.x + nearest.x) / 2,
              y: (dragItem.y + nearest.y) / 2,
              element: result,
            })
            setTimeout(() => setMergeAnimation(null), 700)
          } else {
            setShakeId(draggingId)
            setTimeout(() => setShakeId(null), 400)
          }
        } else {
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            if (dragItem.x < -60 || dragItem.y < -60 || dragItem.x > rect.width + 60 || dragItem.y > rect.height + 60) {
              onRemove(draggingId)
            }
          }
        }
      }
      setDraggingId(null)
    }
  }, [draggingId, ghostDrag, items, findNearestItem, onMerge, onRemove, onDrop])

  const handleDoubleClick = useCallback((itemId: string) => {
    onRemove(itemId)
  }, [onRemove])

  return (
    <div className="relative h-full w-full overflow-hidden flex">
      {/* Main playground area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ touchAction: 'none' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Dot grid background */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        {/* Empty state */}
        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                <span className="text-muted-foreground/30 text-lg">+</span>
              </div>
              <p className="text-muted-foreground/30 text-sm font-medium">
                Glisse des elements ici
              </p>
            </div>
          </div>
        )}

        {/* Playground items */}
        {items.map(item => {
          const el = elements.get(item.element)
          if (!el) return null
          const isDragging = draggingId === item.id
          const isNearMerge = nearMergeId === item.id
          const isShaking = shakeId === item.id
          return (
            <div
              key={item.id}
              className={`absolute cursor-grab active:cursor-grabbing select-none ${
                isDragging ? 'z-[100]' : 'z-10 hover:z-20'
              } ${isShaking ? 'animate-shake' : ''}`}
              style={{
                left: item.x,
                top: item.y,
                transform: isDragging ? 'scale(1.08)' : isNearMerge ? 'scale(1.05)' : 'scale(1)',
                transition: isDragging ? 'transform 0.1s' : 'transform 0.15s, left 0.05s, top 0.05s',
                filter: isNearMerge ? `drop-shadow(0 0 8px ${el.color}60)` : undefined,
              }}
              onPointerDown={(e) => handlePointerDown(e, el.name, false, item.id)}
              onDoubleClick={() => handleDoubleClick(item.id)}
            >
              <ElementBadge element={el} size="lg" />
            </div>
          )
        })}

        {/* Ghost element being dragged from inventory */}
        {ghostDrag && elements.get(ghostDrag.element) && (
          <div
            className="absolute z-[100] pointer-events-none opacity-90"
            style={{
              left: ghostDrag.x,
              top: ghostDrag.y,
              transform: 'scale(1.05)',
            }}
          >
            <ElementBadge element={elements.get(ghostDrag.element)!} size="lg" />
          </div>
        )}

        {/* Merge success animation */}
        {mergeAnimation && elements.get(mergeAnimation.element) && (
          <div
            className="absolute z-50 pointer-events-none"
            style={{ left: mergeAnimation.x, top: mergeAnimation.y }}
          >
            <div className="relative animate-in zoom-in-0 fade-in duration-300">
              <div
                className="absolute -inset-4 rounded-full animate-ping opacity-15"
                style={{ backgroundColor: elements.get(mergeAnimation.element)!.color }}
              />
              <div
                className="absolute -inset-2 rounded-full opacity-10"
                style={{ backgroundColor: elements.get(mergeAnimation.element)!.color }}
              />
              <ElementBadge element={elements.get(mergeAnimation.element)!} size="lg" />
            </div>
          </div>
        )}

        {/* Clear button */}
        {items.length > 0 && (
          <button
            onClick={onClear}
            className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors backdrop-blur-sm border border-border/50"
          >
            <Trash2 className="w-3 h-3" />
            Vider
          </button>
        )}
      </div>

      {/* Inventory overlay */}
      <div data-inventory className="absolute bottom-0 lg:relative lg:bottom-auto w-full lg:w-[420px] h-[50vh] lg:h-full flex flex-col bg-card/95 backdrop-blur-sm border-t lg:border-t-0 lg:border-l border-border z-50">
        {/* Header */}
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
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowReset(!showReset)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                {showReset && (
                  <>
                    <div className="fixed inset-0 z-50" onClick={() => setShowReset(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg p-3 w-52">
                      <p className="text-xs text-foreground mb-2">Reinitialiser ?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            onReset()
                            setShowReset(false)
                          }}
                          className="flex-1 px-2 py-1.5 bg-destructive text-destructive-foreground rounded text-xs font-medium"
                        >
                          Oui
                        </button>
                        <button
                          onClick={() => setShowReset(false)}
                          className="flex-1 px-2 py-1.5 bg-muted text-foreground rounded text-xs font-medium"
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
              className="w-full h-10 pl-10 pr-10 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-muted rounded p-1"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Sort */}
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

        {/* Element list */}
        <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin p-3" style={{ touchAction: 'pan-y' }}>
          {discoveredElements.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">
                {search ? 'Aucun element' : 'Aucun decouvert'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {discoveredElements.map(element => (
                <div
                  key={element.name}
                  className="cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => handlePointerDown(e, element.name, true)}
                >
                  <ElementBadge element={element} size="lg" className="hover:opacity-80 transition-opacity" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
