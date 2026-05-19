'use client'

import { memo } from 'react'
import { type ElementDef } from '@/lib/game-data'

interface ElementBadgeProps {
  element: ElementDef
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  fluid?: boolean
  className?: string
  style?: React.CSSProperties
}

// Pill sizes: width × height
const PILL_SIZE = {
  xs: { w: 80,  h: 32,  icon: 16, font: 10, radius: 10 },
  sm: { w: 100, h: 38,  icon: 19, font: 11, radius: 12 },
  md: { w: 116, h: 44,  icon: 22, font: 12, radius: 13 },
  lg: { w: 136, h: 52,  icon: 26, font: 13, radius: 16 },
}

// Returns a scaled-down font size when the name is long
function adaptiveFont(baseFontSize: number, name: string): number {
  const len = name.length
  if (len <= 8)  return baseFontSize
  if (len <= 13) return baseFontSize * 0.88
  if (len <= 18) return baseFontSize * 0.78
  return baseFontSize * 0.70
}

// Square sizes (playground canvas / xl / 2xl)
const SQUARE_SIZE = {
  sm:  { w: 60,  h: 60,  icon: 32, labelFont: 9,    radius: 14 },
  xl:  { w: 80,  h: 80,  icon: 40, labelFont: 10.5, radius: 18 },
  '2xl': { w: 110, h: 110, icon: 62, labelFont: 12,   radius: 22 },
}

function ElementBadgeInner({ element, size = 'md', fluid = false, className = '', style }: ElementBadgeProps & { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' }) {
  const imgSrc = element.imageUrl || null
  const name = element.name

  // xl / 2xl / fluid → square layout (used on playground canvas)
  if (size === 'xl' || size === '2xl' || fluid) {
    const sq = size === '2xl' ? SQUARE_SIZE['2xl'] : size === 'sm' && fluid ? SQUARE_SIZE.sm : SQUARE_SIZE.xl
    const wClass = fluid ? 'w-full aspect-square' : undefined
    return (
      <div
        className={`${fluid ? wClass : ''} relative flex flex-col items-center justify-between select-none overflow-hidden ${className}`}
        style={{
          width: fluid ? undefined : sq.w,
          height: fluid ? undefined : sq.h,
          borderRadius: sq.radius,
          background: 'var(--badge-bg)',
          border: '1px solid var(--badge-border)',
          boxShadow: 'var(--badge-shadow)',
          contentVisibility: 'auto',
          containIntrinsicSize: `${sq.w}px ${sq.h}px`,
          ...style,
        }}
      >
        {/* Top shine */}
        <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: '45%', borderRadius: `${sq.radius}px ${sq.radius}px 0 0`, background: 'var(--badge-shine)' }} />

        {/* Icon */}
        <div className="flex-1 w-full flex items-center justify-center relative z-10 pt-1">
          {imgSrc ? (
            <img src={imgSrc} alt={name} draggable={false} loading="eager" decoding="async"
              style={{ width: sq.icon, height: sq.icon, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.25))' }}
              className="pointer-events-none"
            />
          ) : (
            <div className="flex items-center justify-center rounded-xl font-bold text-white"
              style={{ width: sq.icon, height: sq.icon, backgroundColor: 'rgba(255,255,255,0.12)', fontSize: sq.icon * 0.45 }}>
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Label strip */}
        <div className="w-full flex items-center justify-center shrink-0 relative z-10 px-1 pb-1.5">
          <span className="font-semibold text-center leading-tight w-full"
            style={{
              color: 'var(--badge-label-text)',
              fontSize: sq.labelFont,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}>
            {name}
          </span>
        </div>
      </div>
    )
  }

  // Pill / horizontal layout for xs → lg (inventory grid)
  const p = PILL_SIZE[size]
  return (
    <div
      className={`relative flex flex-row items-center select-none overflow-hidden gap-0 ${className}`}
      style={{
        width: p.w,
        height: p.h,
        borderRadius: p.radius,
        background: 'var(--badge-bg)',
        border: '1px solid var(--badge-border)',
        boxShadow: 'var(--badge-shadow)',
        contentVisibility: 'auto',
        containIntrinsicSize: `${p.w}px ${p.h}px`,
        ...style,
      }}
    >
      {/* Left shine on icon area */}
      <div className="absolute inset-y-0 left-0 pointer-events-none" style={{ width: '45%', borderRadius: `${p.radius}px 0 0 ${p.radius}px`, background: 'var(--badge-shine-h)' }} />

      {/* Icon */}
      <div className="flex-shrink-0 flex items-center justify-center relative z-10"
        style={{ width: p.h, height: p.h }}>
        {imgSrc ? (
          <img src={imgSrc} alt={name} draggable={false} loading="eager" decoding="async"
            style={{ width: p.icon, height: p.icon, objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
            className="pointer-events-none"
          />
        ) : (
          <div className="flex items-center justify-center rounded-lg font-bold text-white"
            style={{ width: p.icon * 0.9, height: p.icon * 0.9, backgroundColor: 'rgba(255,255,255,0.12)', fontSize: p.icon * 0.48 }}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Thin divider */}
      <div className="flex-shrink-0 self-stretch" style={{ width: 1, background: 'var(--badge-border)', opacity: 0.6 }} />

      {/* Name */}
      <div className="flex-1 flex items-center relative z-10 min-w-0" style={{ paddingLeft: p.h * 0.18, paddingRight: p.h * 0.22 }}>
        <span className="font-semibold leading-snug w-full"
          style={{
            color: 'var(--badge-label-text)',
            fontSize: adaptiveFont(p.font, name),
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
            hyphens: 'auto',
          }}>
          {name}
        </span>
      </div>
    </div>
  )
}

export const ElementBadge = memo(ElementBadgeInner)
