import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { flight, getFlightState } from './flightStore'
import { headingVector } from './FlightEngine'
import { getPhase, isTransitioning, warp } from '../../transition/warpStore'

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

/**
 * Speed the ship carries in when arriving via the EXPLORE transition, and how
 * long it takes to bleed off.
 *
 * The whole point of the handoff is that /interactive does not begin at rest.
 * The visitor was travelling at speed a frame ago on the other route; starting
 * the establishing pass from a standstill would announce the cut that the
 * entire transition exists to hide. So the pass begins hot and decelerates into
 * its normal cruise, and the deceleration itself becomes the arrival.
 */
const ARRIVAL_SPEED = 210
/* Gentler than it first looks: at 0.55/sec the residual is still ~30% after a
 * second, so the ship is demonstrably still slowing when control transfers.
 * At the original 0.85 it had flattened to cruise before the handover and the
 * telemetry read 000 M/S on arrival — verified on a mobile capture. The point
 * of the carried velocity is that the pilot FEELS it, so it has to outlive the
 * deceleration shot. */
const ARRIVAL_DECEL = 0.55

export default function ApproachSequence() {
  const { camera } = useThree()
  const t = useRef(0)
  const initialised = useRef(false)
  const wasBoot = useRef(false)
  /** True when this boot was entered through the EXPLORE transition. */
  const arriving = useRef(false)
  /** Residual velocity from that transition, bled off over the first second. */
  const entrySpeed = useRef(0)

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

    /* HOLD STILL WHILE STAGED BUT NOT YET REVEALED.
     *
     * The staging layer mounts this scene ~1.5s before the visitor sees it, so
     * the pass would otherwise be well underway — and the arrival deceleration
     * already spent — by the time the frame is handed over. The ship must be
     * poised at its start mark, engines lit, waiting. Placement below still
     * runs; only the motion is withheld. */
    const tp = getPhase()
    const stagedHidden =
      isTransitioning(tp) && tp !== 'routing' && tp !== 'interactive-entry'

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

      /* Did we get here by flying, or by opening the URL?
       *
       * Read from the TRANSITION PHASE, not from warp.handoff. Staging mounts
       * this component during 'entering-space', which is BEFORE the controller
       * writes the handoff at the peak — so checking the handoff here found it
       * still null and every flown arrival silently degraded to a cold start.
       * The phase is already true at mount time and needs no handshake.
       *
       * A cold visit (typed URL, reload) has phase 'idle', so it takes the
       * normal spool-up exactly as before. */
      arriving.current = isTransitioning(tp) && tp !== 'idle'
      warp.handoff = null
      entrySpeed.current = arriving.current ? ARRIVAL_SPEED : 0
    }

    /* Frozen until revealed: hold the start mark rather than flying the pass
       out of sight. Engines still lit so the reveal has glow from frame one. */
    if (stagedHidden) {
      flight.throttle += (0.55 - flight.throttle) * Math.min(1, 1.4 * delta)

      /* Publish the speed the ship is ABOUT to be travelling at.
       *
       * The freeze holds position, but the telemetry is read by the HUD every
       * 100ms and would otherwise show 000 M/S on the first visible frame —
       * verified on a mobile capture. The visitor arrives at speed; the readout
       * has to agree with the motion from the moment it is legible. */
      flight.speed = arriving.current ? CRUISE_SPEED + entrySpeed.current : 0

      /* Park the camera on its mark too, snapped rather than lerped. The lerp
         below converges over ~1s; leaving the camera at its default while
         frozen would make the reveal open on a swing into position instead of
         on a composed shot. */
      headingVector(_fwd, flight.heading, flight.pitch)
      camera.position.set(
        flight.position.x - _fwd.x * 24,
        flight.position.y + 4.2,
        flight.position.z - _fwd.z * 24,
      )
      _lookWant.set(
        flight.position.x + _fwd.x * 24,
        flight.position.y + _fwd.y * 24 + 1.2,
        flight.position.z + _fwd.z * 24,
      )
      camera.lookAt(_lookWant)
      return
    }

    t.current += delta

    /* A long, slow bank. The turn rate is constant, so the ship traces an arc
     * rather than a straight line — a straight approach reads as a dolly move,
     * an arc reads as flight. */
    flight.heading += TURN_RATE * delta
    // Very gentle vertical drift, easing out, so the horizon is never static.
    flight.pitch = Math.sin(t.current * 0.18) * 0.045

    headingVector(_fwd, flight.heading, flight.pitch)

    /* Two ways to reach cruise, depending on how the visitor got here.
     *
     * COLD (typed the URL, reloaded): ease up from zero, as before.
     * ARRIVING (flew here from the portfolio): start hot and decelerate. The
     * residual decays exponentially onto the same cruise value, so both paths
     * converge within about a second and everything downstream is identical. */
    const spool = Math.min(1, t.current / 2.4)

    if (entrySpeed.current > 0.5) {
      // Frame-rate independent decay — a raw multiply would bleed off at
      // different rates on a 60Hz and a 144Hz display.
      entrySpeed.current *= Math.pow(1 - ARRIVAL_DECEL, delta)
    } else {
      entrySpeed.current = 0
    }

    const speed = arriving.current
      ? CRUISE_SPEED + entrySpeed.current
      : CRUISE_SPEED * spool

    flight.position.x += _fwd.x * speed * delta
    flight.position.y += _fwd.y * speed * delta
    flight.position.z += _fwd.z * speed * delta

    flight.speed = speed

    /* Engines visibly lit — this is a ship under way, not a parked model.
     *
     * On arrival the plumes run hot and settle back to cruise as the residual
     * bleeds off, so the FIRST thing that resolves out of the white-out is
     * engine glow. That ordering is deliberate: glow, then silhouette, then
     * the lit hull. A ship that simply appears fully rendered is a cut; one
     * that resolves out of its own exhaust is an arrival. */
    const wantThrottle = arriving.current
      ? 0.55 + Math.min(0.45, entrySpeed.current / ARRIVAL_SPEED) * 0.45
      : 0.55
    flight.throttle += (wantThrottle - flight.throttle) * Math.min(1, 1.4 * delta)

    /* Camera: a three-quarter trailing view, slightly off the ship's axis.
     *
     * Not the gameplay chase rig. Sitting off-axis and a little high shows the
     * planform and both engines at once, which is what makes an establishing
     * shot read as composed rather than as a viewport. */
    const side = Math.sin(t.current * 0.12) * 6.5

    /* Trail distance tracks the residual speed. Sitting further back while
       decelerating and drawing in as the ship settles gives the arrival a
       physical reason to be moving, rather than just a number going down. */
    const residual = arriving.current ? entrySpeed.current / ARRIVAL_SPEED : 0
    const trail = 15 + residual * 9

    _camWant.set(
      flight.position.x - _fwd.x * trail + _fwd.z * side,
      flight.position.y + 4.2,
      flight.position.z - _fwd.z * trail - _fwd.x * side,
    )
    // Snappier while the residual is high so the camera cannot fall behind a
    // ship doing 210; relaxes back to the composed establishing lerp.
    camera.position.lerp(_camWant, Math.min(1, (1.6 + residual * 5) * delta))

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
