import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { flight, getFlightState, setFlightState } from './flightStore'
import { MOTION } from '../data/artDirection'
import { DESTINATIONS, WORLD } from '../data/spaceMap'

/**
 * FLIGHT ENGINE
 *
 * Runs entirely inside useFrame against mutable state. It never calls setState
 * on a per-frame basis; the only React updates it triggers are discrete target
 * locks and capture events, which happen a handful of times per session.
 *
 * Model: assisted flight on a disc.
 *   W/S    thrust along the nose vector
 *   A/D    yaw
 *   mouse  soft bias on heading + pitch (no pointer lock)
 *   shift  boost
 *
 * Vertical travel is limited to ±WORLD.verticalLimit and auto-levels after
 * MOTION.autoLevelDelay seconds of no input. You can drift off-plane enough to
 * feel three-dimensional, never enough to lose the reference plane.
 */

/**
 * Tuned by feel, not by physics. Drag is high enough that the ship always
 * settles quickly (you never fight momentum in a portfolio) but low enough
 * that boost builds real speed instead of fighting friction.
 */
const THRUST = 190
const BOOST_MULTIPLIER = 3.1
const DRAG = 0.945
const YAW_RATE = 1.5
const MAX_PITCH = 0.32

/**
 * Scratch vectors. Every one of these is written before it is read within a
 * single frame — never carry a value across sections, and never let a helper
 * like multiplyScalar mutate one that a later line still depends on.
 */
const _forward = new THREE.Vector3()
const _camOffset = new THREE.Vector3()
const _camTarget = new THREE.Vector3()
const _lookTarget = new THREE.Vector3()
const _shipPos = new THREE.Vector3()
const _desiredUp = new THREE.Vector3()

/**
 * THE HEADING CONVENTION — the single source of orientation truth.
 *
 * The vessel model is built nose-along -Z. Three's Object3D.rotation.y rotates
 * counter-clockwise about +Y, so a hull with rotation.y = h points at:
 *
 *     ( -sin(h), 0, -cos(h) )
 *
 * The camera rig MUST derive its forward vector from the same expression or it
 * ends up orbiting beside the ship instead of trailing it. Everything that
 * needs "which way is the nose pointing" calls this.
 */
export function headingVector(out, heading, pitch = 0) {
  return out.set(-Math.sin(heading), pitch, -Math.cos(heading)).normalize()
}

export default function FlightEngine({ input, shipRef }) {
  const { camera } = useThree()

  const fovRef = useRef(MOTION.fov.rest)
  const boostReleaseRef = useRef(0)
  const wasBoosting = useRef(false)
  const shakeRef = useRef(0)
  const prevHeading = useRef(0)
  /** Position at the end of the previous frame, for swept capture tests. */
  const prevPos = useRef({ x: 0, y: 0, z: 0 })

  useFrame((_, rawDelta) => {
    // Clamp delta so an alt-tab pause cannot launch the ship into deep space.
    const delta = Math.min(rawDelta, 0.05)
    const st = getFlightState()
    // Navigation is locked for the whole deployment: the sequence owns the ship.
    const interactive =
      st.phase === 'flying' && !st.navOpen && !st.systemsOpen && !st.deployPhase

    /* Yield entirely while a deployment is running.
     *
     * LaunchSequence drives ship position, heading and camera during the pad
     * hold and the launch. If the chase rig keeps writing camera.position on
     * the same frames, the two fight and the launch reads as a stutter rather
     * than as a departure. The ship mesh is still synced below so the vessel
     * stays visible — it just follows LaunchSequence's numbers. */
    if (st.deployPhase) {
      if (shipRef.current) {
        const ship = shipRef.current
        ship.position.set(flight.position.x, flight.position.y, flight.position.z)
        ship.rotation.y = flight.heading
        ship.rotation.x = -flight.pitch * 0.6
        ship.rotation.z += (0 - ship.rotation.z) * Math.min(1, 3 * delta)
      }
      return
    }

    /* ---------------------------------------------------------- */
    /* Steering                                                    */
    /* ---------------------------------------------------------- */

    // Touch counts as input too, or the control hint never retires on a phone
    // and auto-level fights the stick.
    const hasKeyInput =
      interactive &&
      (input.forward ||
        input.back ||
        input.left ||
        input.right ||
        input.touchActive)

    if (hasKeyInput && !flight.hasMoved) {
      flight.hasMoved = true
      setFlightState({}) // notify HUD to begin retiring the control hint
    }

    if (hasKeyInput) flight.idleTime = 0
    else flight.idleTime += delta

    if (interactive) {
      /* Yaw from A/D, or from the touch stick's analogue X.
       *
       * The stick takes precedence when it is being held, so both input methods
       * share one code path. The engine never asks which device is in use —
       * that is the whole point of routing touch through the same object. */
      let yawInput = 0
      if (input.left) yawInput += 1
      if (input.right) yawInput -= 1
      if (input.axisX) yawInput = -input.axisX

      const pointerBias =
        input.pointerActive && !input.touchActive ? -input.pointerX * 0.45 : 0
      flight.heading += (yawInput + pointerBias) * YAW_RATE * delta

      // Vertical drift: stick Y or mouse Y nudges pitch, auto-levels when idle.
      let pitchTarget = 0
      if (input.axisY) pitchTarget = input.axisY * MAX_PITCH
      else if (input.pointerActive) pitchTarget = -input.pointerY * MAX_PITCH
      const levelling = flight.idleTime > MOTION.autoLevelDelay
      const pitchLerp = levelling ? 0.6 : 1.8
      flight.pitch += (pitchTarget - flight.pitch) * Math.min(1, pitchLerp * delta)

      /* -------------------------------------------------------- */
      /* Thrust                                                    */
      /* -------------------------------------------------------- */

      let throttleTarget = 0
      if (input.forward) throttleTarget += 1
      if (input.back) throttleTarget -= 0.55
      // Touch throttle is already ramped by the control itself.
      if (input.axisThrottle) throttleTarget = input.axisThrottle

      flight.throttle += (throttleTarget - flight.throttle) * Math.min(1, 4 * delta)

      /* Boost on touch: holding the thrust pad at full for a moment engages it.
       * There is no room on a phone for a third control, and a dedicated boost
       * button would be pressed by accident constantly. */
      const touchBoost = input.axisThrottle > 0.97
      const boostTarget = (input.boost && input.forward) || touchBoost ? 1 : 0
      flight.boost += (boostTarget - flight.boost) * Math.min(1, 5 * delta)

      const power = THRUST * (1 + flight.boost * (BOOST_MULTIPLIER - 1))

      // Thrust runs along the nose, using the shared heading convention.
      headingVector(_forward, flight.heading, flight.pitch)

      flight.velocity.x += _forward.x * flight.throttle * power * delta
      flight.velocity.y += _forward.y * flight.throttle * power * delta
      flight.velocity.z += _forward.z * flight.throttle * power * delta
    }

    /* ---------------------------------------------------------- */
    /* Integration + drag                                          */
    /* ---------------------------------------------------------- */

    // Snapshot before integration — the swept capture test needs both ends of
    // this frame's travel.
    prevPos.current.x = flight.position.x
    prevPos.current.y = flight.position.y
    prevPos.current.z = flight.position.z

    const dragFactor = Math.pow(DRAG, delta * 60)
    flight.velocity.x *= dragFactor
    flight.velocity.y *= dragFactor
    flight.velocity.z *= dragFactor

    flight.position.x += flight.velocity.x * delta
    flight.position.y += flight.velocity.y * delta
    flight.position.z += flight.velocity.z * delta

    // Soft vertical containment — push back toward the ecliptic plane.
    const vLimit = WORLD.verticalLimit
    if (Math.abs(flight.position.y) > vLimit) {
      const over = flight.position.y - Math.sign(flight.position.y) * vLimit
      flight.position.y -= over * Math.min(1, 3 * delta)
      flight.velocity.y *= 0.9
    }

    // Soft radial containment — the disc has an edge that gently repels.
    const radial = Math.hypot(flight.position.x, flight.position.z)
    if (radial > WORLD.radius) {
      const pull = (radial - WORLD.radius) / radial
      flight.position.x -= flight.position.x * pull * Math.min(1, 2 * delta)
      flight.position.z -= flight.position.z * pull * Math.min(1, 2 * delta)
    }

    flight.speed = Math.hypot(
      flight.velocity.x,
      flight.velocity.y,
      flight.velocity.z,
    )

    /* ---------------------------------------------------------- */
    /* Ship transform                                              */
    /* ---------------------------------------------------------- */

    if (shipRef.current) {
      const ship = shipRef.current
      ship.position.set(flight.position.x, flight.position.y, flight.position.z)
      ship.rotation.y = flight.heading
      ship.rotation.x = -flight.pitch * 0.6

      // Bank into the turn. Roll is visual only — it never affects heading.
      let bankTarget = 0
      if (interactive) {
        if (input.left) bankTarget += 0.34
        if (input.right) bankTarget -= 0.34
        if (input.pointerActive) bankTarget += -input.pointerX * 0.18
      }
      ship.rotation.z += (bankTarget - ship.rotation.z) * Math.min(1, 3 * delta)
    }

    /* ---------------------------------------------------------- */
    /* Camera — chase with lag, FOV punch, overshoot on release    */
    /* ---------------------------------------------------------- */

    const boosting = flight.boost > 0.5
    if (wasBoosting.current && !boosting) {
      // Release: dip below rest FOV, then settle. 200ms of physicality.
      boostReleaseRef.current = MOTION.boostRelease
    }
    wasBoosting.current = boosting

    let fovTarget = MOTION.fov.rest + flight.boost * (MOTION.fov.boost - MOTION.fov.rest)
    if (boostReleaseRef.current > 0) {
      boostReleaseRef.current -= delta
      fovTarget = MOTION.fov.overshoot
    }

    const fovLerp = boosting ? 1 / MOTION.boostAttack : 3.5
    fovRef.current += (fovTarget - fovRef.current) * Math.min(1, fovLerp * delta)

    if (Math.abs(camera.fov - fovRef.current) > 0.01) {
      camera.fov = fovRef.current
      camera.updateProjectionMatrix()
    }

    /* Chase rig.
     *
     * The camera trails directly behind the nose and slightly above it. Two
     * rules make this feel like flying rather than like watching:
     *
     *  - The rig follows HEADING, not velocity. Chasing the velocity vector
     *    makes the camera swing wide during drift, which reads as a bug.
     *  - Position lag is springy but the look target is not, so the ship stays
     *    pinned to screen centre while the world swings around it.
     */
    _shipPos.set(flight.position.x, flight.position.y, flight.position.z)
    headingVector(_forward, flight.heading, flight.pitch)

    // Close enough that the hull detail and nav lights read; far enough that
    // the ship still occupies only a small part of frame.
    /* Close enough that the hull detail — panel seams, radiator fins, thermal
     * blankets, nav lights — actually resolves. At 11 units the ship was a
     * silhouette and every bit of that work was invisible. Boost still pulls
     * back, which is what makes acceleration read. */
    const pullBack = 7.6 + flight.boost * 5
    const riseAbove = 2.1 - flight.pitch * 5

    _camOffset.copy(_forward).multiplyScalar(-pullBack)
    _camTarget.copy(_shipPos).add(_camOffset)
    _camTarget.y += riseAbove

    /* Springy follow, but the spring stiffens with turn rate.
     *
     * A constant-rate lerp is what let the ship slide off to one side during a
     * sustained turn: the rig kept chasing a target that had already rotated
     * away. Scaling stiffness by |yaw rate| keeps the nose centred through the
     * turn while preserving lag on straight runs, where lag is what sells the
     * weight of the ship. */
    const yawRate = Math.abs(flight.heading - prevHeading.current) / Math.max(delta, 1e-4)
    prevHeading.current = flight.heading

    const turnBoost = Math.min(6, yawRate * 2.6)
    const follow = (boosting ? 7 : 5) + turnBoost
    camera.position.lerp(_camTarget, Math.min(1, follow * delta))

    // Boost shake — a couple of pixels of grit, off in reduced mode.
    if (!st.reducedMode) {
      const shakeTarget = flight.boost > 0.6 ? flight.boost : 0
      shakeRef.current += (shakeTarget - shakeRef.current) * Math.min(1, 6 * delta)
      if (shakeRef.current > 0.01) {
        const t = performance.now() * 0.05
        camera.position.x += Math.sin(t * 1.7) * shakeRef.current * 0.16
        camera.position.y += Math.cos(t * 2.3) * shakeRef.current * 0.16
      }
    }

    // Aim ahead of the ship, not at it — the pilot needs to see where they are
    // going. copy() first so multiplyScalar never mutates the shared _forward.
    _lookTarget.copy(_shipPos).addScaledVector(_forward, 30)
    _lookTarget.y += 1.2

    // Roll the camera slightly with the bank so turns feel banked rather than
    // flat. Kept well under the hull's own roll or the horizon starts to swim.
    const bankRoll = shipRef.current ? shipRef.current.rotation.z * 0.28 : 0
    _desiredUp.set(Math.sin(bankRoll), Math.cos(bankRoll), 0)
    camera.up.lerp(_desiredUp, Math.min(1, 4 * delta))

    camera.lookAt(_lookTarget)

    /* ---------------------------------------------------------- */
    /* Proximity detection                                         */
    /* ---------------------------------------------------------- */

    if (st.phase === 'flying') {
      let nearest = null
      let nearestDist = Infinity

      for (const dest of DESTINATIONS) {
        const dx = dest.position[0] - flight.position.x
        const dy = dest.position[1] - flight.position.y
        const dz = dest.position[2] - flight.position.z
        const dist = Math.hypot(dx, dy, dz)
        if (dist < dest.detectRadius && dist < nearestDist) {
          nearest = dest
          nearestDist = dist
        }
      }

      const lockedId = nearest ? nearest.id : null
      if (lockedId !== st.lockedTarget) {
        setFlightState({ lockedTarget: lockedId })
      }

      /* Orbital capture, tested against the FRAME'S TRAVEL SEGMENT rather than
       * against the end point.
       *
       * At boost cruise the ship covers ~9 units per frame at 60fps and ~19 at
       * 30fps, while a capture sphere can be only 68 across — so a point test
       * can tunnel straight through and the ship sails past the site. Verified:
       * a manual run overshot ARCHIVES entirely and ended up pinned against the
       * world boundary at -900.
       *
       * Measuring the closest approach of the segment travelled this frame
       * makes capture independent of frame rate. */
      for (const dest of DESTINATIONS) {
        // Segment from previous position to current, in dest-local space.
        const sx = prevPos.current.x - dest.position[0]
        const sy = prevPos.current.y - dest.position[1]
        const sz = prevPos.current.z - dest.position[2]
        const ex = flight.position.x - dest.position[0]
        const ey = flight.position.y - dest.position[1]
        const ez = flight.position.z - dest.position[2]

        const dx = ex - sx
        const dy = ey - sy
        const dz = ez - sz
        const lenSq = dx * dx + dy * dy + dz * dz

        // Parameter of closest approach, clamped to the segment.
        let t = lenSq > 1e-6 ? -(sx * dx + sy * dy + sz * dz) / lenSq : 0
        t = Math.max(0, Math.min(1, t))

        const cx = sx + dx * t
        const cy = sy + dy * t
        const cz = sz + dz * t
        const closest = Math.hypot(cx, cy, cz)

        if (closest < dest.captureRadius) {
          setFlightState({ phase: 'capturing', activeSection: dest.id })
          break
        }
      }
    }
  })

  return null
}
