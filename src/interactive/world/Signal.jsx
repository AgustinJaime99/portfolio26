import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HEX } from '../data/artDirection'
import { DESTINATION_BY_ID } from '../data/spaceMap'
import { flight, useFlightState } from '../core/flightStore'

/**
 * SIGNAL — about.
 *
 * A deep space antenna, alone, aimed at the void, and TRANSMITTING. The bio
 * does not appear on arrival — it decodes line by line, like a received
 * message. An "about" that reads as an intercepted transmission says something
 * a text panel cannot.
 *
 * REBUILT. The first pass was a smooth spherical cap on a plain cylinder: it
 * read as a bowl on a stick, it was visibly hollow through its own back face,
 * and — the real failure — nothing about it announced that it was broadcasting.
 * From a distance it was a dark blob, so there was no reason to fly toward it.
 *
 * What earns its place now:
 *   - a RIBBED dish with radial spars and a panelled reflector surface, so it
 *     reads as fabricated at any distance
 *   - a solid backing shell, so it is never see-through
 *   - a truss mast rather than a pipe, with a counterweight the dish balances
 *     against — the structure explains its own mechanics
 *   - a TRANSMISSION BEAM plus expanding wavefronts, visible from far away.
 *     This is the part that makes the site legible as a destination: from
 *     across the map you see something pulsing and you go and look.
 */

const DEST = DESTINATION_BY_ID.signal
const DISH_RADIUS = 15

/* ------------------------------------------------------------------ */
/* Dish                                                                */
/* ------------------------------------------------------------------ */

/**
 * Radial ribs across the dish face. These are what sell it as engineered:
 * a smooth paraboloid reads as a primitive, a ribbed one reads as built.
 */
function DishRibs({ count = 12 }) {
  const ribs = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2
        return { a }
      }),
    [count],
  )

  return (
    <>
      {ribs.map(({ a }, i) => (
        <mesh
          key={i}
          position={[
            (Math.cos(a) * DISH_RADIUS) / 2,
            -1.4,
            (Math.sin(a) * DISH_RADIUS) / 2,
          ]}
          rotation={[0, -a, 0.12]}
        >
          <boxGeometry args={[DISH_RADIUS * 0.94, 0.22, 0.16]} />
          <meshStandardMaterial
            color={HEX.steel}
            metalness={0.88}
            roughness={0.3}
            flatShading
          />
        </mesh>
      ))}
    </>
  )
}

/** Concentric hoops tying the ribs together. Real dishes have them. */
function DishHoops() {
  return (
    <>
      {[0.42, 0.72, 0.99].map((r, i) => (
        <mesh key={i} position={[0, -1.4 + i * 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[DISH_RADIUS * r, 0.11, 5, 40]} />
          <meshStandardMaterial
            color={HEX.steel}
            metalness={0.86}
            roughness={0.32}
          />
        </mesh>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Truss mast                                                          */
/* ------------------------------------------------------------------ */

/**
 * Open lattice mast. A solid cylinder gave the structure no scale — a truss
 * has repeating members the eye can count, which is what communicates size.
 */
function TrussMast({ height = 30, width = 2.6, bays = 9 }) {
  const legs = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]

  return (
    <group>
      {/* Four legs */}
      {legs.map(([sx, sz], i) => (
        <mesh key={i} position={[sx * width, -height / 2, sz * width]}>
          <boxGeometry args={[0.34, height, 0.34]} />
          <meshStandardMaterial
            color={HEX.hull}
            metalness={0.8}
            roughness={0.38}
            flatShading
          />
        </mesh>
      ))}

      {/* Horizontal bracing rings */}
      {Array.from({ length: bays }, (_, i) => {
        const y = -(i + 0.5) * (height / bays)
        return (
          <group key={i} position={[0, y, 0]}>
            {[0, 1].map((axis) => (
              <mesh
                key={axis}
                rotation={[0, axis === 0 ? 0 : Math.PI / 2, 0]}
                position={[0, 0, 0]}
              >
                <boxGeometry args={[width * 2, 0.16, 0.16]} />
                <meshStandardMaterial color={HEX.steel} metalness={0.85} roughness={0.34} />
              </mesh>
            ))}
            {/* Diagonal — gives the lattice its characteristic zigzag */}
            <mesh rotation={[0, 0, i % 2 ? 0.62 : -0.62]}>
              <boxGeometry args={[width * 2.4, 0.12, 0.12]} />
              <meshStandardMaterial color={HEX.steel} metalness={0.85} roughness={0.34} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Transmission                                                        */
/* ------------------------------------------------------------------ */

/**
 * Expanding wavefronts along the boresight.
 *
 * This is the element that makes SIGNAL findable. Everything else here is dark
 * metal against a dark void; the pulses are what say "something is happening
 * over there" from across the map. Three rings on staggered phases so the
 * transmission reads as continuous rather than as a single blink.
 */
function Wavefronts({ intensity }) {
  const refs = [useRef(), useRef(), useRef()]

  useFrame((state) => {
    const t = state.clock.elapsedTime
    refs.forEach((r, i) => {
      if (!r.current) return
      const period = 3.6
      const phase = ((t + (i * period) / refs.length) % period) / period
      // Travel outward along the dish boresight (+Y in dish-local space).
      r.current.position.y = phase * 90
      const grow = 1 + phase * 5.5
      r.current.scale.set(grow, grow, grow)
      // Fade in fast, out slow: a wavefront leaving, not a ring appearing.
      const fade = Math.min(1, phase * 6) * (1 - phase)
      // Thin rings reading as wavefronts, not as solid discs sitting in space.
      r.current.material.opacity = fade * 0.22 * intensity
    })
  })

  return (
    <>
      {refs.map((r, i) => (
        <mesh key={i} ref={r} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.4, 3.0, 40]} />
          <meshBasicMaterial
            color={HEX.ion}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */

export default function Signal() {
  const dishRef = useRef()
  const beamRef = useRef()
  const beaconRef = useRef()
  const feedGlowRef = useRef()

  const activeSection = useFlightState((s) => s.activeSection)
  const locked = useFlightState((s) => s.lockedTarget) === 'signal'
  const docked = activeSection === 'signal'

  const intensity = useRef(0.55)

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const t = state.clock.elapsedTime

    if (dishRef.current) {
      // Tracking something far away, very slowly. It is working, not spinning.
      dishRef.current.rotation.y = Math.sin(t * 0.045) * 0.34 - 0.5
      dishRef.current.rotation.z = -0.3 + Math.sin(t * 0.031) * 0.08
    }

    // Transmission strengthens as you close in — approaching makes it react,
    // which is the feedback that rewards flying over.
    const dx = DEST.position[0] - flight.position.x
    const dy = DEST.position[1] - flight.position.y
    const dz = DEST.position[2] - flight.position.z
    const dist = Math.hypot(dx, dy, dz)
    const proximity = THREE.MathUtils.clamp(1 - (dist - 60) / 260, 0.35, 1)
    const want = docked || locked ? 1 : proximity
    intensity.current += (want - intensity.current) * Math.min(1, 2 * delta)

    if (beamRef.current) {
      // Barely there. At 0.05 the shaft rendered as a solid milky cone that
      // dominated the composition — the antenna is the subject, the beam is
      // only evidence that it is working.
      const pulse = 0.82 + Math.sin(t * 1.6) * 0.18
      beamRef.current.material.opacity = 0.012 * intensity.current * pulse
    }

    if (feedGlowRef.current) {
      feedGlowRef.current.material.opacity =
        (0.5 + Math.sin(t * 3.1) * 0.3) * intensity.current
    }

    if (beaconRef.current) {
      // Slow aviation-style beacon on the mast. Irregular, never a metronome.
      const cyc = t % 2.4
      beaconRef.current.material.opacity = cyc < 0.1 || (cyc > 0.26 && cyc < 0.34) ? 1 : 0.05
    }
  })

  return (
    <group position={DEST.position}>
      {/* ---- MAST ------------------------------------------------ */}
      <group position={[0, -2, 0]}>
        <TrussMast />
      </group>

      {/* Base plate — the structure terminates instead of just stopping. */}
      <mesh position={[0, -33, 0]}>
        <cylinderGeometry args={[6.5, 8, 1.6, 12]} />
        <meshStandardMaterial color={HEX.hull} metalness={0.78} roughness={0.42} flatShading />
      </mesh>
      {/* Radial anchors */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 7, -31, Math.sin(a) * 7]}
            rotation={[0, -a, 0.5]}
          >
            <boxGeometry args={[7, 0.5, 0.9]} />
            <meshStandardMaterial color={HEX.steel} metalness={0.82} roughness={0.36} flatShading />
          </mesh>
        )
      })}

      {/* Anti-collision beacon on the mast */}
      <mesh ref={beaconRef} position={[0, -8, 0]}>
        <sphereGeometry args={[0.42, 8, 8]} />
        <meshBasicMaterial color={HEX.amber} transparent opacity={0.4} toneMapped={false} />
      </mesh>

      {/* ---- ELEVATION BEARING ----------------------------------- */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[3.1, 3.4, 3.4, 10]} />
        <meshStandardMaterial color={HEX.steel} metalness={0.85} roughness={0.3} flatShading />
      </mesh>
      {/* Trunnion arms the dish pivots on */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 3.6, 2.4, 0]}>
          <boxGeometry args={[1.1, 3.6, 1.4]} />
          <meshStandardMaterial color={HEX.hull} metalness={0.8} roughness={0.36} flatShading />
        </mesh>
      ))}

      {/* ---- DISH ------------------------------------------------ */}
      <group ref={dishRef} position={[0, 4.6, 0]}>
        {/* Reflector face. openEnded=false is deliberate — the old version was
            a see-through shell and you could look straight into a hollow bowl. */}
        <mesh rotation={[Math.PI, 0, 0]}>
          <sphereGeometry
            args={[DISH_RADIUS, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.38]}
          />
          <meshStandardMaterial
            color={0x30353d}
            metalness={0.55}
            roughness={0.42}
            side={THREE.DoubleSide}
            flatShading
          />
        </mesh>

        {/* Solid backing so the dish is never transparent from behind. */}
        <mesh rotation={[Math.PI, 0, 0]} scale={0.985}>
          <sphereGeometry
            args={[DISH_RADIUS, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.38]}
          />
          <meshStandardMaterial
            color={0x14171c}
            metalness={0.7}
            roughness={0.5}
            side={THREE.BackSide}
            flatShading
          />
        </mesh>

        {/* Rim hoop — a hard edge reads far better than a soft one at distance. */}
        <mesh position={[0, -1.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[DISH_RADIUS * 0.995, 0.3, 6, 48]} />
          <meshStandardMaterial color={HEX.steel} metalness={0.9} roughness={0.26} />
        </mesh>

        <DishRibs />
        <DishHoops />

        {/* Feed horn on its tripod */}
        <mesh position={[0, 7.4, 0]}>
          <cylinderGeometry args={[0.62, 1.0, 2.4, 8]} />
          <meshStandardMaterial color={HEX.steel} metalness={0.88} roughness={0.28} />
        </mesh>
        {/* Hot feed point — the source of the transmission. */}
        <mesh ref={feedGlowRef} position={[0, 6.2, 0]}>
          <sphereGeometry args={[0.55, 10, 10]} />
          <meshBasicMaterial
            color={HEX.ion}
            transparent
            opacity={0.6}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <pointLight position={[0, 6.2, 0]} color={HEX.ion} intensity={7} distance={44} />

        {[0, 2.09, 4.19].map((a, i) => (
          <mesh
            key={i}
            position={[Math.cos(a) * 4.6, 3.0, Math.sin(a) * 4.6]}
            rotation={[Math.PI * 0.14, -a, 0]}
          >
            <cylinderGeometry args={[0.13, 0.13, 9.5, 5]} />
            <meshStandardMaterial color={HEX.steel} metalness={0.85} roughness={0.3} />
          </mesh>
        ))}

        {/* Transmission shaft along the boresight. Very faint — implied, not solid. */}
        <mesh ref={beamRef} position={[0, 52, 0]}>
          <cylinderGeometry args={[3.4, 9, 100, 20, 1, true]} />
          <meshBasicMaterial
            color={HEX.ion}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        <Wavefronts intensity={1} />
      </group>

      {/* One warm working light at the base — the only sign anyone was here. */}
      <pointLight position={[4, -26, 4]} intensity={5} distance={46} color={HEX.amber} />
      <mesh position={[4, -26, 4]}>
        <sphereGeometry args={[0.26, 8, 8]} />
        <meshBasicMaterial color={HEX.amber} toneMapped={false} />
      </mesh>

      {/* Key and fill come from the global sun — see Lighting.jsx. Only the
          practicals above (working lamp, feed glow, beacon) belong to the site
          itself. */}
    </group>
  )
}
