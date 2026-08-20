import { useEffect, useRef, useState } from 'react'

/**
 * FLIGHT STORE
 *
 * Two kinds of state, deliberately separated:
 *
 *  - CONTINUOUS (position, velocity, heading, throttle) lives in a plain
 *    mutable object read inside useFrame. React never sees it. Routing 60fps
 *    telemetry through React state would re-render the tree 60 times a second
 *    and destroy the frame budget.
 *
 *  - DISCRETE (which target is locked, which section is open, phase) is
 *    published through a tiny subscription store so HUD components can react.
 *    These change a few times per session, not per frame.
 *
 * HUD readouts that must display continuous values (velocity, position) poll
 * the mutable object on an interval via useTelemetry — 10Hz is plenty for a
 * number a human reads, and it costs 10 renders/sec instead of 60.
 */

/** Mutable flight state. Read/written inside the render loop. Never in JSX. */
export const flight = {
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  /** Heading in radians (yaw). 0 = facing -Z. */
  heading: 0,
  /** Vertical drift angle, clamped. Contributes feel without 6DOF confusion. */
  pitch: 0,
  speed: 0,
  throttle: 0,
  boost: 0,
  /** Seconds since the pilot last touched a control. Drives auto-level. */
  idleTime: 0,
  /** True once the pilot has moved for the first time — retires the hint HUD. */
  hasMoved: false,
}

export function resetFlight() {
  flight.position = { x: 0, y: 0, z: 0 }
  flight.velocity = { x: 0, y: 0, z: 0 }
  flight.heading = 0
  flight.pitch = 0
  flight.speed = 0
  flight.throttle = 0
  flight.boost = 0
  flight.idleTime = 0
  flight.hasMoved = false
}

/* ------------------------------------------------------------------ */
/* Discrete store                                                      */
/* ------------------------------------------------------------------ */

const listeners = new Set()

let state = {
  /** 'boot' | 'flying' | 'capturing' | 'docked' */
  phase: 'boot',
  /** Destination id currently within detect radius, or null. */
  lockedTarget: null,
  /** Destination id we are docked at, or null. */
  activeSection: null,
  /** Satellite id opened inside THE WORKS, or null. */
  activeSatellite: null,
  /** Index of the media panel opened full-screen, or null. */
  focusedPanel: null,
  /** Mission id opened inside ARCHIVES, or null. */
  activeMission: null,
  /** True while the ship-systems diagnostic overlay is open. */
  systemsOpen: false,
  /** Deployment flow: null | 'form' | 'countdown' | 'launching' | 'sent' */
  deployPhase: null,
  /** True while the [NAVIGATION] panel is open. */
  navOpen: false,
  /** Degraded RENDERING for low-end GPUs / mobile: fewer particles, no bloom. */
  reducedMode: false,
  /**
   * Honours prefers-reduced-motion ONLY.
   *
   * Kept separate from reducedMode on purpose: a mid-range GPU should still get
   * the full deployment cinematic, just rendered more cheaply. Conflating the
   * two meant PerformanceMonitor.onDecline silently skipped the entire launch
   * sequence for anyone whose frame rate dipped — an accessibility setting and
   * a performance heuristic are not the same decision.
   */
  prefersReducedMotion: false,
}

export function getFlightState() {
  return state
}

export function setFlightState(patch) {
  const next = typeof patch === 'function' ? patch(state) : patch
  let changed = false
  for (const key in next) {
    if (state[key] !== next[key]) {
      changed = true
      break
    }
  }
  if (!changed) return
  state = { ...state, ...next }
  listeners.forEach((fn) => fn(state))
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * Subscribe to a slice of discrete state. Re-renders only when the selected
 * value actually changes.
 */
export function useFlightState(selector) {
  const select = selector || ((s) => s)
  const [value, setValue] = useState(() => select(state))
  const selectRef = useRef(select)
  selectRef.current = select

  useEffect(
    () =>
      subscribe((next) => {
        const picked = selectRef.current(next)
        setValue((prev) => (Object.is(prev, picked) ? prev : picked))
      }),
    [],
  )

  return value
}

/**
 * Poll continuous flight values at a low frequency for HUD display.
 * @param {(f: typeof flight) => any} read  extracts the display value
 * @param {number} hz                        sample rate, default 10
 */
export function useTelemetry(read, hz = 10) {
  const [value, setValue] = useState(() => read(flight))
  const readRef = useRef(read)
  readRef.current = read

  useEffect(() => {
    const id = setInterval(() => {
      const next = readRef.current(flight)
      setValue((prev) => (Object.is(prev, next) ? prev : next))
    }, 1000 / hz)
    return () => clearInterval(id)
  }, [hz])

  return value
}
