import { forwardRef, useMemo, useRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { MATERIALS, PALETTE, PROPORTIONS } from './shipConfig'

/**
 * ENGINE — the ship's primary visual feature.
 *
 * Layered so it holds up from directly astern, which is where the chase camera
 * spends almost all its time:
 *
 *   1. NACELLE      dark outer casing, tapered, with a machined lip
 *   2. RINGS        concentric stator rings receding into the bell — these are
 *                   what give the throat depth instead of a flat disc
 *   3. CORE         emissive cyan disc deep inside
 *   4. HALO         additive glow that blooms
 *   5. PLUME        exhaust, built from the nozzle mouth backwards
 *   6. POINTLIGHT   soft wash on the surrounding hull
 *
 * The plume geometry starts at z = 0 and extends along +Z only. That is
 * load-bearing: a centred cone scales in both directions, and under thrust the
 * forward half drives through the hull and out past the nose.
 */

const plumeVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const plumeFragment = /* glsl */ `
  uniform vec3 uCore;
  uniform vec3 uEdge;
  uniform float uOutput;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    float along = vUv.y;
    float falloff = pow(1.0 - along, 1.7);

    // Shock diamonds — standing waves, only under real thrust.
    float d = sin(along * 20.0 - uTime * 9.0) * 0.5 + 0.5;
    d = pow(d, 2.4) * smoothstep(0.55, 1.0, uOutput) * pow(1.0 - along, 2.2);

    vec3 color = mix(uEdge, uCore, pow(1.0 - along, 3.0) + d * 0.6);
    gl_FragColor = vec4(color, (falloff * 0.16 + d * 0.14) * uOutput);
  }
`

/** Exhaust cone with its origin AT the nozzle mouth. */
function useNozzleGeometry(radius, length, segments = 14) {
  return useMemo(() => {
    const positions = []
    const uvs = []
    const indices = []
    const rings = 8

    for (let r = 0; r <= rings; r++) {
      const t = r / rings
      const flare = radius * (0.5 + Math.pow(t, 0.85) * 0.75)
      for (let s = 0; s <= segments; s++) {
        const a = (s / segments) * Math.PI * 2
        positions.push(Math.cos(a) * flare, Math.sin(a) * flare, t * length)
        uvs.push(s / segments, t)
      }
    }
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < segments; s++) {
        const a = r * (segments + 1) + s
        const b = a + segments + 1
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    return geo
  }, [radius, length, segments])
}

const Engine = forwardRef(function Engine({ side = 1 }, ref) {
  const { radius, length } = PROPORTIONS.engine
  const plumeRef = useRef()
  const coreRef = useRef()
  const haloRef = useRef()
  const lightRef = useRef()

  const nozzleGeo = useNozzleGeometry(radius * 0.42, 2.6)

  const plumeUniforms = useMemo(
    () => ({
      uCore: { value: new THREE.Color(0xd8f4ff) },
      uEdge: { value: new THREE.Color(PALETTE.cyan) },
      uOutput: { value: 0 },
      uTime: { value: 0 },
    }),
    [],
  )

  // Expose an imperative update so the parent drives all engines from one
  // frame callback rather than each engine running its own.
  useImperativeHandle(ref, () => ({
    update(output, time, delta, reduced) {
      plumeUniforms.uOutput.value +=
        (Math.min(1.35, output) - plumeUniforms.uOutput.value) * Math.min(1, 9 * delta)
      plumeUniforms.uTime.value = time

      if (plumeRef.current) {
        const flutter = 1 + Math.sin(time * (17 + side * 5)) * 0.04 * output
        const s = plumeRef.current.scale
        s.z += ((0.12 + output * 0.95) * flutter - s.z) * Math.min(1, 10 * delta)
        const xy = 0.5 + output * 0.42
        s.x += (xy - s.x) * Math.min(1, 8 * delta)
        s.y = s.x
      }

      if (coreRef.current) {
        // The core never fully dies — a powered ship with a black throat looks
        // broken. It breathes at idle and hardens under thrust.
        const breathe = 1 + Math.sin(time * 2.2 + side) * 0.06
        coreRef.current.material.opacity = Math.min(0.92, (0.3 + output * 0.55) * breathe)
      }

      if (haloRef.current) {
        haloRef.current.material.opacity = Math.min(0.5, 0.1 + output * 0.32)
        haloRef.current.scale.setScalar(1 + output * 0.22)
      }

      if (lightRef.current) {
        const target = reduced ? 0 : 1.2 + output * 5
        lightRef.current.intensity += (target - lightRef.current.intensity) * Math.min(1, 8 * delta)
      }
    },
  }))

  return (
    <group>
      {/* ---- NACELLE ---------------------------------------------- */}

      {/* Outer casing, tapering rearward. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius, radius * 0.88, length, 16, 1, false]} />
        <meshStandardMaterial {...MATERIALS.hullDark} flatShading />
      </mesh>

      {/* Machined intake lip at the front of the nacelle. */}
      <mesh position={[0, 0, -length / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.94, radius * 0.09, 8, 20]} />
        <meshStandardMaterial {...MATERIALS.mechanism} />
      </mesh>

      {/* Copper heat-exchanger band — one of only four copper parts. */}
      <mesh position={[0, 0, -length * 0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 1.02, radius * 1.02, 0.14, 16]} />
        <meshStandardMaterial {...MATERIALS.copper} />
      </mesh>

      {/* Longitudinal cooling ribs. */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * radius * 0.98, Math.sin(a) * radius * 0.98, length * 0.18]}
            rotation={[0, 0, a]}
          >
            <boxGeometry args={[0.07, 0.05, length * 0.5]} />
            <meshStandardMaterial {...MATERIALS.panel} />
          </mesh>
        )
      })}

      {/* ---- BELL + STATOR RINGS ----------------------------------- */}

      {/* Exhaust bell. Scorched: rough, dark, barely metallic. */}
      <mesh position={[0, 0, length * 0.52]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.92, radius * 0.62, 0.5, 16, 1, true]} />
        <meshStandardMaterial
          color={0x120f0d}
          metalness={0.34}
          roughness={0.88}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Concentric stator rings receding inward — depth, not a flat disc. */}
      {[0.78, 0.6, 0.44].map((r, i) => (
        <mesh
          key={r}
          position={[0, 0, length * 0.44 - i * 0.16]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[radius * r, radius * 0.05, 6, 18]} />
          <meshStandardMaterial
            color={i === 1 ? PALETTE.copperDark : PALETTE.steel}
            metalness={0.9}
            roughness={0.28}
          />
        </mesh>
      ))}

      {/* ---- CORE + HALO ------------------------------------------- */}

      <mesh ref={coreRef} position={[0, 0, length * 0.42]}>
        <circleGeometry args={[radius * 0.42, 20]} />
        <meshBasicMaterial
          color={PALETTE.cyan}
          transparent
          opacity={0.3}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh ref={haloRef} position={[0, 0, length * 0.46]}>
        <circleGeometry args={[radius * 0.86, 20]} />
        <meshBasicMaterial
          color={PALETTE.cyanDeep}
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* ---- PLUME -------------------------------------------------- */}
      <mesh ref={plumeRef} geometry={nozzleGeo} position={[0, 0, length * 0.56]}>
        <shaderMaterial
          uniforms={plumeUniforms}
          vertexShader={plumeVertex}
          fragmentShader={plumeFragment}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      <pointLight
        ref={lightRef}
        position={[0, 0, length * 0.5]}
        color={PALETTE.cyan}
        intensity={1}
        distance={22}
        decay={2}
      />
    </group>
  )
})

export default Engine
