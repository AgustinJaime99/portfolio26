import { useEffect } from 'react'
import { setFlightState, useFlightState, useTelemetry } from '../core/flightStore'
import { DESTINATIONS } from '../data/spaceMap'
import { siteMarkers } from '../core/TargetProjector'

/**
 * [NAVIGATION]
 *
 * A DIRECTORY, not a travel service.
 *
 * This used to fly the ship to whatever you picked. That autopilot is gone by
 * request: every approach is now flown by hand. What remains is a reference
 * card — what exists out there, how far away each site is, and roughly which
 * way it lies — so the map is legible without being automated.
 *
 * Worth stating plainly: removing the autopilot removes the piece's
 * accessibility route. Anyone who cannot or does not want to fly now has no way
 * to reach a section. The on-screen site markers and the live bearings below
 * are the mitigation, but they are guidance, not a substitute.
 *
 * Opens with Tab or the corner button. Escape closes.
 */

/** Compass bearing from the ship to a destination, for orientation. */
function bearingTo(dest, f) {
  const dx = dest.position[0] - f.position.x
  const dz = dest.position[2] - f.position.z
  // Inverse of the nose convention: nose = (-sin h, ·, -cos h).
  const rad = Math.atan2(-dx, -dz)
  return ((rad * 180) / Math.PI + 360) % 360
}

function DestinationRow({ dest, navOpen }) {
  const data = useTelemetry((f) => {
    const dx = dest.position[0] - f.position.x
    const dy = dest.position[1] - f.position.y
    const dz = dest.position[2] - f.position.z
    const distance = Math.round(Math.hypot(dx, dy, dz))

    // Relative bearing: how far you would have to turn to face it.
    const abs = bearingTo(dest, f)
    const heading = ((f.heading * 180) / Math.PI + 360) % 360
    let rel = abs - heading
    while (rel > 180) rel -= 360
    while (rel < -180) rel += 360

    return { distance, rel: Math.round(rel) }
  }, 4)

  // Turn instruction rather than a raw number: "18° left" is actionable,
  // "bearing 342" requires the reader to do the subtraction themselves.
  const turn =
    Math.abs(data.rel) < 8
      ? 'AHEAD'
      : `${Math.abs(data.rel)}° ${data.rel < 0 ? 'LEFT' : 'RIGHT'}`

  return (
    <div className="ix-nav__item ix-nav__item--static" tabIndex={navOpen ? 0 : -1}>
      <span className="ix-nav__name">{dest.label}</span>
      <span className="ix-nav__readout">
        <span className="ix-nav__turn">{turn}</span>
        <span className="ix-nav__desig">
          {String(data.distance).padStart(4, '0')} M
        </span>
      </span>
    </div>
  )
}

export default function NavigationPanel() {
  const navOpen = useFlightState((s) => s.navOpen)
  const phase = useFlightState((s) => s.phase)

  useEffect(() => {
    function onKey(e) {
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return

      if (e.code === 'Tab') {
        e.preventDefault()
        setFlightState((s) => ({ navOpen: !s.navOpen }))
      }
      if (e.code === 'Escape') {
        setFlightState({ navOpen: false })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (phase === 'boot') return null

  return (
    <>
      <button
        className="ix-navbtn"
        onClick={() => setFlightState((s) => ({ navOpen: !s.navOpen }))}
        aria-expanded={navOpen}
      >
        [ Navigation ]
      </button>

      <div
        className={`ix-nav${navOpen ? ' ix-nav--open' : ''}`}
        role="dialog"
        aria-label="Navigation"
        aria-hidden={!navOpen}
      >
        <div className="ix-nav__list">
          <div
            className="ix-label"
            style={{ paddingBottom: 18, borderBottom: '1px solid var(--steel)' }}
          >
            Known sites — fly to them under your own power
          </div>

          {DESTINATIONS.map((dest) => (
            <DestinationRow key={dest.id} dest={dest} navOpen={navOpen} />
          ))}

          <button
            className="ix-nav__item"
            tabIndex={navOpen ? 0 : -1}
            onClick={() => setFlightState({ navOpen: false, systemsOpen: true })}
          >
            <span className="ix-nav__name">SHIP SYSTEMS</span>
            <span className="ix-nav__desig">DIAGNOSTIC</span>
          </button>
        </div>
      </div>
    </>
  )
}
