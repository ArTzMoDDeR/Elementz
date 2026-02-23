'use client'

import { type ElementDef } from '@/lib/game-data'

interface ElementBadgeProps {
  element: ElementDef
  size?: 'sm' | 'md' | 'lg'
  className?: string
  style?: React.CSSProperties
}

// SVG icon paths for common elements (simple, recognizable shapes)
const ELEMENT_ICONS: Record<string, (color: string) => React.ReactNode> = {
  'eau': (c) => (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M12 2C12 2 5 10 5 15a7 7 0 0014 0c0-5-7-13-7-13z" fill={c} opacity="0.9"/>
    </svg>
  ),
  'feu': (c) => (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M12 2c0 0-6 6-6 12a6 6 0 0012 0c0-3-1.5-5-3-7 0 2-1 3-3 3s-2-2 0-8z" fill={c} opacity="0.9"/>
    </svg>
  ),
  'terre': (c) => (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <circle cx="12" cy="12" r="10" fill={c} opacity="0.9"/>
      <path d="M7 8c2-1 4 0 5 2s3 2 5 0" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none"/>
      <path d="M5 14c3-1 5 1 7 0s4-1 7 1" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none"/>
    </svg>
  ),
  'air': (c) => (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M4 8h12a3 3 0 100-3" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M4 12h14a3 3 0 110 3H4" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7"/>
      <path d="M4 16h8a2 2 0 110 2" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5"/>
    </svg>
  ),
}

export function ElementBadge({ element, size = 'md', className = '', style }: ElementBadgeProps) {
  const iconSize = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : 'w-7 h-7'
  const textSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs'
  const padding = size === 'sm' ? 'px-2 py-1.5' : size === 'lg' ? 'px-3 py-2.5' : 'px-3 py-2'

  const hasIcon = ELEMENT_ICONS[element.name]

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg select-none ${padding} ${className}`}
      style={{
        backgroundColor: `${element.color}18`,
        border: `1.5px solid ${element.color}40`,
        ...style,
      }}
    >
      <div className={`${iconSize} flex-shrink-0 flex items-center justify-center overflow-hidden rounded-md`}>
        {element.imageUrl ? (
          <img
            src={element.imageUrl}
            alt={element.name}
            className="w-full h-full object-cover"
          />
        ) : hasIcon ? (
          ELEMENT_ICONS[element.name](element.color)
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-[9px] font-bold"
            style={{
              backgroundColor: element.color,
              color: 'white',
            }}
          >
            {element.icon.charAt(0)}
          </div>
        )}
      </div>
      <span
        className={`${textSize} font-medium leading-tight`}
        style={{ color: element.color }}
      >
        {element.name}
      </span>
    </div>
  )
}
