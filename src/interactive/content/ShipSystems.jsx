import { useEffect } from 'react'
import { setFlightState, useFlightState } from '../core/flightStore'
import { SHIP_SYSTEMS } from '../data/spaceMap'

/**
 * SHIP SYSTEMS — technology.
 *
 * Rejected: a "technology core" destination, and any arrangement of floating
 * logos. Both treat a stack as scenery.
 *
 * Your stack is not a place you fly to. It is the vessel you have been flying
 * this whole time. Opening the diagnostic labels the hull you already know:
 * the reactor is Node, the nav is React, the tanks are Postgres.
 *
 * That reframe is the payoff — the technology section reveals something that
 * was already true rather than introducing something new.
 */

export default function ShipSystems() {
  const systemsOpen = useFlightState((s) => s.systemsOpen)
  const phase = useFlightState((s) => s.phase)
  const activeSection = useFlightState((s) => s.activeSection)

  useEffect(() => {
    function onKey(e) {
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (e.code === 'KeyT' && !e.metaKey && !e.ctrlKey) {
        // Overlays are mutually exclusive: the diagnostic and a section panel
        // must never occupy the screen at the same time.
        setFlightState((s) => ({ systemsOpen: !s.systemsOpen, navOpen: false }))
      }
      if (e.code === 'Escape') setFlightState({ systemsOpen: false })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Docked at a site? The section panel owns the screen. Suppress the overlay.
  if (phase === 'boot' || activeSection) return null

  return (
    <div
      className={`ix-systems${systemsOpen ? ' ix-systems--open' : ''}`}
      aria-hidden={!systemsOpen}
    >
      <button
        className="ix-close"
        style={{ top: 28, right: 32 }}
        onClick={() => setFlightState({ systemsOpen: false })}
        tabIndex={systemsOpen ? 0 : -1}
      >
        Close diagnostic
        <span className="ix-close__x">✕</span>
      </button>

      <div className="ix-systems__head">
        <div className="ix-label">Vessel diagnostic</div>
        <h2 className="ix-systems__title ix-display">Ship Systems</h2>
        <div className="ix-label" style={{ opacity: 0.7 }}>
          All subsystems nominal
        </div>
      </div>

      <div className="ix-systems__grid">
        {SHIP_SYSTEMS.map((sys, i) => (
          <div
            className="ix-systems__cell"
            key={sys.id}
            style={{ transitionDelay: `${120 + i * 90}ms` }}
          >
            <div className="ix-systems__part">{sys.part}</div>
            <div className="ix-systems__items">
              {sys.items.map((item) => (
                <span className="ix-systems__item" key={item}>
                  {item}
                </span>
              ))}
            </div>
            <div className="ix-systems__note">{sys.note}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
