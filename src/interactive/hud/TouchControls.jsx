import { useEffect, useRef } from 'react'
import { useFlightState } from '../core/flightStore'

/**
 * TOUCH CONTROLS — flying with a thumb.
 *
 * On a phone there is no keyboard, so before this existed a visitor could see
 * the scene, read the HUD, and reach absolutely nothing. Verified: tapping the
 * screen left POSITION at +0000 +000 +0000.
 *
 * DESIGN RULES, in order of importance:
 *
 *   1. WRITE TO THE SAME INPUT OBJECT AS THE KEYBOARD. The flight engine reads
 *      `input.axisX` / `axisThrottle` and never learns where they came from.
 *      No branch in the engine, no second flight model to keep in sync.
 *
 *   2. ANALOGUE, NOT FOUR ARROWS. A stick that only reports ±1 feels like
 *      arrow keys drawn on glass. The magnitude of the thumb offset is the
 *      steering value, so small corrections are possible.
 *
 *   3. THUMB-REACHABLE. Both controls sit in the lower corners, inside the arc
 *      a thumb actually sweeps. Centre-screen controls look tidy in a mockup
 *      and are unusable in the hand.
 *
 *   4. QUIET. Same instrumentation vocabulary as the rest of the HUD — thin
 *      rings, no gloss, no colour until touched. A translucent gamepad overlay
 *      would wreck the art direction in one stroke.
 */

const STICK_RADIUS = 52 // px from centre at which the axis reads 1.0
const DEAD_ZONE = 0.12 // ignore micro-movement so a resting thumb does not drift

export default function TouchControls({ input }) {
  const phase = useFlightState((s) => s.phase)
  const navOpen = useFlightState((s) => s.navOpen)
  const activeSection = useFlightState((s) => s.activeSection)
  const deployPhase = useFlightState((s) => s.deployPhase)

  const stickRef = useRef(null)
  const knobRef = useRef(null)
  const thrustRef = useRef(null)

  // Only while actually flying — never over a section panel or a deployment.
  const active = phase === 'flying' && !navOpen && !activeSection && !deployPhase

  useEffect(() => {
    if (!active) {
      input.axisX = 0
      input.axisY = 0
      input.axisThrottle = 0
      input.touchActive = false
      return undefined
    }

    const stick = stickRef.current
    const knob = knobRef.current
    const thrust = thrustRef.current
    if (!stick || !thrust) return undefined

    let stickId = null
    let thrustId = null
    let origin = { x: 0, y: 0 }

    /* ---- Steering stick ---- */

    function stickDown(e) {
      if (stickId !== null) return
      stickId = e.pointerId
      const r = stick.getBoundingClientRect()
      origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      /* Capture can throw if the pointer has already been released — which
       * happens on flaky touch hardware and when a gesture is interrupted by
       * the OS. It is an optimisation, not a requirement: the window-level
       * listeners below still track the drag without it. */
      try {
        stick.setPointerCapture(e.pointerId)
      } catch {
        /* capture unavailable — drag still works */
      }
      input.touchActive = true
      stick.classList.add('ix-stick--held')
      stickMove(e)
    }

    function stickMove(e) {
      if (e.pointerId !== stickId) return
      const dx = e.clientX - origin.x
      const dy = e.clientY - origin.y
      const dist = Math.hypot(dx, dy)
      const clamped = Math.min(dist, STICK_RADIUS)
      const nx = dist > 0 ? (dx / dist) * (clamped / STICK_RADIUS) : 0
      const ny = dist > 0 ? (dy / dist) * (clamped / STICK_RADIUS) : 0

      input.axisX = Math.abs(nx) < DEAD_ZONE ? 0 : nx
      // Screen Y is inverted relative to pitch: dragging up should pitch up.
      input.axisY = Math.abs(ny) < DEAD_ZONE ? 0 : -ny

      if (knob) {
        knob.style.transform = `translate(${nx * STICK_RADIUS}px, ${ny * STICK_RADIUS}px)`
      }
    }

    function stickUp(e) {
      if (e.pointerId !== stickId) return
      stickId = null
      input.axisX = 0
      input.axisY = 0
      input.touchActive = thrustId !== null
      stick.classList.remove('ix-stick--held')
      if (knob) knob.style.transform = 'translate(0px, 0px)'
    }

    /* ---- Thrust pad ----
     *
     * Pressure would be ideal but is not available, so throttle ramps while
     * held rather than snapping to full. That ramp is what keeps the ship from
     * lurching on every tap, and it mirrors how the keyboard throttle eases in.
     */

    let thrustHeld = false
    let raf = 0

    function rampThrottle() {
      raf = requestAnimationFrame(rampThrottle)
      const target = thrustHeld ? 1 : 0
      input.axisThrottle += (target - input.axisThrottle) * 0.12
      if (input.axisThrottle < 0.001) input.axisThrottle = 0
    }
    raf = requestAnimationFrame(rampThrottle)

    function thrustDown(e) {
      if (thrustId !== null) return
      thrustId = e.pointerId
      try {
        thrust.setPointerCapture(e.pointerId)
      } catch {
        /* capture unavailable — the pad still releases on pointerup */
      }
      thrustHeld = true
      input.touchActive = true
      thrust.classList.add('ix-thrust--held')
    }

    function thrustUp(e) {
      if (e.pointerId !== thrustId) return
      thrustId = null
      thrustHeld = false
      input.touchActive = stickId !== null
      thrust.classList.remove('ix-thrust--held')
    }

    stick.addEventListener('pointerdown', stickDown)
    stick.addEventListener('pointermove', stickMove)
    stick.addEventListener('pointerup', stickUp)
    stick.addEventListener('pointercancel', stickUp)

    thrust.addEventListener('pointerdown', thrustDown)
    thrust.addEventListener('pointerup', thrustUp)
    thrust.addEventListener('pointercancel', thrustUp)

    return () => {
      cancelAnimationFrame(raf)
      stick.removeEventListener('pointerdown', stickDown)
      stick.removeEventListener('pointermove', stickMove)
      stick.removeEventListener('pointerup', stickUp)
      stick.removeEventListener('pointercancel', stickUp)
      thrust.removeEventListener('pointerdown', thrustDown)
      thrust.removeEventListener('pointerup', thrustUp)
      thrust.removeEventListener('pointercancel', thrustUp)
      input.axisX = 0
      input.axisY = 0
      input.axisThrottle = 0
      input.touchActive = false
    }
  }, [active, input])

  if (!active) return null

  return (
    <div className="ix-touch" aria-hidden="true">
      {/* Steering stick — lower left, under the thumb's natural arc. */}
      <div className="ix-stick" ref={stickRef}>
        <span className="ix-stick__ring" />
        <span className="ix-stick__knob" ref={knobRef} />
        <span className="ix-stick__label">Attitude</span>
      </div>

      {/* Thrust pad — lower right. */}
      <button className="ix-thrust" ref={thrustRef} type="button">
        <span className="ix-thrust__glyph">▲</span>
        <span className="ix-stick__label">Thrust</span>
      </button>
    </div>
  )
}
