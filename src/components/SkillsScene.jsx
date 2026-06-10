import { useRef, useState, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text, Html } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'
import { useI18n } from '../i18n/LanguageContext'

const SKILLS = [
  { name: 'React',        color: '#61dafb', desc: { es: 'UI declarativa basada en componentes.', en: 'Declarative component-based UI.' }, usage: { es: 'Construí las interfaces del portfolio y dashboards con componentes reutilizables. Lo elegí por su ecosistema maduro y para lograr UIs reactivas y mantenibles.', en: 'Built the portfolio UI and dashboards with reusable components. Chosen for its mature ecosystem to achieve reactive, maintainable UIs.' } },
  { name: 'Next.js',      color: '#e2e8f0', desc: { es: 'Framework React con SSR y routing.', en: 'React framework with SSR & routing.' }, usage: { es: 'Usado para renderizado híbrido (SSR/SSG) y ruteo. Lo apliqué para mejorar el SEO y los tiempos de carga en proyectos de cara al usuario.', en: 'Used for hybrid rendering (SSR/SSG) and routing. Applied to improve SEO and load times in user-facing projects.' } },
  { name: 'TypeScript',   color: '#3b82f6', desc: { es: 'JavaScript tipado, escalable y seguro.', en: 'Typed, scalable and safer JavaScript.' }, usage: { es: 'Tipé todo el código de front y back. Lo uso para detectar bugs temprano y documentar los contratos entre capas.', en: 'Typed the whole front and back code. I use it to catch bugs early and document contracts between layers.' } },
  { name: 'Tailwind CSS', color: '#38bdf8', desc: { es: 'Estilos utility-first ultrarrápidos.', en: 'Fast utility-first styling.' }, usage: { es: 'Estilicé toda la interfaz con utilidades. Lo elegí para iterar diseño rápido y mantener consistencia visual sin CSS disperso.', en: 'Styled the entire interface with utilities. Chosen to iterate design fast and keep visual consistency without scattered CSS.' } },
  { name: 'Framer Motion',color: '#e879a0', desc: { es: 'Animaciones fluidas para React.', en: 'Smooth animations for React.' }, usage: { es: 'Implementé animaciones de entrada, scroll y micro-interacciones. Lo uso para dar pulido y guiar la atención del usuario.', en: 'Implemented entrance, scroll and micro-interactions. I use it to add polish and guide the user\'s attention.' } },
  { name: 'Shadcn/UI',    color: '#94a3b8', desc: { es: 'Componentes accesibles y elegantes.', en: 'Accessible, elegant components.' }, usage: { es: 'Base de componentes accesibles que personalicé. Lo apliqué para acelerar el desarrollo manteniendo control total del estilo.', en: 'Accessible component base I customized. Applied to speed up development while keeping full control of styling.' } },
  { name: 'Node.js',      color: '#68a063', desc: { es: 'Runtime de JavaScript del lado servidor.', en: 'Server-side JavaScript runtime.' }, usage: { es: 'Runtime de los servicios backend y APIs. Lo elegí para compartir lenguaje en todo el stack y aprovechar su I/O no bloqueante.', en: 'Runtime for backend services and APIs. Chosen to share one language across the stack and leverage non-blocking I/O.' } },
  { name: 'NestJS',       color: '#e0234e', desc: { es: 'Backend modular y escalable.', en: 'Modular, scalable backend.' }, usage: { es: 'Estructuré APIs con módulos, providers e inyección de dependencias. Lo uso para escalar el backend con arquitectura limpia.', en: 'Structured APIs with modules, providers and DI. I use it to scale the backend with a clean architecture.' } },
  { name: 'Express',      color: '#aaaaaa', desc: { es: 'APIs REST minimalistas y rápidas.', en: 'Minimal, fast REST APIs.' }, usage: { es: 'Monté APIs REST ligeras y middlewares. Lo apliqué cuando necesité control fino y mínima sobrecarga.', en: 'Built lightweight REST APIs and middlewares. Applied when I needed fine control and minimal overhead.' } },
  { name: 'WebSockets',   color: '#f59e0b', desc: { es: 'Comunicación en tiempo real.', en: 'Real-time communication.' }, usage: { es: 'Implementé features en tiempo real como chat y notificaciones. Lo uso para comunicación bidireccional de baja latencia.', en: 'Implemented real-time features like chat and notifications. I use it for low-latency bidirectional communication.' } },
  { name: 'PostgreSQL',   color: '#4f8cc5', desc: { es: 'Base de datos relacional robusta.', en: 'Robust relational database.' }, usage: { es: 'Modelé datos relacionales con integridad y consultas complejas. Lo elegí por su robustez y soporte transaccional.', en: 'Modeled relational data with integrity and complex queries. Chosen for its robustness and transactional support.' } },
  { name: 'MongoDB',      color: '#47a248', desc: { es: 'Base de datos NoSQL flexible.', en: 'Flexible NoSQL database.' }, usage: { es: 'Almacené datos flexibles y documentos anidados. Lo apliqué en casos con esquemas cambiantes y prototipado rápido.', en: 'Stored flexible data and nested documents. Applied for changing schemas and rapid prototyping.' } },
  { name: 'Prisma',       color: '#a78bfa', desc: { es: 'ORM moderno y type-safe.', en: 'Modern, type-safe ORM.' }, usage: { es: 'ORM type-safe para acceder a la base desde TypeScript. Lo uso por sus migraciones y autocompletado seguro.', en: 'Type-safe ORM to access the DB from TypeScript. I use it for its migrations and safe autocompletion.' } },
  { name: 'TypeORM',      color: '#c75c5c', desc: { es: 'ORM maduro para TypeScript.', en: 'Mature ORM for TypeScript.' }, usage: { es: 'Mapeé entidades y relaciones en proyectos NestJS. Lo apliqué para manejar repositorios y migraciones de forma declarativa.', en: 'Mapped entities and relations in NestJS projects. Applied to handle repositories and migrations declaratively.' } },
  { name: 'Docker',       color: '#2496ed', desc: { es: 'Contenedores reproducibles.', en: 'Reproducible containers.' }, usage: { es: 'Contenericé apps y bases para entornos reproducibles. Lo uso para igualar dev y producción y simplificar deploys.', en: 'Containerized apps and databases for reproducible environments. I use it to match dev and prod and simplify deploys.' } },
  { name: 'Git',          color: '#f05032', desc: { es: 'Control de versiones distribuido.', en: 'Distributed version control.' }, usage: { es: 'Control de versiones y flujo de ramas en todos los proyectos. Lo uso para colaborar y mantener un historial limpio.', en: 'Version control and branching flow across all projects. I use it to collaborate and keep a clean history.' } },
  { name: 'Linux',        color: '#fbbf24', desc: { es: 'Entornos de servidor y CLI.', en: 'Server environments & CLI.' }, usage: { es: 'Administré servidores y entornos vía CLI. Lo uso para desplegar, automatizar tareas y depurar en producción.', en: 'Managed servers and environments via CLI. I use it to deploy, automate tasks and debug in production.' } },
  { name: 'Vercel',       color: '#e2e8f0', desc: { es: 'Deploy y hosting de frontend.', en: 'Frontend deploy & hosting.' }, usage: { es: 'Desplegé frontends con CI/CD y previews. Lo elegí por su integración directa con Git y despliegues instantáneos.', en: 'Deployed frontends with CI/CD and previews. Chosen for its direct Git integration and instant deployments.' } },
  { name: 'SOLID',        color: '#c084fc', desc: { es: 'Principios de diseño limpio.', en: 'Clean design principles.' }, usage: { es: 'Apliqué los principios para mantener el código desacoplado. Lo uso para que el sistema sea fácil de extender y testear.', en: 'Applied the principles to keep code decoupled. I use it so the system is easy to extend and test.' } },
  { name: 'Clean Arch',   color: '#818cf8', desc: { es: 'Arquitectura mantenible y testeable.', en: 'Maintainable, testable architecture.' }, usage: { es: 'Separé dominio, aplicación e infraestructura. Lo apliqué para aislar la lógica de negocio de los frameworks y los datos.', en: 'Separated domain, application and infrastructure. Applied to isolate business logic from frameworks and data.' } },
]

function fibSphere(n, r = 3.6) {
  const phi = Math.PI * (3 - Math.sqrt(5))
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (i / (n - 1)) * 2
    const rr = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = phi * i
    return new THREE.Vector3(
      rr * Math.cos(theta) * r,
      y * r * 0.6,
      rr * Math.sin(theta) * r * 0.5,
    )
  })
}

function SkillNode({ skill, home, lang, selected, onSelect, hoverCount, compact }) {
  const groupRef = useRef()
  const meshRef  = useRef()
  const haloRef  = useRef()
  const [hovered, setHovered] = useState(false)
  const isSelected = selected === skill.name

  const phase = useMemo(() => Math.random() * Math.PI * 2, [])
  const speed = useMemo(() => 0.35 + Math.random() * 0.55, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (groupRef.current) {
      const bob = hovered || isSelected ? 0 : Math.sin(t * speed + phase) * 0.1
      groupRef.current.position.set(home.x, home.y + bob, home.z)
    }
    if (meshRef.current) {
      const target = isSelected ? 2.6 : hovered ? 1.9 : 1
      const s = THREE.MathUtils.lerp(meshRef.current.scale.x, target, 0.15)
      meshRef.current.scale.setScalar(s)
    }
    if (haloRef.current) {
      const active = hovered || isSelected
      const targetOpacity = active ? (isSelected ? 0.9 : 0.35) : 0
      haloRef.current.material.opacity = THREE.MathUtils.lerp(
        haloRef.current.material.opacity, targetOpacity, 0.15,
      )
      const base = isSelected ? 1.6 + Math.sin(t * 4) * 0.14 : active ? 1 : 0.6
      const hs = THREE.MathUtils.lerp(haloRef.current.scale.x, base, 0.15)
      haloRef.current.scale.setScalar(hs)
      haloRef.current.lookAt(0, 0, 12)
    }
  })

  const enter = () => {
    setHovered(true)
    hoverCount.current += 1
    document.body.style.cursor = 'pointer'
  }
  const leave = () => {
    setHovered(false)
    hoverCount.current = Math.max(0, hoverCount.current - 1)
    document.body.style.cursor = 'auto'
  }
  const handleClick = (e) => {
    e.stopPropagation()
    onSelect(isSelected ? null : skill.name)
  }

  const accent = isSelected ? '#22c55e' : skill.color

  return (
    <group ref={groupRef} position={home.toArray()}>
      {/* Fixed-size invisible hit target: stable hover/tap area, easier on touch */}
      <mesh onPointerOver={enter} onPointerOut={leave} onClick={handleClick}>
        <sphereGeometry args={[compact ? 0.38 : 0.28, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh ref={meshRef}>
        <sphereGeometry args={[0.1, 24, 24]} />
        <meshStandardMaterial
          color={skill.color}
          emissive={accent}
          emissiveIntensity={isSelected ? 2.4 : hovered ? 1.6 : 0.3}
          metalness={0.4}
          roughness={0.2}
        />
      </mesh>

      <mesh ref={haloRef} scale={0.6}>
        <ringGeometry args={[0.16, 0.22, 48]} />
        <meshBasicMaterial color={accent} transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      <Text
        position={[0, 0.22, 0]}
        fontSize={hovered || isSelected ? 0.16 : 0.125}
        color={hovered || isSelected ? '#ffffff' : `${skill.color}cc`}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.005}
        outlineColor="#05060a"
        renderOrder={1}
      >
        {skill.name}
      </Text>

      {hovered && !isSelected && !compact && (
        <Html
          center
          distanceFactor={8}
          position={[0, -0.32, 0]}
          zIndexRange={[30, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="pointer-events-none w-48 rounded-xl border border-white/10 bg-[#0b0d14]/90 px-3 py-2 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: skill.color, boxShadow: `0 0 8px ${skill.color}` }} />
              <span className="text-sm font-semibold text-white">{skill.name}</span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-white/55">{skill.desc[lang]}</p>
            <p className="mt-1 text-[10px] font-mono text-accent2/80">{lang === 'es' ? 'click para detalles' : 'click for details'}</p>
          </div>
        </Html>
      )}
    </group>
  )
}

function buildLineGeo(pairs, homes) {
  const positions = new Float32Array(pairs.length * 6)
  pairs.forEach(([a, b], idx) => {
    positions.set(homes[a].toArray(), idx * 6)
    positions.set(homes[b].toArray(), idx * 6 + 3)
  })
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  return geo
}

function ConnectionLines({ homes, selectedIndex }) {
  const highlightRef = useRef()

  const pairs = useMemo(() => {
    const p = []
    for (let i = 0; i < homes.length; i++) {
      for (let j = i + 1; j < homes.length; j++) {
        if (homes[i].distanceTo(homes[j]) < 2.8) p.push([i, j])
      }
    }
    return p
  }, [homes])

  const baseGeo = useMemo(() => buildLineGeo(pairs, homes), [pairs, homes])

  const highlightGeo = useMemo(() => {
    if (selectedIndex == null || selectedIndex < 0) return null
    const hp = pairs.filter(([a, b]) => a === selectedIndex || b === selectedIndex)
    return buildLineGeo(hp, homes)
  }, [pairs, homes, selectedIndex])

  useFrame(({ clock }) => {
    if (highlightRef.current) {
      highlightRef.current.material.opacity = 0.6 + Math.sin(clock.getElapsedTime() * 4) * 0.35
    }
  })

  return (
    <>
      <lineSegments geometry={baseGeo}>
        <lineBasicMaterial color="#6366f1" transparent opacity={selectedIndex >= 0 ? 0.06 : 0.14} />
      </lineSegments>
      {highlightGeo && (
        <lineSegments ref={highlightRef} geometry={highlightGeo}>
          <lineBasicMaterial color="#22c55e" transparent opacity={0.9} />
        </lineSegments>
      )}
    </>
  )
}

function Cluster({ lang, selected, onSelect }) {
  const tilt = useRef()
  const spin = useRef()
  const hoverCount = useRef(0)
  const { size } = useThree()
  const homes = useMemo(() => fibSphere(SKILLS.length), [])
  const selectedIndex = useMemo(
    () => SKILLS.findIndex((s) => s.name === selected),
    [selected],
  )

  const compact = size.width < 768
  // Bigger on desktop so the graph is easier to appreciate; scales with width.
  const groupScale =
    size.width < 480 ? 0.56
    : size.width < 768 ? 0.74
    : size.width < 1280 ? 1.3
    : 1.5

  useFrame(({ pointer, clock }) => {
    const t = clock.getElapsedTime()
    // Gentle sway instead of full 360 rotation (keeps text readable)
    if (spin.current) {
      const swayY = selected ? 0 : Math.sin(t * 0.25) * 0.32
      const swayX = selected ? 0 : Math.sin(t * 0.18) * 0.08
      spin.current.rotation.y = THREE.MathUtils.lerp(spin.current.rotation.y, swayY, 0.04)
      spin.current.rotation.x = THREE.MathUtils.lerp(spin.current.rotation.x, swayX, 0.04)
    }
    // Subtle parallax tilt (reduced so it never mirrors)
    if (tilt.current) {
      const f = selected ? 0.04 : 0.14
      tilt.current.rotation.y = THREE.MathUtils.lerp(tilt.current.rotation.y, pointer.x * f, 0.05)
      tilt.current.rotation.x = THREE.MathUtils.lerp(tilt.current.rotation.x, -pointer.y * f * 0.7, 0.05)
    }
  })

  return (
    <group ref={tilt} scale={groupScale}>
      <group ref={spin}>
        <ConnectionLines homes={homes} selectedIndex={selectedIndex} />
        {SKILLS.map((skill, i) => (
          <SkillNode
            key={skill.name}
            skill={skill}
            home={homes[i]}
            lang={lang}
            selected={selected}
            onSelect={onSelect}
            hoverCount={hoverCount}
            compact={compact}
          />
        ))}
      </group>
    </group>
  )
}

function InfoPanel({ skill, lang, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      class="pointer-events-auto fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-white/10 bg-[#0b0d14]/95 p-5 shadow-2xl backdrop-blur-md sm:absolute sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-96"
    >
      <button
        onClick={onClose}
        aria-label="close"
        className="absolute right-3 top-2.5 text-xl leading-none text-white/40 transition hover:text-white"
      >
        ×
      </button>
      <div className="flex items-center gap-2.5">
        <span
          className="h-3 w-3 rounded-full"
          style={{ background: skill.color, boxShadow: `0 0 10px ${skill.color}` }}
        />
        <h4 className="text-lg font-semibold text-white">{skill.name}</h4>
        <span className="ml-auto mr-5 h-1.5 w-1.5 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />
      </div>
      <p className="mt-1 font-mono text-xs text-accent2">{skill.desc[lang]}</p>
      <p className="mt-3 text-sm leading-relaxed text-white/70">{skill.usage[lang]}</p>
    </motion.div>
  )
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  )
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [breakpoint])
  return isMobile
}

function SkillsList({ lang, selected, onSelect }) {
  return (
    <div className="mt-6">
      <ul className="flex flex-col gap-2.5">
        {SKILLS.map((skill, i) => {
          const isSelected = selected === skill.name
          return (
            <motion.li
              key={skill.name}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.3) }}
            >
              <button
                onClick={() => onSelect(isSelected ? null : skill.name)}
                className={`flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                  isSelected
                    ? 'border-[#22c55e]/60 bg-[#22c55e]/10'
                    : 'border-white/10 bg-white/[0.03] active:bg-white/[0.07]'
                }`}
              >
                <span
                  className="h-3.5 w-3.5 flex-shrink-0 rounded-full"
                  style={{ background: skill.color, boxShadow: `0 0 10px ${skill.color}` }}
                />
                <span className="flex-1 text-base font-medium text-white">{skill.name}</span>
                <span className="font-mono text-xs text-white/35">{skill.desc[lang]}</span>
              </button>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}

export default function SkillsScene() {
  const { lang } = useI18n()
  const [selected, setSelected] = useState(null)
  const isMobile = useIsMobile()
  const selectedSkill = SKILLS.find((s) => s.name === selected) || null

  return (
    <div className={isMobile ? 'pointer-events-auto relative' : 'pointer-events-auto absolute inset-0'}>
      {isMobile ? (
        <SkillsList lang={lang} selected={selected} onSelect={setSelected} />
      ) : (
        <Canvas
          camera={{ position: [0, 0, 9], fov: 55 }}
          dpr={[1, 1.5]}
          onPointerMissed={() => setSelected(null)}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 6, 5]}  intensity={1.4} color="#a855f7" />
          <pointLight      position={[-5, -3, 4]} intensity={2.2} color="#22d3ee" />
          <pointLight      position={[4,  2, -4]} intensity={1.0} color="#6366f1" />
          <Cluster lang={lang} selected={selected} onSelect={setSelected} />
        </Canvas>
      )}

      <AnimatePresence>
        {selectedSkill && (
          <InfoPanel
            key={selectedSkill.name}
            skill={selectedSkill}
            lang={lang}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
