'use client'

import { useRef, useCallback, useState } from 'react'
import { ElementBadge } from './element-badge'
import type { PlaygroundItem } from '@/hooks/use-game-store'
import type { ElementDef } from '@/lib/game-data'
import { Trash2 } from 'lucide-react'

const MERGE_DISTANCE = 80

interface PlaygroundProps {
  items: PlaygroundItem[]
  elements: Map<string, ElementDef>
  onDrop: (element: string, x: number, y: number) => void
  onMove: (id: string, x: number, y: number) => void
  onMerge: (id1: string, id2: string) => string | null
  onRemove: (id: string) => void
  onClear: () => void
}

export function Playground({ items, elements, onDrop, onMove, onMerge, onRemove, onClear }: PlaygroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const [mergeAnimation, setMergeAnimation] = useState<{ x: number; y: number; element: string } | null>(null)
  const [shakeId, setShakeId] = useState<string | null>(null)
  const [nearMergeId, setNearMergeId] = useState<string | null>(null)

  const getRelativePos = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  // Drop from inventory
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const element = e.dataTransfer.getData('text/element')
    if (!element) return
    const pos = getRelativePos(e.clientX, e.clientY)
    
    // Check if dropped on existing element for instant merge
    const droppedOnItem = items.find(item => {
      const dx = pos.x - item.x - 45
      const dy = pos.y - item.y - 18
      return Math.sqrt(dx * dx + dy * dy) < 50
    })
    
    if (droppedOnItem) {
      // Create temporary item at drop position for merge
      const tempId = `temp-${Date.now()}`
      onDrop(element, pos.x - 45, pos.y - 18)
      // Wait a frame then trigger merge
      setTimeout(() => {
        const newItem = items.find(i => i.id === tempId || i.element === element)
        if (newItem) {
          const result = onMerge(newItem.id, droppedOnItem.id)
          if (result) {
            setMergeAnimation({
              x: (newItem.x + droppedOnItem.x) / 2,
              y: (newItem.y + droppedOnItem.y) / 2,
              element: result,
            })
            setTimeout(() => setMergeAnimation(null), 700)
          }
        }
      }, 50)
    } else {
      onDrop(element, pos.x - 45, pos.y - 18)
    }
  }, [getRelativePos, onDrop, items, onMerge])

  // Playground item dragging
  const handleItemPointerDown = useCallback((e: React.PointerEvent, itemId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const pos = getRelativePos(e.clientX, e.clientY)
    dragOffsetRef.current = { x: pos.x - item.x, y: pos.y - item.y }
    setDraggingId(itemId)

    // Capture pointer on the container to not lose it
    containerRef.current?.setPointerCapture(e.pointerId)
  }, [items, getRelativePos])

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
    if (!draggingId) return
    const pos = getRelativePos(e.clientX, e.clientY)
    const newX = pos.x - dragOffsetRef.current.x
    const newY = pos.y - dragOffsetRef.current.y
    onMove(draggingId, newX, newY)

    // Check proximity for visual hint
    const dragItem = items.find(i => i.id === draggingId)
    if (dragItem) {
      const updatedItem = { ...dragItem, x: newX, y: newY }
      const near = findNearestItem(updatedItem)
      setNearMergeId(near?.id || null)
    }
  }, [draggingId, getRelativePos, onMove, items, findNearestItem])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!draggingId) return
    containerRef.current?.releasePointerCapture(e.pointerId)
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
          // Failed merge - shake
          setShakeId(draggingId)
          setTimeout(() => setShakeId(null), 400)
        }
      } else {
        // If dragged far outside, remove
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          if (dragItem.x < -60 || dragItem.y < -60 || dragItem.x > rect.width + 60 || dragItem.y > rect.height + 60) {
            onRemove(draggingId)
          }
        }
      }
    }

    setDraggingId(null)
  }, [draggingId, items, findNearestItem, onMerge, onRemove])

  // Double click to remove
  const handleDoubleClick = useCallback((itemId: string) => {
    onRemove(itemId)
  }, [onRemove])

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden"
      style={{ touchAction: 'none' }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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
              isDragging ? 'z-50' : 'z-10 hover:z-20'
            } ${isShaking ? 'animate-shake' : ''}`}
            style={{
              left: item.x,
              top: item.y,
              transform: isDragging ? 'scale(1.08)' : isNearMerge ? 'scale(1.05)' : 'scale(1)',
              transition: isDragging ? 'transform 0.1s' : 'transform 0.15s, left 0.05s, top 0.05s',
              filter: isNearMerge ? `drop-shadow(0 0 8px ${el.color}60)` : undefined,
            }}
            onPointerDown={(e) => handleItemPointerDown(e, item.id)}
            onDoubleClick={() => handleDoubleClick(item.id)}
          >
            <ElementBadge element={el} />
          </div>
        )
      })}

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
            <ElementBadge element={elements.get(mergeAnimation.element)!} />
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
  )
}
