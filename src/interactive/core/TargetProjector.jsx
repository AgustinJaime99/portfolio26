import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { flight, getFlightState } from './flightStore'
import { DESTINATION_BY_ID, DESTINATIONS } from '../data/spaceMap'

/**
 * TARGET PROJECTOR
 *
 * Projects the locked destination's world position into screen space every
 * frame and writes it to a shared mutable object the HUD reads.
 *
 * Why a mutable object and not React state: this value changes every single
 * frame while flying. Pushing it through setState would re-render the HUD 60
 * times a second. Instead the projector writes here and the reticle animates
 * itself from the same rAF loop via direct DOM writes.
 *
 * OFF-SCREEN HANDLING is the interesting part. A tracked object frequently sits
 * behind you or outside the frustum. Three behaviours, in order of preference:
 *
 *  - On screen        → bracket sits exactly on the object.
 *  - Off screen       → bracket clamps to the frame edge and an arrow points
 *                       toward where the object actually is.
 *  - Behind camera    → the projected point mirrors, so it must be flipped
 *                       manually or the arrow points exactly backwards.
 */

export const targetScreen = {
  x: 0,
  y: 0,
  /** True when the object projects inside the viewport. */
  onScreen: false,
  /** Angle in radians from screen centre toward the target, for the arrow. */
  angle: 0,
  /** Apparent radius in pixels, so the bracket can size itself to the object. */
  radius: 90,
  /** Whether anything is being tracked at all. */
  active: false,
}

const _v = new THREE.Vector3()
const _camDir = new THREE.Vector3()
const _toTarget = new THREE.Vector3()

/**
 * Screen-space data for EVERY destination, not just the locked one. Drives the
 * always-on site markers that make the map navigable from a distance.
 *
 * `weight` is the marker's opacity: it falls off with angular distance from the
 * centre of the screen, so only what you are roughly facing stays legible and
 * four permanent labels never turn into clutter.
 */
export const siteMarkers = Object.fromEntries(
  DESTINATIONS.map((d) => [
    d.id,
    { x: 0, y: 0, angle: 0, distance: 0, onScreen: false, active: false, weight: 0 },
  ]),
)

/** Project one world point; returns screen coords with behind-camera handling. */
function projectPoint(target, camera, size, out) {
  _v.set(target[0], target[1], target[2])

  camera.getWorldDirection(_camDir)
  _toTarget.copy(_v).sub(camera.position)
  const distance = _toTarget.length()
  const behind = _toTarget.dot(_camDir) < 0

  _v.project(camera)

  let sx = (_v.x * 0.5 + 0.5) * size.width
  let sy = (-_v.y * 0.5 + 0.5) * size.height

  if (behind) {
    sx = size.width - sx
    sy = size.height - sy
  }

  out.sx = sx
  out.sy = sy
  out.behind = behind
  out.distance = distance
  return out
}

const _proj = { sx: 0, sy: 0, behind: false, distance: 0 }

/** Structures have very different physical sizes; the bracket should reflect that. */
const TARGET_EXTENT = {
  works: 34,
  signal: 20,
  archives: 22,
  launch: 40,
}

export default function TargetProjector() {
  const { camera, size } = useThree()
  const smoothed = useRef({ x: 0, y: 0, r: 90, init: false })

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const st = getFlightState()

    /* ---------------------------------------------------------- */
    /* Every site, for the always-on markers                       */
    /* ---------------------------------------------------------- */

    const cx = size.width / 2
    const cy = size.height / 2
    const markerMargin = 74
    const flying = st.phase === 'flying'

    for (const d of DESTINATIONS) {
      const m = siteMarkers[d.id]
      if (!flying) {
        m.active = false
        continue
      }

      projectPoint(d.position, camera, size, _proj)

      let sx = _proj.sx
      let sy = _proj.sy
      const onScreen =
        !_proj.behind &&
        sx > markerMargin &&
        sx < size.width - markerMargin &&
        sy > markerMargin &&
        sy < size.height - markerMargin

      m.angle = Math.atan2(sy - cy, sx - cx)

      if (!onScreen) {
        const dx = sx - cx
        const dy = sy - cy
        const halfW = cx - markerMargin
        const halfH = cy - markerMargin
        const scale = Math.min(
          halfW / Math.max(Math.abs(dx), 1e-3),
          halfH / Math.max(Math.abs(dy), 1e-3),
        )
        sx = cx + dx * scale
        sy = cy + dy * scale
      }

      /* Weight by how far the site is from screen centre. A marker dead ahead
       * is fully legible; one clamped to the far edge is a faint hint. Without
       * this, four permanent labels ring the viewport and the HUD stops being
       * quiet. */
      const offCentre = Math.hypot(sx - cx, sy - cy) / Math.hypot(cx, cy)
      // Floor at 0.4: below that the edge markers were mathematically present
      // but visually absent, which defeats the point of having them. What is
      // ahead of you is emphatic; what is off to the side is a legible hint,
      // never invisible.
      let weight = THREE.MathUtils.clamp(1.05 - offCentre * 0.72, 0.4, 1)
      if (_proj.behind) weight *= 0.62

      m.x = sx
      m.y = sy
      m.onScreen = onScreen
      m.distance = _proj.distance
      m.weight = weight
      m.active = true
    }

    /* ---------------------------------------------------------- */
    /* The locked target, for the full bracket                     */
    /* ---------------------------------------------------------- */

    const id = st.lockedTarget
    const dest = id ? DESTINATION_BY_ID[id] : null

    if (!dest || st.phase !== 'flying') {
      targetScreen.active = false
      smoothed.current.init = false
      return
    }

    _v.set(dest.position[0], dest.position[1], dest.position[2])

    // Is the object in front of or behind the camera? project() mirrors points
    // behind the near plane, which would send the off-screen arrow the wrong way.
    camera.getWorldDirection(_camDir)
    _toTarget.copy(_v).sub(camera.position)
    const distance = _toTarget.length()
    const behind = _toTarget.dot(_camDir) < 0

    _v.project(camera)

    let sx = (_v.x * 0.5 + 0.5) * size.width
    let sy = (-_v.y * 0.5 + 0.5) * size.height

    if (behind) {
      // Mirror through screen centre so the direction reads correctly.
      sx = size.width - sx
      sy = size.height - sy
    }

    const margin = 108
    const onScreen =
      !behind &&
      sx > margin &&
      sx < size.width - margin &&
      sy > margin &&
      sy < size.height - margin

    // Angle from centre, used to point the off-screen arrow. Reuses the cx/cy
    // computed for the site-marker pass above.
    targetScreen.angle = Math.atan2(sy - cy, sx - cx)

    if (!onScreen) {
      // Clamp to the frame edge, keeping the direction from centre intact.
      const dx = sx - cx
      const dy = sy - cy
      const halfW = size.width / 2 - margin
      const halfH = size.height / 2 - margin
      const scale = Math.min(
        halfW / Math.max(Math.abs(dx), 1e-3),
        halfH / Math.max(Math.abs(dy), 1e-3),
      )
      sx = cx + dx * scale
      sy = cy + dy * scale
    }

    // Apparent radius from the object's physical extent — the bracket tightens
    // as you close in, which is what makes the lock feel like an instrument
    // rather than a static overlay.
    const extent = TARGET_EXTENT[dest.id] ?? 24
    const fovRad = (camera.fov * Math.PI) / 180
    const projected = (extent / Math.max(distance, 1)) * (size.height / (2 * Math.tan(fovRad / 2)))
    const radius = THREE.MathUtils.clamp(projected, 46, 260)

    // Smooth so the bracket glides instead of jittering with camera shake.
    const s = smoothed.current
    if (!s.init) {
      s.x = sx
      s.y = sy
      s.r = radius
      s.init = true
    } else {
      const k = Math.min(1, 14 * delta)
      s.x += (sx - s.x) * k
      s.y += (sy - s.y) * k
      s.r += (radius - s.r) * k
    }

    targetScreen.x = s.x
    targetScreen.y = s.y
    targetScreen.radius = s.r
    targetScreen.onScreen = onScreen
    targetScreen.active = true
  })

  return null
}
