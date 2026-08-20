import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { HEX } from '../data/artDirection'
import { PANEL, DEPLOY, imagesFor, makeThumb } from '../data/projectMedia'
import { setFlightState, useFlightState } from '../core/flightStore'

/**
 * MEDIA PANELS — screenshots as physical hardware.
 *
 * Rejected: a floating carousel of images. Images hovering in space with no
 * physical justification is the single most common "3D portfolio" cliché and it
 * breaks the premise that every object here is built infrastructure.
 *
 * Built instead: the selected satellite DEPLOYS its array, and each panel in
 * that array is one screenshot. Panels have thickness, a machined bezel, and a
 * faint emissive backing so they read as powered displays rather than as decals.
 * They unfold in sequence, hinging up from stowed, the way real solar arrays do.
 *
 * TEXTURE STRATEGY — this is the part that decides whether the feature ships:
 *  - Nothing loads until a project is selected. 22 browser screenshots at
 *    1920x995 would be ~5MB and several hundred MB of VRAM if decoded eagerly.
 *  - Textures are cached across selections, so revisiting a project is instant.
 *  - Anisotropy is capped from renderer capabilities: screenshots are viewed at
 *    a steep angle in the fan, and without it the text in them turns to mush.
 *  - colorSpace must be SRGB or the screenshots render washed out against the
 *    linear pipeline.
 */

const textureCache = new Map()
/** In-flight loads, so two consumers asking at once share one network request. */
const pending = new Map()

/** Scratch objects for the billboard maths. Never allocate inside useFrame. */
const _worldPos = new THREE.Vector3()
const _toCam = new THREE.Vector3()
const _parentQ = new THREE.Quaternion()
const _euler = new THREE.Euler()

/**
 * Load one screenshot as a texture, deduplicated.
 *
 * Without the `pending` map, the 3D panel and the contact-sheet thumbnail race
 * each other and every screenshot is fetched twice — verified in the browser as
 * 6 requests for a 3-image project.
 */
function loadTexture(url, loader, maxAniso) {
  const cached = textureCache.get(url)
  if (cached) return Promise.resolve(cached)

  const inFlight = pending.get(url)
  if (inFlight) return inFlight

  const p = new Promise((resolve) => {
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = Math.min(8, maxAniso)
        tex.generateMipmaps = true
        tex.minFilter = THREE.LinearMipmapLinearFilter
        tex.magFilter = THREE.LinearFilter
        textureCache.set(url, tex)
        // Derive the contact-sheet thumbnail from the pixels we just decoded,
        // so the panel never re-fetches the full-size screenshot.
        makeThumb(url, tex.image)
        pending.delete(url)
        resolve(tex)
      },
      undefined,
      () => {
        // A missing screenshot must never break the scene.
        pending.delete(url)
        resolve(null)
      },
    )
  })

  pending.set(url, p)
  return p
}

function useProjectTextures(urls, enabled) {
  const { gl } = useThree()
  const [textures, setTextures] = useState([])

  useEffect(() => {
    if (!enabled || !urls.length) {
      setTextures([])
      return undefined
    }

    let cancelled = false
    const loader = new THREE.TextureLoader()
    const maxAniso = gl.capabilities.getMaxAnisotropy?.() ?? 1

    Promise.all(urls.map((url) => loadTexture(url, loader, maxAniso))).then(
      (loaded) => {
        if (!cancelled) setTextures(loaded.filter(Boolean))
      },
    )

    return () => {
      cancelled = true
    }
  }, [urls, enabled, gl])

  return textures
}

/**
 * One deployed panel.
 *
 * Hinges from stowed (folded flat against the satellite) to deployed. The hinge
 * is what makes it read as hardware — a panel that simply fades in reads as UI.
 */
function Panel({ texture, index, count, deployed, onOpen, isFocused }) {
  const groupRef = useRef()
  const bezelRef = useRef()
  const progress = useRef(0)
  /** Seconds elapsed since deploy was requested — drives the stagger. */
  const elapsed = useRef(0)

  /* Fan the panels along a shallow arc.
   *
   * The arc bows AWAY from the planet (+Z outward) and each panel yaws to face
   * back along the arc normal, so every screen points outward into space where
   * the camera sits. Bowing the other way pointed all six screens at the
   * planet and the array rendered as six black rectangles. */
  const { targetPos, targetRot } = useMemo(() => {
    const spread = (index - (count - 1) / 2) * PANEL.spacing
    const theta = spread / PANEL.arcRadius
    return {
      targetPos: new THREE.Vector3(
        Math.sin(theta) * PANEL.arcRadius,
        PANEL.rise,
        Math.cos(theta) * PANEL.arcRadius - PANEL.arcRadius,
      ),
      targetRot: new THREE.Euler(0, theta, 0),
    }
  }, [index, count])

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const g = groupRef.current
    if (!g) return

    // Staggered unfold: each panel waits its turn so the array opens as a
    // sequence rather than as one block. Retracting is deliberately faster and
    // un-staggered — a slow reverse would keep you waiting to switch projects.
    const delay = index * DEPLOY.perPanelDelay
    const rate = 1 / DEPLOY.duration

    if (deployed) {
      elapsed.current += delta
      if (elapsed.current >= delay) {
        progress.current = Math.min(1, progress.current + delta * rate)
      }
    } else {
      elapsed.current = 0
      progress.current = Math.max(0, progress.current - delta * rate * 2.2)
    }

    // Ease-out-back-free easing: cubic out. A springy overshoot on a mechanical
    // panel would read as rubber, not metal.
    const t = progress.current
    const e = 1 - Math.pow(1 - t, 3)

    g.position.set(targetPos.x * e, targetPos.y * e, targetPos.z * e)
    // Hinge: stowed panels are rotated flat, deployed ones face the arc normal.
    g.rotation.set(
      THREE.MathUtils.lerp(-Math.PI / 2, targetRot.x, e),
      THREE.MathUtils.lerp(0, targetRot.y, e),
      0,
    )
    g.scale.setScalar(THREE.MathUtils.lerp(0.15, 1, e))
    g.visible = t > 0.001

    if (bezelRef.current) {
      const want = isFocused ? 1 : 0.18
      bezelRef.current.material.opacity +=
        (want - bezelRef.current.material.opacity) * Math.min(1, 6 * delta)
    }
  })

  const w = PANEL.width
  const h = PANEL.height

  return (
    <group ref={groupRef} visible={false}>
      {/* Screen. Slightly emissive so it reads as powered in a dark scene, but
          well under bloom threshold so it does not glow like a lamp. */}
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          onOpen?.(index)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          map={texture}
          emissiveMap={texture}
          emissive={0xffffff}
          emissiveIntensity={0.52}
          roughness={0.34}
          metalness={0.05}
          toneMapped
          // Double-sided: the array orbits, so a single-sided screen goes black
          // for half of every revolution. Cheap insurance against an empty-
          // looking deployment.
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Machined bezel.
       *
       * Pushed well behind the screen. Previously the bezel was a 0.12-deep box
       * centred at z=-0.06, so its front face landed exactly on the screen at
       * z=0 — coplanar surfaces the depth buffer cannot separate, which showed
       * up as diagonal stair-stepped tearing across every screenshot. The gap
       * has to exceed depth precision at this camera range, not merely be
       * non-zero. */}
      <mesh position={[0, 0, -0.34]}>
        <boxGeometry args={[w + 0.28, h + 0.28, 0.5]} />
        <meshStandardMaterial color={0x1a1d23} metalness={0.86} roughness={0.28} flatShading />
      </mesh>

      {/* Focus rule — amber edge under the panel, lit only when hovered/active.
          Offset forward of the bezel face for the same reason. */}
      <mesh ref={bezelRef} position={[0, -h / 2 - 0.22, 0.04]}>
        <boxGeometry args={[w * 0.94, 0.05, 0.05]} />
        <meshBasicMaterial color={HEX.amber} transparent opacity={0.18} toneMapped={false} />
      </mesh>

      {/* Strut back to the satellite hub — panels must be attached to something. */}
      <mesh position={[0, -h / 2 - 1.1, -0.1]} rotation={[0.24, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 2.1, 5]} />
        <meshStandardMaterial color={HEX.steel} metalness={0.9} roughness={0.26} />
      </mesh>
    </group>
  )
}

/**
 * The deployed array for one satellite. Mounted inside the satellite's orbital
 * group, so it inherits the orbit and keeps moving while you read.
 */
export default function MediaPanels({ project, active }) {
  const urls = useMemo(() => imagesFor(project), [project])
  const textures = useProjectTextures(urls, active)
  const focusedIndex = useFlightState((s) => s.focusedPanel)

  const groupRef = useRef()

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const g = groupRef.current
    if (!g || !active) return

    /* Yaw the whole array to face the camera.
     *
     * The array hangs off a satellite that is itself rotated by its orbit, so a
     * fixed local orientation means the screens face a different direction
     * depending on where in the orbit you caught it — sometimes edge-on, which
     * is what made the screenshots unreadable. Turning the array to face the
     * viewer keeps the content legible from wherever the camera settles, while
     * the panels stay physically attached to the hull. */
    g.getWorldPosition(_worldPos)
    _toCam.copy(state.camera.position).sub(_worldPos)
    const wantYaw = Math.atan2(_toCam.x, _toCam.z)
    // Undo the parent chain's yaw so the result is an absolute facing.
    g.parent?.getWorldQuaternion(_parentQ)
    _euler.setFromQuaternion(_parentQ, 'YXZ')
    const localYaw = wantYaw - _euler.y

    let diff = localYaw - g.rotation.y
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    g.rotation.y += diff * Math.min(1, 2.4 * delta)
  })

  if (!urls.length) return null

  return (
    <group ref={groupRef}>
      {textures.map((tex, i) => (
        <Panel
          key={urls[i] ?? i}
          texture={tex}
          index={i}
          count={textures.length}
          deployed={active}
          isFocused={focusedIndex === i}
          onOpen={(idx) => setFlightState({ focusedPanel: idx })}
        />
      ))}
    </group>
  )
}
