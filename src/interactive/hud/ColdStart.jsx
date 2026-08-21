import { useEffect, useRef, useState } from 'react'
import { setFlightState, useFlightState } from '../core/flightStore'
import { handOverControls } from '../core/ApproachSequence'
import { getPhase, isTransitioning } from '../../transition/warpStore'

/**
 * COLD START — wow moment #1.
 *
 * The systems come up one at a time over a LIVE SCENE: the ship is already
 * flying an automatic approach behind this panel. Previously this was an opaque
 * black card, so the first thing a visitor saw of a space experience was a text
 * screen with the 3D hidden behind it.
 *
 * The delays are irregular ON PURPOSE. A uniform stagger is the single clearest
 * tell of generated motion; real hardware boots unevenly.
 *
 * There is a launch control now rather than "press any key". A named action —
 * TAKE THE CONTROLS — states what actually happens, and it gives the moment a
 * threshold to cross instead of an instruction to obey.
 */

const BOOT_LINES = [
  { label: 'POWER BUS', status: 'NOMINAL', delay: 260 },
  { label: 'ATTITUDE CONTROL', status: 'NOMINAL', delay: 430 },
  { label: 'ION DRIVE', status: 'ARMED', delay: 700 },
  { label: 'NAV COMPUTER', status: 'ONLINE', delay: 1180 },
  { label: 'STELLAR CARTOGRAPHY', status: 'SYNCED', delay: 1340 },
  { label: 'TELEMETRY UPLINK', status: 'OPEN', delay: 1810 },
]

const PROMPT_DELAY = 2250

export default function ColdStart() {
  const phase = useFlightState((s) => s.phase)
  const [visibleCount, setVisibleCount] = useState(0)
  const [promptIn, setPromptIn] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const timers = useRef([])

  /* ARRIVED BY FLIGHT — skip the cold start entirely.
   *
   * This panel is the threshold for someone opening /interactive directly: it
   * introduces the craft and hands over the controls deliberately. A visitor
   * who just flew here from the portfolio has ALREADY crossed that threshold —
   * dropping a boot checklist on top of their arrival would undo the one thing
   * the transition was built to achieve, and ask them to consent to something
   * they just did.
   *
   * Latched on mount and never re-read: by the time the arrival deceleration
   * finishes the controller has already moved to 'complete', and re-reading
   * would flash the panel in at the end.
   *
   * The check covers the WHOLE transition, not just its last two phases. The
   * staging layer mounts this component during 'entering-space' — well before
   * the route changes — so a narrower test missed it and rendered the boot
   * checklist over the hero. Verified in a capture at 700ms. */
  const arrivedByFlight = useRef(isTransitioning(getPhase())).current

  useEffect(() => {
    if (!arrivedByFlight || phase !== 'boot') return undefined

    /* Wait for the scene to actually be REVEALED before starting the clock.
     *
     * The staging layer mounts this well before the arrival — starting an 800ms
     * timer here would hand over the controls while the visitor is still
     * looking at the hero, and the ship would already be under manual flight
     * when it came into view. Poll for the transition reaching its peak, then
     * let the deceleration play out. */
    let timer = null
    let raf = 0

    const waitForReveal = () => {
      const p = getPhase()
      if (p === 'routing' || p === 'interactive-entry' || p === 'complete' || p === 'idle') {
        // The deceleration is what the visitor reads as the arrival; hand over
        // as it settles, not before.
        timer = setTimeout(() => {
          handOverControls()
          setFlightState({ phase: 'flying' })
        }, 800)
        return
      }
      raf = requestAnimationFrame(waitForReveal)
    }
    raf = requestAnimationFrame(waitForReveal)

    return () => {
      cancelAnimationFrame(raf)
      if (timer) clearTimeout(timer)
    }
  }, [arrivedByFlight, phase])

  useEffect(() => {
    if (phase !== 'boot' || arrivedByFlight) return undefined

    BOOT_LINES.forEach((line, i) => {
      timers.current.push(setTimeout(() => setVisibleCount(i + 1), line.delay))
    })
    timers.current.push(setTimeout(() => setPromptIn(true), PROMPT_DELAY))

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [phase])

  function begin() {
    if (dismissed) return
    setDismissed(true)
    // Carry the approach's velocity into free flight so control transfers
    // mid-manoeuvre rather than snapping to a standstill.
    handOverControls()
    setTimeout(() => setFlightState({ phase: 'flying' }), 820)
  }

  // Keyboard still works, so a returning visitor need not hunt for the button.
  useEffect(() => {
    if (phase !== 'boot' || !promptIn || dismissed || arrivedByFlight) return undefined
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.code === 'Tab') return
      begin()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (phase !== 'boot' || arrivedByFlight) return null

  return (
    <div className={`ix-boot${dismissed ? ' ix-boot--out' : ''}`}>
      {/* A soft scrim rather than a solid fill: the approach has to stay
          visible, but the readout still needs to be legible over it. */}
      <div className="ix-boot__scrim" />

      <div className="ix-boot__inner">
        <div className="ix-boot__masthead">
          <span className="ix-boot__ident">Agustín Jaime</span>
          <span className="ix-boot__craft">Explorer R-1 · Scout Class</span>
        </div>

        {BOOT_LINES.map((line, i) => (
          <div
            key={line.label}
            className={`ix-boot__line${i < visibleCount ? ' ix-boot__line--in' : ''}`}
          >
            <span className="ix-label">{line.label}</span>
            <span
              className={`ix-boot__status ix-mono${
                i < visibleCount ? ' ix-boot__status--ok' : ''
              }`}
            >
              {line.status}
            </span>
          </div>
        ))}

        <div className={`ix-boot__launch${promptIn ? ' ix-boot__launch--in' : ''}`}>
          <button className="ix-boot__btn" onClick={begin} type="button">
            <span className="ix-boot__btn-label">Take the controls</span>
            <span className="ix-boot__btn-hint">W A S D · Shift to boost</span>
          </button>
          <span className="ix-boot__any">or press any key</span>
        </div>
      </div>
    </div>
  )
}
