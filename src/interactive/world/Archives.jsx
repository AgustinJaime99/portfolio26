import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { HEX, MOTION } from '../data/artDirection'
import { DESTINATION_BY_ID, MISSIONS } from '../data/spaceMap'
import { setFlightState, useFlightState } from '../core/flightStore'

/**
 * ARCHIVES — case studies.
 *
 * A monolith: black, rectangular, half-buried in debris, carrying NO light of
 * its own. It is dead. You light it with your ship. That is the entire point —
 * the archive only exists because someone came looking.
 *
 * On docking it separates into horizontal layers, one per mission. The
 * monolith's vertical structure IS the index. Wow moment #4 is the 800ms of
 * total silence before it opens: the silence is the effect, not the animation.
 */

const DEST = DESTINATION_BY_ID.archives
const LAYER_HEIGHT = 3.2
const LAYER_GAP_OPEN = 5.4

function DebrisField() {
  const groupRef = useRef()

  // Deterministic pseudo-random so the field is identical every session.
  const chunks = []
  let seed = 9871
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  /* Debris sits BEYOND the viewing position, never around it.
   *
   * The old field spanned 26–70 units while the camera settled at ~73, so the
   * rubble formed a screen between viewer and subject and the monolith was
   * barely visible behind it. Pushing the belt outward keeps it as a backdrop
   * that frames the structure rather than occluding it. */
  for (let i = 0; i < 42; i++) {
    const a = rand() * Math.PI * 2
    const r = 46 + rand() * 58
    chunks.push({
      pos: [Math.cos(a) * r, -18 + rand() * 30, Math.sin(a) * r],
      rot: [rand() * 3, rand() * 3, rand() * 3],
      scale: 0.6 + rand() * 3.2,
    })
  }

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.006
  })

  return (
    <group ref={groupRef}>
      {chunks.map((c, i) => (
        <mesh key={i} position={c.pos} rotation={c.rot} scale={c.scale}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={0x0f1116}
            metalness={0.3}
            roughness={0.9}
            flatShading
          />
        </mesh>
      ))}
    </group>
  )
}

function Layer({ index, total, opened, mission }) {
  const meshRef = useRef()
  const activeMission = useFlightState((s) => s.activeMission)
  const isActive = activeMission === mission.id
  const edgeRef = useRef()

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const m = meshRef.current
    if (!m) return

    // Closed: layers are flush, forming one solid block.
    // Open: they separate vertically, newest at the top.
    const closedY = (index - (total - 1) / 2) * LAYER_HEIGHT
    const openY = (index - (total - 1) / 2) * LAYER_GAP_OPEN
    const targetY = opened ? openY : closedY

    // Staggered so layers do not move as one slab — irregular delays read human.
    const rate = opened ? 2.2 + index * 0.35 : 3.4
    m.position.y += (targetY - m.position.y) * Math.min(1, rate * delta)

    const targetX = opened ? (index % 2 === 0 ? 1.6 : -1.6) : 0
    m.position.x += (targetX - m.position.x) * Math.min(1, rate * delta)

    if (edgeRef.current) {
      const target = isActive ? 0.85 : opened ? 0.28 : 0.06
      edgeRef.current.material.opacity +=
        (target - edgeRef.current.material.opacity) * Math.min(1, 5 * delta)
    }
  })

  return (
    <group ref={meshRef}>
      <mesh
        onClick={(e) => {
          if (!opened) return
          e.stopPropagation()
          setFlightState({ activeMission: isActive ? null : mission.id })
        }}
        onPointerOver={(e) => {
          if (!opened) return
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        <boxGeometry args={[13, LAYER_HEIGHT - 0.14, 13]} />
        <meshStandardMaterial
          color={0x0a0b0e}
          metalness={0.45}
          roughness={0.72}
          flatShading
        />
      </mesh>

      {/* Amber edge strip — lights only when this mission is selected. */}
      <mesh ref={edgeRef} position={[6.55, 0, 0]}>
        <boxGeometry args={[0.09, LAYER_HEIGHT - 0.6, 11.6]} />
        <meshBasicMaterial
          color={isActive ? HEX.amber : HEX.dust}
          transparent
          opacity={0.06}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/**
 * Holds the monolith shut for MOTION.monolithSilence seconds after docking.
 * That pause — with the ambient bed ducked — is wow moment #4.
 */
function useDelayedOpen(docked) {
  const [opened, setOpened] = useState(false)

  useEffect(() => {
    if (!docked) {
      setOpened(false)
      return
    }
    const id = setTimeout(() => setOpened(true), MOTION.monolithSilence * 1000)
    return () => clearTimeout(id)
  }, [docked])

  return opened
}

export default function Archives() {
  const phase = useFlightState((s) => s.phase)
  const activeSection = useFlightState((s) => s.activeSection)
  const docked = activeSection === 'archives' && phase === 'docked'
  const opened = useDelayedOpen(docked)

  return (
    <group position={DEST.position}>
      <DebrisField />

      <group>
        {MISSIONS.map((mission, i) => (
          <Layer
            key={mission.id}
            index={i}
            total={MISSIONS.length}
            opened={opened}
            mission={mission}
          />
        ))}
      </group>

      {/* Deliberately NO light source of its own. The ship is the only lamp. */}
    </group>
  )
}
