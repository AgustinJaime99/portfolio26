import * as THREE from 'three'
import { SUN_POSITION } from './Lighting'

/**
 * BASALT PLANET MATERIAL
 *
 * A smooth icosahedron lit by a directional light reads as a primitive, not as
 * a world. Three things fix that, and all three are shader-side so they cost no
 * geometry:
 *
 *  1. DISPLACEMENT from 3-octave value noise, applied along the normal in the
 *     vertex shader. Gives real silhouette break-up at the limb — the single
 *     strongest cue that this is terrain.
 *  2. NORMAL PERTURBATION from the derivative of the same noise, so lighting
 *     responds to surface detail far finer than the mesh resolution.
 *  3. A SOFT TERMINATOR with a slight warm bounce on the dark side. A hard
 *     light/dark split is what makes CG spheres look like billiard balls.
 *
 * Extended from MeshStandardMaterial via onBeforeCompile so it keeps PBR
 * lighting, fog and tone mapping instead of reimplementing them badly.
 */

const noiseGLSL = /* glsl */ `
  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float gnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)),
                       dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                   mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)),
                       dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
               mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)),
                       dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                   mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)),
                       dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * gnoise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }
`

export function createBasaltMaterial({
  color = 0x2a2e36,
  displacement = 1.35,
  noiseScale = 0.055,
} = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness: 0.06,
    roughness: 0.94,
  })

  mat.userData.uniforms = {
    uDisplacement: { value: displacement },
    uNoiseScale: { value: noiseScale },
  }

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDisplacement = mat.userData.uniforms.uDisplacement
    shader.uniforms.uNoiseScale = mat.userData.uniforms.uNoiseScale

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uDisplacement;
         uniform float uNoiseScale;
         varying float vElevation;
         varying vec3 vLocalPos;
         ${noiseGLSL}`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vLocalPos = position;
         float elev = fbm(position * uNoiseScale);
         // Ridged component: sharp crests, smooth basins. Plain fbm alone
         // gives soft dunes, which reads as sand rather than rock.
         float ridge = 1.0 - abs(fbm(position * uNoiseScale * 2.1));
         elev = elev * 0.65 + ridge * 0.35;
         vElevation = elev;
         transformed += normal * elev * uDisplacement;`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uNoiseScale;
         varying float vElevation;
         varying vec3 vLocalPos;
         ${noiseGLSL}`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
         // Perturb the normal using the noise gradient so lighting picks up
         // detail finer than the tessellation.
         float e = 1.4;
         vec3 gp = vLocalPos * uNoiseScale * 3.0;
         float nx = fbm(gp + vec3(e, 0.0, 0.0)) - fbm(gp - vec3(e, 0.0, 0.0));
         float ny = fbm(gp + vec3(0.0, e, 0.0)) - fbm(gp - vec3(0.0, e, 0.0));
         float nz = fbm(gp + vec3(0.0, 0.0, e)) - fbm(gp - vec3(0.0, 0.0, e));
         normal = normalize(normal - vec3(nx, ny, nz) * 0.55);`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         // Darken basins, lighten exposed crests — mineral variation, not a
         // colour ramp. Kept desaturated so it never turns into a "planet".
         float strata = smoothstep(-0.35, 0.55, vElevation);
         diffuseColor.rgb *= mix(0.42, 1.22, strata);
         diffuseColor.rgb += vec3(0.018, 0.021, 0.026) * strata;`,
      )
  }

  return mat
}

/**
 * ATMOSPHERIC RIM — a back-facing shell with fresnel-driven opacity.
 *
 * Not a glow sprite. A real shell means the rim occludes correctly against
 * orbiting structures, so satellites pass IN FRONT of the haze rather than
 * being washed over by it. That single detail is the difference between a
 * composited look and a rendered one.
 */
export function createRimMaterial(color = 0x5d87a8, power = 3.2, strength = 0.55) {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPower: { value: power },
      uStrength: { value: strength },
      // Must agree with the global key light, or the atmospheric limb glows on
      // the opposite side from the lit terminator — an error the eye catches
      // instantly even when it cannot name it.
      uLightDir: { value: SUN_POSITION.clone().normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uStrength;
      uniform vec3 uLightDir;
      varying vec3 vNormalW;
      varying vec3 vViewDir;

      void main() {
        float fres = pow(1.0 - abs(dot(vNormalW, vViewDir)), uPower);
        // Only the LIT limb glows. A ring of haze all the way around is the
        // giveaway of a fake atmosphere.
        float lit = smoothstep(-0.35, 0.6, dot(-vNormalW, uLightDir));
        gl_FragColor = vec4(uColor, fres * uStrength * lit);
      }
    `,
  })
}
