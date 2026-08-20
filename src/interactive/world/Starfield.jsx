import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { flight, getFlightState } from '../core/flightStore'
import { deployment } from '../core/deploymentMachine'

/**
 * STARFIELD
 *
 * A single Points object with a custom shader. Three jobs:
 *
 *  1. Parallax. Stars live in a box that recentres on the ship, so the field is
 *     effectively infinite without ever allocating more points.
 *  2. Boost streaks — points stretch along the velocity vector in the vertex
 *     shader. Free on the GPU; rebuilding line geometry per frame would not be.
 *  3. DEPTH. This is the part that was missing. A field of near-identical white
 *     dots reads as noise, no matter how many you add — the eye needs
 *     magnitude and colour variety to interpret it as distance.
 *
 * What makes it read as a sky now:
 *
 *   MAGNITUDE DISTRIBUTION — real skies are overwhelmingly faint stars with a
 *   handful of bright ones. A power distribution gives that; uniform random
 *   scale gives static.
 *
 *   STELLAR COLOUR — temperature drawn from a realistic mix: mostly cool
 *   orange-white dwarfs, some neutral, a few hot blue giants, and rare deep
 *   amber ones. Kept desaturated, because a sky of saturated colours is a
 *   screensaver — the colour should be felt rather than noticed.
 *
 *   SCINTILLATION — a slow per-star brightness wobble on independent phases.
 *   Real stars do not twinkle in vacuum, but a perfectly static field looks
 *   dead and, worse, looks like a texture. This is deliberately subtle: it
 *   registers as the field being alive, not as blinking.
 *
 *   THREE DEPTH SHELLS — near, mid and far, at different densities and sizes,
 *   so movement produces genuine parallax between layers instead of the whole
 *   sky sliding as one plane.
 */

const FIELD = 1200
const COUNT_HIGH = 18000
const COUNT_LOW = 4200

const vertexShader = /* glsl */ `
  uniform float uSize;
  uniform vec3 uVelocity;
  uniform float uStretch;
  uniform float uPixelRatio;
  uniform float uTime;

  attribute float aScale;
  attribute float aTemp;
  attribute float aPhase;

  varying float vAlpha;
  varying float vTemp;
  varying float vScale;

  void main() {
    vec3 pos = position;

    /* Stretch along the velocity vector.
     *
     * The component of the star's offset parallel to travel is exaggerated,
     * pulling the point into a streak. uStretch carries BOTH the ordinary boost
     * (small values) and the deployment warp (which drives it far past 1), so
     * the transition from "points" to "short streaks" to "full speed tunnel" is
     * one continuous ramp rather than two separate effects. */
    if (uStretch > 0.001) {
      vec3 dir = normalize(uVelocity + vec3(0.0001));
      float along = dot(pos, dir);
      pos -= dir * along * uStretch * 0.16;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float dist = -mvPosition.z;
    // Points grow with warp so streaks read as long bright lines rather than
    // as the same dot moved further along.
    float warpGrow = 1.0 + uStretch * 2.2;
    gl_PointSize = uSize * aScale * uPixelRatio * warpGrow * (300.0 / max(dist, 1.0));

    // Scintillation: slow, low-amplitude, independent phase per star. Brighter
    // stars wobble less, which is what keeps the effect from reading as noise.
    float twinkle = 1.0 + sin(uTime * 0.7 + aPhase * 6.283) * 0.16 * (1.0 - aScale * 0.4);

    // Fade distant stars so the field has depth instead of a flat wall.
    vAlpha = smoothstep(1700.0, 180.0, dist) * (0.28 + aScale * 0.72) * twinkle;
    vTemp = aTemp;
    vScale = aScale;
  }
`

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vTemp;
  varying float vScale;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    /* Falloff. Magnitude is carried by SIZE and BRIGHTNESS, not by adding a
     * halo: an additive halo on every star, run through a bloom pass, turns
     * each point into a soft disc and the sky into falling snow. Verified in
     * the browser — the field looked like static, not like depth.
     *
     * A single tight core keeps stars reading as points. */
    float soft = smoothstep(0.5, 0.06, d);
    soft *= soft;

    /* Stellar colour ramp, desaturated.
     * 0.0 -> cool blue-white (hot O/B giants, rare)
     * 0.5 -> neutral white   (A/F)
     * 1.0 -> warm amber      (K/M dwarfs, common) */
    vec3 hot  = vec3(0.74, 0.83, 1.00);
    vec3 mid  = vec3(0.97, 0.97, 0.96);
    vec3 warm = vec3(1.00, 0.87, 0.71);

    vec3 color = vTemp < 0.5
      ? mix(hot, mid, vTemp * 2.0)
      : mix(mid, warm, (vTemp - 0.5) * 2.0);

    gl_FragColor = vec4(color, soft * vAlpha);
  }
`

export default function Starfield({ reduced = false }) {
  const pointsRef = useRef()
  const matRef = useRef()
  const stretchRef = useRef(0)

  const count = reduced ? COUNT_LOW : COUNT_HIGH

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const temps = new Float32Array(count)
    const phases = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      /* Three depth shells.
       *
       * A single uniform box makes the whole sky slide as one plane when you
       * move. Splitting the field into near/mid/far shells at different
       * densities produces real parallax between layers — the near shell
       * sweeps past while the far shell barely shifts, which is the cue that
       * sells enormous distance. */
      const shell = i / count
      let radius
      if (shell < 0.18) {
        radius = FIELD * (0.25 + Math.random() * 0.3) // near, sparse
      } else if (shell < 0.55) {
        radius = FIELD * (0.55 + Math.random() * 0.4) // mid
      } else {
        radius = FIELD * (0.95 + Math.random() * 0.7) // far, dense
      }

      // Distribute on a shell rather than in a cube: a cube puts visibly more
      // stars toward its corners, which reads as a boxy sky.
      const u = Math.random() * 2 - 1
      const theta = Math.random() * Math.PI * 2
      const r = Math.sqrt(1 - u * u)
      positions[i * 3] = Math.cos(theta) * r * radius
      positions[i * 3 + 1] = u * radius
      positions[i * 3 + 2] = Math.sin(theta) * r * radius

      /* Magnitude: steep power distribution. Most stars are faint; a few are
       * bright. Uniform random here is the single biggest reason a starfield
       * looks like TV static. */
      // Steeper than it looks: pow 5 means ~1 star in 30 reaches half size, and
      // roughly 1 in 300 is genuinely bright. That ratio is what makes a field
      // read as a sky rather than as evenly-scattered dots.
      const m = Math.random()
      scales[i] = Math.pow(m, 5.0) * 2.4 + 0.09

      /* Temperature, weighted toward cool. Roughly mirrors a real stellar
       * population: many K/M dwarfs, fewer hot blue giants. */
      const tRoll = Math.random()
      if (tRoll < 0.1) temps[i] = Math.random() * 0.28 // hot blue, rare
      else if (tRoll < 0.42) temps[i] = 0.3 + Math.random() * 0.3 // neutral
      else temps[i] = 0.62 + Math.random() * 0.38 // warm, common

      phases[i] = Math.random()
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
    geo.setAttribute('aTemp', new THREE.BufferAttribute(temps, 1))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    // Stars are recentred on the ship every frame, so a bounding sphere would
    // be wrong immediately. Culling is disabled on the object instead.
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), FIELD * 2)
    return geo
  }, [count])

  const uniforms = useMemo(
    () => ({
      // Small. Stars are points; anything that resolves as a shape is a bug.
      uSize: { value: 1.35 },
      uVelocity: { value: new THREE.Vector3(0, 0, 1) },
      uStretch: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uTime: { value: 0 },
    }),
    [],
  )

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const pts = pointsRef.current
    if (!pts) return

    // Recentre the field on the ship in FIELD-sized steps. Because the field is
    // uniformly random, snapping by a whole period is visually seamless.
    const px = flight.position.x
    const py = flight.position.y
    const pz = flight.position.z
    pts.position.set(
      Math.round(px / FIELD) * FIELD,
      Math.round(py / FIELD) * FIELD,
      Math.round(pz / FIELD) * FIELD,
    )

    const st = getFlightState()

    /* Warp dominates boost when a deployment is running.
     *
     * warpFactor is 0→1, but the visual needs far more stretch than boost ever
     * asks for, so it is scaled up hard. Taking the max rather than adding them
     * keeps ordinary flight untouched while letting the launch reach a full
     * speed tunnel. */
    const warp = deployment.warpFactor * 9
    const targetStretch = st.reducedMode ? 0 : Math.max(flight.boost, warp)
    // Warp ramps faster than it decays, so acceleration snaps and the return
    // to normal space settles gently.
    const rate = targetStretch > stretchRef.current ? 7 : 3
    stretchRef.current += (targetStretch - stretchRef.current) * Math.min(1, rate * delta)

    if (matRef.current) {
      const u = matRef.current.uniforms
      u.uStretch.value = stretchRef.current
      u.uTime.value = state.clock.elapsedTime
      if (flight.speed > 0.5) {
        u.uVelocity.value.set(
          flight.velocity.x,
          flight.velocity.y,
          flight.velocity.z,
        )
      }
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
