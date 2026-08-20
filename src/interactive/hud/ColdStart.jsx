import { useEffect, useRef, useState } from 'react'
import { setFlightState, useFlightState } from '../core/flightStore'
import { handOverControls } from '../core/ApproachSequence'

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

  useEffect(() => {
    if (phase !== 'boot') return undefined

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
    if (phase !== 'boot' || !promptIn || dismissed) return undefined
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.code === 'Tab') return
      begin()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (phase !== 'boot') return null

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
