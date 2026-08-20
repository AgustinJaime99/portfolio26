import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HEX } from '../data/artDirection'
import { DESTINATION_BY_ID } from '../data/spaceMap'
import { useFlightState } from '../core/flightStore'

/**
 * LAUNCH COMPLEX — deployment (contact).
 *
 * Not "CONTACT ME". A launch ring, under power, waiting for something to send.
 * This is the one place amber is allowed to take the screen, and it only does
 * so during the deployment sequence itself. At rest it is a dark structure with
 * a slow chase of sequence lights.
 */

const DEST = DESTINATION_BY_ID.launch
const RING_RADIUS = 34
const SEQUENCE_LIGHTS = 24

function SequenceLights({ armed, launching }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])

  // Positions are fixed; only per-instance colour animates. Writing the matrix
  // once keeps the per-frame cost to a single colour buffer upload.
  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    for (let i = 0; i < SEQUENCE_LIGHTS; i++) {
      const a = (i / SEQUENCE_LIGHTS) * Math.PI * 2
      dummy.position.set(Math.cos(a) * RING_RADIUS, Math.sin(a) * RING_RADIUS, 0)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, color.setHex(HEX.amber))
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [dummy, color])

  useFrame((state) => {
    const mesh = meshRef.current
    if (!mesh || !mesh.instanceColor) return
    const t = state.clock.elapsedTime

    // Chase speed rises as the sequence arms, then goes continuous on launch.
    const speed = launching ? 9 : armed ? 3.4 : 1.1

    for (let i = 0; i < SEQUENCE_LIGHTS; i++) {
      const a = (i / SEQUENCE_LIGHTS) * Math.PI * 2
      // A travelling wave around the ring rather than a uniform blink.
      const hot = Math.max(0, Math.sin(a * 2 - t * speed))
      const intensity = launching
        ? 0.45 + hot * 0.55
        : armed
          ? 0.2 + hot * 0.6
          : 0.08 + hot * 0.22
      mesh.setColorAt(i, color.setHex(HEX.amber).multiplyScalar(intensity))
    }
    mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, SEQUENCE_LIGHTS]}>
      <sphereGeometry args={[0.42, 8, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}

export default function LaunchComplex() {
  const ringRef = useRef()
  const innerRef = useRef()
  const coreLightRef = useRef()

  const phase = useFlightState((s) => s.phase)
  const activeSection = useFlightState((s) => s.activeSection)
  const deployPhase = useFlightState((s) => s.deployPhase)

  // The ring escalates in three steps: idle -> armed (form open / counting
  // down) -> launching. Without the countdown feeding 'armed', the structure
  // sat inert through the three-count and the moment had no build.
  const armed =
    (activeSection === 'launch' && phase === 'docked') ||
    deployPhase === 'form' ||
    deployPhase === 'countdown'
  const launching = deployPhase === 'launching' || deployPhase === 'sent'

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)

    if (ringRef.current) {
      ringRef.current.rotation.z += delta * (launching ? 0.5 : armed ? 0.1 : 0.03)
    }
    if (innerRef.current) {
      innerRef.current.rotation.z -= delta * (launching ? 0.8 : armed ? 0.16 : 0.05)
    }
    if (coreLightRef.current) {
      const target = launching ? 42 : armed ? 9 : 2.5
      coreLightRef.current.intensity +=
        (target - coreLightRef.current.intensity) * Math.min(1, 3 * delta)
    }
  })

  return (
    <group position={DEST.position}>
      {/* Primary ring — the structure you fly through. */}
      <group ref={ringRef}>
        <mesh>
          <torusGeometry args={[RING_RADIUS, 1.5, 8, 64]} />
          <meshStandardMaterial
            color={HEX.hull}
            metalness={0.85}
            roughness={0.3}
            flatShading
          />
        </mesh>

        {/* Structural spokes — six, not eight. Eight reads as a wheel. */}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2
          return (
            <mesh key={i} position={[0, 0, 0]} rotation={[0, 0, a]}>
              <boxGeometry args={[RING_RADIUS * 2, 0.5, 0.9]} />
              <meshStandardMaterial
                color={HEX.steel}
                metalness={0.8}
                roughness={0.35}
                flatShading
              />
            </mesh>
          )
        })}

        <SequenceLights armed={armed} launching={launching} />
      </group>

      {/* Counter-rotating inner ring — gives the structure depth and life. */}
      <group ref={innerRef}>
        <mesh>
          <torusGeometry args={[RING_RADIUS * 0.62, 0.7, 6, 48]} />
          <meshStandardMaterial
            color={HEX.steel}
            metalness={0.9}
            roughness={0.25}
            flatShading
          />
        </mesh>
      </group>

      {/* Core — the aperture the ship is thrown through. */}
      <mesh>
        <circleGeometry args={[RING_RADIUS * 0.55, 48]} />
        <meshBasicMaterial
          color={HEX.amber}
          transparent
          opacity={launching ? 0.35 : armed ? 0.09 : 0.03}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <pointLight ref={coreLightRef} intensity={2.5} distance={220} color={HEX.amber} />

      {/* Support pylons anchoring the ring to nothing — it was assembled here. */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (RING_RADIUS + 6), -RING_RADIUS * 0.5, 0]}>
          <boxGeometry args={[2.2, 16, 2.2]} />
          <meshStandardMaterial
            color={HEX.hull}
            metalness={0.7}
            roughness={0.45}
            flatShading
          />
        </mesh>
      ))}

      {/* Lit by the global sun. The amber core light above is a practical —
          it belongs to the ring, not to the scene. */}
    </group>
  )
}
