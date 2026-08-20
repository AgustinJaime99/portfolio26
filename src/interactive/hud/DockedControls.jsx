import { useEffect, useRef, useState } from 'react'
import { useFlightState } from '../core/flightStore'
import { releaseFromOrbit } from '../core/CaptureSequence'
import { orbit } from '../core/orbitControl'

/**
 * DOCKED CONTROLS
 *
 * The caption under the model while you are in a section. Two jobs:
 *
 *   1. Say that the view can be dragged. A 3D object gives no visual clue that
 *      it is interactive — without a caption, the drag feature effectively does
 *      not exist for anyone who does not happen to try it.
 *   2. Say how to leave. ESC is the expected key and it should be stated, not
 *      assumed.
 *
 * It sits centred BELOW the subject rather than in a corner, because that is
 * where the eye already is: looking at the thing it describes. The drag half
 * retires itself once you have actually dragged, so it stops being an
 * instruction and the frame goes quiet again.
 */

export default function DockedControls() {
  const phase = useFlightState((s) => s.phase)
  const activeSection = useFlightState((s) => s.activeSection)
  const focusedPanel = useFlightState((s) => s.focusedPanel)
  const deployPhase = useFlightState((s) => s.deployPhase)

  const [dragged, setDragged] = useState(false)
  const pollRef = useRef(0)

  const docked = phase === 'docked' && !!activeSection
  // Hide while a screenshot viewer or a launch sequence owns the screen.
  const visible =
    docked && focusedPanel === null && deployPhase !== 'countdown' && deployPhase !== 'launching'

  // Poll the mutable drag flag at a low rate — it is written from rAF and must
  // not push per-frame state through React.
  useEffect(() => {
    if (!visible || dragged) return undefined
    pollRef.current = setInterval(() => {
      if (orbit.hasDragged) setDragged(true)
    }, 250)
    return () => clearInterval(pollRef.current)
  }, [visible, dragged])

  // ESC leaves the section. Capture phase so it runs before other handlers,
  // and only when nothing more specific is open.
  useEffect(() => {
    if (!docked) return undefined
    function onKey(e) {
      if (e.code !== 'Escape') return
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      // The screenshot viewer handles its own Escape; do not close both at once.
      if (focusedPanel !== null) return
      e.stopPropagation()
      releaseFromOrbit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [docked, focusedPanel])

  if (!visible) return null

  return (
    <div className="ix-dockbar">
      {!dragged && (
        <span className="ix-dockbar__item">
          <span className="ix-dockbar__glyph">⟲</span>
          Drag to rotate
        </span>
      )}
      <button
        className="ix-dockbar__item ix-dockbar__item--action"
        onClick={releaseFromOrbit}
      >
        <span className="ix-key ix-key--inline">ESC</span>
        Leave section
      </button>
    </div>
  )
}
