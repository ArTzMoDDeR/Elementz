'use client'

import { memo } from 'react'
import { type ElementDef } from '@/lib/game-data'

interface ElementBadgeProps {
  element: ElementDef
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fluid?: boolean
  className?: string
  style?: React.CSSProperties
}

const FIXED_SIZE = {
  xs: 'w-12 h-12',
  sm: 'w-[68px] h-[68px]',
  md: 'w-20 h-20',
  lg: 'w-28 h-28',
  xl: 'w-36 h-36',
}

const ICON_RATIO = {
  xs: '55%',
  sm: '58%',
  md: '60%',
  lg: '62%',
  xl: '64%',
}

const LABEL_FONT: Record<string, number> = { xs: 7.5, sm: 8.5, md: 10, lg: 11.5, xl: 13 }
const RADIUS: Record<string, string> = { xs: '10px', sm: '12px', md: '14px', lg: '18px', xl: '22px' }

function labelFontSize(size: 'xs' | 'sm' | 'md' | 'lg' | 'xl', nameLength: number): string {
  const b = LABEL_FONT[size]
  if (nameLength <= 10) return `${b}px`
  if (nameLength <= 14) return `${b - 1}px`
  if (nameLength <= 18) return `${b - 1.5}px`
  return `${b - 2}px`
}

function ElementBadgeInner({ element, size = 'md', fluid = false, className = '', style }: ElementBadgeProps & { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeClass = fluid ? 'w-full aspect-square' : FIXED_SIZE[size]
  const imgSrc = element.imageUrl || null
  const iconSize = ICON_RATIO[size]
  const borderRadius = RADIUS[size]

  return (
    <div
      className={`${sizeClass} relative flex flex-col items-center justify-between select-none overflow-hidden ${className}`}
      style={{
        borderRadius,
        background: 'var(--badge-bg)',
        border: '1px solid var(--badge-border)',
        boxShadow: 'var(--badge-shadow)',
        ...style,
      }}
    >
      {/* Subtle top highlight — iOS inner glow */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: '40%',
          borderRadius: `${borderRadius} ${borderRadius} 0 0`,
          background: 'var(--badge-shine)',
        }}
      />

      {/* Icon area */}
      <div className="flex-1 w-full flex items-center justify-center relative z-10" style={{ paddingTop: '8%', paddingBottom: '2%' }}>
        <div style={{ width: iconSize, height: iconSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={element.name}
              draggable={false}
              loading="eager"
              decoding="async"
              className="w-full h-full object-contain pointer-events-none drop-shadow-sm"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}
            />
          ) : (
            <div
              className="w-[80%] h-[80%] flex items-center justify-center font-bold rounded-xl text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', fontSize: '130%' }}
            >
              {element.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Label */}
      <div
        className="w-full flex items-center justify-center shrink-0 relative z-10"
        style={{
          background: 'var(--badge-label-bg)',
          paddingTop: '3px',
          paddingBottom: '4px',
          paddingLeft: '4px',
          paddingRight: '4px',
        }}
      >
        <span
          className="font-semibold leading-tight text-center w-full"
          style={{
            color: 'var(--badge-label-text)',
            fontSize: labelFontSize(size, element.name.length),
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
          }}
        >
          {element.name}
        </span>
      </div>
    </div>
  )
}

export const ElementBadge = memo(ElementBadgeInner)
