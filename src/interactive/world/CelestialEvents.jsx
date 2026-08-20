import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HEX } from '../data/artDirection'
import { flight } from '../core/flightStore'
import { SUN_POSITION } from './Lighting'

/**
 * CELESTIAL EVENTS
 *
 * Sporadic bodies that give the void depth and a sense of an inhabited system.
 *
 * WHAT THIS DELIBERATELY IS NOT: shooting stars. A meteor IS atmospheric
 * friction — the streak is air burning. In vacuum there is nothing to burn, so
 * a white streak crossing the frame every few seconds would be the single
 * clearest tell that nobody thought about it. It is also the most over-used
 * effect in the genre.
 *
 * What is here instead, all of it physically motivated:
 *
 *   COMETS      Long-period bodies on slow hyperbolic passes. The dust tail
 *               always points ANTI-SUNWARD — driven by radiation pressure, not
 *               by direction of travel. A comet whose tail streams behind it
 *               like a jet exhaust is the giveaway of a fake; getting this one
 *               detail right is what makes the system read as observed.
 *               Two tails, in fact: a broad curved dust tail and a narrower,
 *               straighter, bluer ion tail. That is what real comets look like.
 *
 *   REENTRIES   Debris fragments burning up. THIS is where a streak is earned:
 *               a fragment on a decaying orbit that heats, glows and breaks
 *               apart. Short, rare, and always near a body — never in deep void.
 *
 *   DRIFTERS    Distant asteroids on very slow trajectories. Pure parallax:
 *               they give the middle distance something to measure against, so
 *               the space between sites stops feeling like an empty backdrop.
 *
 * Frequency is deliberately LOW. The brief asked for sporadic, and it is right:
 * an event every few seconds becomes wallpaper, and wallpaper is invisible.
 */

// Imported rather than redeclared: comet tails point anti-sunward, so this MUST
// be the same sun the key light uses or the physics detail becomes a lie.
const SUN = SUN_POSITION

/** Scratch objects. Declared up front — never allocate inside a frame loop. */
const _pos = new THREE.Vector3()
const _antiSun = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _zAxis = new THREE.Vector3(0, 0, 1)

/* ------------------------------------------------------------------ */
/* Comet                                                               */
/* ------------------------------------------------------------------ */

/**
 * Dust tail geometry: a tapered ribbon built once and reused. Curved slightly,
 * because dust lags behind the nucleus along its orbit while ion tails do not.
 */
function useTailGeometry(segments = 26, length = 150, width = 7, curve = 0.22) {
  return useMemo(() => {
    const positions = []
    const uvs = []
    const indices = []

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      // Taper: wide near the nucleus, feathering out to nothing.
      const w = width * Math.pow(1 - t, 0.55) * (0.35 + t * 1.4)
      // Lateral drift gives the dust tail its characteristic bow.
      const bow = Math.pow(t, 1.7) * length * curve
      const z = t * length

      positions.push(-w, bow, z)
      positions.push(w, bow, z)
      uvs.push(0, t, 1, t)

      if (i < segments) {
        const a = i * 2
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }, [segments, length, width, curve])
}

const tailVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const tailFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    // Fade along the tail, and soften across its width so the ribbon has no
    // hard edge. A visible polygon edge is what makes a tail look like a plane.
    float along = pow(1.0 - vUv.y, 1.5);
    float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
    across = pow(max(across, 0.0), 1.4);
    gl_FragColor = vec4(uColor, along * across * uOpacity);
  }
`

/**
 * One comet on a slow pass. Comets are recycled: when a pass ends the body is
 * re-seeded on a new trajectory rather than allocated again.
 */
function Comet({ index, reduced }) {
  const groupRef = useRef()
  const dustRef = useRef()
  const ionRef = useRef()
  const coreRef = useRef()
  const glowRef = useRef()

  // Generous dimensions: at 300+ units a narrow ribbon renders as a hairline
  // and the comet reads as a stray bright pixel rather than as a body.
  const dustGeo = useTailGeometry(26, 210, 26, 0.26)
  const ionGeo = useTailGeometry(18, 280, 9, 0.04)

  // Deterministic per-comet seed so passes are varied but reproducible.
  const seed = useRef(index * 977 + 131)
  const state = useRef({
    active: false,
    /* Seconds until the first pass. Short enough that a visitor who stays a
     * minute sees one, staggered so two comets never share the sky. Subsequent
     * waits are much longer — see the reseed on completion. */
    wait: 9 + index * 21,
    t: 0,
    duration: 40,
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
    scale: 1,
  })

  const rand = () => {
    seed.current = (seed.current * 1103515245 + 12345) & 0x7fffffff
    return seed.current / 0x7fffffff
  }

  function reseed(s) {
    /* Seed the pass RELATIVE TO THE SHIP, not to the world origin.
     *
     * Anchoring to the origin put every comet 600-1000 units from world centre,
     * which is nowhere near a pilot who has flown out to a site — the passes
     * happened, correctly, entirely off-screen. A comet nobody sees is not an
     * event.
     *
     * The path is a chord that chances past the viewer: close enough to be
     * unmistakable, far enough that it never obstructs the route to a site. */
    /* Seed the pass ACROSS THE PILOT'S FORWARD VIEW.
     *
     * Seeding at a random bearing put comets behind the ship as often as not —
     * verified in the browser with a body at (-172, 1, 357) while the pilot sat
     * at the origin facing -Z. A comet you cannot see is not an event.
     *
     * So: build the chord around the FORWARD vector, entering from one side of
     * frame and exiting the other, at a distance where its tail spans a good
     * part of the view without ever getting in the way. */
    const cx = flight.position.x
    const cy = flight.position.y
    const cz = flight.position.z

    // Forward and right vectors from current heading (nose = -sin, -cos).
    const h = flight.heading
    const fx = -Math.sin(h)
    const fz = -Math.cos(h)
    const rx = -fz // right = forward rotated -90° about Y
    const rz = fx

    const ahead = 300 + rand() * 220
    const side = 190 + rand() * 140
    const dirSign = rand() < 0.5 ? -1 : 1
    const height = (rand() - 0.5) * 150

    s.from.set(
      cx + fx * ahead + rx * side * dirSign,
      cy + height,
      cz + fz * ahead + rz * side * dirSign,
    )
    // Exit on the opposite side, slightly nearer, so the path reads as a chord
    // sweeping across the view rather than a line receding from it.
    s.to.set(
      cx + fx * (ahead * 0.72) - rx * side * dirSign,
      cy + height + (rand() - 0.5) * 90,
      cz + fz * (ahead * 0.72) - rz * side * dirSign,
    )

    // Slow enough to be majestic, fast enough that the motion is perceptible
    // within a few seconds of noticing it.
    s.duration = 17 + rand() * 13
    s.scale = 0.9 + rand() * 1.1
    s.t = 0
    s.active = true
  }

  useFrame((_frameState, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const s = state.current
    const g = groupRef.current
    if (!g) return

    if (!s.active) {
      s.wait -= delta
      if (s.wait <= 0) reseed(s)
      g.visible = false
      return
    }

    s.t += delta / s.duration
    if (s.t >= 1) {
      s.active = false
      // Long gaps. Sporadic means sporadic: constant comets are wallpaper.
      s.wait = 45 + rand() * 90
      g.visible = false
      return
    }

    g.visible = true

    // Position along the pass.
    _pos.copy(s.from).lerp(s.to, s.t)
    g.position.copy(_pos)
    g.scale.setScalar(s.scale)


    /* THE DETAIL THAT MATTERS: orient the tails ANTI-SUNWARD.
     *
     * The tail geometry runs along +Z, so point +Z away from the sun. This is
     * why a comet approaching the sun trails its tail ahead of itself — the
     * behaviour that reads as real to anyone who has looked at a comet photo. */
    _antiSun.copy(_pos).sub(SUN).normalize()
    _q.setFromUnitVectors(_zAxis, _antiSun)
    g.quaternion.copy(_q)

    // Brightness peaks at closest approach to the sun, not at mid-pass.
    const sunDist = _pos.distanceTo(SUN)
    const activity = THREE.MathUtils.clamp(1 - (sunDist - 1400) / 1400, 0.25, 1)
    // Fade in and out at the edges of the pass so nothing pops into existence.
    const edge = Math.min(1, s.t * 8) * Math.min(1, (1 - s.t) * 8)
    const amount = activity * edge

    if (dustRef.current) dustRef.current.material.uniforms.uOpacity.value = amount * 0.95
    if (ionRef.current) ionRef.current.material.uniforms.uOpacity.value = amount * 0.72
    if (coreRef.current) coreRef.current.material.opacity = amount
    if (glowRef.current) {
      // Coma breathes very slightly. It is the brightest thing in the pass, so
      // it carries the eye to the comet before the tails resolve.
      glowRef.current.material.opacity = amount * 0.9
      glowRef.current.scale.setScalar(4.2 + Math.sin(s.t * 40) * 0.2)
    }
  })

  const dustUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(0xd8cfc0) }, // dust is warm grey, not blue
      uOpacity: { value: 0 },
    }),
    [],
  )
  const ionUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(0x8fc4de) }, // ion tail is cold blue
      uOpacity: { value: 0 },
    }),
    [],
  )

  return (
    <group ref={groupRef} visible={false}>
      {/* Nucleus — small and irregular, never a sphere. */}
      <mesh>
        <icosahedronGeometry args={[1.5, 0]} />
        <meshStandardMaterial color={0x3a3630} metalness={0.1} roughness={0.95} flatShading />
      </mesh>

      {/* Coma: the glowing envelope around the nucleus. */}
      <sprite ref={glowRef} scale={2.4}>
        <spriteMaterial
          color={0xe6f0f5}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>

      <mesh ref={coreRef}>
        <sphereGeometry args={[0.7, 10, 10]} />
        <meshBasicMaterial
          color={0xffffff}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Dust tail — broad, curved, warm. */}
      <mesh ref={dustRef} geometry={dustGeo}>
        <shaderMaterial
          uniforms={dustUniforms}
          vertexShader={tailVertex}
          fragmentShader={tailFragment}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Ion tail — narrow, straight, cold. Offset so the two are distinct. */}
      {!reduced && (
        <mesh ref={ionRef} geometry={ionGeo}>
          <shaderMaterial
            uniforms={ionUniforms}
            vertexShader={tailVertex}
            fragmentShader={tailFragment}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Debris reentry — the one place a streak is earned                   */
/* ------------------------------------------------------------------ */

/**
 * A fragment heating up and breaking apart. Short-lived and rare.
 *
 * Unlike a "shooting star", this has a cause: debris on a decaying path
 * compressing gas ahead of it. It stays near the player so it reads as an
 * event happening in the same space, not as a backdrop animation.
 */
function Reentry({ index }) {
  const groupRef = useRef()
  const headRef = useRef()
  const trailRef = useRef()
  const sparkRefs = [useRef(), useRef(), useRef()]

  const seed = useRef(index * 4409 + 77)
  const rand = () => {
    seed.current = (seed.current * 1103515245 + 12345) & 0x7fffffff
    return seed.current / 0x7fffffff
  }

  const s = useRef({
    active: false,
    // First burn comes early; later ones are spaced far apart so they stay
    // punctuation rather than texture.
    wait: 13 + index * 19,
    t: 0,
    duration: 1.6,
    from: new THREE.Vector3(),
    dir: new THREE.Vector3(),
  })

  function reseed(st) {
    /* Spawn AHEAD of the ship and well out.
     *
     * Seeding at a random bearing 170 units away put burns directly behind the
     * hull, where the flare read as the ship catching fire rather than as a
     * distant fragment. A reentry is something you witness at a distance.
     *
     * Placed in the forward hemisphere so it is seen, and far enough that its
     * scale reads as "over there". */
    const h = flight.heading
    const fx = -Math.sin(h)
    const fz = -Math.cos(h)
    const rx = -fz
    const rz = fx

    const ahead = 420 + rand() * 260
    // Push the lateral offset out of the centre band so a burn never overlaps
    // the ship on screen, where it reads as the hull igniting.
    const lateralSign = rand() < 0.5 ? -1 : 1
    const side = lateralSign * (200 + rand() * 400)
    const lift = (rand() - 0.5) * 220

    st.from.set(
      flight.position.x + fx * ahead + rx * side,
      flight.position.y + lift,
      flight.position.z + fz * ahead + rz * side,
    )

    // Travel roughly tangentially, so it crosses the view rather than
    // approaching head-on (which would foreshorten the trail to a dot).
    st.dir
      .set(rand() - 0.5, (rand() - 0.5) * 0.35, rand() - 0.5)
      .normalize()
      .multiplyScalar(240 + rand() * 180)
    st.duration = 1.5 + rand() * 1.2
    st.t = 0
    st.active = true
  }

  useFrame((_f, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const st = s.current
    const g = groupRef.current
    if (!g) return

    if (!st.active) {
      st.wait -= delta
      if (st.wait <= 0) reseed(st)
      g.visible = false
      return
    }

    st.t += delta / st.duration
    if (st.t >= 1) {
      st.active = false
      // Rare. This is punctuation, not texture.
      st.wait = 34 + rand() * 70
      g.visible = false
      return
    }

    g.visible = true
    _pos.copy(st.from).addScaledVector(st.dir, st.t)
    g.position.copy(_pos)

    // Point the trail back along the direction of travel.
    _q.setFromUnitVectors(_zAxis, _dir.copy(st.dir).normalize().negate())
    g.quaternion.copy(_q)

    /* Burn profile: ignites fast, peaks, then breaks up and dies. Modelling the
     * ABLATION rather than a linear fade is what makes it read as a body coming
     * apart instead of a light being turned off. */
    const burn = Math.min(1, st.t * 7) * Math.pow(1 - st.t, 0.6)
    const breakup = THREE.MathUtils.clamp((st.t - 0.55) / 0.45, 0, 1)

    if (headRef.current) {
      headRef.current.material.opacity = burn
      headRef.current.scale.setScalar(0.5 + burn * 0.8)
    }
    if (trailRef.current) {
      trailRef.current.material.uniforms.uOpacity.value = burn * 0.7
    }

    // Fragments shed as it comes apart.
    sparkRefs.forEach((r, i) => {
      if (!r.current) return
      const spread = breakup * (18 + i * 12)
      r.current.position.set(
        Math.sin(i * 2.1 + st.t * 9) * spread,
        Math.cos(i * 1.7 + st.t * 7) * spread * 0.6,
        10 + i * 8 + breakup * 40,
      )
      r.current.material.opacity = burn * breakup * 0.9
      r.current.scale.setScalar(0.5 + breakup * 0.5)
    })
  })

  // Scaled for the new spawn distance: at 420+ units the old 46x1.6 ribbon was
  // sub-pixel and the burn read as a bare dot with no motion cue.
  const trailGeo = useTailGeometry(16, 130, 7, 0)
  const trailUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(0xffb579) }, // incandescent, not white
      uOpacity: { value: 0 },
    }),
    [],
  )

  return (
    <group ref={groupRef} visible={false}>
      <mesh ref={headRef}>
        <sphereGeometry args={[2.6, 10, 10]} />
        <meshBasicMaterial
          color={0xfff0dc}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh ref={trailRef} geometry={trailGeo}>
        <shaderMaterial
          uniforms={trailUniforms}
          vertexShader={tailVertex}
          fragmentShader={tailFragment}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {sparkRefs.map((r, i) => (
        <mesh key={i} ref={r}>
          <sphereGeometry args={[1.1, 6, 6]} />
          <meshBasicMaterial
            color={HEX.amber}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Distant drifters — parallax at the middle distance                  */
/* ------------------------------------------------------------------ */

/**
 * Slow-moving asteroids far out. They never come close and never do anything.
 * Their entire job is to occupy the middle distance so the gap between sites
 * has depth cues — without them the void between destinations is a flat
 * backdrop and travel feels like nothing is happening.
 */
function Drifters({ count = 26 }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const bodies = useMemo(() => {
    let s = 31337
    const rand = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      return s / 0x7fffffff
    }
    return Array.from({ length: count }, () => {
      const a = rand() * Math.PI * 2
      const r = 700 + rand() * 700
      return {
        a,
        r,
        y: (rand() - 0.5) * 420,
        scale: 2.5 + rand() * 9,
        speed: 0.002 + rand() * 0.004,
        spin: (rand() - 0.5) * 0.09,
        rot: [rand() * 3, rand() * 3, rand() * 3],
      }
    })
  }, [count])

  useFrame((frameState) => {
    const mesh = meshRef.current
    if (!mesh) return
    const t = frameState.clock.elapsedTime
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i]
      const a = b.a + t * b.speed
      dummy.position.set(Math.cos(a) * b.r, b.y, Math.sin(a) * b.r)
      dummy.rotation.set(b.rot[0] + t * b.spin, b.rot[1] + t * b.spin * 0.6, b.rot[2])
      dummy.scale.setScalar(b.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={0x2c3037} metalness={0.15} roughness={0.95} flatShading />
    </instancedMesh>
  )
}

/* ------------------------------------------------------------------ */

export default function CelestialEvents({ reduced = false }) {
  // Reduced mode keeps the drifters (they are one draw call and carry the depth
  // cue) but drops the event systems, which are the expensive part.
  if (reduced) {
    return <Drifters count={14} />
  }

  return (
    <>
      <Drifters />
      <Comet index={0} reduced={reduced} />
      <Comet index={1} reduced={reduced} />
      <Reentry index={0} />
      <Reentry index={1} />
    </>
  )
}
