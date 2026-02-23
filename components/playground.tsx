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
  onRemove: (id: string) => void
  onClear: () => void
  onReset: () => void
}

type SortType = 'name' | 'recent' | 'category'

export function Playground(props: PlaygroundProps) {
  const {
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
  } = props

  const playgroundRef = useRef<HTMLDivElement>(null)
  const inventoryRef = useRef<HTMLDivElement>(null)
  
  // Drag state
  const [dragging, setDragging] = useState<{
    source: 'inventory' | 'playground'
    elementName: string
    itemId?: string
    x: number
    y: number
  } | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  
  // Visual effects
  const [nearMergeId, setNearMergeId] = useState<string | null>(null)
  const [mergeAnimation, setMergeAnimation] = useState<{ x: number; y: number; element: string } | null>(null)
  const [shakeId, setShakeId] = useState<string | null>(null)
  
  // Inventory state
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortType>('recent')
  const [sortReverse, setSortReverse] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const { theme, setTheme } = useTheme()

  const getRelativePos = useCallback((clientX: number, clientY: number) => {
    if (!playgroundRef.current) return { x: 0, y: 0 }
    const rect = playgroundRef.current.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const findNearestItem = useCallback(
    (x: number, y: number, excludeId?: string) => {
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
    },
    [items]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, source: 'inventory' | 'playground', elementName: string, itemId?: string) => {
      e.preventDefault()
      e.stopPropagation()

      const pos = getRelativePos(e.clientX, e.clientY)

      if (source === 'inventory') {
        setDragging({
          source: 'inventory',
          elementName,
          x: pos.x,
          y: pos.y,
        })
        dragOffsetRef.current = { x: 45, y: 18 }
      } else if (itemId) {
        const item = items.find(i => i.id === itemId)
        if (!item) return
        setDragging({
          source: 'playground',
          elementName,
          itemId,
          x: item.x,
          y: item.y,
        })
        dragOffsetRef.current = { x: pos.x - item.x, y: pos.y - item.y }
      }

      playgroundRef.current?.setPointerCapture(e.pointerId)
    },
    [getRelativePos, items]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return
      e.preventDefault()

      const pos = getRelativePos(e.clientX, e.clientY)
      const newX = pos.x - dragOffsetRef.current.x
      const newY = pos.y - dragOffsetRef.current.y

      if (dragging.source === 'inventory') {
        setDragging(prev => (prev ? { ...prev, x: newX, y: newY } : null))
      } else if (dragging.source === 'playground' && dragging.itemId) {
        onMove(dragging.itemId, newX, newY)
        const nearest = findNearestItem(newX, newY, dragging.itemId)
        setNearMergeId(nearest?.id || null)
      }
    },
    [dragging, getRelativePos, onMove, findNearestItem]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return
      e.preventDefault()
      e.stopPropagation()

      playgroundRef.current?.releasePointerCapture(e.pointerId)

      // Check if dropped on inventory
      const dropPoint = document.elementFromPoint(e.clientX, e.clientY)
      const droppedOnInventory = inventoryRef.current?.contains(dropPoint)

      if (dragging.source === 'inventory') {
        if (droppedOnInventory) {
          // Cancel drop
          setDragging(null)
          return
        }

        // Check for nearby element to merge with
        const nearest = findNearestItem(dragging.x, dragging.y)
        if (nearest) {
          // Create element and immediately try merge
          const newId = onDrop(dragging.elementName, dragging.x, dragging.y)
          // Use requestAnimationFrame to ensure state update before merge
          requestAnimationFrame(() => {
            const result = onMerge(newId, nearest.id)
            if (result) {
              setMergeAnimation({
                x: (dragging.x + nearest.x) / 2,
                y: (dragging.y + nearest.y) / 2,
                element: result,
              })
              setTimeout(() => setMergeAnimation(null), 700)
            } else {
              setShakeId(newId)
              setTimeout(() => setShakeId(null), 400)
            }
          })
        } else {
          // Just drop
          onDrop(dragging.elementName, dragging.x, dragging.y)
        }
      } else if (dragging.source === 'playground' && dragging.itemId) {
        setNearMergeId(null)
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
    },
    [dragging, findNearestItem, onDrop, onMerge]
  )

  // Sorting inventory
  const discoveredElements = Array.from(discovered)
    .map(name => elements.get(name))
    .filter((el): el is ElementDef => el !== undefined)
    .filter(el => el.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') {
        const cmp = a.name.localeCompare(b.name)
        return sortReverse ? -cmp : cmp
      } else if (sortBy === 'category') {
        const cmp = a.category.localeCompare(b.category)
        return sortReverse ? -cmp : cmp
      }
      return sortReverse ? 1 : -1
    })

  const toggleSort = (type: SortType) => {
    if (sortBy === type) {
      setSortReverse(!sortReverse)
    } else {
      setSortBy(type)
      setSortReverse(false)
    }
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Playground */}
      <div
        ref={playgroundRef}
        className="absolute inset-0"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Playground items */}
        {items.map(item => {
          const el = elements.get(item.element)
          if (!el) return null
          const isDragging = dragging?.source === 'playground' && dragging.itemId === item.id
          const isNear = nearMergeId === item.id
          const isShaking = shakeId === item.id

          return (
            <div
              key={item.id}
              className={`absolute select-none ${isDragging ? 'z-[200]' : 'z-10'} ${
                isShaking ? 'animate-shake' : ''
              }`}
              style={{
                left: item.x,
                top: item.y,
                transform: isDragging ? 'scale(1.1)' : isNear ? 'scale(1.05)' : 'scale(1)',
                transition: isDragging ? 'none' : 'transform 0.2s',
                filter: isNear ? `drop-shadow(0 0 12px ${el.color}80)` : undefined,
                cursor: isDragging ? 'grabbing' : 'grab',
              }}
              onPointerDown={e => handlePointerDown(e, 'playground', item.element, item.id)}
              onDoubleClick={() => onRemove(item.id)}
            >
              <ElementBadge element={el} size="lg" />
            </div>
          )
        })}

        {/* Ghost from inventory */}
        {dragging?.source === 'inventory' && elements.get(dragging.elementName) && (
          <div
            className="absolute z-[300] pointer-events-none"
            style={{
              left: dragging.x,
              top: dragging.y,
              transform: 'scale(1.05)',
              opacity: 0.95,
            }}
          >
            <ElementBadge element={elements.get(dragging.elementName)!} size="lg" />
          </div>
        )}

        {/* Merge animation */}
        {mergeAnimation && elements.get(mergeAnimation.element) && (
          <div
            className="absolute z-[250] pointer-events-none animate-in zoom-in fade-in duration-500"
            style={{ left: mergeAnimation.x, top: mergeAnimation.y }}
          >
            <div className="relative">
              <div
                className="absolute -inset-3 rounded-full animate-ping"
                style={{ backgroundColor: elements.get(mergeAnimation.element)!.color, opacity: 0.2 }}
              />
              <ElementBadge element={elements.get(mergeAnimation.element)!} size="lg" />
            </div>
          </div>
        )}

        {/* Success toast */}
        {mergeAnimation && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[250] bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 animate-in slide-in-from-top duration-300">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">Nouveau !</span>
          </div>
        )}

        {/* Clear button */}
        {items.length > 0 && (
          <button
            onClick={onClear}
            className="absolute top-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/90 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors backdrop-blur text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Vider
          </button>
        )}
      </div>

      {/* Floating Inventory Panel */}
      <div
        ref={inventoryRef}
        className="absolute bottom-4 right-4 w-[380px] max-h-[75vh] bg-card/98 backdrop-blur-xl border border-border rounded-2xl shadow-2xl flex flex-col z-[100] lg:w-[420px]"
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-foreground">
              {discoveredCount} / {totalCount} éléments
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <div className="relative">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowReset(!showReset)}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
                {showReset && (
                  <>
                    <div className="fixed inset-0 z-[200]" onClick={() => setShowReset(false)} />
                    <div className="absolute right-0 top-full mt-2 z-[201] bg-popover border border-border rounded-lg shadow-xl p-3 w-48">
                      <p className="text-xs mb-2">Réinitialiser ?</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => {
                            onReset()
                            setShowReset(false)
                          }}
                        >
                          Oui
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowReset(false)}>
                          Non
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full h-9 pl-9 pr-9 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-muted rounded p-1">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex gap-2">
            {(['name', 'recent', 'category'] as const).map(type => (
              <Button
                key={type}
                variant={sortBy === type ? 'default' : 'outline'}
                size="sm"
                className="flex-1 h-8 text-xs gap-1"
                onClick={() => toggleSort(type)}
              >
                {type === 'name' ? 'Nom' : type === 'recent' ? 'Récent' : 'Type'}
                {sortBy === type && <ArrowUpDown className={`w-3 h-3 ${sortReverse ? 'rotate-180' : ''}`} />}
              </Button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-3 scrollbar-thin" style={{ touchAction: 'pan-y' }}>
          <div className="grid grid-cols-2 gap-2">
            {discoveredElements.map(element => (
              <div
                key={element.name}
                className="cursor-grab active:cursor-grabbing select-none"
                onPointerDown={e => handlePointerDown(e, 'inventory', element.name)}
              >
                <ElementBadge element={element} size="lg" className="hover:opacity-80 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
