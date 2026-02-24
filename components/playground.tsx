'use client'

import { useCallback, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { ElementBadge } from './element-badge'
import { Sparkles, RotateCcw, Moon, Sun, Search, X, ArrowUpDown, Trash2 } from 'lucide-react'
import type { ElementDef, PlaygroundItem } from '@/lib/game-data'
import { Button } from './ui/button'

interface PlaygroundProps {
  items: PlaygroundItem[]
  elements: Map<string, ElementDef>
  discovered: Set<string>
  discoveredCount: number
  totalCount: number
  onDrop: (element: string, x: number, y: number) => string
  onMove: (id: string, x: number, y: number) => void
  onMerge: (id1: string, id2: string) => string | null
  onDropAndMerge: (element: string, x: number, y: number, targetId: string) => string | null
  onRemove: (id: string) => void
  onClear: () => void
  onReset: () => void
}

type SortType = 'name' | 'recent' | 'category'

interface DragState {
  source: 'inventory' | 'playground'
  elementName: string
  itemId?: string
  x: number
  y: number
  offsetX: number
  offsetY: number
}

export function Playground({
  items, elements, discovered, discoveredCount, totalCount,
  onDrop, onMove, onMerge, onDropAndMerge, onRemove, onClear, onReset,
}: PlaygroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inventoryRef = useRef<HTMLDivElement>(null)
  const inventoryScrollRef = useRef<HTMLDivElement>(null)

  const [dragging, setDragging] = useState<DragState | null>(null)
  const [nearMergeId, setNearMergeId] = useState<string | null>(null)
  const [mergeAnimation, setMergeAnimation] = useState<{ x: number; y: number; element: string } | null>(null)
  const [shakeId, setShakeId] = useState<string | null>(null)

  // Track intent before committing to drag vs scroll
  const pendingDragRef = useRef<{ elementName: string; pointerId: number; startX: number; startY: number; committed: boolean } | null>(null)

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortType>('recent')
  const [sortReverse, setSortReverse] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const { theme, setTheme } = useTheme()

  const getRelativePos = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const findNearestItem = useCallback((x: number, y: number, excludeId?: string) => {
    let nearest: { item: PlaygroundItem; dist: number } | null = null
    items.forEach(item => {
      if (item.id === excludeId) return
      const dx = x - item.x
      const dy = y - item.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 80 && (!nearest || dist < nearest.dist)) {
        nearest = { item, dist }
      }
    })
    return nearest?.item || null
  }, [items])

  const cancelPendingDrag = useCallback(() => {
    pendingDragRef.current = null
  }, [])

  const commitInventoryDrag = useCallback((elementName: string, pointerId: number, clientX: number, clientY: number) => {
    const pos = getRelativePos(clientX, clientY)
    setDragging({
      source: 'inventory',
      elementName,
      x: pos.x - 40,
      y: pos.y - 40,
      offsetX: 40,
      offsetY: 40,
    })
    containerRef.current?.setPointerCapture(pointerId)
    if (inventoryScrollRef.current) {
      inventoryScrollRef.current.style.overflow = 'hidden'
      inventoryScrollRef.current.style.touchAction = 'none'
    }
    pendingDragRef.current = null
  }, [getRelativePos])

  // Pointer down on inventory item — record intent, don't commit yet
  const handleInventoryPointerDown = useCallback((e: React.PointerEvent, elementName: string) => {
    e.stopPropagation()
    pendingDragRef.current = {
      elementName,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      committed: false,
    }
  }, [])

  // Pointer move on scroll container — decide drag vs scroll based on direction
  const handleInventoryPointerMove = useCallback((e: React.PointerEvent) => {
    const pd = pendingDragRef.current
    if (!pd || pd.committed) return
    const dx = Math.abs(e.clientX - pd.startX)
    const dy = Math.abs(e.clientY - pd.startY)
    const moved = Math.sqrt(dx * dx + dy * dy)
    if (moved < 6) return // not enough movement yet

    if (dy > dx) {
      // Vertical — it's a scroll, cancel drag intent
      pendingDragRef.current = null
    } else {
      // Horizontal or diagonal — commit to drag immediately
      pd.committed = true
      commitInventoryDrag(pd.elementName, pd.pointerId, e.clientX, e.clientY)
    }
  }, [commitInventoryDrag])

  // === POINTER DOWN (playground items only now) ===
  const handlePointerDown = useCallback((e: React.PointerEvent, source: 'inventory' | 'playground', elementName: string, itemId?: string) => {
    e.preventDefault()
    e.stopPropagation()
    const pos = getRelativePos(e.clientX, e.clientY)

    if (source === 'playground' && itemId) {
      const item = items.find(i => i.id === itemId)
      if (!item) return
      setDragging({
        source: 'playground',
        elementName,
        itemId,
        x: item.x,
        y: item.y,
        offsetX: pos.x - item.x,
        offsetY: pos.y - item.y,
      })
      containerRef.current?.setPointerCapture(e.pointerId)
    }
  }, [getRelativePos, items])

  // === POINTER MOVE (container-level — handles both pending and active drag) ===
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // Check pending inventory drag intent first
    const pd = pendingDragRef.current
    if (pd && !pd.committed) {
      const dx = Math.abs(e.clientX - pd.startX)
      const dy = Math.abs(e.clientY - pd.startY)
      const moved = Math.sqrt(dx * dx + dy * dy)
      if (moved >= 6) {
        if (dy > dx) {
          // Vertical scroll — cancel intent
          pendingDragRef.current = null
        } else {
          // Horizontal — commit to drag
          pd.committed = true
          commitInventoryDrag(pd.elementName, pd.pointerId, e.clientX, e.clientY)
        }
      }
      return
    }

    if (!dragging) return
    e.preventDefault()
    const pos = getRelativePos(e.clientX, e.clientY)
    const newX = pos.x - dragging.offsetX
    const newY = pos.y - dragging.offsetY

    if (dragging.source === 'playground' && dragging.itemId) {
      onMove(dragging.itemId, newX, newY)
      setDragging(prev => prev ? { ...prev, x: newX, y: newY } : null)
      setNearMergeId(findNearestItem(newX, newY, dragging.itemId)?.id || null)
    } else {
      setDragging(prev => prev ? { ...prev, x: newX, y: newY } : null)
      setNearMergeId(findNearestItem(newX, newY)?.id || null)
    }
  }, [dragging, getRelativePos, onMove, findNearestItem, commitInventoryDrag])

  // === POINTER UP ===
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging) return
    e.preventDefault()
    e.stopPropagation()
    containerRef.current?.releasePointerCapture(e.pointerId)

    const dropPoint = document.elementFromPoint(e.clientX, e.clientY)
    const droppedOnInventory = inventoryRef.current?.contains(dropPoint)

    if (dragging.source === 'inventory') {
      if (droppedOnInventory) {
        setDragging(null)
        setNearMergeId(null)
        return
      }

      const nearest = findNearestItem(dragging.x, dragging.y)
      if (nearest) {
        const result = onDropAndMerge(dragging.elementName, dragging.x, dragging.y, nearest.id)
        if (result) {
          setMergeAnimation({
            x: (dragging.x + nearest.x) / 2,
            y: (dragging.y + nearest.y) / 2,
            element: result,
          })
          setTimeout(() => setMergeAnimation(null), 700)
        } else {
          const newId = onDrop(dragging.elementName, dragging.x, dragging.y)
          setShakeId(newId)
          setTimeout(() => setShakeId(null), 400)
        }
      } else {
        onDrop(dragging.elementName, dragging.x, dragging.y)
      }

    } else if (dragging.source === 'playground' && dragging.itemId) {
      const nearest = findNearestItem(dragging.x, dragging.y, dragging.itemId)
      if (nearest) {
        const result = onMerge(dragging.itemId, nearest.id)
        if (result) {
          setMergeAnimation({
            x: (dragging.x + nearest.x) / 2,
            y: (dragging.y + nearest.y) / 2,
            element: result,
          })
          setTimeout(() => setMergeAnimation(null), 700)
        } else {
          setShakeId(dragging.itemId)
          setTimeout(() => setShakeId(null), 400)
        }
      }
    }

    setDragging(null)
    setNearMergeId(null)
    cancelPendingDrag()
    // Restore scroll on inventory
    if (inventoryScrollRef.current) {
      inventoryScrollRef.current.style.overflow = ''
      inventoryScrollRef.current.style.touchAction = ''
    }
  }, [dragging, findNearestItem, onDrop, onMerge, onDropAndMerge, cancelPendingDrag])

  // === INVENTORY SORT ===
  const discoveredElements = Array.from(discovered)
    .map(name => elements.get(name))
    .filter((el): el is ElementDef => el !== undefined)
    .filter(el => el.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortBy === 'category') cmp = a.category.localeCompare(b.category)
      return sortReverse ? -cmp : cmp
    })

  const toggleSort = (type: SortType) => {
    if (sortBy === type) setSortReverse(!sortReverse)
    else { setSortBy(type); setSortReverse(false) }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ touchAction: 'none' }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* PLAYGROUND ITEMS */}
      {items.map(item => {
        const el = elements.get(item.element)
        if (!el) return null
        const isDragging = dragging?.source === 'playground' && dragging.itemId === item.id
        const isNear = nearMergeId === item.id
        const isShaking = shakeId === item.id

        return (
          <div
            key={item.id}
            className={`absolute select-none cursor-grab active:cursor-grabbing ${isShaking ? 'animate-shake' : ''}`}
            style={{
              left: item.x,
              top: item.y,
              zIndex: isDragging ? 200 : 10,
              transform: isDragging ? 'scale(1.08)' : isNear ? 'scale(1.05)' : 'scale(1)',
              transition: isDragging ? 'none' : 'transform 0.15s',
              filter: isNear ? `drop-shadow(0 0 10px ${el.color}80)` : undefined,
            }}
            onPointerDown={e => handlePointerDown(e, 'playground', item.element, item.id)}
            onDoubleClick={() => onRemove(item.id)}
          >
            <ElementBadge element={el} size="md" />
          </div>
        )
      })}

      {/* GHOST (inventory drag) */}
      {dragging?.source === 'inventory' && elements.get(dragging.elementName) && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: dragging.x,
            top: dragging.y,
            zIndex: 9999,
            transform: 'scale(1.05)',
            opacity: 0.9,
          }}
        >
          <ElementBadge element={elements.get(dragging.elementName)!} size="md" />
        </div>
      )}

      {/* MERGE ANIMATION */}
      {mergeAnimation && elements.get(mergeAnimation.element) && (
        <div
          className="absolute pointer-events-none animate-in zoom-in fade-in duration-500"
          style={{ left: mergeAnimation.x, top: mergeAnimation.y, zIndex: 250 }}
        >
          <div className="relative">
            <div
              className="absolute -inset-3 rounded-full animate-ping"
              style={{ backgroundColor: elements.get(mergeAnimation.element)!.color, opacity: 0.2 }}
            />
            <ElementBadge element={elements.get(mergeAnimation.element)!} size="md" />
          </div>
        </div>
      )}

      {/* CLEAR */}
      {items.length > 0 && (
        <button
          onClick={onClear}
          className="absolute top-4 left-4 z-[101] flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium backdrop-blur transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Vider
        </button>
      )}

      {/* INVENTORY PANEL - full height right on desktop, full width bottom on mobile */}
      <div
        ref={inventoryRef}
        className="absolute bottom-0 left-0 right-0 h-[45vh] lg:bottom-0 lg:left-auto lg:top-0 lg:right-0 lg:h-full lg:w-[400px] bg-card/95 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-border flex flex-col"
        style={{ zIndex: 100 }}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold tabular-nums">
              {discoveredCount}<span className="text-muted-foreground">/{totalCount}</span>
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </Button>
              <div className="relative">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowReset(!showReset)}>
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
                {showReset && (
                  <>
                    <div className="fixed inset-0 z-[200]" onClick={() => setShowReset(false)} />
                    <div className="absolute right-0 top-full mt-2 z-[201] bg-popover border border-border rounded-lg shadow-xl p-3 w-44">
                      <p className="text-xs mb-2">Reinitialiser ?</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" className="flex-1" onClick={() => { onReset(); setShowReset(false) }}>Oui</Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowReset(false)}>Non</Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full h-8 pl-8 pr-8 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex gap-1.5">
            {(['name', 'recent', 'category'] as const).map(type => (
              <Button
                key={type}
                variant={sortBy === type ? 'default' : 'outline'}
                size="sm"
                className="flex-1 h-7 text-[10px] gap-1 px-2"
                onClick={() => toggleSort(type)}
              >
                {type === 'name' ? 'Nom' : type === 'recent' ? 'Recent' : 'Type'}
                {sortBy === type && <ArrowUpDown className={`w-2.5 h-2.5 transition-transform ${sortReverse ? 'rotate-180' : ''}`} />}
              </Button>
            ))}
          </div>
        </div>

        {/* Element grid */}
        <div
          ref={inventoryScrollRef}
          className="flex-1 overflow-y-scroll overscroll-contain p-2"
          style={{
            touchAction: 'pan-y',
            // Always show scrollbar so users can scroll via it on mobile
            scrollbarWidth: 'thin',
            scrollbarGutter: 'stable',
          }}
          onPointerDown={e => e.stopPropagation()}
          onPointerUp={cancelPendingDrag}
          onPointerCancel={cancelPendingDrag}
        >
          <div className="grid grid-cols-4 lg:grid-cols-3 gap-2">
            {discoveredElements.map(element => (
              <div
                key={element.name}
                className="cursor-grab active:cursor-grabbing select-none flex justify-center"
                onPointerDown={e => handleInventoryPointerDown(e, element.name)}
              >
                <ElementBadge element={element} size="md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
