import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { flight } from '../core/flightStore'
import { WORLD } from '../data/spaceMap'
import { SUN_POSITION } from './Lighting'

/**
 * VOLUMETRICS — the reason empty space stops feeling empty.
 *
 * Two elements, both earning their place:
 *
 *  1. DRIFT MOTES. A small instanced field of near-invisible particles that
 *     recentres on the ship. They exist for one reason: PARALLAX AT LOW SPEED.
 *     Distant stars barely shift when you are crawling, so without close-range
 *     reference the ship feels static. Motes give the eye something near to
 *     measure motion against. This is the single biggest "it feels like flying"
 *     upgrade available, and it costs one draw call.
 *
 *  2. DUST BANDS. Two enormous, very faint planes of noise lying near the
 *     ecliptic. They give the disc a readable "floor" and "ceiling" without
 *     ever drawing a grid — which would be the lazy sci-fi answer.
 *
 * Neither is a nebula. Coloured nebula sprites are the fastest way to make
 * space look like a desktop wallpaper.
 */

const MOTE_COUNT = 260
const MOTE_FIELD = 130

export function DriftMotes({ reduced }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const offsets = useMemo(() => {
    const arr = []
    for (let i = 0; i < MOTE_COUNT; i++) {
      arr.push({
        x: (Math.random() - 0.5) * MOTE_FIELD,
        y: (Math.random() - 0.5) * MOTE_FIELD * 0.5,
        z: (Math.random() - 0.5) * MOTE_FIELD,
        s: 0.02 + Math.random() * 0.07,
      })
    }
    return arr
  }, [])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    // Wrap each mote into the box centred on the ship. Modulo wrapping means a
    // fixed 260 particles read as an infinite field however far you travel.
    for (let i = 0; i < offsets.length; i++) {
      const o = offsets[i]
      const wrap = (v, p, size) => {
        let d = v + p
        d = ((((d - p + size / 2) % size) + size) % size) - size / 2 + p
        return d
      }
      const x = wrap(o.x, flight.position.x, MOTE_FIELD)
      const y = wrap(o.y, flight.position.y, MOTE_FIELD * 0.5)
      const z = wrap(o.z, flight.position.z, MOTE_FIELD)

      dummy.position.set(x, y, z)
      dummy.scale.setScalar(o.s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  if (reduced) return null

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MOTE_COUNT]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color={0x9fb0c4} transparent opacity={0.34} depthWrite={false} />
    </instancedMesh>
  )
}

/**
 * Faint dust bands near the ecliptic. Procedural texture — no asset download,
 * and it compresses to nothing because it never leaves the GPU.
 */
function useDustTexture() {
  return useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, size, size)

    // Soft blobs, additively built up. Deterministic-ish is fine here.
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const r = 8 + Math.random() * 46
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      const a = 0.02 + Math.random() * 0.05
      g.addColorStop(0, `rgba(150,175,200,${a})`)
      g.addColorStop(1, 'rgba(150,175,200,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(3, 3)
    return tex
  }, [])
}

export function DustBands({ reduced }) {
  const tex = useDustTexture()
  const topRef = useRef()
  const botRef = useRef()

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    // Bands drift very slowly and follow the ship horizontally, so they read as
    // an environment rather than as two planes you can fly past.
    ;[topRef, botRef].forEach((r) => {
      if (!r.current) return
      r.current.position.x = flight.position.x
      r.current.position.z = flight.position.z
    })
    if (topRef.current) topRef.current.material.map.offset.x += delta * 0.0016
    if (botRef.current) botRef.current.material.map.offset.x -= delta * 0.0011
  })

  if (reduced) return null

  const size = WORLD.radius * 3

  return (
    <>
      <mesh ref={topRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 210, 0]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          map={tex}
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={botRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -230, 0]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          map={tex}
          transparent
          opacity={0.36}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  )
}

/**
 * A single distant sun, far outside the play area. It is the key light for the
 * whole scene and the reason structures have a consistent lit side — without
 * one directional source the world looks like it was assembled from unrelated
 * props, which is exactly the "AI slop" read to avoid.
 */
/**
 * The visible sun body.
 *
 * Lighting is NOT done here — Lighting.jsx owns the key/fill/bounce rig so
 * there is exactly one light direction in the world. This component only draws
 * the star you can see, positioned to agree with that rig.
 *
 * The corona layers matter: a bare emissive sphere reads as a white dot, while
 * a hot core inside two falloff shells reads as something with atmosphere and
 * enormous distance.
 */
/**
 * Corona shader.
 *
 * A spriteMaterial with NO MAP renders a solid square — which is exactly what
 * was happening: the "sun" was two grey rectangles stacked behind a white
 * sphere. Any halo has to define its own radial falloff in a fragment shader,
 * or supply a texture. This does the former: no asset, correct falloff.
 *
 * The profile matters. A linear fade reads as a flat disc; real stellar glare
 * falls off close to inverse-square near the limb and much more slowly out in
 * the wings, which is why a sun looks like a small intense core wrapped in a
 * very wide, very faint haze.
 */
const coronaVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const coronaFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uFalloff;
  varying vec2 vUv;

  void main() {
    float d = length(vUv - 0.5) * 2.0;
    if (d > 1.0) discard;

    // Inverse-power falloff with a soft outer cutoff, so the halo has no edge.
    float glow = pow(max(1.0 - d, 0.0), uFalloff);
    // Extra concentration near the centre gives the core its bloom-feeding punch.
    glow += pow(max(1.0 - d, 0.0), uFalloff * 4.0) * 0.6;

    gl_FragColor = vec4(uColor, glow * uIntensity);
  }
`

function Corona({ size, color, intensity, falloff }) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uFalloff: { value: falloff },
    }),
    [color, intensity, falloff],
  )

  return (
    <mesh>
      <planeGeometry args={[size, size]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={coronaVertex}
        fragmentShader={coronaFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}

/**
 * The visible sun.
 *
 * Lighting is owned by Lighting.jsx — this only draws the star. Billboarded as
 * a group so the corona planes always face the camera.
 */
export function DistantSun() {
  const groupRef = useRef()

  useFrame((state) => {
    // Face the camera. Corona planes seen edge-on would vanish.
    if (groupRef.current) groupRef.current.quaternion.copy(state.camera.quaternion)
  })

  return (
    <group position={SUN_POSITION}>
      {/* Photosphere. Small and very hot — the disc of a distant star subtends
          almost nothing; it is the glare around it that reads as "sun". */}
      {/* Photosphere, 3x. A bigger disc reads as a nearer, more present star
          and gives the corona something substantial to sit around. */}
      <mesh>
        <sphereGeometry args={[48, 32, 32]} />
        <meshBasicMaterial color={0xfffaf0} toneMapped={false} />
      </mesh>

      <group ref={groupRef}>
        {/* Inner glare — tight, hot, drives the bloom. */}
        <Corona size={570} color={0xffeed4} intensity={0.9} falloff={3.8} />
        {/* Mid halo */}
        <Corona size={1290} color={0xffdcae} intensity={0.22} falloff={3.4} />
        {/* Outer wings. Steep falloff and low intensity on purpose: at
            falloff 1.9 the halo spread across a quarter of the frame and
            lifted the void to brown haze. Glare should imply an enormous
            distant source, not fog the shot.
            Scaled 3x with the rest, but intensity is UNCHANGED — a wider halo
            at the same brightness is exactly the goal; raising both would put
            the brown haze back. */}
        <Corona size={2700} color={0xffcf96} intensity={0.07} falloff={3.0} />
      </group>
    </group>
  )
}
