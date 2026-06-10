import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

// 3D timeline rail. Each experience shows its tech stack as several logos
// arranged in a ring; each logo is a small particle cloud sampled from its SVG.
// When the scroll is far from a node the clouds collapse to a knot; when it
// lands on the node they bloom into the logo ring. A straight rail connects the
// nodes and a violet glow rides along it at the current scroll position.

const GAP = 7 // world-units between consecutive nodes along the rail
const PER_LOGO = 700 // particles per logo (denser → crisper shapes)
const RING_RADIUS = 1.7 // radius of the logo ring around a node
const LOGO_SIZE = 1.05 // base world size of each individual logo (at REF_LOGOS)
const REF_LOGOS = 10 // logo count at which LOGO_SIZE applies; fewer → bigger
const KNOT_RADIUS = 0.12 // tight radius when collapsed between nodes

// Scale each logo up when its node has fewer of them, so sparse rings fill out.
function logoSizeFor(count) {
  return LOGO_SIZE * THREE.MathUtils.clamp(Math.sqrt(REF_LOGOS / count), 1, 1.9)
}
const SPIN_SPEED = 0.2 // radians/sec the logo ring orbits (clockwise)

// Inline text "logos" with custom colors.
const TS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <text x="50" y="50" font-family="Arial, Helvetica, sans-serif" font-weight="800"
        font-size="58" fill="#3178c6" text-anchor="middle" dominant-baseline="central">TS</text>
</svg>`
const MYSQL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <text x="50" y="50" font-family="Arial, Helvetica, sans-serif" font-weight="800"
        font-size="26" text-anchor="middle" dominant-baseline="central">
    <tspan fill="#8b9bb4">My</tspan><tspan fill="#f5d000">SQL</tspan>
  </text>
</svg>`

// Logo sources: URLs to /public/logos, or inline SVG strings.
const LOGO_SRC = {
  react: '/logos/react-svgrepo-com.svg',
  typescript: TS_SVG,
  nestjs: '/logos/nestjs-svgrepo-com.svg',
  node: '/logos/node-js-svgrepo-com.svg',
  prisma: '/logos/light-prisma-svgrepo-com.svg',
  mysql: MYSQL_SVG,
  postgresql: '/logos/postgresql-svgrepo-com.svg',
  docker: '/logos/docker-svgrepo-com.svg',
  git: '/logos/git-icon-logo-svgrepo-com.svg',
  graphql: '/logos/graphql-svgrepo-com.svg',
}

// Which logos each experience displays (Next maps to React per request).
const NODE_LOGOS = [
  ['react', 'typescript', 'nestjs', 'node', 'prisma', 'mysql', 'docker'], // Ingenes
  ['react', 'typescript', 'git'], // B21 (Next→react)
  ['react', 'node', 'graphql', 'git'], // Proyecto Wow
]

const NODE_COLORS = ['#61dafb', '#e0234e', '#a855f7']

// Straight rail: nodes stack vertically (down), no horizontal weave.
function nodeBase(i) {
  return new THREE.Vector3(0, -i * GAP, 0)
}

// Rasterize an SVG URL and return `count` samples, each with a 2D position (in
// [-1,1]) and the pixel's real RGB color, taken from opaque pixels. Async.
async function sampleLogoUrl(src, count, res = 256) {
  // `src` can be an inline SVG string or a URL to fetch.
  const svgText = src.trim().startsWith('<svg') ? src : await fetch(src).then((r) => r.text())
  return new Promise((resolve) => {
    const empty = { pos: new Float32Array(count * 2), col: new Float32Array(count * 3) }
    const img = new Image()
    const blob = new Blob([svgText], { type: 'image/svg+xml' })
    const objUrl = URL.createObjectURL(blob)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = res
      canvas.height = res
      const ctx = canvas.getContext('2d')
      // Fit the glyph centered with a small margin so thin logos stay readable.
      ctx.drawImage(img, res * 0.08, res * 0.08, res * 0.84, res * 0.84)
      let data
      try {
        data = ctx.getImageData(0, 0, res, res).data
      } catch {
        URL.revokeObjectURL(objUrl)
        resolve(empty)
        return
      }
      const opaque = []
      for (let y = 0; y < res; y++) {
        for (let x = 0; x < res; x++) {
          if (data[(y * res + x) * 4 + 3] > 110) opaque.push((y * res + x) * 4)
        }
      }
      URL.revokeObjectURL(objUrl)
      const pos = new Float32Array(count * 2)
      const col = new Float32Array(count * 3)
      if (opaque.length) {
        for (let i = 0; i < count; i++) {
          const o = opaque[(Math.random() * opaque.length) | 0]
          const px = (o / 4) % res
          const py = Math.floor(o / 4 / res)
          pos[i * 2] = (px / res) * 2 - 1
          pos[i * 2 + 1] = -((py / res) * 2 - 1)
          col[i * 3] = data[o] / 255
          col[i * 3 + 1] = data[o + 1] / 255
          col[i * 3 + 2] = data[o + 2] / 255
        }
      }
      resolve({ pos, col })
    }
    img.onerror = () => resolve(empty)
    img.src = objUrl
  })
}

function ParticleField({ offset, slotAngle, logoColors, total, nodeOf, activeProgress }) {
  const pointsRef = useRef()

  // Static per-particle knot direction + orbit phase. Colors and the logo-local
  // offset / slot angle come in as props from the sampled SVGs.
  const { positions, dir, phase } = useMemo(() => {
    const positions = new Float32Array(total * 3)
    const dir = new Float32Array(total * 3)
    const phase = new Float32Array(total)
    const v = new THREE.Vector3()
    for (let i = 0; i < total; i++) {
      v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
      if (v.lengthSq() < 1e-4) v.set(0, 1, 0)
      v.normalize()
      dir[i * 3] = v.x
      dir[i * 3 + 1] = v.y
      dir[i * 3 + 2] = v.z
      phase[i] = Math.random() * Math.PI * 2
    }
    return { positions, dir, phase }
  }, [total])

  useFrame(({ clock }) => {
    const pts = pointsRef.current
    if (!pts || !offset) return
    const time = clock.getElapsedTime()
    const posAttr = pts.geometry.attributes.position
    const arr = posAttr.array
    // Clockwise ring rotation (negative angle in the X-right / Y-up frame).
    const ringAng = -time * SPIN_SPEED

    for (let i = 0; i < total; i++) {
      const n = nodeOf[i]
      const center = nodeBase(n)
      const dist = Math.abs(activeProgress.current - n)
      const closeness = THREE.MathUtils.clamp(1 - dist, 0, 1)
      const bloom = closeness * closeness * (3 - 2 * closeness)

      const ph = phase[i]
      // Collapsed knot target.
      const kx = dir[i * 3] * KNOT_RADIUS
      const ky = dir[i * 3 + 1] * KNOT_RADIUS
      const kz = dir[i * 3 + 2] * KNOT_RADIUS

      // Bloomed target = slot center orbiting the node clockwise, plus the
      // logo-local offset added straight (so each logo stays upright/readable).
      const a = slotAngle[i] + ringAng
      const wob = 0.03 * bloom
      const bx = Math.cos(a) * RING_RADIUS + offset[i * 3] + Math.sin(time * 0.8 + ph) * wob
      const by = Math.sin(a) * RING_RADIUS + offset[i * 3 + 1] + Math.cos(time * 0.7 + ph) * wob
      const bz = offset[i * 3 + 2] + Math.sin(time * 0.9 + ph) * wob

      arr[i * 3] = center.x + THREE.MathUtils.lerp(kx, bx, bloom)
      arr[i * 3 + 1] = center.y + THREE.MathUtils.lerp(ky, by, bloom)
      arr[i * 3 + 2] = center.z + THREE.MathUtils.lerp(kz, bz, bloom)
    }
    posAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={total} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={total} array={logoColors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        sizeAttenuation
        vertexColors
        transparent
        opacity={1}
        depthWrite={false}
      />
    </points>
  )
}

// A single node's labels. They fade out with distance from the active scroll
// position so only the focused experience's company/period read clearly — this
// stops the next node's label sitting near the previous node's ring.
function NodeLabel({ item, index, color, activeProgress }) {
  const groupRef = useRef()
  const companyRef = useRef()
  const periodRef = useRef()

  useFrame(() => {
    const dist = Math.abs(activeProgress.current - index)
    const op = THREE.MathUtils.clamp(1 - dist * 1.8, 0, 1) // sharp falloff
    if (groupRef.current) groupRef.current.visible = op > 0.01
    if (companyRef.current?.material) companyRef.current.material.opacity = op
    if (periodRef.current?.material) periodRef.current.material.opacity = op
  })

  return (
    <group ref={groupRef} position={nodeBase(index).toArray()}>
      <Text ref={companyRef} position={[0, 2.9, 0]} fontSize={0.42} color="#ffffff" anchorX="center" anchorY="bottom" outlineWidth={0.012} outlineColor="#05060a" material-transparent material-opacity={0}>
        {item.company}
      </Text>
      <Text ref={periodRef} position={[0, -2.9, 0]} fontSize={0.24} color={`${color}dd`} anchorX="center" anchorY="top" outlineWidth={0.008} outlineColor="#05060a" material-transparent material-opacity={0}>
        {item.period}
      </Text>
    </group>
  )
}

function NodeLabels({ items, activeProgress }) {
  return items.map((item, i) => (
    <NodeLabel
      key={item.company}
      item={item}
      index={i}
      color={NODE_COLORS[i % NODE_COLORS.length]}
      activeProgress={activeProgress}
    />
  ))
}

function Rail({ items, progress, offset, slotAngle, logoColors, total, nodeOf }) {
  const railRef = useRef()
  const { pointer } = useThree()
  const activeProgress = useRef(0)

  useFrame(() => {
    const target = progress.current * (items.length - 1)
    activeProgress.current = THREE.MathUtils.lerp(activeProgress.current, target, 0.1)
    if (railRef.current) {
      railRef.current.position.y = activeProgress.current * GAP
      railRef.current.rotation.y = THREE.MathUtils.lerp(railRef.current.rotation.y, pointer.x * 0.1, 0.05)
      railRef.current.rotation.x = THREE.MathUtils.lerp(railRef.current.rotation.x, -pointer.y * 0.05, 0.05)
    }
  })

  return (
    <group ref={railRef}>
      {offset && (
        <ParticleField
          offset={offset}
          slotAngle={slotAngle}
          logoColors={logoColors}
          total={total}
          nodeOf={nodeOf}
          activeProgress={activeProgress}
        />
      )}
      <NodeLabels items={items} activeProgress={activeProgress} />
    </group>
  )
}

export default function ExperienceScene({ items, progress }) {
  const count = items.length

  // Build the particle layout once: every logo of every node is a ring slot.
  const layout = useMemo(() => {
    const nodeOf = []
    const slots = [] // { node, logoId, angle }
    for (let n = 0; n < count; n++) {
      const logos = NODE_LOGOS[n] || []
      logos.forEach((logoId, li) => {
        const angle = (li / logos.length) * Math.PI * 2 - Math.PI / 2
        slots.push({ node: n, logoId, angle, logoCount: logos.length })
        for (let k = 0; k < PER_LOGO; k++) nodeOf.push(n)
      })
    }
    return { nodeOf: Int16Array.from(nodeOf), slots, total: nodeOf.length }
  }, [count])

  const [sampled, setSampled] = useState(null)

  // Sample every logo SVG and compose per-particle buffers. We keep the slot's
  // ring angle and the logo-local offset separate, so the ring can orbit the
  // node (clockwise) while each logo stays upright and readable.
  useEffect(() => {
    let cancelled = false
    const offset = new Float32Array(layout.total * 3) // logo-local (does not spin)
    const slotAngle = new Float32Array(layout.total)  // base ring angle of the slot
    const colors = new Float32Array(layout.total * 3)
    Promise.all(
      layout.slots.map((slot) =>
        sampleLogoUrl(LOGO_SRC[slot.logoId], PER_LOGO).then((res) => ({ slot, res })),
      ),
    ).then((results) => {
      if (cancelled) return
      let p = 0 // particle cursor (slots were pushed in order)
      results.forEach(({ slot, res }) => {
        const half = logoSizeFor(slot.logoCount) / 2
        for (let k = 0; k < PER_LOGO; k++) {
          const idx = p++
          offset[idx * 3] = res.pos[k * 2] * half
          offset[idx * 3 + 1] = res.pos[k * 2 + 1] * half
          offset[idx * 3 + 2] = (Math.random() - 0.5) * 0.1
          slotAngle[idx] = slot.angle
          colors[idx * 3] = res.col[k * 3]
          colors[idx * 3 + 1] = res.col[k * 3 + 1]
          colors[idx * 3 + 2] = res.col[k * 3 + 2]
        }
      })
      setSampled({ offset, slotAngle, colors })
    })
    return () => { cancelled = true }
  }, [layout])

  return (
    <Canvas camera={{ position: [0, 0, 7], fov: 55 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.7} />
      <pointLight position={[-5, -2, 4]} intensity={1.6} color="#22d3ee" />
      <pointLight position={[4, 3, -6]} intensity={1.2} color="#6366f1" />
      <Rail
        items={items}
        progress={progress}
        offset={sampled?.offset}
        slotAngle={sampled?.slotAngle}
        logoColors={sampled?.colors}
        total={layout.total}
        nodeOf={layout.nodeOf}
      />
    </Canvas>
  )
}
