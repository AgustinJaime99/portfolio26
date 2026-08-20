import { useEffect, useMemo, useState } from 'react'
import { setFlightState, useFlightState } from '../core/flightStore'
import { releaseFromOrbit } from '../core/CaptureSequence'
import { SATELLITES } from '../data/spaceMap'
import { imagesFor, getThumb, subscribeThumbs } from '../data/projectMedia'

/**
 * THE WORKS panel.
 *
 * Editorial slab, not a modal: it slides in beside the orbit that is still
 * turning behind it. Selecting a satellite in the list also selects it in 3D,
 * and vice versa — the panel and the world are the same object viewed twice.
 */

export default function WorksPanel() {
  const activeSatellite = useFlightState((s) => s.activeSatellite)
  const phase = useFlightState((s) => s.phase)
  const activeSection = useFlightState((s) => s.activeSection)

  const open = activeSection === 'works' && phase === 'docked'
  const selected = SATELLITES.find((s) => s.id === activeSatellite)
  const shots = useMemo(
    () => (selected ? imagesFor(selected.project) : []),
    [selected],
  )

  // Thumbnails are generated from the textures the 3D panels decode, so this
  // re-renders as they become available rather than fetching anything itself.
  const [, bumpThumbs] = useState(0)
  useEffect(() => subscribeThumbs(() => bumpThumbs((n) => n + 1)), [])

  return (
    <div className={`ix-panel${open ? ' ix-panel--open' : ''}`} aria-hidden={!open}>
      <button className="ix-close" onClick={releaseFromOrbit}>
        Break orbit
        <span className="ix-close__x">✕</span>
      </button>

      <div className="ix-panel__head">
        <div className="ix-panel__desig">Site 01 — {SATELLITES.length} structures in orbit</div>
        <h2 className="ix-panel__title">The Works</h2>
        <p className="ix-panel__sub">
          Constructed systems, not discovered ones. Each structure in this orbit
          is something that shipped.
        </p>
      </div>

      <div className="ix-panel__body">
        {!selected && (
          <div className="ix-list">
            {SATELLITES.map((sat, i) => (
              <button
                key={sat.id}
                className="ix-list__row"
                tabIndex={open ? 0 : -1}
                onClick={() =>
                  setFlightState({ activeSatellite: sat.id, focusedPanel: null })
                }
              >
                <span>{sat.project.name}</span>
                <span className="ix-nav__desig">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </button>
            ))}
          </div>
        )}

        {selected && (
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
              onClick={() =>
                setFlightState({ activeSatellite: null, focusedPanel: null })
              }
            >
              ← All structures
            </button>

            <div>
              <h3
                className="ix-display"
                style={{ fontSize: 30, marginBottom: 12 }}
              >
                {selected.project.name}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--dust)' }}>
                {selected.project.description}
              </p>
            </div>

            <div className="ix-tags">
              {selected.project.tags.map((tag) => (
                <span className="ix-tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>

            {/* Contact sheet. Without this nobody would discover that the
                panels deployed out in the scene are clickable — the affordance
                for a 3D object is invisible from a text panel. It doubles as a
                keyboard-reachable route to the same viewer. */}
            {shots.length > 0 && (
              <div className="ix-sheet">
                <div className="ix-slot__label">
                  Array deployed — {shots.length} frame
                  {shots.length === 1 ? '' : 's'}
                </div>
                <div className="ix-sheet__row">
                  {shots.map((src, i) => {
                    const thumb = getThumb(src)
                    return (
                      <button
                        key={src}
                        className="ix-sheet__thumb"
                        tabIndex={open ? 0 : -1}
                        onClick={() => setFlightState({ focusedPanel: i })}
                        aria-label={`Open frame ${i + 1}`}
                      >
                        {thumb ? (
                          <img src={thumb} alt="" />
                        ) : (
                          // Placeholder while the array is still deploying.
                          <span className="ix-sheet__pending" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="ix-links">
              {selected.project.repo && (
                <a
                  className="ix-link"
                  href={selected.project.repo}
                  target="_blank"
                  rel="noreferrer"
                >
                  Source
                </a>
              )}
              {selected.project.live && (
                <a
                  className="ix-link"
                  href={selected.project.live}
                  target="_blank"
                  rel="noreferrer"
                >
                  Live deployment
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
