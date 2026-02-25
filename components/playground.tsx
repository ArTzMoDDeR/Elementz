'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ElementBadge } from './element-badge'
import { RotateCcw, Search, X, ArrowUpDown, Trash2 } from 'lucide-react'
import type { ElementDef, PlaygroundItem } from '@/lib/game-data'
import { Button } from './ui/button'

interface PlaygroundProps {
  items: PlaygroundItem[]
  elements: Map<string, ElementDef>
  discovered: Set<string>
  discoveredCount: number
  totalCount: number
  lang: 'fr' | 'en'
  onSetLang: (l: 'fr' | 'en') => void
  onDrop: (element: string, x: number, y: number) => string
  onMove: (id: string, x: number, y: number) => void
  onMerge: (id1: string, id2: string) => string | null
  onDropAndMerge: (element: string, x: number, y: number, targetId: string) => string | null
  onRemove: (id: string) => void
  onClear: () => void
  onReset: () => void
  onUnlockAll: () => void
}

type SortType = 'name' | 'recent'

interface DragState {
  source: 'inventory' | 'playground'
  elementName: string
  itemId?: string
  x: number
  y: number
  offsetX: number
  offsetY: number
}

// ============================================================
// Custom scrollbar hook
// ============================================================
function useCustomScrollbar(
  scrollRef: React.RefObject<HTMLDivElement>,
  trackRef: React.RefObject<HTMLDivElement>,
  thumbRef: React.RefObject<HTMLDivElement>,
) {
  const isDraggingThumb = useRef(false)
  const thumbDragStart = useRef({ y: 0, scrollTop: 0 })

  const updateThumb = useCallback(() => {
    const scroll = scrollRef.current
    const track = trackRef.current
    const thumb = thumbRef.current
    if (!scroll || !track || !thumb) return
    const ratio = scroll.clientHeight / scroll.scrollHeight
    if (ratio >= 1) {
      thumb.style.display = 'none'
      return
    }
    thumb.style.display = 'block'
    const thumbH = Math.max(32, track.clientHeight * ratio)
    const maxScroll = scroll.scrollHeight - scroll.clientHeight
    const maxThumbTop = track.clientHeight - thumbH
    const thumbTop = maxScroll > 0 ? (scroll.scrollTop / maxScroll) * maxThumbTop : 0
    thumb.style.height = `${thumbH}px`
    thumb.style.transform = `translateY(${thumbTop}px)`
  }, [scrollRef, trackRef, thumbRef])

  useEffect(() => {
    const scroll = scrollRef.current
    const thumb = thumbRef.current
    if (!scroll || !thumb) return

    scroll.addEventListener('scroll', updateThumb, { passive: true })
    const ro = new ResizeObserver(updateThumb)
    ro.observe(scroll)
    updateThumb()

    const onThumbPointerDown = (e: PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()
      isDraggingThumb.current = true
      thumbDragStart.current = { y: e.clientY, scrollTop: scroll.scrollTop }
      thumb.setPointerCapture(e.pointerId)
    }

    const onThumbPointerMove = (e: PointerEvent) => {
      if (!isDraggingThumb.current) return
      e.stopPropagation()
      const track = trackRef.current
      if (!track) return
      const ratio = scroll.scrollHeight / track.clientHeight
      const delta = (e.clientY - thumbDragStart.current.y) * ratio
      scroll.scrollTop = thumbDragStart.current.scrollTop + delta
    }

    const onThumbPointerUp = (e: PointerEvent) => {
      e.stopPropagation()
      isDraggingThumb.current = false
    }

    thumb.addEventListener('pointerdown', onThumbPointerDown)
    thumb.addEventListener('pointermove', onThumbPointerMove)
    thumb.addEventListener('pointerup', onThumbPointerUp)
    thumb.addEventListener('pointercancel', onThumbPointerUp)

    return () => {
      scroll.removeEventListener('scroll', updateThumb)
      ro.disconnect()
      thumb.removeEventListener('pointerdown', onThumbPointerDown)
      thumb.removeEventListener('pointermove', onThumbPointerMove)
      thumb.removeEventListener('pointerup', onThumbPointerUp)
      thumb.removeEventListener('pointercancel', onThumbPointerUp)
    }
  }, [updateThumb, scrollRef, trackRef, thumbRef])
}

// ============================================================
// Playground component
// ============================================================
export function Playground({
  items, elements, discovered, discoveredCount, totalCount,
  lang, onSetLang,
  onDrop, onMove, onMerge, onDropAndMerge, onRemove, onClear, onReset,
  onUnlockAll,
}: PlaygroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inventoryRef = useRef<HTMLDivElement>(null)
  const inventoryScrollRef = useRef<HTMLDivElement>(null)
  const scrollTrackRef = useRef<HTMLDivElement>(null)
  const scrollThumbRef = useRef<HTMLDivElement>(null)

  const [dragging, setDragging] = useState<DragState | null>(null)
  const [nearMergeId, setNearMergeId] = useState<string | null>(null)
  const [mergeAnimation, setMergeAnimation] = useState<{ x: number; y: number; element: string } | null>(null)
  const [shakeId, setShakeId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortType>('recent')
  const [sortReverse, setSortReverse] = useState(false)
  const [showReset, setShowReset] = useState(false)


  useCustomScrollbar(inventoryScrollRef, scrollTrackRef, scrollThumbRef)

  const getRelativePos = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const findNearestItem = useCallback((x: number, y: number, excludeId?: string) => {
    let nearest: { item: PlaygroundItem; dist: number } | null = null
    items.forEach(item => {
      if (item.id === excludeId) return
      const dist = Math.sqrt((x - item.x) ** 2 + (y - item.y) ** 2)
      if (dist < 80 && (!nearest || dist < nearest.dist)) nearest = { item, dist }
    })
    return nearest?.item || null
  }, [items])

  // === INVENTORY DRAG — immediate capture, no delay, no direction detection ===
  const handleInventoryPointerDown = useCallback((e: React.PointerEvent, elementName: string) => {
    e.stopPropagation()
    e.preventDefault()
    const pos = getRelativePos(e.clientX, e.clientY)
    setDragging({
      source: 'inventory',
      elementName,
      x: pos.x - 40,
      y: pos.y - 40,
      offsetX: 40,
      offsetY: 40,
    })
    containerRef.current?.setPointerCapture(e.pointerId)
  }, [getRelativePos])

  // === PLAYGROUND ITEM DRAG ===
  const handlePointerDown = useCallback((e: React.PointerEvent, elementName: string, itemId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const pos = getRelativePos(e.clientX, e.clientY)
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
  }, [getRelativePos, items])

  // === POINTER MOVE ===
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
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
  }, [dragging, getRelativePos, onMove, findNearestItem])

  // === POINTER UP ===
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging) return
    e.preventDefault()
    containerRef.current?.releasePointerCapture(e.pointerId)

    const dropTarget = document.elementFromPoint(e.clientX, e.clientY)
    const droppedOnInventory = inventoryRef.current?.contains(dropTarget)

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
          setMergeAnimation({ x: (dragging.x + nearest.x) / 2, y: (dragging.y + nearest.y) / 2, element: result })
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
          setMergeAnimation({ x: (dragging.x + nearest.x) / 2, y: (dragging.y + nearest.y) / 2, element: result })
          setTimeout(() => setMergeAnimation(null), 700)
        } else {
          setShakeId(dragging.itemId)
          setTimeout(() => setShakeId(null), 400)
        }
      }
    }

    setDragging(null)
    setNearMergeId(null)
  }, [dragging, findNearestItem, onDrop, onMerge, onDropAndMerge])

  // === SORT ===
  const discoveredOrder = Array.from(discovered)
  const discoveredElements = discoveredOrder
    .map(name => elements.get(name))
    .filter((el): el is ElementDef => el !== undefined)
    .filter(el => el.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') {
        const cmp = a.name.localeCompare(b.name, 'fr')
        return sortReverse ? -cmp : cmp
      }
      const ia = discoveredOrder.indexOf(a.name)
      const ib = discoveredOrder.indexOf(b.name)
      const cmp = ib - ia
      return sortReverse ? -cmp : cmp
    })

  const toggleSort = (type: SortType) => {
    if (sortBy === type) setSortReverse(prev => !prev)
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
      {/* Dot grid — more visible */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, oklch(0.6 0.01 250 / 0.18) 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
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
            onPointerDown={e => handlePointerDown(e, item.element, item.id)}
            onDoubleClick={() => onRemove(item.id)}
          >
                <ElementBadge element={el} size="lg" />
          </div>
        )
      })}

      {/* GHOST (inventory drag) */}
      {dragging?.source === 'inventory' && elements.get(dragging.elementName) && (
        <div
          className="absolute pointer-events-none"
          style={{ left: dragging.x, top: dragging.y, zIndex: 9999, transform: 'scale(1.05)', opacity: 0.9 }}
        >
              <ElementBadge element={elements.get(dragging.elementName)!} size="lg" />
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
              <ElementBadge element={elements.get(mergeAnimation.element)!} size="lg" />
          </div>
        </div>
      )}

      {/* BOTTOM-RIGHT HUD: clear + counter */}
      <div className="absolute bottom-[calc(45vh+12px)] md:bottom-4 right-4 z-[101] flex items-center gap-2">
        <span className="text-xs font-semibold tabular-nums px-2.5 py-1.5 rounded-lg bg-card/80 border border-border/60 backdrop-blur-sm text-muted-foreground" suppressHydrationWarning>
          {discoveredCount}<span className="opacity-50">/{totalCount}</span>
        </span>
        <button
          onClick={onClear}
          disabled={items.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card/80 border border-border/60 hover:bg-card text-muted-foreground hover:text-foreground text-xs font-medium backdrop-blur-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {lang === 'fr' ? 'Vider' : 'Clear'}
        </button>
      </div>

      {/* INVENTORY PANEL */}
      <div
        ref={inventoryRef}
        className="absolute bottom-0 left-0 right-0 h-[45vh] md:bottom-0 md:left-auto md:top-0 md:right-0 md:h-full md:w-[300px] lg:w-[400px] bg-card/95 backdrop-blur-xl border-t md:border-t-0 md:border-l border-border flex flex-col"
        style={{ zIndex: 100 }}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-3 border-b border-border">
          <div className="flex items-center justify-end mb-2">
            <div className="flex items-center gap-1">
              {/* Lang switcher */}
              <div className="flex items-center bg-muted rounded-md p-0.5 h-7">
                <button
                  className={`px-1.5 h-6 text-[10px] font-semibold rounded transition-colors ${lang === 'fr' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => onSetLang('fr')}
                >FR</button>
                <button
                  className={`px-1.5 h-6 text-[10px] font-semibold rounded transition-colors ${lang === 'en' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => onSetLang('en')}
                >EN</button>
              </div>

              <div className="relative">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowReset(!showReset)}>
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
                {showReset && (
                  <>
                    <div className="fixed inset-0 z-[200]" onClick={() => setShowReset(false)} />
                    <div className="absolute right-0 top-full mt-2 z-[201] bg-popover border border-border rounded-lg shadow-xl p-3 w-44">
                      <p className="text-xs mb-2">{lang === 'fr' ? 'Réinitialiser ?' : 'Reset progress?'}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" className="flex-1" onClick={() => { onReset(); setShowReset(false) }}>
                          {lang === 'fr' ? 'Oui' : 'Yes'}
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowReset(false)}>
                          {lang === 'fr' ? 'Non' : 'No'}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-2.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={lang === 'fr' ? 'Rechercher...' : 'Search...'}
              className="w-full h-10 pl-10 pr-10 bg-muted/50 border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-colors"
              style={{ fontSize: '16px' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 transition-colors"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex gap-2">
            {(['name', 'recent'] as const).map(type => (
              <button
                key={type}
                className={`flex-1 h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 border transition-colors ${
                  sortBy === type
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                }`}
                onClick={() => toggleSort(type)}
              >
                {type === 'name' ? (lang === 'fr' ? 'Nom' : 'Name') : (lang === 'fr' ? 'Récent' : 'Recent')}
                {sortBy === type && <ArrowUpDown className={`w-3.5 h-3.5 transition-transform ${sortReverse ? 'rotate-180' : ''}`} />}
              </button>
            ))}
          </div>
        </div>



        {/* Scroll area + custom scrollbar */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Grid (no native scrollbar, no touch-action) */}
          <div
            ref={inventoryScrollRef}
            className="flex-1 overflow-y-scroll p-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', touchAction: 'none' }}
          >
            <div className="grid grid-cols-3 gap-3">
              {discoveredElements.map(element => (
                <div
                  key={element.name}
                  className="cursor-grab active:cursor-grabbing select-none"
                  onPointerDown={e => handleInventoryPointerDown(e, element.name)}
                >
                  <ElementBadge element={element} size="md" fluid />
                </div>
              ))}
            </div>
          </div>

          {/* Custom scrollbar track */}
          <div
            ref={scrollTrackRef}
            className="w-4 lg:w-3 flex-shrink-0 bg-muted/30 relative my-2 mr-1.5 rounded-full"
          >
            {/* Thumb */}
            <div
              ref={scrollThumbRef}
              className="absolute w-full rounded-full bg-muted-foreground/50 hover:bg-muted-foreground/70 active:bg-muted-foreground/90 cursor-grab active:cursor-grabbing transition-colors"
              style={{ touchAction: 'none' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
