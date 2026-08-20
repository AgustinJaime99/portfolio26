/**
 * ART DIRECTION — single source of truth.
 *
 * Rules that must not be broken:
 *  1. AMBER never exceeds ~2% of screen pixels. Active/alert states only.
 *  2. ION is light only (engines, rim). It never appears in UI text or borders.
 *  3. No gradients between accent colours. Ever.
 *  4. Composition is built with light, not with hue.
 */

export const COLOR = {
  void: '#08090B',
  hull: '#16181D',
  steel: '#2A2E36',
  dust: '#6E747F',
  signal: '#E8E9EB',
  amber: '#FF6B35',
  ion: '#7FD4E8',
}

/** Numeric forms for three.js (avoids per-frame string parsing). */
export const HEX = {
  void: 0x08090b,
  hull: 0x16181d,
  steel: 0x2a2e36,
  dust: 0x6e747f,
  signal: 0xe8e9eb,
  amber: 0xff6b35,
  ion: 0x7fd4e8,
}

/**
 * Motion constants. Durations in seconds.
 * OVERSHOOT is the detail that separates "it moves" from "it feels physical".
 */
export const MOTION = {
  fov: { rest: 55, boost: 78, overshoot: 52 },
  boostAttack: 0.4,
  boostRelease: 0.2,
  autoLevelDelay: 1.2,
  captureDuration: 1.4,
  monolithSilence: 0.8,
}

/** HUD labels are small and spaced. The HUD whispers. */
export const HUD_LABEL = {
  fontSize: '10px',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
}
