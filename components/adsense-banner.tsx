'use client'

import { useEffect, useRef } from 'react'

interface AdSenseBannerProps {
  /** AdSense ad slot ID from your AdSense dashboard */
  adSlot: string
  /** Ad format — defaults to 'auto' which is responsive */
  adFormat?: 'auto' | 'rectangle' | 'vertical' | 'horizontal'
  className?: string
}

const PUB_ID = 'ca-pub-2003923325493504'
const IS_DEV = process.env.NODE_ENV === 'development'

export function AdSenseBanner({ adSlot, adFormat = 'auto', className = '' }: AdSenseBannerProps) {
  const ref = useRef<HTMLModElement>(null)
  const pushed = useRef(false)

  useEffect(() => {
    // Only push once, and only when AdSense script is loaded
    if (pushed.current) return
    pushed.current = true
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adsbygoogle = (window as any).adsbygoogle ?? []
      adsbygoogle.push({})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).adsbygoogle = adsbygoogle
    } catch {}
  }, [])

  // In dev: show a labelled placeholder so you can verify layout without real ads
  if (IS_DEV) {
    return (
      <div
        className={`flex items-center justify-center bg-muted/30 border border-dashed border-border/40 rounded-lg text-xs text-muted-foreground/50 ${className}`}
        style={{ minHeight: 60 }}
      >
        AdSense — slot {adSlot}
      </div>
    )
  }

  return (
    <ins
      ref={ref}
      className={`adsbygoogle block ${className}`}
      data-ad-client={PUB_ID}
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive="true"
    />
  )
}
