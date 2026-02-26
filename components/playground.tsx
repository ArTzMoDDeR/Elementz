'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { signOut } from 'next-auth/react'
import { ElementBadge } from './element-badge'
import { Settings, Search, X, ArrowUpDown, Trash2, ChevronUp, ChevronDown, Lightbulb, LogIn, LogOut } from 'lucide-react'
import type { ElementDef, PlaygroundItem } from '@/lib/game-data'
import Link from 'next/link'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

interface PlaygroundProps {
  items: PlaygroundItem[]
  elements: Map<string, ElementDef>
  discovered: Set<string>
  totalElements: number
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
  sessionUser?: { name?: string | null; image?: string | null } | null
  hintsEnabled?: boolean
  onToggleHints?: () => void
  onRequestHint?: () => void
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
// Smart scroll button (accelerates the longer you hold)
// ============================================================
function ScrollButton({ dir, scrollRef }: { dir: 'up' | 'down'; scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  const scroll = (ts: number) => {
    if (!scrollRef.current) return
    const elapsed = ts - startTimeRef.current
    // Start at 3px/frame, ramp to 18px/frame over 1.5s
    const speed = Math.min(3 + (elapsed / 1500) * 15, 18)
    scrollRef.current.scrollTop += dir === 'down' ? speed : -speed
    rafRef.current = requestAnimationFrame(scroll)
  }

  const start = () => {
    startTimeRef.current = performance.now()
    rafRef.current = requestAnimationFrame(scroll)
  }
  const stop = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
  }

  return (
    <button
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      className="md:hidden flex-1 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground active:text-foreground hover:bg-muted/40 transition-colors flex-shrink-0 select-none touch-none"
    >
      {dir === 'up' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
    </button>
  )
}

// ============================================================
// Playground component
// ============================================================
export function Playground({
  items, elements, discovered, totalElements,
  lang, onSetLang,
  onDrop, onMove, onMerge, onDropAndMerge, onRemove, onClear, onReset,
  onUnlockAll, sessionUser, hintsEnabled, onToggleHints, onRequestHint,
}: PlaygroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inventoryRef = useRef<HTMLDivElement>(null)
  const inventoryScrollRef = useRef<HTMLDivElement>(null)

  const [dragging, setDragging] = useState<DragState | null>(null)
  const [nearMergeId, setNearMergeId] = useState<string | null>(null)
  const [mergeAnimation, setMergeAnimation] = useState<{ x: number; y: number } | null>(null)
  const [shakeId, setShakeId] = useState<string | null>(null)
  const isMobile = useIsMobile()
  const playgroundBadgeSize = isMobile ? 'sm' : 'lg'
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortType>('name')
  const [sortReverse, setSortReverse] = useState(false)

  // Inventory resize — mobile only
  const [inventoryHeight, setInventoryHeight] = useState<number | null>(null) // null = default 55vh
  const dragHandleRef = useRef<{ startY: number; startH: number } | null>(null)

  const handleDragHandlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const currentH = inventoryRef.current?.getBoundingClientRect().height ?? window.innerHeight * 0.55
    dragHandleRef.current = { startY: e.clientY, startH: currentH }

    const onMove = (ev: PointerEvent) => {
      if (!dragHandleRef.current) return
      const delta = dragHandleRef.current.startY - ev.clientY // drag up = bigger
      const newH = Math.max(120, Math.min(window.innerHeight * 0.92, dragHandleRef.current.startH + delta))
      setInventoryHeight(newH)
    }
    const onUp = () => {
      dragHandleRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [])

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
          setMergeAnimation({ x: (dragging.x + nearest.x) / 2, y: (dragging.y + nearest.y) / 2 })
          setTimeout(() => setMergeAnimation(null), 600)
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
          setMergeAnimation({ x: (dragging.x + nearest.x) / 2, y: (dragging.y + nearest.y) / 2 })
          setTimeout(() => setMergeAnimation(null), 600)
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
    .filter(el => {
      const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
      return n(el.name).includes(n(search))
    })
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
                <ElementBadge element={el} size={playgroundBadgeSize} />
          </div>
        )
      })}

      {/* GHOST (inventory drag) */}
      {dragging?.source === 'inventory' && elements.get(dragging.elementName) && (
        <div
          className="absolute pointer-events-none"
          style={{ left: dragging.x, top: dragging.y, zIndex: 9999, transform: 'scale(1.05)', opacity: 0.9 }}
        >
              <ElementBadge element={elements.get(dragging.elementName)!} size={playgroundBadgeSize} />
        </div>
      )}

      {/* MERGE ANIMATION — flash ring only, no badge duplicate */}
      {mergeAnimation && (
        <div
          className="absolute pointer-events-none"
          style={{ left: mergeAnimation.x, top: mergeAnimation.y, zIndex: 250, transform: 'translate(-50%, -50%)' }}
        >
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full animate-ping" style={{ backgroundColor: 'white', opacity: 0.15 }} />
            <div className="absolute w-10 h-10 rounded-full animate-ping" style={{ backgroundColor: 'white', opacity: 0.25, animationDelay: '80ms' }} />
          </div>
        </div>
      )}



      {/* INVENTORY PANEL */}
      <div
        ref={inventoryRef}
        className="absolute bottom-0 left-0 right-0 md:bottom-0 md:left-auto md:top-0 md:right-0 md:h-full md:w-[300px] lg:w-[400px] bg-card/95 backdrop-blur-xl border-t md:border-t-0 md:border-l border-border flex flex-col"
        style={{
          zIndex: 100,
          height: isMobile ? (inventoryHeight != null ? `${inventoryHeight}px` : '55vh') : undefined,
        }}
      >
        {/* Drag handle — mobile only, rendered via isMobile to avoid SSR/hydration mismatch */}
        {isMobile && (
          <div
            className="flex-shrink-0 flex items-center justify-center h-6 cursor-row-resize touch-none select-none active:bg-muted/30 transition-colors"
            onPointerDown={handleDragHandlePointerDown}
          >
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/40" />
          </div>
        )}
        {/* Header */}
        <div className="flex-shrink-0 px-3 pt-3 pb-3 border-b border-border flex flex-col gap-2.5">

          {/* Row 1: logo + title + counter — centré */}
          <div className="flex items-center justify-center gap-2">
            <img src="/logo.png" alt="Elementz" className="w-6 h-6 rounded-full flex-shrink-0" />
            <span className="font-bold text-sm tracking-tight">Elementz</span>
            <span className="text-xs tabular-nums text-muted-foreground" suppressHydrationWarning>
              {discovered.size}<span className="opacity-40">/{totalElements}</span>
            </span>
          </div>

          {/* Row 2: clear, login/logout, FR/EN, hint */}
          <div className="flex items-center gap-2">
            {/* Clear — icon only */}
            <button
              onClick={onClear}
              disabled={items.length === 0}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-muted/50 border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
              title={lang === 'fr' ? 'Vider' : 'Clear'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <div className="flex-1" />

            {/* Login / avatar+logout */}
            {sessionUser ? (
              <div className="flex items-center gap-1 h-9 px-2 rounded-xl bg-muted/50 border border-border flex-shrink-0">
                {sessionUser.image && (
                  <img src={sessionUser.image} alt="" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
                )}
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-muted/50 border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors flex-shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                Login
              </Link>
            )}

            {/* Lang switcher */}
            <div className="flex items-center bg-muted/50 border border-border rounded-xl p-1 h-9 gap-0.5 flex-shrink-0">
              <button
                className={`px-2 h-full text-xs font-semibold rounded-lg transition-colors ${lang === 'fr' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => onSetLang('fr')}
              >FR</button>
              <button
                className={`px-2 h-full text-xs font-semibold rounded-lg transition-colors ${lang === 'en' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => onSetLang('en')}
              >EN</button>
            </div>

            {/* Hint toggle */}
            <button
              onClick={onToggleHints}
              title={hintsEnabled ? (lang === 'fr' ? 'Désactiver les hints' : 'Disable hints') : (lang === 'fr' ? 'Activer les hints' : 'Enable hints')}
              className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-colors flex-shrink-0 ${
                hintsEnabled
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25'
                  : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Row 3: search + Nom + Récent sur la même ligne */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={lang === 'fr' ? 'Rechercher...' : 'Search...'}
                className="w-full h-9 pl-9 pr-8 bg-muted/50 border border-input rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-colors"
                style={{ fontSize: '16px' }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 transition-colors"
                >
                  <X className="w-2.5 h-2.5 text-muted-foreground" />
                </button>
              )}
            </div>
            {(['name', 'recent'] as const).map(type => (
              <button
                key={type}
                className={`h-9 px-3 rounded-xl text-xs font-medium flex items-center gap-1 border transition-colors flex-shrink-0 ${
                  sortBy === type
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                }`}
                onClick={() => toggleSort(type)}
              >
                {type === 'name' ? (lang === 'fr' ? 'Nom' : 'Name') : (lang === 'fr' ? 'Récent' : 'Recent')}
                {sortBy === type && <ArrowUpDown className={`w-3 h-3 transition-transform ${sortReverse ? 'rotate-180' : ''}`} />}
              </button>
            ))}
          </div>
        </div>



        {/* Scroll area + scroll buttons */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Up + Down buttons side by side — mobile only */}
          <div className="md:hidden flex flex-shrink-0 border-b border-border">
            <ScrollButton dir="up" scrollRef={inventoryScrollRef} />
            <ScrollButton dir="down" scrollRef={inventoryScrollRef} />
          </div>

          {/* Grid */}
          <div
            ref={inventoryScrollRef}
            className="flex-1 overflow-y-scroll p-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', touchAction: 'none' }}
          >
            <div className="grid grid-cols-4 md:grid-cols-3 gap-2 md:gap-3 justify-items-center">
              {discoveredElements.map(element => (
                <div
                  key={element.name}
                  className="cursor-grab active:cursor-grabbing select-none"
                  onPointerDown={e => handleInventoryPointerDown(e, element.name)}
                >
                  <ElementBadge element={element} size={isMobile ? 'sm' : 'md'} fluid />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom spacer — mobile only */}
          <div className="md:hidden h-11 flex-shrink-0" />
        </div>
      </div>
    </div>
  )
}
