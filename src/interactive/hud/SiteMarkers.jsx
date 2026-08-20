import { useEffect, useRef } from 'react'
import { useFlightState } from '../core/flightStore'
import { siteMarkers } from '../core/TargetProjector'
import { DESTINATIONS } from '../data/spaceMap'

/**
 * SITE MARKERS
 *
 * A small ident for every destination, projected onto its real screen position.
 * This is the layer that makes the map navigable: from anywhere you can see
 * where the four sites are, how far away they are, and which direction to turn.
 *
 * Deliberately restrained, because four permanent on-screen labels is exactly
 * how a clean HUD turns into clutter:
 *   - a 5px tick, not an icon
 *   - label and range only, at 9px
 *   - the whole marker dims to near-nothing when the site is far off to the
 *     side, so only what you are roughly facing is legible
 *   - the currently locked site is suppressed here, because TargetLock already
 *     draws a full bracket for it — two markers on one object reads as a bug
 *
 * Written straight to the DOM from rAF: these move every frame, and routing
 * four sets of coordinates through React state would re-render the HUD subtree
 * sixty times a second.
 */

export default function SiteMarkers() {
  const phase = useFlightState((s) => s.phase)
  const lockedTarget = useFlightState((s) => s.lockedTarget)
  const navOpen = useFlightState((s) => s.navOpen)

  const refs = useRef({})
  const rafRef = useRef(0)

  const visible = phase === 'flying' && !navOpen

  useEffect(() => {
    if (!visible) return undefined

    function tick() {
      rafRef.current = requestAnimationFrame(tick)

      for (const dest of DESTINATIONS) {
        const el = refs.current[dest.id]
        const data = siteMarkers[dest.id]
        if (!el || !data) continue

        // The locked site gets the full TargetLock bracket instead.
        if (dest.id === lockedTarget || !data.active) {
          el.style.opacity = '0'
          continue
        }

        el.style.transform = `translate3d(${data.x}px, ${data.y}px, 0) translate(-50%, -50%)`
        el.style.opacity = String(data.weight)
        el.dataset.offscreen = data.onScreen ? 'false' : 'true'

        const arrow = el.querySelector('.ix-site__arrow')
        if (arrow) {
          if (data.onScreen) {
            arrow.style.opacity = '0'
          } else {
            arrow.style.opacity = '0.9'
            arrow.style.transform = `rotate(${data.angle + Math.PI / 2}rad)`
          }
        }

        const range = el.querySelector('.ix-site__range')
        if (range) range.textContent = `${String(Math.round(data.distance)).padStart(4, '0')}`
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [visible, lockedTarget])

  if (phase === 'boot') return null

  return (
    <div className="ix-sites" aria-hidden="true">
      {DESTINATIONS.map((dest) => (
        <div
          key={dest.id}
          className="ix-site"
          ref={(el) => {
            refs.current[dest.id] = el
          }}
        >
          <span className="ix-site__tick" />
          <span className="ix-site__arrow" />
          <span className="ix-site__meta">
            <span className="ix-site__name">{dest.label}</span>
            <span className="ix-site__range ix-mono">0000</span>
          </span>
        </div>
      ))}
    </div>
  )
}
