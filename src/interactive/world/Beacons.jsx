import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { HEX } from '../data/artDirection'
import { DESTINATIONS } from '../data/spaceMap'
import { flight, getFlightState } from '../core/flightStore'

/**
 * BEACONS — long-range site visibility.
 *
 * The problem this solves: at 400+ units every site is a handful of dark metal
 * pixels against a dark void. Without a marker there is no reason to fly
 * anywhere, and the whole navigation premise collapses into "read the HUD".
 *
 * Three layers, each active at a different range, so a site is legible from
 * anywhere without ever becoming a bloom-blown blob up close:
 *
 *   1. STAR CORE   — a tight point of light, apparent size held constant with
 *                    distance. Visible from across the map. This is what says
 *                    "something is there".
 *   2. IDENT PULSE — a slow expanding ring on a per-site rhythm. Motion is what
 *                    separates a site from the static starfield; a still point
 *                    reads as one more star.
 *   3. RANGE RING  — a thin circle that only appears in the mid band, sized to
 *                    the structure. It frames the site as you close in and
 *                    hands off to the actual geometry.
 *
 * All three fade out completely before the structure is close enough to read on
 * its own, so nothing competes with the hardware once you arrive.
 */

const _v = new THREE.Vector3()

/** Ranges are expressed as multiples of each site's detectRadius. */
const CORE_FADE_START = 0.9 // core begins fading in below this multiple
const RING_BAND = [1.0, 3.2] // range ring visible between these multiples

function Beacon({ dest }) {
  const coreRef = useRef()
  const haloRef = useRef()
  const pulseRefs = [useRef(), useRef()]
  const ringRef = useRef()

  const color = useMemo(
    () => new THREE.Color(HEX[dest.beaconColor] ?? HEX.ion),
    [dest.beaconColor],
  )

  // Each site pulses on its own period, so a distant cluster never blinks in
  // unison — synchronised markers read as UI, not as separate places.
  const period = useMemo(
    () => 3.1 + (Math.abs(dest.position[0]) % 7) * 0.19,
    [dest.position],
  )

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const t = state.clock.elapsedTime
    const st = getFlightState()

    const dx = dest.position[0] - flight.position.x
    const dy = dest.position[1] - flight.position.y
    const dz = dest.position[2] - flight.position.z
    const dist = Math.hypot(dx, dy, dz)

    const R = dest.detectRadius
    const near = dist / R // 1.0 = at the detect boundary

    // Fully hidden once docked — the structure speaks for itself by then.
    const docked = st.phase === 'docked' || st.phase === 'capturing'

    /* Core: strong far away, off before arrival. Ramps down across the detect
     * boundary rather than switching, so there is no visible pop. */
    const coreFade = docked
      ? 0
      : THREE.MathUtils.clamp((near - CORE_FADE_START) / 0.7, 0, 1)

    if (coreRef.current) {
      const m = coreRef.current.material
      // A slow breath keeps it alive without reading as a blink.
      const breath = 0.78 + Math.sin(t * 1.1 + dest.position[2]) * 0.22
      const target = coreFade * breath
      m.opacity += (target - m.opacity) * Math.min(1, 5 * delta)
      // Apparent size held constant: scale with distance so the marker stays a
      // readable point whether it is 200 or 900 units away.
      coreRef.current.scale.setScalar(THREE.MathUtils.clamp(dist * 0.011, 0.8, 9))
    }

    if (haloRef.current) {
      const m = haloRef.current.material
      m.opacity += (coreFade * 0.3 - m.opacity) * Math.min(1, 5 * delta)
      haloRef.current.scale.setScalar(THREE.MathUtils.clamp(dist * 0.03, 2, 26))
    }

    /* Ident pulse: expanding rings, always facing the viewer. This is the layer
     * that makes a site findable — the eye locks onto periodic motion in a
     * static field far more readily than onto a brighter dot. */
    pulseRefs.forEach((r, i) => {
      if (!r.current) return
      const phase = ((t + (i * period) / pulseRefs.length) % period) / period
      const scale = THREE.MathUtils.clamp(dist * 0.014, 1, 11) * (0.6 + phase * 3.4)
      r.current.scale.setScalar(scale)
      const fade = Math.min(1, phase * 5) * (1 - phase)
      r.current.material.opacity = fade * 0.42 * coreFade
    })

    /* Range ring: a framing device for the mid band only. */
    if (ringRef.current) {
      const band = THREE.MathUtils.clamp(
        Math.min(
          (near - RING_BAND[0]) / 0.5,
          (RING_BAND[1] - near) / 1.0,
        ),
        0,
        1,
      )
      const m = ringRef.current.material
      const target = docked ? 0 : band * 0.3
      m.opacity += (target - m.opacity) * Math.min(1, 4 * delta)
      // Sized to the structure, not to distance: it should read as a boundary
      // around the site, so it grows on screen as you approach.
      ringRef.current.scale.setScalar(1)
    }
  })

  return (
    <group position={dest.position}>
      {/* Hot core */}
      <sprite ref={coreRef}>
        <spriteMaterial
          color={color}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>

      {/* Soft halo. Capped so bloom cannot turn it into a screen-filling square. */}
      <sprite ref={haloRef}>
        <spriteMaterial
          color={color}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>

      {/* Ident pulses — sprites, so they always face the camera. */}
      {pulseRefs.map((r, i) => (
        <sprite key={i} ref={r}>
          <spriteMaterial
            color={color}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}

      {/* Range ring, sized to the site's capture boundary. */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[dest.captureRadius * 0.97, dest.captureRadius, 72]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

export default function Beacons() {
  return (
    <>
      {DESTINATIONS.map((dest) => (
        <Beacon key={dest.id} dest={dest} />
      ))}
    </>
  )
}
