import { useEffect, useRef, useState } from 'react'
import { setFlightState, useFlightState } from '../core/flightStore'

/**
 * COLD START — wow moment #1.
 *
 * Black screen. Instruments come up one at a time, then: AWAITING PILOT INPUT.
 *
 * There is deliberately NO "enter" button. The experience begins when the user
 * presses W. That is the contract: the first thing you do is fly, and the
 * interface never asks permission to start.
 *
 * The delays below are irregular ON PURPOSE. A uniform 120ms stagger is the
 * single clearest tell of generated motion; real hardware boots unevenly.
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
    if (phase !== 'boot') return

    BOOT_LINES.forEach((line, i) => {
      timers.current.push(
        setTimeout(() => setVisibleCount(i + 1), line.delay),
      )
    })
    timers.current.push(setTimeout(() => setPromptIn(true), PROMPT_DELAY))

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [phase])

  // Any meaningful input starts the mission. Keyboard, click or touch.
  useEffect(() => {
    if (phase !== 'boot' || !promptIn) return

    function begin() {
      setDismissed(true)
      // Let the fade finish before handing control to the flight engine.
      setTimeout(() => setFlightState({ phase: 'flying' }), 900)
    }

    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      begin()
    }

    window.addEventListener('keydown', onKey, { once: true })
    window.addEventListener('pointerdown', begin, { once: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', begin)
    }
  }, [phase, promptIn])

  if (phase !== 'boot') return null

  return (
    <div className={`ix-boot${dismissed ? ' ix-boot--out' : ''}`}>
      <div className="ix-boot__inner">
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

        <div className={`ix-boot__prompt${promptIn ? ' ix-boot__prompt--in' : ''}`}>
          Awaiting pilot input
        </div>
      </div>
    </div>
  )
}
