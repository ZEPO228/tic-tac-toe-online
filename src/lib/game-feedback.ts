'use client'

/**
 * Game feedback utilities: sound effects + haptic vibration.
 *
 * Sounds are synthesized at runtime using the Web Audio API — no audio files
 * are bundled, so this adds ~3 KB to the JS bundle instead of hundreds of KB.
 *
 * Settings are read from localStorage('ttt_settings'):
 *   { sound: boolean, vibrate: boolean, autoQueue: boolean }
 *
 * Sound effects:
 *   - move: short click (800 Hz, 50 ms) — played when player makes a move
 *   - win:  ascending arpeggio (C-E-G) — played on victory
 *   - lose: descending low tone (200 → 100 Hz) — played on defeat
 *   - draw: neutral two-tone (440 → 330 Hz) — played on draw
 */

interface Settings {
  sound: boolean
  vibrate: boolean
  autoQueue: boolean
}

const DEFAULT_SETTINGS: Settings = {
  sound: true,
  vibrate: true,
  autoQueue: false,
}

let cachedSettings: Settings | null = null

/** Read settings from localStorage. Cached after first read. */
export function getSettings(): Settings {
  if (cachedSettings) return cachedSettings
  if (typeof window === 'undefined' || !localStorage) {
    cachedSettings = DEFAULT_SETTINGS
    return cachedSettings
  }
  try {
    const raw = localStorage.getItem('ttt_settings')
    if (!raw) {
      cachedSettings = DEFAULT_SETTINGS
      return cachedSettings
    }
    const parsed = JSON.parse(raw)
    cachedSettings = {
      sound: parsed.sound ?? DEFAULT_SETTINGS.sound,
      vibrate: parsed.vibrate ?? DEFAULT_SETTINGS.vibrate,
      autoQueue: parsed.autoQueue ?? DEFAULT_SETTINGS.autoQueue,
    }
    return cachedSettings
  } catch (e) {
    console.warn('[settings] Failed to parse ttt_settings:', e)
    cachedSettings = DEFAULT_SETTINGS
    return cachedSettings
  }
}

/** Invalidate the cached settings (call after SettingsView saves). */
export function invalidateSettingsCache(): void {
  cachedSettings = null
}

// ===== Audio synthesis =====

let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!('AudioContext' in window) && !('webkitAudioContext' in window)) return null
  if (!audioCtx) {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext)
    audioCtx = new Ctx()
  }
  // Browsers suspend AudioContext until user gesture — try to resume.
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/** Play a single tone at the given frequency for the given duration. */
function playTone(freq: number, durationMs: number, gain = 0.15, type: OscillatorType = 'sine'): void {
  const ctx = getAudioCtx()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gainNode = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gainNode.gain.value = 0
  // ADSR envelope (simplified): quick attack, hold, quick release
  const now = ctx.currentTime
  gainNode.gain.linearRampToValueAtTime(gain, now + 0.005)
  gainNode.gain.linearRampToValueAtTime(gain, now + durationMs / 1000 - 0.02)
  gainNode.gain.linearRampToValueAtTime(0, now + durationMs / 1000)

  osc.connect(gainNode)
  gainNode.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + durationMs / 1000)
}

// ===== Vibration =====

function vibrate(pattern: number | number[]): void {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return
  try {
    navigator.vibrate(pattern)
  } catch {
    // Some browsers throw if not allowed — silently ignore
  }
}

// ===== Public API =====

/** Play move sound + short vibration (called when player makes a move). */
export function playMove(): void {
  const s = getSettings()
  if (s.sound) {
    playTone(800, 60, 0.12, 'triangle')
  }
  if (s.vibrate) {
    vibrate(20)
  }
}

/** Play win sound + victory vibration pattern. */
export function playWin(): void {
  const s = getSettings()
  if (s.sound) {
    // Ascending arpeggio: C5 (523), E5 (659), G5 (784), C6 (1047)
    playTone(523, 120, 0.15, 'triangle')
    setTimeout(() => playTone(659, 120, 0.15, 'triangle'), 120)
    setTimeout(() => playTone(784, 120, 0.15, 'triangle'), 240)
    setTimeout(() => playTone(1047, 240, 0.18, 'triangle'), 360)
  }
  if (s.vibrate) {
    vibrate([60, 40, 60, 40, 120])
  }
}

/** Play lose sound + defeat vibration pattern. */
export function playLose(): void {
  const s = getSettings()
  if (s.sound) {
    // Descending low tone: 300 Hz → 150 Hz
    playTone(300, 200, 0.15, 'sawtooth')
    setTimeout(() => playTone(200, 200, 0.13, 'sawtooth'), 200)
    setTimeout(() => playTone(150, 400, 0.12, 'sawtooth'), 400)
  }
  if (s.vibrate) {
    vibrate([200, 100, 200])
  }
}

/** Play draw sound + neutral vibration. */
export function playDraw(): void {
  const s = getSettings()
  if (s.sound) {
    playTone(440, 150, 0.13, 'sine')
    setTimeout(() => playTone(330, 250, 0.13, 'sine'), 150)
  }
  if (s.vibrate) {
    vibrate(80)
  }
}

/** Play sound based on game result. Convenience wrapper. */
export function playResult(result: 'win' | 'loss' | 'draw'): void {
  if (result === 'win') playWin()
  else if (result === 'loss') playLose()
  else playDraw()
}

/**
 * Check if autoQueue is enabled.
 * Called from MenuView on mount — if true, navigates to matchmaking view.
 */
export function isAutoQueueEnabled(): boolean {
  return getSettings().autoQueue
}
