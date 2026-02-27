'use client'

import { type ElementDef } from '@/lib/game-data'

interface ElementBadgeProps {
  element: ElementDef
  size?: 'xs' | 'sm' | 'md' | 'lg'
  fluid?: boolean
  className?: string
  style?: React.CSSProperties
}

const ELEMENT_ICONS: Record<string, (color: string) => React.ReactNode> = {
  'eau': (_c) => (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M12 2C12 2 5 10 5 15a7 7 0 0014 0c0-5-7-13-7-13z" fill="rgba(255,255,255,0.7)"/>
    </svg>
  ),
  'feu': (_c) => (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M12 2c0 0-6 6-6 12a6 6 0 0012 0c0-3-1.5-5-3-7 0 2-1 3-3 3s-2-2 0-8z" fill="rgba(255,255,255,0.7)"/>
    </svg>
  ),
  'terre': (_c) => (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.7)"/>
    </svg>
  ),
  'air': (_c) => (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M4 8h12a3 3 0 100-3" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M4 12h14a3 3 0 110 3H4" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M4 16h8a2 2 0 110 2" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
}

const FIXED_SIZE = {
  xs: 'w-12 h-12',
  sm: 'w-[68px] h-[68px]',
  md: 'w-20 h-20',
  lg: 'w-28 h-28',
}

const ICON_RATIO = {
  xs: 'w-[65%] h-[65%]',
  sm: 'w-[65%] h-[65%]',
  md: 'w-[70%] h-[70%]',
  lg: 'w-[72%] h-[72%]',
}

// Base font sizes per badge size
const LABEL_BASE_PX: Record<'xs' | 'sm' | 'md' | 'lg', number> = {
  xs: 7,
  sm: 8,
  md: 9,
  lg: 10,
}

// Returns a scaled font-size in px depending on name length
function labelFontSize(size: 'xs' | 'sm' | 'md' | 'lg', name: string): number {
  const base = LABEL_BASE_PX[size]
  const len = name.length
  if (len <= 8)  return base
  if (len <= 12) return Math.max(base - 1, 6)
  if (len <= 18) return Math.max(base - 1.5, 6)
  return Math.max(base - 2, 6)
}

// Single neutral background for all badges
const BADGE_BG = 'rgba(255,255,255,0.06)'
const BADGE_BORDER = 'rgba(255,255,255,0.12)'
const LABEL_BG = 'rgba(0,0,0,0.55)'

export function ElementBadge({ element, size = 'md', fluid = false, className = '', style }: ElementBadgeProps) {
  const hasIcon = ELEMENT_ICONS[element.name]
  const sizeClass = fluid ? 'w-full aspect-square' : FIXED_SIZE[size]

  return (
    <div
      className={`${sizeClass} flex flex-col items-center justify-between rounded-xl select-none overflow-hidden ${className}`}
      style={{
        backgroundColor: BADGE_BG,
        border: `1px solid ${BADGE_BORDER}`,
        ...style,
      }}
    >
      {/* Image / icon — fills most of the badge */}
      <div className="flex-1 w-full flex items-center justify-center p-1.5">
        <div className={`${ICON_RATIO[size]} flex items-center justify-center`}>
          {element.imageUrl ? (
            <img
              src={element.imageUrl}
              alt={element.name}
              draggable={false}
              className="w-full h-full object-contain pointer-events-none"
            />
          ) : hasIcon ? (
            ELEMENT_ICONS[element.name](element.color)
          ) : (
            <div
              className="w-[80%] h-[80%] flex items-center justify-center font-bold rounded-lg text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', fontSize: '120%' }}
            >
              {element.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Label — auto height, font shrinks for long names, 2 lines max without crop */}
      <div
        className="w-full px-1 py-[2px] flex items-center justify-center shrink-0"
        style={{ backgroundColor: LABEL_BG }}
      >
        <span
          className="font-semibold leading-tight text-center text-white w-full"
          style={{
            fontSize: labelFontSize(size, element.name),
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'visible',
            wordBreak: 'break-word',
            hyphens: 'auto',
            lineHeight: 1.2,
          }}
        >
          {element.name}
        </span>
      </div>
    </div>
  )
}
