import { useCallback, useEffect, useMemo } from 'react'
import { setFlightState, useFlightState } from '../core/flightStore'
import { imagesFor } from '../data/projectMedia'
import { SATELLITES } from '../data/spaceMap'

/**
 * PANEL VIEWER
 *
 * Clicking a deployed panel in 3D opens the screenshot at full resolution.
 *
 * This is the one place the experience deliberately drops out of 3D, and it is
 * the right call: a browser screenshot is a flat document. Forcing the user to
 * squint at it on an angled plane in space would be prioritising the concept
 * over the content — and the content is the reason anyone is here.
 *
 * The 3D scene stays live and orbiting behind the overlay, so it reads as a
 * viewport opening rather than as a page navigation.
 */

export default function PanelViewer() {
  const focusedPanel = useFlightState((s) => s.focusedPanel)
  const activeSatellite = useFlightState((s) => s.activeSatellite)

  const sat = useMemo(
    () => SATELLITES.find((s) => s.id === activeSatellite) ?? null,
    [activeSatellite],
  )
  const images = useMemo(() => (sat ? imagesFor(sat.project) : []), [sat])

  const open = focusedPanel !== null && focusedPanel !== undefined && images.length > 0
  const index = open ? Math.min(focusedPanel, images.length - 1) : 0

  const close = useCallback(() => setFlightState({ focusedPanel: null }), [])

  const step = useCallback(
    (dir) => {
      if (!images.length) return
      setFlightState((s) => {
        const cur = s.focusedPanel ?? 0
        const next = (cur + dir + images.length) % images.length
        return { focusedPanel: next }
      })
    },
    [images.length],
  )

  useEffect(() => {
    if (!open) return undefined
    function onKey(e) {
      if (e.code === 'Escape') {
        e.stopPropagation()
        close()
      }
      if (e.code === 'ArrowRight') step(1)
      if (e.code === 'ArrowLeft') step(-1)
    }
    // Capture phase so Escape closes the viewer before any other handler
    // interprets it as "close the whole section".
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, close, step])

  if (!open || !sat) return null

  return (
    <div className="ix-viewer ix-viewer--open" role="dialog" aria-label="Project screenshot">
      <div className="ix-viewer__bar">
        <div className="ix-viewer__meta">
          <span className="ix-panel__desig">{sat.project.name}</span>
          <span className="ix-label ix-mono">
            FRAME {String(index + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
          </span>
        </div>
        <button className="ix-close" onClick={close}>
          Close
          <span className="ix-close__x">✕</span>
        </button>
      </div>

      <div className="ix-viewer__stage">
        {images.length > 1 && (
          <button
            className="ix-viewer__nav ix-viewer__nav--prev"
            onClick={() => step(-1)}
            aria-label="Previous screenshot"
          >
            ←
          </button>
        )}

        <img
          className="ix-viewer__img"
          src={images[index]}
          alt={`${sat.project.name} — frame ${index + 1}`}
        />

        {images.length > 1 && (
          <button
            className="ix-viewer__nav ix-viewer__nav--next"
            onClick={() => step(1)}
            aria-label="Next screenshot"
          >
            →
          </button>
        )}
      </div>

      <div className="ix-viewer__foot">
        <span className="ix-label">
          ← → to browse · Esc to close
        </span>
      </div>
    </div>
  )
}
