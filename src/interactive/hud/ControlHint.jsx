import { useEffect, useState } from 'react'
import { flight, useFlightState } from '../core/flightStore'

/**
 * CONTROL HINT
 *
 * The entire tutorial. Four keys, no copy explaining them, no modal, no
 * "click to continue". The keys light up as you press them — that is the whole
 * teaching mechanism, and it teaches by doing rather than by reading.
 *
 * It retires itself permanently once you have flown for a couple of seconds.
 * An instruction that outstays its usefulness is clutter.
 */

export default function ControlHint({ input }) {
  const phase = useFlightState((s) => s.phase)
  const [active, setActive] = useState({ w: false, a: false, s: false, d: false, shift: false })
  const [retired, setRetired] = useState(false)
  const [movedFor, setMovedFor] = useState(0)

  // Sample input at 20Hz for the key highlight. Cheap and visually immediate.
  useEffect(() => {
    if (retired || phase !== 'flying') return
    const id = setInterval(() => {
      setActive({
        w: input.forward,
        a: input.left,
        s: input.back,
        d: input.right,
        shift: input.boost,
      })
      if (flight.hasMoved) setMovedFor((m) => m + 0.05)
    }, 50)
    return () => clearInterval(id)
  }, [input, retired, phase])

  // Two seconds of actual flight and the hint has done its job.
  useEffect(() => {
    if (movedFor > 2) setRetired(true)
  }, [movedFor])

  if (phase !== 'flying' || retired) return null

  return (
    <div className="ix-hint ix-hint--visible">
      <div className="ix-hint__group">
        <span className={`ix-key${active.w ? ' ix-key--active' : ''}`}>W</span>
        <span className={`ix-key${active.a ? ' ix-key--active' : ''}`}>A</span>
        <span className={`ix-key${active.s ? ' ix-key--active' : ''}`}>S</span>
        <span className={`ix-key${active.d ? ' ix-key--active' : ''}`}>D</span>
      </div>
      <div className="ix-hint__group">
        <span className={`ix-key${active.shift ? ' ix-key--active' : ''}`}>SHIFT</span>
        <span className="ix-label">Boost</span>
      </div>
    </div>
  )
}
