import { forwardRef, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { flight, getFlightState } from '../core/flightStore'
import { loftHull, buildWedge } from './shipGeometry'
import { MATERIALS, PALETTE, PROPORTIONS } from './shipConfig'
import Wing from './Wing'
import Engine from './Engine'

/**
 * EXPLORER R-1 — scout class.
 *
 * Procedural throughout: no GLTF, no external assets. Every surface is either a
 * three.js primitive or a custom BufferGeometry built in shipGeometry.js.
 *
 * STRUCTURE (the groups the brief asked for):
 *   ship
 *   ├── hull              lofted fuselage + spine + belly mass
 *   ├── cockpit           raised canopy, dark glass, frame
 *   ├── leftWing / rightWing   mirrored, with winglets
 *   ├── leftEngine / rightEngine
 *   ├── details           intakes, greebles, panels, sensors
 *   └── navigationLights  red port, green starboard, white strobe
 *
 * DESIGN NOTES
 *
 * The hull is a LOFT, not a stack of boxes. Seven cross-sections taper from a
 * narrow wedge nose to a wider mid-body and back down at the tail, each section
 * narrower at the top than the bottom. That single taper parameter is what
 * produces the hard chine down each flank — the crease that makes a hull read
 * as folded metal plate rather than as an extruded tube.
 *
 * The bottom is deliberately heavier: a belly plate, ventral fins and the
 * engine mass all sit below the centreline, so the silhouette has weight and
 * does not float. Mass is read from the bottom edge.
 *
 * Copper appears on exactly four parts — engine heat bands, wing actuators,
 * nose sensor housing, dorsal vent. Rationing the accent is what separates a
 * designed object from a decorated one.
 *
 * Nose points -Z to match the flight engine's heading convention. The group
 * takes position and rotation from FlightEngine unchanged; no control,
 * movement or camera code was modified to accommodate it.
 */

const Vessel = forwardRef(function Vessel(_, ref) {
  const engineRefs = [useRef(), useRef()]
  const strobeRef = useRef()
  const canopyRef = useRef()
  const headLightRef = useRef()
  const lampTargetRef = useRef()

  const P = PROPORTIONS

  const hullGeo = useMemo(() => loftHull(P.hull.sections), [P.hull.sections])

  // Belly plate — the visual mass under the centreline.
  const bellyGeo = useMemo(
    () => buildWedge({ width: 1.7, height: 0.34, depth: 3.4, frontScaleX: 0.36, frontScaleY: 0.5 }),
    [],
  )

  // Dorsal spine housing behind the canopy.
  const spineGeo = useMemo(
    () => buildWedge({ width: 0.62, height: 0.36, depth: 2.4, frontScaleX: 0.7, frontScaleY: 0.55 }),
    [],
  )

  // Nose sensor block.
  const sensorGeo = useMemo(
    () => buildWedge({ width: 0.44, height: 0.2, depth: 0.7, frontScaleX: 0.4, frontScaleY: 0.5 }),
    [],
  )

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const st = getFlightState()
    const t = state.clock.elapsedTime

    const output = Math.max(0, flight.throttle) * (1 + flight.boost * 2.2)

    // One frame callback drives both engines.
    engineRefs.forEach((r) => r.current?.update(output, t, delta, st.reducedMode))

    // Anti-collision strobe: irregular double-blink, as on real aircraft.
    if (strobeRef.current) {
      const cyc = t % 1.6
      strobeRef.current.material.opacity = cyc < 0.06 || (cyc > 0.18 && cyc < 0.24) ? 1 : 0
    }

    // Canopy interior glow breathes very slightly — the ship is crewed.
    if (canopyRef.current) {
      canopyRef.current.material.emissiveIntensity = 0.08 + Math.sin(t * 0.9) * 0.025
    }

    if (headLightRef.current) {
      headLightRef.current.intensity = st.reducedMode ? 0 : 2.4
      if (lampTargetRef.current && headLightRef.current.target !== lampTargetRef.current) {
        headLightRef.current.target = lampTargetRef.current
      }
    }
  })

  return (
    <group ref={ref}>
      <group scale={P.scale} name="ship">
        {/* ================= HULL ================= */}
        <group name="hull">
          <mesh geometry={hullGeo}>
            <meshStandardMaterial {...MATERIALS.hull} flatShading />
          </mesh>

          {/* Belly mass — sits low, gives the silhouette weight. */}
          <mesh geometry={bellyGeo} position={[0, -0.52, 0.5]}>
            <meshStandardMaterial {...MATERIALS.hullDark} flatShading />
          </mesh>

          {/* Ventral strakes: two shallow fins under the belly. */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.52, -0.72, 1.5]} rotation={[0, 0, s * 0.2]}>
              <boxGeometry args={[0.08, 0.34, 1.3]} />
              <meshStandardMaterial {...MATERIALS.panel} flatShading />
            </mesh>
          ))}

          {/* Dorsal spine housing */}
          <mesh geometry={spineGeo} position={[0, 0.5, 1.1]}>
            <meshStandardMaterial {...MATERIALS.hullDark} flatShading />
          </mesh>

          {/* Upper hull plates — brighter metal, breaking the top surface. */}
          {[
            { z: -1.6, w: 1.1, d: 1.1 },
            { z: 0.2, w: 1.24, d: 1.3 },
          ].map((pl) => (
            <mesh key={pl.z} position={[0, 0.42, pl.z]}>
              <boxGeometry args={[pl.w, 0.05, pl.d]} />
              <meshStandardMaterial {...MATERIALS.panel} flatShading />
            </mesh>
          ))}

          {/* Thermal blanket sections along the flanks — the only fully matte
              surface on the ship, and the strongest material contrast. */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.98, -0.06, -0.4]} rotation={[0, 0, s * 0.12]}>
              <boxGeometry args={[0.05, 0.42, 1.9]} />
              <meshStandardMaterial {...MATERIALS.blanket} />
            </mesh>
          ))}

          {/* Panel seams across the spine. */}
          {[-2.2, -1.2, 0.0, 1.2].map((z) => (
            <mesh key={z} position={[0, 0.3, z]}>
              <boxGeometry args={[1.3, 0.03, 0.05]} />
              <meshStandardMaterial color={0x0a0c10} metalness={0.3} roughness={0.85} />
            </mesh>
          ))}
        </group>

        {/* ================= COCKPIT ================= */}
        <group name="cockpit" position={[0, 0.42, -1.55]}>
          {/* Raised base the canopy sits on. */}
          <mesh position={[0, -0.1, 0.1]}>
            <boxGeometry args={[0.86, 0.22, 1.5]} />
            <meshStandardMaterial {...MATERIALS.hullDark} flatShading />
          </mesh>

          {/* Canopy glass.
           *
           * A full hemisphere read as an orange bubble stuck on the spine — a
           * fishbowl, not a cockpit. A LOW, ELONGATED section sunk into the
           * fuselage is what a fast aircraft actually has, and the emissive is
           * pulled right down so the glass stays near-black with only a hint of
           * instrument light behind it. */}
          <mesh
            ref={canopyRef}
            position={[0, 0.04, -0.12]}
            rotation={[-0.18, 0, 0]}
            scale={[0.78, 0.42, 1.5]}
          >
            <sphereGeometry args={[0.46, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshPhysicalMaterial
              {...MATERIALS.canopy}
              emissive={0xff9d5c}
              emissiveIntensity={0.08}
            />
          </mesh>

          {/* Canopy frame — a hard rim so the glass reads as a window set into
              the hull rather than as a dome resting on it. */}
          <mesh position={[0, 0.03, -0.12]} rotation={[Math.PI / 2, 0, 0]} scale={[0.8, 1.52, 1]}>
            <torusGeometry args={[0.45, 0.026, 6, 24]} />
            <meshStandardMaterial {...MATERIALS.mechanism} />
          </mesh>

          {/* Canopy centre rib. */}
          <mesh position={[0, 0.17, -0.12]} rotation={[-0.18, 0, 0]}>
            <boxGeometry args={[0.04, 0.04, 1.28]} />
            <meshStandardMaterial {...MATERIALS.panel} />
          </mesh>
        </group>

        {/* ================= WINGS ================= */}
        <group name="rightWing">
          <Wing side={1} />
        </group>
        <group name="leftWing">
          <Wing side={-1} />
        </group>

        {/* ================= ENGINES ================= */}
        <group
          name="rightEngine"
          position={[P.engine.x, P.engine.y, P.engine.z]}
        >
          <Engine ref={engineRefs[0]} side={1} />
        </group>
        <group
          name="leftEngine"
          position={[-P.engine.x, P.engine.y, P.engine.z]}
        >
          <Engine ref={engineRefs[1]} side={-1} />
        </group>

        {/* Engine pylons tying the nacelles to the hull. */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.55, -0.1, P.engine.z - 0.3]} rotation={[0, 0, s * 0.4]}>
            <boxGeometry args={[0.6, 0.16, 0.9]} />
            <meshStandardMaterial {...MATERIALS.panel} flatShading />
          </mesh>
        ))}

        {/* ================= DETAILS ================= */}
        <group name="details">
          {/* Nose sensor block — copper accent #3. */}
          <mesh geometry={sensorGeo} position={[0, -0.12, -3.55]}>
            <meshStandardMaterial {...MATERIALS.copperDark} flatShading />
          </mesh>

          {/* Sensor aperture */}
          <mesh position={[0, -0.12, -3.9]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.08, 10]} />
            <meshStandardMaterial color={0x05070a} metalness={0.4} roughness={0.5} />
          </mesh>

          {/* Dorsal vent — copper accent #4, the last one. */}
          <mesh position={[0, 0.66, 1.5]}>
            <boxGeometry args={[0.4, 0.05, 0.5]} />
            <meshStandardMaterial {...MATERIALS.copper} />
          </mesh>

          {/* Intake scoops either side of the spine. */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.46, 0.34, 0.5]} rotation={[0.12, 0, 0]}>
              <boxGeometry args={[0.26, 0.16, 0.7]} />
              <meshStandardMaterial color={0x0b0d11} metalness={0.5} roughness={0.7} />
            </mesh>
          ))}

          {/* RCS thruster clusters — attitude control has to come from somewhere. */}
          {[
            [0.9, 0.0, -2.2],
            [-0.9, 0.0, -2.2],
            [0.75, 0.0, 2.0],
            [-0.75, 0.0, 2.0],
          ].map((p, i) => (
            <mesh key={i} position={p} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.07, 0.09, 0.12, 6]} />
              <meshStandardMaterial color={0x0f1216} metalness={0.55} roughness={0.65} />
            </mesh>
          ))}

          {/* Antenna mast */}
          <mesh position={[0, 0.74, 0.2]}>
            <cylinderGeometry args={[0.02, 0.03, 0.5, 5]} />
            <meshStandardMaterial {...MATERIALS.mechanism} />
          </mesh>

          {/* Greeble block behind the canopy. */}
          <mesh position={[0.24, 0.5, -0.5]}>
            <boxGeometry args={[0.18, 0.1, 0.3]} />
            <meshStandardMaterial {...MATERIALS.mechanism} />
          </mesh>
        </group>

        {/* ================= NAVIGATION LIGHTS ================= */}
        <group name="navigationLights">
          {/* Red to port (-X), green to starboard (+X). Aviation convention —
              a detail pilots register instantly. */}
          {[
            { side: -1, color: PALETTE.navRed },
            { side: 1, color: PALETTE.navGreen },
          ].map(({ side, color }) => {
            const w = P.wing
            const tipZ = w.z - w.rootChord / 2 + w.sweep + w.tipChord / 2
            const x = side * (w.x + w.span + 0.06)
            const y = w.y + w.span * w.dihedral
            return (
              <group key={side}>
                <mesh position={[x, y, tipZ + 0.3]}>
                  <sphereGeometry args={[0.075, 8, 8]} />
                  <meshBasicMaterial color={color} toneMapped={false} />
                </mesh>
                <pointLight
                  position={[x, y, tipZ + 0.3]}
                  color={color}
                  intensity={0.6}
                  distance={7}
                />
              </group>
            )
          })}

          {/* White anti-collision strobe on the dorsal spine. */}
          <mesh ref={strobeRef} position={[0, 0.78, 1.2]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color={0xffffff} transparent opacity={0} toneMapped={false} />
          </mesh>
        </group>

        {/* Forward work lamp — reveals the monolith at ARCHIVES. */}
        <object3D ref={lampTargetRef} position={[0, 0, -90]} />
        <spotLight
          ref={headLightRef}
          position={[0, 0, -3.2]}
          color={0xdce8f2}
          intensity={2.4}
          angle={0.5}
          penumbra={0.75}
          distance={340}
          decay={1.6}
        />
      </group>
    </group>
  )
})

export default Vessel
