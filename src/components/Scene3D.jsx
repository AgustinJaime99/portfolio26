import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Icosahedron, MeshDistortMaterial, Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'

function StarField() {
  const ref = useRef()
  const positions = useMemo(() => {
    const count = 2200
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 9
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      arr[i * 3 + 2] = r * Math.cos(phi)
    }
    return arr
  }, [])

  useFrame((state, delta) => {
    if (!ref.current) return
    ref.current.rotation.y += delta * 0.04
    ref.current.rotation.x += delta * 0.015
  })

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
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
  useFrame((state) => {
    if (!mesh.current) return
    const t = state.clock.getElapsedTime()
    mesh.current.rotation.y = t * 0.18
    mesh.current.rotation.z = t * 0.06
    // subtle parallax toward pointer
    mesh.current.position.x = THREE.MathUtils.lerp(mesh.current.position.x, pointer.current.x * 0.4, 0.05)
    mesh.current.position.y = THREE.MathUtils.lerp(mesh.current.position.y, pointer.current.y * 0.4, 0.05)
  })

  return (
    <Float speed={1.5} rotationIntensity={0.6} floatIntensity={1.1}>
      <Icosahedron ref={mesh} args={[1.6, 12]}>
        <MeshDistortMaterial
          color="#4f46e5"
          emissive="#1e1b4b"
          roughness={0.18}
          metalness={0.85}
          distort={0.42}
          speed={1.6}
        />
      </Icosahedron>
    </Float>
  )
}

function Rig({ pointer }) {
  useFrame((state) => {
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, pointer.current.x * 0.6, 0.04)
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, pointer.current.y * 0.6, 0.04)
    state.camera.lookAt(0, 0, 0)
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
