import { flight, useFlightState, useTelemetry } from '../core/flightStore'
import { DESTINATION_BY_ID, DESTINATIONS } from '../data/spaceMap'

/**
 * TELEMETRY
 *
 * Four readouts, each of which had to justify its existence:
 *
 *  POSITION   — proves the world is continuous and that you are somewhere in it
 *  VELOCITY   — the only feedback that makes throttle legible
 *  HEADING    — orientation on the disc, the thing you would otherwise lose
 *  DESTINATION— what the nav computer is currently tracking
 *
 * Rejected: fuel, hull integrity, oxygen, shield, radar sweep, system time,
 * frame counter. All of them are fake instrumentation for a portfolio, and
 * fake complexity is exactly the "HUD falsamente complejo" the brief forbids.
 *
 * Values are polled at 10Hz, not per frame. A human cannot read faster.
 */

function pad(n, width = 4) {
  const s = Math.abs(Math.round(n)).toString().padStart(width, '0')
  return `${n < 0 ? '-' : '+'}${s}`
}

/** Compass letter for the current heading — cheaper to read than degrees alone. */
function bearing(rad) {
  const deg = ((rad * 180) / Math.PI + 360) % 360
  return deg.toFixed(0).padStart(3, '0')
}

export default function Telemetry() {
  const phase = useFlightState((s) => s.phase)
  const lockedTarget = useFlightState((s) => s.lockedTarget)
  const activeSection = useFlightState((s) => s.activeSection)

  const pos = useTelemetry(
    (f) => `${pad(f.position.x)} ${pad(f.position.y, 3)} ${pad(f.position.z)}`,
  )
  const speed = useTelemetry((f) => Math.round(f.speed))
  const head = useTelemetry((f) => bearing(f.heading))
  const boosting = useTelemetry((f) => f.boost > 0.35)

  if (phase === 'boot') return null

  const tracked = activeSection || lockedTarget
  const dest = tracked ? DESTINATION_BY_ID[tracked] : null

  // Normalised for the velocity bar. ~560 is boost cruise with current thrust.
  const speedPct = Math.min(100, (speed / 560) * 100)

  let status = 'FREE FLIGHT'
  if (phase === 'capturing') status = 'ORBITAL CAPTURE'
  else if (phase === 'docked') status = 'MOORED'

  return (
    <>
      {/* Top left — identity and mission status */}
      <div className="ix-corner ix-corner--tl">
        <div className="ix-readout">
          <div className="ix-rule" />
          <div className="ix-label">Agustín Jaime</div>
          <div className="ix-value">FULL STACK ENGINEER</div>
        </div>
        <div className="ix-readout">
          <div className="ix-label">Mission status</div>
          <div className="ix-value">{status}</div>
        </div>
      </div>

      {/* Bottom left — flight instruments */}
      <div className="ix-corner ix-corner--bl">
        <div className="ix-readout">
          <div className="ix-label">Position</div>
          <div className="ix-value">{pos}</div>
        </div>

        <div className="ix-readout">
          <div className="ix-label">Velocity</div>
          <div className="ix-readout__row">
            <div className="ix-value">{String(speed).padStart(3, '0')} M/S</div>
          </div>
          <div className="ix-bar">
            <div
              className={`ix-bar__fill${boosting ? ' ix-bar__fill--boost' : ''}`}
              style={{ width: `${speedPct}%` }}
            />
          </div>
        </div>

        <div className="ix-readout">
          <div className="ix-label">Heading</div>
          <div className="ix-value">{head}°</div>
        </div>
      </div>

      {/* Bottom right — what the nav computer is tracking */}
      <div className="ix-corner ix-corner--br">
        <div className="ix-readout ix-readout--right">
          <div className="ix-label">Destination</div>
          <div className="ix-value">{dest ? dest.label : 'NONE SELECTED'}</div>
          {dest && <div className="ix-label">{dest.designation}</div>}
        </div>
      </div>
    </>
  )
}

/** Count of destinations, used by the nav panel header. */
export const DESTINATION_COUNT = DESTINATIONS.length
