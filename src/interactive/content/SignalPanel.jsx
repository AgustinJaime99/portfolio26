import { useEffect, useState } from 'react'
import { useFlightState } from '../core/flightStore'
import { releaseFromOrbit } from '../core/CaptureSequence'
import { profile } from '../../data/profile'

/**
 * SIGNAL panel — about.
 *
 * The bio does not appear. It ARRIVES: line by line, with propagation delay,
 * as though it were being received rather than rendered. A caret sits on the
 * line currently decoding.
 *
 * This is the difference between a text block and a transmission — and it is
 * why "about" stops being the weakest section in the piece.
 */

const LINES = [
  profile.intro,
  ...profile.whatIDo.map((item) => `— ${item}`),
]

/** Delay per line. Irregular: a signal does not arrive on a metronome. */
const DELAYS = [420, 760, 980, 1160, 1400, 1580, 1810]

export default function SignalPanel() {
  const phase = useFlightState((s) => s.phase)
  const activeSection = useFlightState((s) => s.activeSection)
  const open = activeSection === 'signal' && phase === 'docked'

  const [received, setReceived] = useState(0)

  useEffect(() => {
    if (!open) {
      setReceived(0)
      return
    }
    const timers = LINES.map((_, i) =>
      setTimeout(() => setReceived(i + 1), DELAYS[i] ?? 1800 + i * 190),
    )
    return () => timers.forEach(clearTimeout)
  }, [open])

  const complete = received >= LINES.length

  return (
    <div className={`ix-panel${open ? ' ix-panel--open' : ''}`} aria-hidden={!open}>
      <button className="ix-close" onClick={releaseFromOrbit}>
        Close channel
        <span className="ix-close__x">✕</span>
      </button>

      <div className="ix-panel__head">
        <div className="ix-panel__desig">
          Site 02 — {complete ? 'transmission complete' : 'receiving…'}
        </div>
        <h2 className="ix-panel__title">Signal</h2>
        <p className="ix-panel__sub">
          {profile.name} — {profile.role}
        </p>
      </div>

      <div className="ix-panel__body">
        <div className="ix-transmission">
          <div className="ix-transmission__meta">
            SOURCE {profile.handle.toUpperCase()} · DECODING {received}/{LINES.length}
          </div>

          {LINES.map((line, i) => (
            <p
              key={i}
              className={`ix-transmission__line${
                i < received ? ' ix-transmission__line--in' : ''
              }`}
            >
              {line}
              {i === received - 1 && !complete && <span className="ix-caret" />}
            </p>
          ))}
        </div>

        {complete && (
          <div className="ix-links">
            <a className="ix-link" href={profile.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a className="ix-link" href={profile.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
