'use client'

// Lazily-loaded Haptics — avoids SSR issues with @capacitor/haptics
let _Haptics: typeof import('@capacitor/haptics').Haptics | null = null
let _ImpactStyle: typeof import('@capacitor/haptics').ImpactStyle | null = null

async function loadHaptics() {
  if (_Haptics) return { Haptics: _Haptics, ImpactStyle: _ImpactStyle! }
  const mod = await import('@capacitor/haptics')
  _Haptics = mod.Haptics
  _ImpactStyle = mod.ImpactStyle
  return { Haptics: _Haptics, ImpactStyle: _ImpactStyle }
}

export async function triggerHaptic(style: 'medium' | 'heavy') {
  if (typeof window === 'undefined') return
  try {
    const { Haptics, ImpactStyle } = await loadHaptics()
    await Haptics.impact({ style: style === 'heavy' ? ImpactStyle.Heavy : ImpactStyle.Medium })
    return
  } catch {}
  // Web fallback
  try {
    if (navigator.vibrate) navigator.vibrate(style === 'heavy' ? [30, 20, 60] : 10)
  } catch {}
}
