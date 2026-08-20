import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SUN_POSITION } from './Lighting'

/**
 * SPACE ENVIRONMENT — the missing half of PBR.
 *
 * THE PROBLEM THIS FIXES: the scene is full of metals (metalness 0.7–0.9) and
 * there was no environment map. In a physically based renderer a metal has
 * almost no diffuse response — nearly everything you see on it is REFLECTION.
 * With nothing to reflect, those surfaces resolve to flat shading terms and
 * read as matte plastic, no matter how the lights are tuned.
 *
 * That is why the hull looked like paper: not the light rig, the missing
 * reflections.
 *
 * Rather than ship an HDRI, this builds one procedurally from the scene's own
 * facts, so it always agrees with the lighting:
 *
 *   - a hot sun disc in the correct direction, so highlights land where the key
 *     light says they should
 *   - a cold ambient gradient standing in for scattered starlight
 *   - a faint warm band along the ecliptic, matching the dust bands
 *
 * The result is generated once into a cube render target and costs nothing per
 * frame. Metals get specular highlights that move as you fly past — which is
 * the single strongest cue that a surface is metal rather than painted.
 */

export default function SpaceEnvironment() {
  const { gl, scene } = useThree()

  const envTexture = useMemo(() => {
    const size = 256

    // Build the environment in an offscreen scene, then capture it to a cube.
    const envScene = new THREE.Scene()

    // Sky dome: a large inward-facing sphere carrying the gradient.
    const skyUniforms = {
      uSunDir: { value: SUN_POSITION.clone().normalize() },
      uSunColor: { value: new THREE.Color(0xfff0d8) },
      uZenith: { value: new THREE.Color(0x0a0e14) },
      uHorizon: { value: new THREE.Color(0x141a22) },
      uDust: { value: new THREE.Color(0x1d1b18) },
    }

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(100, 32, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: skyUniforms,
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uSunDir;
          uniform vec3 uSunColor;
          uniform vec3 uZenith;
          uniform vec3 uHorizon;
          uniform vec3 uDust;
          varying vec3 vDir;

          void main() {
            vec3 d = normalize(vDir);

            // Base gradient: slightly lighter toward the ecliptic plane.
            float band = 1.0 - abs(d.y);
            vec3 color = mix(uZenith, uHorizon, pow(band, 2.2));

            // Dust band along the plane — the same warm haze as DustBands.
            color += uDust * pow(band, 7.0) * 0.7;

            /* The sun. Two lobes: a small intense disc that produces tight
             * specular highlights on metal, and a broad falloff that lights the
             * whole sun-facing hemisphere of a rough surface. Both are needed —
             * only the disc gives hard glints with no soft wrap, only the wide
             * lobe gives a wash with no glint. */
            float cosA = max(dot(d, uSunDir), 0.0);
            float disc = pow(cosA, 900.0) * 34.0;
            float wide = pow(cosA, 6.0) * 0.85;
            color += uSunColor * (disc + wide);

            gl_FragColor = vec4(color, 1.0);
          }
        `,
      }),
    )
    envScene.add(sky)

    const cubeTarget = new THREE.WebGLCubeRenderTarget(size, {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    })
    const cubeCam = new THREE.CubeCamera(0.1, 500, cubeTarget)
    cubeCam.update(gl, envScene)

    // PMREM gives correctly pre-filtered roughness levels, so a rough surface
    // samples a blurred version instead of a mirror reflection.
    const pmrem = new THREE.PMREMGenerator(gl)
    pmrem.compileCubemapShader()
    const generated = pmrem.fromCubemap(cubeTarget.texture)

    pmrem.dispose()
    cubeTarget.dispose()
    sky.geometry.dispose()
    sky.material.dispose()

    return generated.texture
  }, [gl])

  useEffect(() => {
    const previous = scene.environment
    scene.environment = envTexture
    // NOT scene.background — the void must stay pure black. This is for
    // reflections only.
    return () => {
      scene.environment = previous
      envTexture.dispose()
    }
  }, [scene, envTexture])

  return null
}
