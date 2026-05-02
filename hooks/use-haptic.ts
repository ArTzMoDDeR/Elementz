'use client'

/**
 * Centralized haptic feedback for iOS PWA.
 * Uses the Web Vibration API — Safari PWA supports it on iOS 13+.
 * On non-supporting devices it silently no-ops.
 */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection'

const PATTERNS: Record<HapticStyle, number | number[]> = {
  selection: 10,
  light:     20,
  medium:    40,
  heavy:     60,
  success:   [30, 20, 50],
  error:     [50, 30, 50, 30, 50],
}

let hapticOn = true

export function setHapticEnabled(val: boolean) {
  hapticOn = val
}

export function haptic(style: HapticStyle = 'light') {
  if (!hapticOn) return
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  try {
    navigator.vibrate(PATTERNS[style])
  } catch {
    // silently ignore — some browsers block vibration
  }
}
