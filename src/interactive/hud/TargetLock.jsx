import { useEffect, useRef } from 'react'
import { useFlightState, useTelemetry, flight } from '../core/flightStore'
import { targetScreen } from '../core/TargetProjector'
import { DESTINATION_BY_ID } from '../data/spaceMap'

/**
 * TARGET LOCK
 *
 * The bracket tracks the actual object in screen space rather than sitting at
 * screen centre. A reticle pinned to the middle of the frame while the thing it
 * describes is up in the corner reads as a broken instrument — it breaks the
 * illusion that the HUD is reading the world.
 *
 * Four open corners, never a closed box: a closed rectangle reads as UI chrome,
 * open corners read as an instrument acquiring something.
 *
 * When the target leaves frame the bracket clamps to the edge and an arrow
 * points toward it, so it doubles as a "turn this way" cue.
 *
 * Positioning is written straight to the DOM inside rAF. Routing per-frame
 * coordinates through React state would re-render this subtree 60 times a
 * second for no benefit.
 */

const LOCK_COPY = {
  works: 'Constructed systems detected',
  signal: 'Carrier signal acquired',
  archives: 'Inert structure — no power signature',
  launch: 'New deployment available',
}

export default function TargetLock() {
  const phase = useFlightState((s) => s.phase)
  const lockedTarget = useFlightState((s) => s.lockedTarget)

  const rootRef = useRef(null)
  const reticleRef = useRef(null)
  const arrowRef = useRef(null)
  const rafRef = useRef(0)

  const distance = useTelemetry((f) => {
    const dest = DESTINATION_BY_ID[lockedTarget]
    if (!dest) return 0
    return Math.round(
      Math.hypot(
        dest.position[0] - f.position.x,
        dest.position[1] - f.position.y,
        dest.position[2] - f.position.z,
      ),
    )
  }, 12)

  const visible = phase === 'flying' && !!lockedTarget
  const dest = lockedTarget ? DESTINATION_BY_ID[lockedTarget] : null

  useEffect(() => {
    if (!visible) return undefined

    function tick() {
      rafRef.current = requestAnimationFrame(tick)
      const root = rootRef.current
      if (!root || !targetScreen.active) return

      root.style.transform = `translate3d(${targetScreen.x}px, ${targetScreen.y}px, 0) translate(-50%, -50%)`

      // Bracket scales with the object's apparent size.
      const reticle = reticleRef.current
      if (reticle) {
        const d = targetScreen.radius * 2
        reticle.style.width = `${d}px`
        reticle.style.height = `${d}px`
      }

      // Arrow only appears when the object is out of frame, and points at it.
      const arrow = arrowRef.current
      if (arrow) {
        if (targetScreen.onScreen) {
          arrow.style.opacity = '0'
        } else {
          arrow.style.opacity = '1'
          arrow.style.transform = `rotate(${targetScreen.angle + Math.PI / 2}rad)`
        }
      }

      root.dataset.offscreen = targetScreen.onScreen ? 'false' : 'true'
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [visible])

  return (
    <div
      ref={rootRef}
      className={`ix-lock${visible ? ' ix-lock--visible' : ''}`}
      aria-hidden={!visible}
    >
      <div className="ix-reticle" ref={reticleRef}>
        <span className="ix-reticle__corner ix-reticle__corner--tl" />
        <span className="ix-reticle__corner ix-reticle__corner--tr" />
        <span className="ix-reticle__corner ix-reticle__corner--bl" />
        <span className="ix-reticle__corner ix-reticle__corner--br" />

        {/* Off-screen direction arrow. Sits at the bracket centre and rotates. */}
        <span className="ix-reticle__arrow" ref={arrowRef} />
      </div>

      {dest && (
        <div className="ix-lock__meta">
          <div className="ix-lock__title">{dest.label}</div>
          <div className="ix-lock__sub">{LOCK_COPY[dest.id]}</div>
          <div className="ix-label ix-mono">
            RANGE {String(distance).padStart(4, '0')} M
          </div>
        </div>
      )}
    </div>
  )
}
