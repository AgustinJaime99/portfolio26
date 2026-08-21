import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Icosahedron, MeshDistortMaterial, Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { warp } from '../transition/warpStore'

/**
 * HOME SCENE — and the first half of the journey into /interactive.
 *
 * This was decoration. It is now also the vehicle: when the visitor triggers
 * EXPLORE, the camera in THIS canvas pushes forward through THESE stars. The
 * field they have been looking at the whole visit is the field they fly into,
 * which is the entire point — a painted overlay could never make the background
 * feel like a place, because it would be a different set of stars.
 *
 * Everything below reads `warp.value` (0→1) from the module store. One number
 * drives camera z, FOV, star speed and streak length so they cannot drift out
 * of agreement, and it lives outside React because it changes every frame.
 *
 * At warp 0 this behaves exactly as it always did.
 */

/** Radius of the shell stars are seeded on. */
const SHELL_NEAR = 4
const SHELL_FAR = 13

/**
 * How far the camera travels at full warp. Tuned against the shell: far enough
 * to pass through the entire field several times over, so the stars keep
 * coming rather than thinning out into empty space.
 */
const TRAVEL = 190

function StarField() {
  const ref = useRef()
  const matRef = useRef()

  const { positions, radii } = useMemo(() => {
    const count = 2200
    const arr = new Float32Array(count * 3)
    // Each star's distance from the axis of travel, cached so recycling can
    // preserve the shape of the field instead of reshuffling it.
    const rad = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const r = SHELL_NEAR + Math.random() * (SHELL_FAR - SHELL_NEAR)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      arr[i * 3 + 2] = r * Math.cos(phi)
      rad[i] = r
    }
    return { positions: arr, radii: rad }
  }, [])

  /* Depth span the field recycles through.
   *
   * Stars that fall behind the camera are wrapped back out to the far edge, so
   * a camera travelling 190 units through a 26-unit shell never runs out of
   * field. Without this the visitor would fly out the back of the starfield
   * into a void about 400ms into the transition. */
  const SPAN = SHELL_FAR * 2

  useFrame((state, delta) => {
    const g = ref.current
    if (!g) return

    const w = warp.value

    // Idle drift. Wound down as warp builds — a rotating field during a
    // forward rush reads as a washing machine, not as travel.
    const drift = 1 - Math.min(1, w * 2.2)
    g.rotation.y += delta * 0.04 * drift
    g.rotation.x += delta * 0.015 * drift

    if (w <= 0) return

    /* Pull the field toward the camera.
     *
     * The GROUP moves rather than the camera, so the parallax rig below stays
     * in charge of the camera and the two never fight over it. Visually
     * identical, and it keeps the star recycling in one coordinate space. */
    const advance = w * TRAVEL
    g.position.z = advance

    // Recycle: anything now behind the viewer wraps back to the far plane.
    const arr = g.geometry.attributes.position.array
    let dirty = false
    for (let i = 0; i < arr.length; i += 3) {
      // World-space depth of this star relative to the camera.
      const z = arr[i + 2] + advance
      if (z > SHELL_FAR) {
        arr[i + 2] -= SPAN
        dirty = true
      }
    }
    if (dirty) g.geometry.attributes.position.needsUpdate = true

    /* Stars grow and brighten as they rush past.
     *
     * Points cannot draw streaks — that is what the breach overlay is for — but
     * scale and opacity carry most of the sensation, and they cost nothing.
     * Deliberately restrained: this is a push into space, not a hyperspace
     * jump with a colour tunnel. */
    if (matRef.current) {
      matRef.current.size = 0.03 + w * 0.075
      matRef.current.opacity = 1
    }
  })

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        ref={matRef}
        transparent
        color="#8b93ff"
        size={0.03}
        sizeAttenuation
        depthWrite={false}
      />
    </Points>
  )
}

function CoreBlob({ pointer }) {
  const mesh = useRef()
  const matRef = useRef()

  useFrame((state) => {
    if (!mesh.current) return
    const t = state.clock.getElapsedTime()
    const w = warp.value

    mesh.current.rotation.y = t * 0.18
    mesh.current.rotation.z = t * 0.06

    /* Get out of the way.
     *
     * The blob sits at the origin, dead ahead. Pushing the camera forward would
     * fly straight through a distorted icosahedron, which reads as a rendering
     * fault rather than as travel. So it retreats faster than the camera closes
     * and fades out over the first third of the warp — by the time there is any
     * real speed it is gone, and the way ahead is clear. */
    const flee = w * 46
    const parallaxX = pointer.current.x * 0.4
    const parallaxY = pointer.current.y * 0.4

    mesh.current.position.x = THREE.MathUtils.lerp(mesh.current.position.x, parallaxX, 0.05)
    mesh.current.position.y = THREE.MathUtils.lerp(mesh.current.position.y, parallaxY, 0.05)
    mesh.current.position.z = -flee

    if (matRef.current) {
      matRef.current.opacity = Math.max(0, 1 - w * 3.4)
    }

    /* Hide outright once faded.
     *
     * Opacity alone was not enough — verified in a capture at 1050ms, where the
     * blob was still a solid disc sitting on the vanishing point in the middle
     * of the dive. Toggling `visible` is a cheap, certain kill that does not
     * depend on blending order or on the material recompiling. */
    mesh.current.visible = w < 0.32
  })

  return (
    <Float speed={1.5} rotationIntensity={0.6} floatIntensity={1.1}>
      <Icosahedron ref={mesh} args={[1.6, 12]}>
        <MeshDistortMaterial
          ref={matRef}
          color="#4f46e5"
          emissive="#1e1b4b"
          roughness={0.18}
          metalness={0.85}
          distort={0.42}
          speed={1.6}
          /* Declared transparent up front. Flipping this at runtime does not
             recompile the shader, so a late toggle silently does nothing and
             the fade never renders. */
          transparent
        />
      </Icosahedron>
    </Float>
  )
}

function Rig({ pointer }) {
  useFrame((state) => {
    const w = warp.value
    const cam = state.camera

    /* Pointer parallax, faded out as the warp builds. Mouse-look during a
       forward rush fights the motion; by mid-transition the camera is locked
       on axis and the only movement is travel. */
    const look = 1 - Math.min(1, w * 2.6)
    cam.position.x = THREE.MathUtils.lerp(cam.position.x, pointer.current.x * 0.6 * look, 0.04)
    cam.position.y = THREE.MathUtils.lerp(cam.position.y, pointer.current.y * 0.6 * look, 0.04)

    if (w <= 0) {
      cam.lookAt(0, 0, 0)
      return
    }

    /* FOV opens with speed.
     *
     * 45 → 62. This is the cheapest and most convincing speed cue there is:
     * widening the frustum makes everything at the edges accelerate outward
     * without anything actually moving faster. Held well short of fisheye —
     * past ~70 it stops reading as velocity and starts reading as a lens. */
    const targetFov = 45 + w * 17
    if (Math.abs(cam.fov - targetFov) > 0.01) {
      cam.fov = targetFov
      cam.updateProjectionMatrix()
    }

    // Look straight down the axis of travel once moving, not back at the origin.
    cam.lookAt(cam.position.x, cam.position.y, -30)
  })
  return null
}

export default function Scene3D() {
  const pointer = useRef({ x: 0, y: 0 })

  const handlePointer = (e) => {
    pointer.current = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: -((e.clientY / window.innerHeight) * 2 - 1),
    }
  }

  return (
    <div className="absolute inset-0 -z-10" onPointerMove={handlePointer}>
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} color="#a855f7" />
        <pointLight position={[-5, -3, 2]} intensity={2} color="#22d3ee" />
        <CoreBlob pointer={pointer} />
        <StarField />
        <Rig pointer={pointer} />
      </Canvas>
    </div>
  )
}
