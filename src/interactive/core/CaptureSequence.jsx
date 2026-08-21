import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { flight, getFlightState, setFlightState, useFlightState } from './flightStore'
import { orbit, decayOrbit, resetOrbit } from './orbitControl'
import { DESTINATION_BY_ID } from '../data/spaceMap'
import { MOTION } from '../data/artDirection'

/**
 * ORBITAL CAPTURE — wow moment #3.
 *
 * Not a modal. The ship is captured: control fades over MOTION.captureDuration
 * while the camera falls into a real orbit around the structure. The orbit
 * never stops while you read, so the content arrives already in motion.
 */

const _from = new THREE.Vector3()
const _to = new THREE.Vector3()
const _center = new THREE.Vector3()
const _look = new THREE.Vector3()
const _satTarget = new THREE.Vector3()
const _satCam = new THREE.Vector3()
const _outward = new THREE.Vector3()
const _berth = new THREE.Vector3()

/**
 * World position of the currently selected satellite, published by TheWorks
 * every frame. The camera reads it to frame the deployed screenshot array.
 *
 * A mutable object rather than React state: the satellite is in motion, so this
 * changes every frame and must never trigger a re-render.
 */
export const satelliteFocus = {
  active: false,
  position: { x: 0, y: 0, z: 0 },
}

/** Cubic ease-in-out — symmetrical, no bounce. Capture should feel inevitable. */
function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export default function CaptureSequence({ shipRef }) {
  const { camera } = useThree()
  const phase = useFlightState((s) => s.phase)
  const sectionId = useFlightState((s) => s.activeSection)

  const tRef = useRef(0)
  const startPos = useRef(new THREE.Vector3())
  const startShip = useRef({ x: 0, y: 0, z: 0 })
  const orbitAngle = useRef(0)
  /** 0 = framing the planet, 1 = framing the selected satellite's array. */
  const focusBlend = useRef(0)
  /** Fixed mooring angle, captured once on arrival. Null until docked. */
  const berthAngle = useRef(null)

  useEffect(() => {
    if (phase !== 'capturing') return
    // A new approach earns a new berth; carrying the old angle over would moor
    // the ship at an arbitrary point inherited from the previous site.
    berthAngle.current = null
    tRef.current = 0
    startPos.current.copy(camera.position)
    startShip.current = { ...flight.position }

    const dest = DESTINATION_BY_ID[sectionId]
    if (dest) {
      // Preserve the angle of arrival so the orbit begins where you came from.
      orbitAngle.current = Math.atan2(
        flight.position.x - dest.position[0],
        flight.position.z - dest.position[2],
      )
    }
  }, [phase, sectionId, camera])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const st = getFlightState()
    const dest = DESTINATION_BY_ID[st.activeSection]
    if (!dest) return
    if (st.phase !== 'capturing' && st.phase !== 'docked') return

    // The launch sequence owns the ship and camera once a deployment starts.
    // Without this both systems write flight.position every frame and the ship
    // is pinned to its orbit while the engines are supposedly at full thrust.
    if (st.deployPhase) return

    _center.set(dest.position[0], dest.position[1], dest.position[2])

    // Bleed off velocity — the structure's gravity well "catches" the ship.
    flight.velocity.x *= Math.pow(0.02, delta)
    flight.velocity.y *= Math.pow(0.02, delta)
    flight.velocity.z *= Math.pow(0.02, delta)
    flight.throttle *= Math.pow(0.05, delta)
    flight.boost *= Math.pow(0.05, delta)
    flight.speed = 0

    const orbitRadius = dest.captureRadius * 0.78
    let orbitHeight = 12

    /* THE WORKS needs a wider berth than the other sites.
     *
     * Its hero object is 22 units of displaced terrain AND a satellite that
     * deploys a ~30-unit-wide screenshot array. Framed at the default distance
     * the planet fills the entire viewport and the deployed panels — the whole
     * point of the section — sit off-screen behind the camera. */
    const isWorks = dest.id === 'works'
    if (isWorks) orbitHeight = 16
    const camStandoff = isWorks ? 54 : 12

    /* Vertical aim offset.
     *
     * Sites are not centred on their own origin. SIGNAL's dish sits well above
     * the origin while its mast runs 33 units below it, so aiming at the origin
     * put the dish — the thing worth looking at — near the top of frame with a
     * column of empty mast underneath. */
    const aimY = dest.id === 'signal' ? 4 : 0

    /* The content panel occupies the right ~35% of the viewport, so the subject
     * must sit left of centre or the composition fights the text.
     *
     * Applied to the LOOK TARGET rather than the camera, so the orbit stays
     * physically honest. Kept modest: at 22 it pushed the subject so far that
     * it left frame entirely and read as "the camera missed". */
    /* On mobile the content is a BOTTOM SHEET, not a side panel, so the empty
     * space is above rather than beside. Shifting the subject sideways there
     * would push it behind nothing and leave it hidden under the sheet — the
     * offset has to become vertical instead. */
    const isNarrow = typeof window !== 'undefined' && window.innerWidth < 860
    const framingShift = isNarrow ? 0 : 11
    // Raise the look target so the structure sits in the upper half, clear of
    // the sheet. Negative because lowering the aim raises the subject in frame.
    const verticalShift = isNarrow ? -(orbitRadius + camStandoff) * 0.3 : 0

    if (st.phase === 'capturing') {
      tRef.current += delta / MOTION.captureDuration
      const t = Math.min(1, tRef.current)
      const e = easeInOut(t)

      // Ship eases onto the orbit path.
      const shipAngle = orbitAngle.current
      const targetShipX = dest.position[0] + Math.sin(shipAngle) * orbitRadius
      const targetShipZ = dest.position[2] + Math.cos(shipAngle) * orbitRadius
      const targetShipY = dest.position[1] + 2

      flight.position.x = THREE.MathUtils.lerp(startShip.current.x, targetShipX, e)
      flight.position.y = THREE.MathUtils.lerp(startShip.current.y, targetShipY, e)
      flight.position.z = THREE.MathUtils.lerp(startShip.current.z, targetShipZ, e)

      // Camera swings out to a three-quarter view of the structure.
      const camAngle = shipAngle + 0.5
      _to.set(
        dest.position[0] + Math.sin(camAngle) * (orbitRadius + camStandoff),
        dest.position[1] + orbitHeight,
        dest.position[2] + Math.cos(camAngle) * (orbitRadius + camStandoff),
      )
      _from.copy(startPos.current).lerp(_to, e)
      camera.position.copy(_from)

      // Ease the framing shift in as capture completes, so the structure slides
      // into the left third rather than snapping there on arrival.
      _look.copy(_center)
      _look.y += aimY
      _look.x += Math.sin(camAngle + Math.PI / 2) * framingShift * e
      _look.z += Math.cos(camAngle + Math.PI / 2) * framingShift * e
      _look.y += verticalShift * e
      camera.lookAt(_look)

      if (t >= 1) {
        setFlightState({ phase: 'docked' })
      }
      return
    }

    /* SATELLITE FOCUS.
     *
     * With a project selected, the subject of the shot is no longer the planet
     * — it is the satellite and its deployed screenshot array. Framing the
     * planet at that moment leaves the panels somewhere off in the dark, which
     * makes the whole feature invisible.
     *
     * The camera eases from planet-framing to satellite-framing and back, so
     * selecting a project is a move rather than a cut. */
    const focusPos = satelliteFocus.position
    const wantFocus = satelliteFocus.active ? 1 : 0
    focusBlend.current += (wantFocus - focusBlend.current) * Math.min(1, 1.9 * delta)
    const fb = focusBlend.current

    if (fb > 0.001) {
      // Aim at the middle of the deployed array, which rises above the hull —
      // targeting the satellite body itself puts the panels in the top half of
      // frame with dead space below.
      _satTarget.set(focusPos.x, focusPos.y + 7, focusPos.z)

      /* Stand off far enough to hold the whole fan.
       *
       * The array spans roughly 6 panels x 8.1 spacing ~ 49 units. At a 55°
       * vertical FOV on a wide viewport, ~76 units back frames that with air
       * around it. At the 34 I first tried, the camera ended up INSIDE the
       * satellite and the scene rendered empty. */
      _satCam
        .copy(_satTarget)
        .addScaledVector(_outward.copy(_satTarget).sub(_center).normalize(), 76)
      _satCam.y += 20
    }

    /* Docked: the orbit continues — motion never fully stops.
     *
     * EXCEPT while a project is selected. Continuous orbital motion is right
     * when you are reading a text panel, but it makes screenshots genuinely
     * unreadable: the array swings through frame and you cannot study a single
     * frame long enough to take it in. Content legibility beats the motion
     * principle here, so orbit drift is damped to a near-stop on selection. */
    const orbitRate = 0.085 * (1 - fb * 0.94)
    orbitAngle.current += delta * orbitRate

    /* THE SHIP PARKS. THE CAMERA ORBITS.
     *
     * Previously the vessel rode the same angle as the camera, so it circled
     * the site forever — which reads as loitering, not as arriving. A ship that
     * has reached its destination should be MOORED: held on a fixed berth
     * alongside the structure, nose squared up to it, engines at idle.
     *
     * The berth is captured once on arrival (see berthAngle below) and then
     * held, while the camera continues its slow orbit around the pair. That
     * separation is what makes the site feel like somewhere you docked rather
     * than somewhere you are still circling. */
    if (berthAngle.current === null) berthAngle.current = orbitAngle.current

    const bAngle = berthAngle.current
    // Sit slightly outside the camera's orbit radius and below the centreline,
    // so the ship reads as parked beside the structure rather than in front of
    // it, and never occludes the subject.
    const berthRadius = orbitRadius * 1.06
    _berth.set(
      dest.position[0] + Math.sin(bAngle) * berthRadius,
      dest.position[1] - orbitRadius * 0.16,
      dest.position[2] + Math.cos(bAngle) * berthRadius,
    )

    // Ease onto the berth rather than snapping — this is the last motion of the
    // arrival and it should settle, like a ship coming to rest on its mooring.
    const moor = Math.min(1, 1.5 * delta)
    flight.position.x += (_berth.x - flight.position.x) * moor
    flight.position.y += (_berth.y - flight.position.y) * moor
    flight.position.z += (_berth.z - flight.position.z) * moor

    // Square the nose up to the structure: a parked ship faces what it came for.
    const toSite = Math.atan2(
      -(dest.position[0] - flight.position.x),
      -(dest.position[2] - flight.position.z),
    )
    let hDiff = toSite - flight.heading
    while (hDiff > Math.PI) hDiff -= Math.PI * 2
    while (hDiff < -Math.PI) hDiff += Math.PI * 2
    flight.heading += hDiff * Math.min(1, 1.8 * delta)

    // Engines drop to station-keeping idle.
    flight.throttle += (0.07 - flight.throttle) * Math.min(1, 2 * delta)

    const shipAngle = orbitAngle.current

    /* Manual drag is an OFFSET on top of the running orbit, never a takeover.
     *
     * Adding orbit.yaw here (rather than writing orbitAngle directly) is what
     * lets the automatic rotation keep advancing underneath a drag: release the
     * mouse and the scene carries on turning from wherever you left it, with
     * the offset easing home. Freezing the orbit on first click would kill the
     * "motion never fully stops" principle for the rest of the session. */
    decayOrbit(delta)
    const camAngle = shipAngle + 0.5 + orbit.yaw
    // Pitch raises/lowers the camera and is clamped in orbitControl, so there
    // is no way to end up under or above the site looking at nothing.
    const pitchLift = orbit.pitch * (orbitRadius + camStandoff) * 0.75

    _to.set(
      dest.position[0] + Math.sin(camAngle) * (orbitRadius + camStandoff),
      dest.position[1] + orbitHeight + pitchLift,
      dest.position[2] + Math.cos(camAngle) * (orbitRadius + camStandoff),
    )
    _look.copy(_center)
    _look.y += aimY
    _look.x += Math.sin(camAngle + Math.PI / 2) * framingShift
    _look.z += Math.cos(camAngle + Math.PI / 2) * framingShift
    _look.y += verticalShift

    // Blend between planet framing and satellite framing.
    if (fb > 0.001) {
      _to.lerp(_satCam, fb)
      _look.lerp(_satTarget, fb)
    }

    // Tighter follow while dragging so the view tracks the pointer directly;
    // a 2/sec lerp feels like dragging through treacle.
    const follow = orbit.dragging ? 14 : 2
    camera.position.lerp(_to, Math.min(1, follow * delta))
    camera.lookAt(_look)

    if (shipRef.current) {
      shipRef.current.position.set(
        flight.position.x,
        flight.position.y,
        flight.position.z,
      )
      shipRef.current.rotation.y = flight.heading
      shipRef.current.rotation.z += (0.12 - shipRef.current.rotation.z) * Math.min(1, 2 * delta)
    }
  })

  return null
}

/** Break orbit and return to free flight. */
export function releaseFromOrbit() {
  const st = getFlightState()
  const dest = DESTINATION_BY_ID[st.activeSection]
  if (dest) {
    // Push outward so the pilot does not immediately re-trigger capture.
    const dx = flight.position.x - dest.position[0]
    const dz = flight.position.z - dest.position[2]
    const d = Math.hypot(dx, dz) || 1
    flight.position.x = dest.position[0] + (dx / d) * (dest.detectRadius + 24)
    flight.position.z = dest.position[2] + (dz / d) * (dest.detectRadius + 24)
    // Point the nose away from the structure we are leaving.
    flight.heading = Math.atan2(-dx / d, -dz / d)
  }
  // Reset camera roll so free flight never starts on a tilted horizon.
  flight.pitch = 0
  flight.velocity = { x: 0, y: 0, z: 0 }
  // Clear any manual drag offset so the next site is framed as designed.
  resetOrbit()
  setFlightState({
    phase: 'flying',
    activeSection: null,
    activeSatellite: null,
    activeMission: null,
    focusedPanel: null,
    lockedTarget: null,
  })
}
