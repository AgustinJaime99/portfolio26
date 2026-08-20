import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HEX } from '../data/artDirection'

/**
 * SURVEY BEAM — what happens to the planet when a project is selected.
 *
 * Rejected: recolouring or re-texturing the planet per project. A geological
 * body that changes material because you clicked a UI element is decoration
 * with no fiction behind it, and it reads as an effect for its own sake.
 *
 * Built instead: the selected satellite switches on its survey floodlight and
 * lights a patch of terrain below. It is physically honest — that is what an
 * imaging satellite does — and it is stronger visually, because a moving pool
 * of light raking across displaced terrain shows off the surface relief in a
 * way a flat colour change never could.
 *
 * The beam is two parts:
 *   1. A real SpotLight, so the terrain shading is genuine and the displacement
 *      catches it.
 *   2. A translucent cone for the volumetric shaft. Cheap, and it is what makes
 *      the light legible in vacuum where there is nothing to scatter off.
 */

export default function SurveyBeam({ active, length = 40, radius = 9 }) {
  const spotRef = useRef()
  const targetRef = useRef()
  const coneRef = useRef()
  const strength = useRef(0)

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)

    // Ease the beam on and off. An instant switch reads as a bug, not a system.
    const want = active ? 1 : 0
    strength.current += (want - strength.current) * Math.min(1, 3.4 * delta)
    const s = strength.current

    if (spotRef.current) {
      spotRef.current.intensity = s * 260
      // Bind the spotlight target once it exists; a SpotLight aims at its
      // .target object, which must be part of the scene graph.
      if (targetRef.current && spotRef.current.target !== targetRef.current) {
        spotRef.current.target = targetRef.current
      }
    }

    if (coneRef.current) {
      // Very low opacity: a solid cone looks like plastic. This should read as
      // dust catching light, not as a shape.
      const flicker = 0.94 + Math.sin(state.clock.elapsedTime * 2.3) * 0.06
      // Very faint. At 0.085 the cone read as a solid teal wedge sitting on the
      // planet; the shaft should only be implied.
      coneRef.current.material.opacity = s * 0.03 * flicker
      coneRef.current.visible = s > 0.01
    }
  })

  return (
    <group>
      {/* Aim straight down toward the planet centre. The satellite group is
          already oriented so -Y points planetward. */}
      <object3D ref={targetRef} position={[0, -length, 0]} />

      <spotLight
        ref={spotRef}
        position={[0, -0.6, 0]}
        color={0xdCEBF5}
        intensity={0}
        angle={0.34}
        penumbra={0.6}
        distance={length * 1.6}
        decay={1.4}
      />

      {/* Volumetric shaft. Open-ended cone, no depth write, additive so it
          never darkens what is behind it. */}
      <mesh ref={coneRef} position={[0, -length / 2, 0]} visible={false}>
        <coneGeometry args={[radius, length, 24, 1, true]} />
        <meshBasicMaterial
          color={HEX.ion}
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
