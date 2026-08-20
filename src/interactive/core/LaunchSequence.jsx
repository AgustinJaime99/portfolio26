import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { flight, getFlightState, setFlightState } from './flightStore'
import { DESTINATION_BY_ID } from '../data/spaceMap'
import { headingVector } from './FlightEngine'
import { deployment, updateDeployment } from './deploymentMachine'

/**
 * LAUNCH SEQUENCE — the cinematic that runs the deployment.
 *
 * Owns ship and camera from the moment the form opens until the scene has
 * returned to normal. It does NOT own timing: deploymentMachine advances the
 * state, and this reads the normalised values it publishes. That split is what
 * keeps camera, UI and 3D in lockstep — they all sample the same clock.
 *
 * Camera behaviour by state:
 *
 *   form/idle    launch-control three-quarter, ship centred in the ring mouth
 *   armed        begins closing on the ship as the UI withdraws
 *   countdown    physically moves in behind the ship — real translation, not
 *                an FOV zoom, so the vessel genuinely grows in frame
 *   ignition     tight behind, trembling
 *   launch       follows with lag, then is left behind
 *   lightspeed   the ship is a silhouette against the streaks
 *   returning    everything eases home
 */

const DEST = DESTINATION_BY_ID.launch

const _shipTarget = new THREE.Vector3()
const _camWant = new THREE.Vector3()
const _lookWant = new THREE.Vector3()
const _fwd = new THREE.Vector3()
const _ringCentre = new THREE.Vector3(
  DEST.position[0],
  DEST.position[1],
  DEST.position[2],
)

/** The ring lies in the XY plane, so its axis — the way you fly through — is Z. */
const RING_AXIS = new THREE.Vector3(0, 0, 1)

/**
 * How far in front of the ring the ship holds.
 * Close to the aperture (ring radius 34) so the vessel reads as sitting IN the
 * ring's mouth rather than merely passing by it.
 */
const PAD_STANDOFF = 30

export default function LaunchSequence({ shipRef }) {
  const { camera } = useThree()
  const shakeSeed = useRef(0)

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const st = getFlightState()

    // Advance the machine from the render clock — one source of time.
    updateDeployment(delta)

    const phase = st.deployPhase
    const dstate = deployment.state
    const running = dstate !== 'idle'

    if (!phase && !running) return

    /* ---------------------------------------------------------- */
    /* Pad hold — form open, or armed/countdown before ignition     */
    /* ---------------------------------------------------------- */

    const onPad =
      (phase === 'form' && !running) ||
      dstate === 'armed' ||
      dstate === 'hold' ||
      dstate === 'countdown' ||
      dstate === 'silence' ||
      dstate === 'ignition'

    if (onPad) {
      _shipTarget.copy(_ringCentre).addScaledVector(RING_AXIS, PAD_STANDOFF)

      const k = Math.min(1, 1.6 * delta)
      flight.position.x += (_shipTarget.x - flight.position.x) * k
      flight.position.y += (_shipTarget.y - flight.position.y) * k
      flight.position.z += (_shipTarget.z - flight.position.z) * k

      flight.velocity.x *= Math.pow(0.02, delta)
      flight.velocity.y *= Math.pow(0.02, delta)
      flight.velocity.z *= Math.pow(0.02, delta)
      flight.speed = 0

      // Nose through the aperture: heading 0 points along -Z.
      let diff = 0 - flight.heading
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      flight.heading += diff * Math.min(1, 2.2 * delta)
      flight.pitch += (0 - flight.pitch) * Math.min(1, 2.2 * delta)

      // Engine idle rises with the machine's enginePower.
      const idle = 0.14 + deployment.enginePower * 0.35
      flight.throttle += (idle - flight.throttle) * Math.min(1, 3 * delta)

      /* Camera closes in as cameraClose goes 0→1.
       *
       * This is a real translation from the wide launch-control view to a tight
       * chase position behind the ship. Zooming with FOV would enlarge the ship
       * without any parallax, which reads as a lens change rather than as
       * approach — the brief is explicit about this and it is correct. */
      const close = deployment.cameraClose

      // Wide: three-quarter, slightly elevated, near the ring axis.
      const wideBack = 46
      const wideUp = 17
      const wideSide = 7

      // Tight: directly behind the ship, low, close.
      const tightBack = 11
      const tightUp = 3.4
      const tightSide = 0

      const back = THREE.MathUtils.lerp(wideBack, tightBack, close)
      const up = THREE.MathUtils.lerp(wideUp, tightUp, close)
      const sideOff = THREE.MathUtils.lerp(wideSide, tightSide, close)

      _camWant.copy(_shipTarget).addScaledVector(RING_AXIS, back)
      _camWant.x += sideOff
      _camWant.y += up

      // Look target slides from "ship and ring together" to "through the ship".
      _lookWant.copy(_shipTarget).lerp(_ringCentre, THREE.MathUtils.lerp(0.34, 0.62, close))

      camera.position.lerp(_camWant, Math.min(1, 2.2 * delta))
      applyShake(camera, delta, st)
      camera.lookAt(_lookWant)
      syncShip()
      return
    }

    /* ---------------------------------------------------------- */
    /* Launch / lightspeed / flash — the ship departs               */
    /* ---------------------------------------------------------- */

    if (dstate === 'launch' || dstate === 'lightspeed' || dstate === 'flash') {
      flight.heading += (0 - flight.heading) * Math.min(1, 3 * delta)
      flight.pitch += (0 - flight.pitch) * Math.min(1, 3 * delta)
      flight.throttle = 1
      flight.boost = 1

      // Position is driven directly by the machine's distance curve, so the
      // exponential acceleration is exact rather than integrated.
      headingVector(_fwd, 0, 0)
      const base = _shipTarget.copy(_ringCentre).addScaledVector(RING_AXIS, PAD_STANDOFF)
      flight.position.x = base.x + _fwd.x * deployment.launchDistance
      flight.position.y = base.y + _fwd.y * deployment.launchDistance
      flight.position.z = base.z + _fwd.z * deployment.launchDistance
      flight.speed = deployment.launchDistance

      /* TIGHT CHASE. The ship stays the subject through the whole warp.
       *
       * The earlier rig let the camera fall behind as speed climbed, so by the
       * time the star tunnel arrived the vessel had left frame entirely and the
       * most spectacular moment of the sequence had nothing in it but streaks.
       * That is backwards: the streaks are the BACKGROUND, the ship is the shot.
       *
       *        stars ╲   │   ╱ stars
       *               ╲  │  ╱
       *               ┌─────┐
       *              ╱ SHIP ╲
       *                ●   ●        engines
       *
       *              CAMERA         locked close behind
       *
       * So the trail distance CLOSES as warp rises rather than opening. Speed is
       * carried by the streaks and the shake, not by losing the subject. */
      const trail = 9.5 - deployment.warpFactor * 2.6
      const rise = 2.6 - deployment.warpFactor * 0.9

      _camWant.set(
        flight.position.x - _fwd.x * trail,
        flight.position.y - _fwd.y * trail + rise,
        flight.position.z - _fwd.z * trail,
      )

      /* RIGID ANCHOR, not a chase.
       *
       * Any lerp — however fast — falls behind an exponential distance curve.
       * Verified: at the warp peak the ship hit 2266 m/s and left frame
       * entirely, which is exactly the failure this rig exists to prevent.
       *
       * So the camera is SET, not eased, and the sense of speed is carried
       * where it belongs: by the star streaks, the shake and the engine glow.
       * A small easing term survives only at low warp, where the frame-to-frame
       * delta is small enough for lag to read as thrust rather than as the
       * subject escaping. */
      const anchor = Math.min(1, deployment.warpFactor * 2.2)
      if (anchor >= 1) {
        camera.position.copy(_camWant)
      } else {
        const follow = 26 + deployment.warpFactor * 40
        camera.position.lerp(_camWant, Math.min(1, follow * delta))
        // Blend toward the rigid position as warp climbs.
        camera.position.lerp(_camWant, anchor)
      }

      applyShake(camera, delta, st)

      // Aim slightly AHEAD of the ship so it sits a little low in frame, with
      // the tunnel opening out above and around it.
      _lookWant.set(
        flight.position.x + _fwd.x * 16,
        flight.position.y + _fwd.y * 16 + 0.6,
        flight.position.z + _fwd.z * 16,
      )
      camera.lookAt(_lookWant)

      /* Sync the hull HERE, not in FlightEngine.
       *
       * FlightEngine's frame callback runs BEFORE this one, so it was writing
       * the mesh from the previous frame's position while this callback set the
       * new one. At 2266 m/s that one-frame lag is ~38 units — enough for the
       * ship to sit outside the camera's view entirely at the warp peak, which
       * is exactly the failure that kept losing the subject. */
      syncShip()
      return
    }

    /* ---------------------------------------------------------- */
    /* Confirmation / returning                                     */
    /* ---------------------------------------------------------- */

    if (dstate === 'confirmation') {
      // Hold wherever the flash left us. The scene is quiet behind the message.
      flight.throttle *= Math.pow(0.2, delta)
      flight.boost *= Math.pow(0.2, delta)
      return
    }

    if (dstate === 'returning') {
      // Ease the ship back onto the pad and the camera back to launch control.
      _shipTarget.copy(_ringCentre).addScaledVector(RING_AXIS, PAD_STANDOFF)
      headingVector(_fwd, 0, 0)
      const d = deployment.launchDistance
      const want = {
        x: _shipTarget.x + _fwd.x * d,
        y: _shipTarget.y + _fwd.y * d,
        z: _shipTarget.z + _fwd.z * d,
      }
      const k = Math.min(1, 3 * delta)
      flight.position.x += (want.x - flight.position.x) * k
      flight.position.y += (want.y - flight.position.y) * k
      flight.position.z += (want.z - flight.position.z) * k
      flight.throttle *= Math.pow(0.3, delta)
      flight.boost *= Math.pow(0.3, delta)

      _camWant.copy(_shipTarget).addScaledVector(RING_AXIS, 46)
      _camWant.x += 7
      _camWant.y += 17
      camera.position.lerp(_camWant, Math.min(1, 2 * delta))
      _lookWant.copy(_shipTarget).lerp(_ringCentre, 0.34)
      camera.lookAt(_lookWant)

      if (deployment.progress >= 1) {
        // Hand control back to the pilot.
        setFlightState({ deployPhase: null })
        flight.velocity = { x: 0, y: 0, z: 0 }
      }
    }
  })

  /** Write the hull transform from the position this callback just computed. */
  function syncShip() {
    const ship = shipRef?.current
    if (!ship) return
    ship.position.set(flight.position.x, flight.position.y, flight.position.z)
    ship.rotation.y = flight.heading
    ship.rotation.x = -flight.pitch * 0.6
    ship.rotation.z += (0 - ship.rotation.z) * 0.2
  }

  function applyShake(cam, delta, st) {
    if (st.reducedMode || deployment.cameraShake < 0.01) return
    shakeSeed.current += delta
    const t = shakeSeed.current * 60
    const amp = deployment.cameraShake
    // Two frequencies so the tremor never reads as a sine wave.
    cam.position.x += (Math.sin(t * 2.1) + Math.sin(t * 5.7) * 0.4) * amp * 0.16
    cam.position.y += (Math.cos(t * 2.9) + Math.cos(t * 6.3) * 0.4) * amp * 0.16
  }

  return null
}

/**
 * Called when the deployment panel opens. Hands ship control to this sequence
 * so the vessel moves onto the pad while the operator fills in the form.
 */
export function enterPadHold() {
  const st = getFlightState()
  if (st.deployPhase) return
  setFlightState({ deployPhase: 'form' })
}

/** Called when the panel closes without launching. */
export function abortPadHold() {
  if (deployment.committed) return
  setFlightState({ deployPhase: null })
}
