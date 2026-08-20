import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { flight, getFlightState } from './flightStore'
import { headingVector } from './FlightEngine'

/**
 * APPROACH SEQUENCE — the scene while the boot panel is up.
 *
 * THE PROBLEM THIS SOLVES: the cold start used to be an opaque black panel with
 * a list of systems on it. The 3D scene was mounted and running the whole time,
 * and nobody could see any of it — the first impression of a space experience
 * was a text screen.
 *
 * Now the ship flies itself on a slow cinematic pass while the systems come up,
 * so the boot panel reads as a HUD overlaying a live scene rather than as a
 * loading screen that happens to precede one.
 *
 * The motion is deliberately AUTOMATIC and unhurried: a long banking curve past
 * the debris toward THE WORKS, engines at cruise. It is the establishing shot,
 * not gameplay — the pilot has not taken the controls yet.
 */

const _fwd = new THREE.Vector3()
const _camWant = new THREE.Vector3()
const _lookWant = new THREE.Vector3()

/** Where the approach begins, and how it curves. */
const START = { x: 300, y: 26, z: 260 }
const CRUISE_SPEED = 34
const TURN_RATE = 0.052

export default function ApproachSequence() {
  const { camera } = useThree()
  const t = useRef(0)
  const initialised = useRef(false)
  const wasBoot = useRef(false)

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const st = getFlightState()
    const booting = st.phase === 'boot'

    if (!booting) {
      // Reset so a return to boot (route re-entry) starts the pass again.
      if (wasBoot.current) initialised.current = false
      wasBoot.current = false
      return
    }
    wasBoot.current = true

    /* Place the ship once, on the first boot frame.
     *
     * The guard also re-fires if something has zeroed the position out from
     * under us: the parent's mount effect calls resetFlight(), and parent
     * effects run AFTER children's, so the very first placement was being
     * wiped a tick later. Verified — the ship sat at 0,0 for the whole boot.
     * Detecting the reset rather than reordering the effects keeps this robust
     * against future changes to mount order. */
    const wasReset =
      initialised.current &&
      flight.position.x === 0 &&
      flight.position.y === 0 &&
      flight.position.z === 0

    if (!initialised.current || wasReset) {
      initialised.current = true
      t.current = 0
      flight.position.x = START.x
      flight.position.y = START.y
      flight.position.z = START.z
      // Facing roughly toward the origin, so the pass sweeps across the map.
      flight.heading = Math.atan2(-(0 - START.x), -(0 - START.z)) - 0.5
      flight.pitch = 0
      flight.velocity = { x: 0, y: 0, z: 0 }
    }

    t.current += delta

    /* A long, slow bank. The turn rate is constant, so the ship traces an arc
     * rather than a straight line — a straight approach reads as a dolly move,
     * an arc reads as flight. */
    flight.heading += TURN_RATE * delta
    // Very gentle vertical drift, easing out, so the horizon is never static.
    flight.pitch = Math.sin(t.current * 0.18) * 0.045

    headingVector(_fwd, flight.heading, flight.pitch)

    // Ease up to cruise rather than starting at speed.
    const spool = Math.min(1, t.current / 2.4)
    const speed = CRUISE_SPEED * spool

    flight.position.x += _fwd.x * speed * delta
    flight.position.y += _fwd.y * speed * delta
    flight.position.z += _fwd.z * speed * delta

    flight.speed = speed
    // Engines visibly lit — this is a ship under way, not a parked model.
    flight.throttle += (0.55 - flight.throttle) * Math.min(1, 1.4 * delta)

    /* Camera: a three-quarter trailing view, slightly off the ship's axis.
     *
     * Not the gameplay chase rig. Sitting off-axis and a little high shows the
     * planform and both engines at once, which is what makes an establishing
     * shot read as composed rather than as a viewport. */
    const side = Math.sin(t.current * 0.12) * 6.5
    _camWant.set(
      flight.position.x - _fwd.x * 15 + _fwd.z * side,
      flight.position.y + 4.2,
      flight.position.z - _fwd.z * 15 - _fwd.x * side,
    )
    camera.position.lerp(_camWant, Math.min(1, 1.6 * delta))

    // Look slightly ahead of the ship so it sits low-left and the space it is
    // flying into occupies the frame.
    _lookWant.set(
      flight.position.x + _fwd.x * 24,
      flight.position.y + _fwd.y * 24 + 1.2,
      flight.position.z + _fwd.z * 24,
    )
    camera.lookAt(_lookWant)
  })

  return null
}

/**
 * Hand the ship to the pilot.
 *
 * Called when the boot panel is dismissed. Velocity is preserved so control
 * transfers mid-flight — cutting to a dead stop would undo the whole point of
 * having been moving.
 */
export function handOverControls() {
  headingVector(_fwd, flight.heading, flight.pitch)
  /* Carry the approach's momentum into free flight.
   *
   * Slightly boosted, because the engine's drag is deliberately heavy: it
   * strips ~97% of velocity in 1.2s with no thrust held, which is what keeps
   * manual flight feeling controlled rather than floaty. Handing over at exact
   * cruise speed made the transfer read as a stall; a modest overshoot gives
   * the pilot a moment of glide before drag settles it — and if they hold W,
   * the two motions join seamlessly. */
  const carried = Math.max(flight.speed, 34) * 1.9
  flight.velocity.x = _fwd.x * carried
  flight.velocity.y = _fwd.y * carried
  flight.velocity.z = _fwd.z * carried
  flight.speed = carried
}
