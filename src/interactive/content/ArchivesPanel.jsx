import { setFlightState, useFlightState } from '../core/flightStore'
import { releaseFromOrbit } from '../core/CaptureSequence'
import { MISSIONS, MISSION_SECTIONS } from '../data/spaceMap'

/**
 * MISSION ARCHIVES panel — case studies.
 *
 * STRUCTURE ONLY. Per the brief, no real content yet. The five-part spine
 * (Challenge / Architecture / Decisions / Development / Impact) is laid out
 * with empty slots so the shape of the argument is visible before the words
 * exist — this is the section that has to prove how you think, not what you
 * shipped, so its skeleton matters more than its copy.
 */

export default function ArchivesPanel() {
  const phase = useFlightState((s) => s.phase)
  const activeSection = useFlightState((s) => s.activeSection)
  const activeMission = useFlightState((s) => s.activeMission)

  const open = activeSection === 'archives' && phase === 'docked'
  const mission = MISSIONS.find((m) => m.id === activeMission)

  return (
    <div className={`ix-panel${open ? ' ix-panel--open' : ''}`} aria-hidden={!open}>
      <button className="ix-close" onClick={releaseFromOrbit}>
        Seal archive
        <span className="ix-close__x">✕</span>
      </button>

      <div className="ix-panel__head">
        <div className="ix-panel__desig">Site 03 — {MISSIONS.length} records recovered</div>
        <h2 className="ix-panel__title">Mission Archives</h2>
        <p className="ix-panel__sub">
          Completed missions, documented end to end. Not screenshots — the
          reasoning behind them.
        </p>
      </div>

      <div className="ix-panel__body">
        {!mission && (
          <div className="ix-list">
            {MISSIONS.map((m) => (
              <button
                key={m.id}
                className="ix-list__row"
                tabIndex={open ? 0 : -1}
                onClick={() => setFlightState({ activeMission: m.id })}
              >
                <span className="ix-mono" style={{ fontSize: 13 }}>
                  {m.code}
                </span>
                <span className="ix-nav__desig">{m.status}</span>
              </button>
            ))}
          </div>
        )}

        {mission && (
          <>
            <button
              className="ix-label"
              style={{
                background: 'none',
                border: 0,
                cursor: 'pointer',
                textAlign: 'left',
                padding: 0,
              }}
              onClick={() => setFlightState({ activeMission: null })}
            >
              ← All records
            </button>

            <div>
              <div className="ix-panel__desig">{mission.code}</div>
              <h3 className="ix-display" style={{ fontSize: 30, margin: '10px 0 6px' }}>
                {mission.title ?? 'Untitled record'}
              </h3>
              <div className="ix-label">Status: {mission.status}</div>
            </div>

            {/* The five-part spine. Empty by design. */}
            {MISSION_SECTIONS.map((section) => (
              <div className="ix-slot" key={section}>
                <div className="ix-slot__label">{section}</div>
                <div className="ix-slot__ghost" />
                <div className="ix-slot__ghost" style={{ width: '72%' }} />
                <div className="ix-slot__ghost" style={{ width: '54%' }} />
              </div>
            ))}

            <div className="ix-label" style={{ opacity: 0.5 }}>
              Record content pending declassification
            </div>
          </>
        )}
      </div>
    </div>
  )
}
