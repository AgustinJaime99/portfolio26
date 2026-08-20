import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HEX } from '../data/artDirection'
import { SATELLITES, DESTINATION_BY_ID } from '../data/spaceMap'
import { setFlightState, useFlightState } from '../core/flightStore'
import { satelliteFocus } from '../core/CaptureSequence'
import { createBasaltMaterial, createRimMaterial } from './planetMaterial'
import MediaPanels from './MediaPanels'
import SurveyBeam from './SurveyBeam'

/**
 * THE WORKS — projects.
 *
 * A single dark basalt body with BUILT STRUCTURES in orbit. You did not
 * discover planets; you built things. An artificial satellite is infrastructure,
 * a planet is an accident of geology.
 *
 * Quality pass: the planet is now displaced terrain with a real fresnel limb
 * rather than a lit sphere, satellites carry greebles and working lights, and a
 * debris belt gives the orbital plane something to catch the light.
 */

const DEST = DESTINATION_BY_ID.works
const PLANET_RADIUS = 22

/** Scratch objects for the survey-beam aiming maths. Never allocate per frame. */
const _planetDir = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _q2 = new THREE.Quaternion()
const _down = new THREE.Vector3(0, -1, 0)

/* ------------------------------------------------------------------ */
/* Satellite archetypes                                                */
/* ------------------------------------------------------------------ */

/** Solar panel with visible cell subdivision — reads as engineered up close. */
function SolarWing({ side, length = 3.6 }) {
  return (
    <group position={[side * (length / 2 + 0.7), 0, 0]}>
      <mesh>
        <boxGeometry args={[length, 0.045, 1.5]} />
        <meshStandardMaterial
          color={0x16202e}
          metalness={0.35}
          roughness={0.28}
          flatShading
        />
      </mesh>
      {/* Cell dividers */}
      {[-1, 0, 1].map((i) => (
        <mesh key={i} position={[i * (length / 3.2), 0.03, 0]}>
          <boxGeometry args={[0.035, 0.02, 1.5]} />
          <meshStandardMaterial color={HEX.steel} metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
      {/* Support spar */}
      <mesh position={[-side * (length / 2), 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1.4, 6]} />
        <meshStandardMaterial color={HEX.steel} metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  )
}

/** Small surface detail so hulls are never bare boxes at close range. */
function Greebles({ count = 6, spread = 0.6, seed = 1 }) {
  const parts = useMemo(() => {
    let s = seed * 7919
    const rand = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      return s / 0x7fffffff
    }
    return Array.from({ length: count }, () => ({
      pos: [(rand() - 0.5) * spread * 2, (rand() - 0.5) * spread, (rand() - 0.5) * spread * 2],
      scale: [0.08 + rand() * 0.16, 0.05 + rand() * 0.1, 0.08 + rand() * 0.2],
    }))
  }, [count, spread, seed])

  return (
    <>
      {parts.map((p, i) => (
        <mesh key={i} position={p.pos} scale={p.scale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={HEX.steel} metalness={0.85} roughness={0.32} flatShading />
        </mesh>
      ))}
    </>
  )
}

function SatelliteBody({ archetype, seed }) {
  if (archetype === 'array') {
    return (
      <group>
        <mesh castShadow>
          <boxGeometry args={[1.1, 1.05, 2.2]} />
          <meshStandardMaterial color={0x1d2128} metalness={0.78} roughness={0.34} flatShading />
        </mesh>
        <Greebles seed={seed} spread={0.75} />
        <SolarWing side={-1} />
        <SolarWing side={1} />
        {/* Dish */}
        <mesh position={[0, 0.75, -0.5]} rotation={[-0.5, 0, 0]}>
          <sphereGeometry args={[0.52, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.4]} />
          <meshStandardMaterial
            color={0x2b303a}
            metalness={0.6}
            roughness={0.45}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    )
  }

  if (archetype === 'panel') {
    return (
      <group>
        <mesh castShadow>
          <cylinderGeometry args={[0.5, 0.5, 2.6, 10]} />
          <meshStandardMaterial color={0x1d2128} metalness={0.8} roughness={0.32} flatShading />
        </mesh>
        {/* Ribs give the cylinder scale */}
        {[-0.8, 0, 0.8].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <cylinderGeometry args={[0.58, 0.58, 0.1, 10]} />
            <meshStandardMaterial color={HEX.steel} metalness={0.9} roughness={0.24} />
          </mesh>
        ))}
        <mesh position={[0, 1.75, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.3, 0.07, 6, 24]} />
          <meshStandardMaterial color={HEX.steel} metalness={0.88} roughness={0.26} />
        </mesh>
        <Greebles seed={seed} spread={0.5} count={5} />
      </group>
    )
  }

  // module
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[1.6, 1.2, 1.2]} />
        <meshStandardMaterial color={0x1d2128} metalness={0.76} roughness={0.36} flatShading />
      </mesh>
      <mesh position={[0, 0, 1.15]}>
        <cylinderGeometry args={[0.42, 0.42, 1.1, 8]} />
        <meshStandardMaterial color={HEX.steel} metalness={0.85} roughness={0.28} flatShading />
      </mesh>
      {/* Docking collar — reads as a port, implies use */}
      <mesh position={[0, 0, 1.72]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.36, 0.07, 6, 16]} />
        <meshStandardMaterial color={HEX.steel} metalness={0.9} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.9, 0.5, 0.9]} />
        <meshStandardMaterial color={0x252a32} metalness={0.8} roughness={0.34} flatShading />
      </mesh>
      <SolarWing side={-1} length={2.6} />
      <SolarWing side={1} length={2.6} />
      <Greebles seed={seed} spread={0.7} />
    </group>
  )
}

function Satellite({ sat, docked, index }) {
  const groupRef = useRef()
  const beaconRef = useRef()
  const lightRef = useRef()
  const beamRigRef = useRef()
  /** Integrated orbital phase, so the satellite can ease to a stop. */
  const orbitT = useRef(0)
  /** 0 = orbiting freely, 1 = parked for reading. */
  const activeBlend = useRef(0)
  const activeSatellite = useFlightState((s) => s.activeSatellite)
  const isActive = activeSatellite === sat.id

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const g = groupRef.current
    if (!g) return

    /* Orbital phase.
     *
     * A selected satellite parks: its own orbital motion is what swings the
     * deployed screenshots through frame, and a moving target cannot be read.
     * Integrating our own phase (rather than reading clock.elapsedTime) is what
     * lets the motion ease to a stop instead of snapping. */
    activeBlend.current += ((isActive ? 1 : 0) - activeBlend.current) * Math.min(1, 2.2 * delta)
    orbitT.current += delta * THREE.MathUtils.lerp(sat.speed, 0, activeBlend.current)

    const t = orbitT.current + sat.phase
    const x = Math.cos(t) * sat.radius
    const z = Math.sin(t) * sat.radius
    const y = Math.sin(t) * sat.radius * Math.sin(sat.inclination)

    g.position.set(x, y, z)
    g.rotation.y = -t + Math.PI / 2
    g.rotation.z = sat.inclination * 0.5
    // Slow tumble on the minor axis — nothing in orbit is perfectly stable.
    // Damped to zero when parked, or the screens rock while you try to read.
    const tumble = Math.sin(state.clock.elapsedTime * 0.09 + sat.phase) * 0.08
    g.rotation.x = tumble * (1 - activeBlend.current)

    // Publish world position so the camera can frame this satellite's array.
    // Local coords are relative to the destination group, so add its origin.
    if (isActive) {
      satelliteFocus.active = true
      satelliteFocus.position.x = DEST.position[0] + x
      satelliteFocus.position.y = DEST.position[1] + y
      satelliteFocus.position.z = DEST.position[2] + z
    }

    if (beaconRef.current) {
      const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 1.3 + sat.phase) * 0.32
      const target = isActive ? 1 : pulse * 0.55
      beaconRef.current.material.opacity +=
        (target - beaconRef.current.material.opacity) * Math.min(1, 5 * delta)
    }

    if (lightRef.current) {
      const target = isActive ? 5.5 : 1.1
      lightRef.current.intensity +=
        (target - lightRef.current.intensity) * Math.min(1, 4 * delta)
    }

    // Keep the survey beam pointed at the planet. The satellite group is
    // rotated by its orbit and tumble, so the beam rig has to undo both — its
    // local -Y must line up with the direction back to the planet centre.
    if (beamRigRef.current && isActive) {
      const rig = beamRigRef.current
      // Direction from satellite to planet centre, in the satellite's local
      // space: planet is at the parent group's origin.
      _planetDir.set(-g.position.x, -g.position.y, -g.position.z).normalize()
      // Undo the parent's rotation so the direction is expressed locally.
      _q.setFromEuler(g.rotation).invert()
      _planetDir.applyQuaternion(_q)
      // Build a rotation taking local -Y onto that direction.
      _q2.setFromUnitVectors(_down, _planetDir)
      rig.quaternion.slerp(_q2, Math.min(1, 5 * delta))
    }
  })

  return (
    <group ref={groupRef} scale={sat.scale}>
      <group
        onClick={(e) => {
          if (!docked) return
          e.stopPropagation()
          // Changing satellite must retire any open screenshot: the viewer is
          // scoped to a project, and leaving it open would show the previous
          // project's frames under the new project's name.
          setFlightState({
            activeSatellite: isActive ? null : sat.id,
            focusedPanel: null,
          })
        }}
        onPointerOver={(e) => {
          if (!docked) return
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        <SatelliteBody archetype={sat.archetype} seed={index + 1} />
      </group>

      {/* Status beacon. Amber only when selected — the 2% rule. */}
      <mesh ref={beaconRef} position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.13, 8, 8]} />
        <meshBasicMaterial
          color={isActive ? HEX.amber : HEX.ion}
          transparent
          opacity={0.5}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, 1.4, 0]}
        color={isActive ? HEX.amber : HEX.ion}
        intensity={1.1}
        distance={22}
      />

      {/* Survey floodlight: the selected satellite lights the terrain below it.
          Un-scaled by the satellite's own scale so small satellites do not cast
          comically small pools of light, and counter-rotated so the beam keeps
          pointing at the planet regardless of where the satellite is in its
          orbit or how it is tumbling. */}
      <group ref={beamRigRef} scale={1 / sat.scale}>
        <SurveyBeam active={isActive} length={sat.radius * 0.82} radius={9} />
      </group>

      {/* Deployed screenshot array. Mounted inside the orbital group so it
          keeps orbiting while you read — motion never fully stops. */}
      <group scale={1 / sat.scale}>
        <MediaPanels project={sat.project} active={isActive} />
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Orbital paths + debris                                              */
/* ------------------------------------------------------------------ */

function OrbitRing({ radius, inclination }) {
  const geometry = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0)
    const pts = curve.getPoints(128).map((p) => new THREE.Vector3(p.x, 0, p.y))
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [radius])

  return (
    <line geometry={geometry} rotation={[inclination, 0, 0]}>
      <lineBasicMaterial color={HEX.steel} transparent opacity={0.16} />
    </line>
  )
}

/**
 * Debris belt. Gives the orbital plane a surface to catch light, and sells the
 * scale of the planet by putting thousands of tiny objects between you and it.
 * One instanced draw call.
 */
function DebrisBelt({ count = 900 }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const rocks = useMemo(() => {
    let s = 4242
    const rand = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      return s / 0x7fffffff
    }
    return Array.from({ length: count }, () => {
      const a = rand() * Math.PI * 2
      // Belt sits between the outermost satellite orbit (88) and the capture
      // radius (62·0.78 ≈ 48 standoff), so the docked view looks THROUGH the
      // belt at the planet rather than sitting outside it.
      const r = 30 + rand() * 12
      return {
        a,
        r,
        y: (rand() - 0.5) * 7,
        scale: 0.16 + rand() * 0.75,
        speed: 0.012 + rand() * 0.01,
        rot: [rand() * 3, rand() * 3, rand() * 3],
      }
    })
  }, [count])

  useFrame((state) => {
    const mesh = meshRef.current
    if (!mesh) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < rocks.length; i++) {
      const r = rocks[i]
      const a = r.a + t * r.speed
      dummy.position.set(Math.cos(a) * r.r, r.y, Math.sin(a) * r.r)
      dummy.rotation.set(r.rot[0] + t * 0.05, r.rot[1], r.rot[2])
      dummy.scale.setScalar(r.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={0x3a4048} metalness={0.2} roughness={0.9} flatShading />
    </instancedMesh>
  )
}

/* ------------------------------------------------------------------ */

export default function TheWorks() {
  const planetRef = useRef()
  const activeSection = useFlightState((s) => s.activeSection)
  const activeSatellite = useFlightState((s) => s.activeSatellite)
  const phase = useFlightState((s) => s.phase)
  const docked = activeSection === 'works' && phase === 'docked'

  const planetMaterial = useMemo(() => createBasaltMaterial(), [])
  const rimMaterial = useMemo(() => createRimMaterial(0x5d87a8, 3.0, 0.5), [])

  useEffect(() => {
    return () => {
      planetMaterial.dispose()
      rimMaterial.dispose()
    }
  }, [planetMaterial, rimMaterial])

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    if (planetRef.current) {
      planetRef.current.rotation.y += delta * 0.012
    }
    // Only a selected satellite publishes focus; clearing it here (rather than
    // in each Satellite) guarantees exactly one writer per frame.
    if (!activeSatellite) satelliteFocus.active = false
  })

  return (
    <group position={DEST.position}>
      {/* Displaced basalt terrain. Subdivision 6 gives ~80k triangles, which is
          the right place to spend budget: it is the hero object of the scene. */}
      <mesh ref={planetRef} material={planetMaterial} castShadow receiveShadow>
        <icosahedronGeometry args={[PLANET_RADIUS, 6]} />
      </mesh>

      {/* Fresnel limb shell. Back-facing, so orbiting structures occlude it. */}
      <mesh material={rimMaterial} scale={1.055}>
        <icosahedronGeometry args={[PLANET_RADIUS, 3]} />
      </mesh>

      {/* No key light here — the global sun in Lighting.jsx defines the
          terminator for every object in the world. A local key would put this
          planet's shadow at a different angle from everything around it. */}

      <DebrisBelt />

      {SATELLITES.map((sat) => (
        <OrbitRing key={`ring-${sat.id}`} radius={sat.radius} inclination={sat.inclination} />
      ))}

      {SATELLITES.map((sat, i) => (
        <Satellite key={sat.id} sat={sat} docked={docked} index={i} />
      ))}
    </group>
  )
}
