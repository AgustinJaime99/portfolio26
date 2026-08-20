import { useMemo } from 'react'
import { buildWing, buildWedge } from './shipGeometry'
import { MATERIALS, PALETTE, PROPORTIONS } from './shipConfig'

/**
 * WING — built once for the right side, mirrored for the left.
 *
 * Mirroring rather than authoring both sides is not just less code: it
 * guarantees the ship is actually symmetrical. Hand-placed pairs drift, and a
 * spacecraft with subtly mismatched wings reads as wrong long before anyone
 * works out why.
 *
 * `side` is +1 (starboard) or -1 (port). Everything is expressed for +1 and
 * negated through the group scale.
 */
export default function Wing({ side = 1 }) {
  const w = PROPORTIONS.wing
  const wl = PROPORTIONS.winglet

  const wingGeo = useMemo(
    () =>
      buildWing({
        rootChord: w.rootChord,
        tipChord: w.tipChord,
        span: w.span,
        sweep: w.sweep,
        thickness: w.thickness,
        dihedral: w.dihedral,
      }),
    [w],
  )

  // Hardpoint fairing where the wing meets the hull.
  const fairingGeo = useMemo(
    () => buildWedge({ width: 0.4, height: 0.3, depth: 1.5, frontScaleX: 0.5, frontScaleY: 0.6 }),
    [],
  )

  const tipZ = -w.rootChord / 2 + w.sweep + w.tipChord / 2
  const tipY = w.span * w.dihedral

  return (
    <group
      position={[side * w.x, w.y, w.z]}
      rotation={[0, 0, side * w.roll]}
      scale={[side, 1, 1]}
    >
      {/* Main planform */}
      <mesh geometry={wingGeo}>
        <meshStandardMaterial {...MATERIALS.hull} flatShading />
      </mesh>

      {/* Upper surface panel — a second, slightly brighter plate that catches
          light differently and breaks the wing's flat top. */}
      <mesh
        geometry={wingGeo}
        scale={[0.72, 0.55, 0.78]}
        position={[0.16, w.thickness * 0.42, -0.1]}
      >
        <meshStandardMaterial {...MATERIALS.panel} flatShading />
      </mesh>

      {/* Root fairing */}
      <mesh geometry={fairingGeo} position={[0.06, 0.02, 0]}>
        <meshStandardMaterial {...MATERIALS.hullDark} flatShading />
      </mesh>

      {/* Leading-edge strake — a hard bright line along the front of the wing,
          which is what makes the sweep readable in silhouette. */}
      <mesh
        position={[w.span * 0.46, w.thickness * 0.18, -w.rootChord / 2 + w.sweep * 0.46 - 0.06]}
        rotation={[0, -Math.atan2(w.sweep, w.span), 0]}
      >
        <boxGeometry args={[w.span * 0.94, 0.05, 0.1]} />
        <meshStandardMaterial {...MATERIALS.mechanism} />
      </mesh>

      {/* Copper actuator housing — accent #2 of four. */}
      <mesh position={[w.span * 0.34, -w.thickness * 0.5, w.rootChord * 0.24]}>
        <boxGeometry args={[0.3, 0.1, 0.34]} />
        <meshStandardMaterial {...MATERIALS.copperDark} />
      </mesh>

      {/* Winglet: canted up and outward at the tip. */}
      <group position={[w.span, tipY, tipZ]} rotation={[0, 0, -wl.cant]}>
        <mesh position={[0, wl.height / 2, 0]}>
          <boxGeometry args={[wl.thickness, wl.height, wl.chord]} />
          <meshStandardMaterial {...MATERIALS.hull} flatShading />
        </mesh>
        {/* Tip cap */}
        <mesh position={[0, wl.height, 0]}>
          <boxGeometry args={[wl.thickness * 1.4, 0.06, wl.chord * 0.8]} />
          <meshStandardMaterial {...MATERIALS.panel} />
        </mesh>
      </group>

      {/* Navigation light housing at the wingtip. The lamp itself is added by
          the parent, which owns all nav lights so their colours stay paired. */}
      <mesh position={[w.span + 0.06, tipY, tipZ + wl.chord * 0.5]}>
        <boxGeometry args={[0.14, 0.1, 0.2]} />
        <meshStandardMaterial {...MATERIALS.hullDark} />
      </mesh>
    </group>
  )
}
