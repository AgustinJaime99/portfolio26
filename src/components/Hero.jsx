import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, Github, Linkedin, Sparkles } from 'lucide-react'
import Scene3D from './Scene3D'
import { useI18n } from '../i18n/LanguageContext'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
}
const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
}

export default function Hero() {
  const { t, meta } = useI18n()
  const h = t.hero
  return (
    <section id="home" className="relative flex min-h-screen items-center overflow-hidden">
      <Suspense fallback={null}>
        <Scene3D />
      </Suspense>

      <div className="pointer-events-none absolute inset-0 -z-[5] bg-gradient-to-b from-transparent via-transparent to-ink" />
      <div className="pointer-events-none absolute inset-0 -z-[5] grid-bg opacity-40" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-6xl px-5"
      >
        {/* <motion.div
          variants={item}
          className="mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm text-white/70"
        >
          <Sparkles size={15} className="text-accent2" />
          {h.badge}
        </motion.div> */}

        <motion.p variants={item} className="mb-3 font-mono text-sm text-accent2">
          {h.greeting}
        </motion.p>

        <motion.h1
          variants={item}
          className="text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl lg:text-8xl"
        >
          {meta.firstName} <span className="text-gradient">{meta.lastName}</span>
        </motion.h1>

        <motion.h2
          variants={item}
          className="mt-4 text-2xl font-light text-white/80 sm:text-4xl"
        >
          {h.role}{' '}
          <span className="text-shimmer font-medium">· {h.tagline}</span>
        </motion.h2>

        <motion.p variants={item} className="mt-6 max-w-xl text-base leading-relaxed text-white/55">
          {h.intro}
        </motion.p>

        <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-4">
          <a
            href="#projects"
            className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-accent to-accent3 px-7 py-3.5 font-medium text-white transition glow"
          >
            <span className="relative z-10">{h.viewProjects}</span>
          </a>
          <a
            href="#contact"
            className="rounded-xl border border-white/15 px-7 py-3.5 font-medium text-white/85 transition hover:border-white/40 hover:bg-white/5"
          >
            {h.contact}
          </a>
          <div className="flex items-center gap-3 pl-2">
            <a href={meta.github} target="_blank" rel="noreferrer" className="text-white/60 transition hover:text-accent2">
              <Github size={22} />
            </a>
            <a href={meta.linkedin} target="_blank" rel="noreferrer" className="text-white/60 transition hover:text-accent2">
              <Linkedin size={22} />
            </a>
          </div>
        </motion.div>
      </motion.div>

      <motion.a
        href="#about"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          className="flex flex-col items-center gap-2 text-xs"
        >
          {h.scroll}
          <ArrowDown size={16} />
        </motion.div>
      </motion.a>
    </section>
  )
}
