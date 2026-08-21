import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * LIGHTING — one sun, one rule.
 *
 * THE PROBLEM THIS FIXES: every site used to carry its own directional lights,
 * aimed wherever looked good in isolation. THE WORKS lit from (-70, 26, -30),
 * SIGNAL from (40, 30, 20), LAUNCH COMPLEX from (-30, 40, 60) — while the
 * visible sun sat at (-1500, 600, -1150). Four different imaginary suns.
 *
 * Nothing destroys the illusion of a single place faster. It is the reason the
 * world read as a set of props assembled in a void rather than as one system:
 * the eye reads shadow direction long before it reads geometry, and when every
 * object disagrees about where the light comes from, none of them look real.
 *
 * THE RULE NOW: there is exactly one key light, and it comes from the sun you
 * can see. Sites may add FILL and PRACTICALS (their own working lamps, beacons,
 * engine glow) but never another key.
 *
 * Three global layers:
 *
 *   KEY     the sun. Hard, cold, directional. Defines every terminator in the
 *           scene, so shadow direction is consistent everywhere.
 *   FILL    a very dim opposing light, so unlit sides read as dark metal rather
 *           than as holes cut in the frame. Deliberately weak: lifting this to
 *           "fix" darkness is what flattens a scene to grey soup.
 *   BOUNCE  a faint hemisphere term standing in for light scattered off the
 *           dust bands. It costs one light and stops silhouettes from going
 *           absolutely flat at grazing angles.
 */

/** The one true sun. Everything that needs a light direction imports this. */
export const SUN_POSITION = new THREE.Vector3(-1500, 600, -1150)

/** Normalised direction FROM the sun TO the origin — i.e. the way light travels. */
export const SUN_DIRECTION = SUN_POSITION.clone().normalize()

/**
 * Colour temperature is doing real work here.
 *
 * KEY is slightly warm (a G-type star), FILL is cold blue (scattered starlight
 * and reflected dust). Warm key against cool fill is the oldest trick in
 * lighting and it is what gives metal its sense of form — a scene lit with one
 * neutral colour reads as a render, not as a photograph.
 */
export const LIGHT = {
  key: 0xfff2e0,
  fill: 0x5f7a92,
  bounce: 0x27313d,
}

export default function Lighting({ reduced = false }) {
  // The key light needs to reach every site, so it is positioned far out along
  // the sun vector rather than at the sun mesh itself.
  const keyPos = useMemo(() => SUN_POSITION.clone().normalize().multiplyScalar(2200), [])
  const fillPos = useMemo(() => keyPos.clone().multiplyScalar(-0.55), [keyPos])

  return (
    <>
      {/* KEY — the sun. Everything's terminator is defined by this vector.
          Raised alongside the 3x photosphere: a visibly larger star that lit
          the scene no more brightly would read as a painted backdrop rather
          than as the source of the light. */}
      <directionalLight
        position={keyPos}
        intensity={3.9}
        color={LIGHT.key}
        castShadow={false}
      />

      {/* FILL — opposing, cold, weak. Keeps dark sides readable as material
          without ever competing with the key. */}
      {/* Enough to keep the unlit hemisphere reading as rock rather than as a
          hole cut in the frame, and no more. The dark side should be legible,
          not lit — which is exactly how a real spacecraft photograph looks:
          the shadow side is not black, it is very dark blue from starlight and
          planetshine. */}
      <directionalLight position={fillPos} intensity={0.9} color={LIGHT.fill} />

      {/* BOUNCE — stands in for light scattered off the dust bands.
          Now that SpaceEnvironment supplies real image-based lighting, this can
          drop right back: the env map already provides directional ambient, and
          stacking a hemisphere term on top double-counts it and flattens the
          modelling that the reflections just restored. */}
      <hemisphereLight args={[LIGHT.fill, LIGHT.bounce, reduced ? 0.12 : 0.06]} />

      {/* No ambientLight. It existed to stop pure-black clipping back when
          nothing else filled the shadows; the environment map does that job
          correctly now, and a flat ambient term would only wash it out. */}
    </>
  )
}
