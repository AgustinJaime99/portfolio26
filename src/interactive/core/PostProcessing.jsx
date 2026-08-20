import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { getFlightState, flight } from './flightStore'
import { deployment } from './deploymentMachine'

/**
 * POST-PROCESSING
 *
 * The single biggest quality jump available, and the reason emissive surfaces
 * previously read as flat white stickers: nothing bled light. A plume with no
 * bloom is a cyan triangle; a plume with bloom is a plume.
 *
 * Chain, in order, each justified:
 *
 *   RenderPass   the scene
 *   UnrealBloom  threshold-gated, so ONLY genuinely hot pixels glow. A low
 *                threshold blooms everything and produces the soft grey haze
 *                that reads instantly as amateur WebGL.
 *   Grade        custom pass: vignette + subtle chromatic offset at the frame
 *                edge + animated film grain. All three are cheap, and grain in
 *                particular is what stops a dark scene from banding into
 *                visible steps across large gradients.
 *   OutputPass   tone mapping + colour space conversion, done once at the end.
 *
 * DELIBERATELY ABSENT: depth of field (expensive, and it fights a game camera),
 * SSAO (near-useless against a black void), god rays (the "AI slop" tell).
 */

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 1.1 },
    uGrain: { value: 0.022 },
    uAberration: { value: 0.0014 },
    uBoost: { value: 0 },
    /** White-out at the transition to confirmation. */
    uFlash: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uAberration;
    uniform float uBoost;
    uniform float uFlash;
    varying vec2 vUv;

    // Cheap hash noise. Good enough for grain, costs nothing.
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 centered = uv - 0.5;
      float r2 = dot(centered, centered);

      // Lateral chromatic aberration, strength scaling toward the edges and
      // with boost. At the centre it is zero, so text and HUD stay crisp.
      float ab = uAberration * (1.0 + uBoost * 5.0);
      vec2 dir = centered * r2;
      float cr = texture2D(tDiffuse, uv - dir * ab).r;
      float cg = texture2D(tDiffuse, uv).g;
      float cb = texture2D(tDiffuse, uv + dir * ab).b;
      vec3 color = vec3(cr, cg, cb);

      // Vignette. Smooth falloff, no hard ring.
      float vig = smoothstep(0.9, 0.15, r2 * uVignette);
      color *= mix(0.62, 1.0, vig);

      // Animated grain, scaled BY LUMINANCE. Applying it flat lifted the void
      // into a visible dither field; weighting it by brightness keeps deep
      // black perfectly black while still breaking up banding in the midtones,
      // which is the only place banding actually occurs.
      float lum = dot(color, vec3(0.299, 0.587, 0.114));
      float grainMask = smoothstep(0.0, 0.22, lum);
      float g = hash(uv * vec2(1920.0, 1080.0) + fract(uTime) * 137.0);
      color += (g - 0.5) * uGrain * grainMask;

      // Guarantee the void stays void. Space is black in this art direction and
      // no amount of post may turn it grey.
      color = max(color, vec3(0.0));

      /* Deployment flash — lightspeed resolves to white, then falls to black.
       * Applied last so it overrides vignette and grain: a flash that is
       * vignetted at the edges reads as a texture, not as light. */
      color = mix(color, vec3(1.0), clamp(uFlash, 0.0, 1.0));

      gl_FragColor = vec4(color, 1.0);
    }
  `,
}

/**
 * Wrapper that mounts the composer ONLY when post-processing is on.
 *
 * This split is load-bearing, not cosmetic. useFrame(cb, priority > 0) takes
 * over rendering from R3F for as long as the callback is registered — even if
 * that callback decides to do nothing. Rendering the inner component
 * conditionally (rather than branching inside the frame callback) is the only
 * way to hand rendering back to R3F when post is disabled. Getting this wrong
 * produces a perfectly black canvas with no console error.
 */
export default function PostProcessing({ enabled = true, quality = 'high' }) {
  if (!enabled) return null
  return <PostProcessingImpl quality={quality} />
}

function PostProcessingImpl({ quality }) {
  const { gl, scene, camera, size } = useThree()
  const composerRef = useRef()
  const bloomRef = useRef()
  const gradeRef = useRef()

  /**
   * Build the composer ONCE per (renderer, scene, camera, quality).
   *
   * Size is deliberately NOT a dependency. Rebuilding on every resize meant the
   * cleanup for the previous composer ran after the new one had already been
   * stored, disposing the live composer's render targets — which is exactly how
   * the canvas ends up rendering pure black with no console error. Resizing is
   * handled by composer.setSize() in a separate effect instead.
   */
  useEffect(() => {
    const bloomScale = quality === 'high' ? 0.5 : 0.35

    const c = new EffectComposer(gl)
    c.addPass(new RenderPass(scene, camera))

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(
        Math.max(1, gl.domElement.width * bloomScale),
        Math.max(1, gl.domElement.height * bloomScale),
      ),
      quality === 'high' ? 0.72 : 0.5, // strength
      0.62, // radius
      0.86, // threshold — high on purpose: only real highlights bloom
    )
    c.addPass(bloom)
    bloomRef.current = bloom

    // OutputPass (tone map + colour space) runs before the grade so the grade
    // operates on display-referred colour, not on a linear HDR buffer.
    c.addPass(new OutputPass())

    const grade = new ShaderPass(GradeShader)
    c.addPass(grade)
    gradeRef.current = grade

    c.setSize(gl.domElement.width, gl.domElement.height)
    composerRef.current = c

    return () => {
      composerRef.current = null
      bloomRef.current = null
      gradeRef.current = null
      c.dispose?.()
    }
  }, [gl, scene, camera, quality])

  useEffect(() => {
    composerRef.current?.setSize(size.width, size.height)
  }, [size])

  // Take over rendering. Returning true from useFrame priority>0 means R3F
  // stops issuing its own render call.
  useFrame((state, delta) => {
    if (!composerRef.current) return
    const st = getFlightState()

    if (gradeRef.current) {
      const u = gradeRef.current.uniforms
      u.uTime.value += delta
      u.uBoost.value = flight.boost
      // Docked panels are for reading — pull the effects back so text stays
      // legible against the grade.
      const docked = st.phase === 'docked'
      const warp = deployment.warpFactor

      u.uGrain.value = docked ? 0.009 : 0.022
      /* Chromatic aberration climbs with warp. It is a lens artefact, so tying
       * it to speed reads as the optics straining rather than as a filter. */
      u.uAberration.value = docked ? 0.0004 : 0.0014 + warp * 0.006
      u.uFlash.value = deployment.flashAmount
    }

    if (bloomRef.current) {
      // Boost pushes bloom harder; warp pushes it much harder still. This is
      // what makes the streaks read as light rather than as bright lines.
      const target = 0.72 + flight.boost * 0.5 + deployment.warpFactor * 1.5
      bloomRef.current.strength += (target - bloomRef.current.strength) * Math.min(1, 4 * delta)
    }

    /* Exposure lifts through the warp so the tunnel blooms out toward the
     * flash, then returns. Driving exposure rather than adding a white overlay
     * keeps the whole frame consistent — highlights blow out from the inside. */
    if (gl.toneMappingExposure !== undefined) {
      const wantExposure = 0.82 + deployment.warpFactor * 0.5
      gl.toneMappingExposure += (wantExposure - gl.toneMappingExposure) * Math.min(1, 5 * delta)
    }

    composerRef.current.render(delta)
  }, 1)

  return null
}
