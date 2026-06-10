import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { Github, ExternalLink, Star, ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react'
import { useI18n } from '../i18n/LanguageContext'

function FullscreenViewer({ images, name, startIndex, originRect, onClose }) {
  const [current, setCurrent] = useState(startIndex)
  const [direction, setDirection] = useState(0)

  // macOS "genie" suction via clip-path funnel: the shape is a narrow neck at the
  // bottom (the card's x position) fanning out wide at the top, like liquid being
  // sucked up. A single scaleX can't do this — the width must vary along Y — so we
  // animate the clip-path polygon from funnel -> full rectangle.
  const cx = window.innerWidth / 2
  const ox = originRect ? originRect.left + originRect.width / 2 : cx
  // horizontal anchor of the neck, as % across the panel (clamped inside)
  const neckX = Math.max(6, Math.min(94, 50 + ((ox - cx) / (window.innerWidth * 0.72)) * 100))

  // Funnel: bottom pinched to `neckX`, curving outward to full width at the top.
  const funnel = (() => {
    const STEPS = 12
    const right = []
    const left = []
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS            // 0 = top, 1 = bottom
      const y = t * 100
      // ease the widening so it's a smooth curved funnel, not a triangle
      const open = Math.pow(1 - t, 1.7)   // 1 at top -> 0 at bottom
      const halfR = neckX + open * (100 - neckX)
      const halfL = neckX - open * neckX
      right.push(`${halfR}% ${y}%`)
      left.unshift(`${halfL}% ${y}%`)
    }
    return `polygon(${right.join(', ')}, ${left.join(', ')})`
  })()
  const full = (() => {
    const STEPS = 12
    const right = []
    const left = []
    for (let i = 0; i <= STEPS; i++) {
      const y = (i / STEPS) * 100
      right.push(`100% ${y}%`)
      left.unshift(`0% ${y}%`)
    }
    return `polygon(${right.join(', ')}, ${left.join(', ')})`
  })()

  const grow = {
    initial: { opacity: 0, clipPath: funnel, filter: 'blur(4px)' },
    animate: { opacity: 1, clipPath: full, filter: 'blur(0px)' },
    exit: { opacity: 0, clipPath: funnel, filter: 'blur(4px)' },
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') { setDirection(1); setCurrent((c) => (c + 1) % images.length) }
      if (e.key === 'ArrowLeft') { setDirection(-1); setCurrent((c) => (c === 0 ? images.length - 1 : c - 1)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [images.length, onClose])

  const go = (idx) => {
    if (idx === current) return
    setDirection(idx > current ? 1 : -1)
    setCurrent(idx)
  }

  // macOS-style easing: smooth deceleration with a subtle overshoot, no bounce.
  const macEase = [0.32, 0.72, 0, 1]

  return createPortal(
    <motion.div
      variants={{
        hidden: { opacity: 0, transition: { duration: 0.3, ease: macEase, delay: 0.3 } },
        visible: { opacity: 1, transition: { duration: 0.3, ease: macEase } },
      }}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-red/90 p-4 backdrop-blur-2xl"
      onClick={onClose}
    >
      <motion.div
        initial={grow.initial}
        animate={grow.animate}
        exit={grow.exit}
        transition={{
          clipPath: { duration: 1.5, ease: macEase },
          opacity: { duration: 1, ease: macEase },
          filter: { duration: 1, ease: macEase },
        }}
        style={{ willChange: 'clip-path, filter' }}
        className="relative w-full max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-[65vh]">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.img
              key={current}
              src={images[current]}
              alt={`${name} ${current + 1}`}
              style={{ borderRadius: 16 }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 h-full w-full bg-[#0b0d14] object-contain"
              draggable={false}
            />
          </AnimatePresence>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); go(current === 0 ? images.length - 1 : current - 1) }}
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2.5 text-white/80 backdrop-blur-sm transition-all hover:scale-110 hover:bg-black/80 hover:text-white"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); go((current + 1) % images.length) }}
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2.5 text-white/80 backdrop-blur-sm transition-all hover:scale-110 hover:bg-black/80 hover:text-white"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}

          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-1.5 text-white/70 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {images.length > 1 && (
          <div className="mt-4 flex justify-center gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <motion.button
                key={i}
                onClick={(e) => { e.stopPropagation(); go(i) }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                className={`h-14 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-300 ${
                  i === current ? 'border-white/70 opacity-100' : 'border-white/10 opacity-40 hover:opacity-70'
                }`}
              >
                <img src={img} alt="" className="h-full w-full object-cover object-top" draggable={false} />
              </motion.button>
            ))}
          </div>
        )}

        <p className="mt-2 text-center font-mono text-xs text-white/40">
          {current + 1} / {images.length}
        </p>
      </motion.div>
    </motion.div>,
    document.body
  )
}

function ProjectCarousel({ images = [], name, className = '' }) {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)
  const [paused, setPaused] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [originRect, setOriginRect] = useState(null)
  const containerRef = useRef(null)
  const valid = images.filter(Boolean)

  const openFullscreen = (e) => {
    e.stopPropagation()
    if (containerRef.current) {
      const r = containerRef.current.getBoundingClientRect()
      setOriginRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    setFullscreen(true)
  }

  useEffect(() => {
    if (paused || valid.length <= 1) return
    const id = setInterval(() => {
      setDirection(1)
      setCurrent((c) => (c + 1) % valid.length)
    }, 3500)
    return () => clearInterval(id)
  }, [paused, valid.length])

  const go = (idx) => {
    if (idx === current) return
    setDirection(idx > current ? 1 : -1)
    setCurrent(idx)
  }
  const prev = (e) => { e.stopPropagation(); go(current === 0 ? valid.length - 1 : current - 1) }
  const next = (e) => { e.stopPropagation(); go((current + 1) % valid.length) }

  if (!valid.length) return null

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.img
          layoutId={fullscreen ? `pimg-${name}` : undefined}
          key={current}
          src={valid[current]}
          alt={`${name} ${current + 1}`}
          style={{ borderRadius: 16 }}
          custom={direction}
          variants={{
            enter: (d) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
            center: { x: 0, opacity: 1 },
            exit: (d) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 h-full w-full object-cover object-top"
          draggable={false}
        />
      </AnimatePresence>

      {valid.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white/80 opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:scale-110 hover:bg-black/70 hover:text-white"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white/80 opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:scale-110 hover:bg-black/70 hover:text-white"
          >
            <ChevronRight size={16} />
          </button>
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
            {valid.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); go(i) }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current
                    ? 'w-5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.7)]'
                    : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
      <button
        onClick={openFullscreen}
        className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-1.5 text-white/70 opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-black/70 hover:text-white"
      >
        <Maximize2 size={14} />
      </button>
      <AnimatePresence>
        {fullscreen && (
          <FullscreenViewer
            images={valid}
            name={name}
            startIndex={current}
            originRect={originRect}
            onClose={() => setFullscreen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function FeaturedCard({ project, index, labels }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [60, -60])
  const reverse = index % 2 === 1

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-120px' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="grid items-center gap-8 lg:grid-cols-2"
    >
      <motion.div
        style={{ y }}
        className={`relative ${reverse ? 'lg:order-2' : ''}`}
      >
        <div className="group relative overflow-hidden rounded-2xl border border-white/10">
          {project.images?.length > 0 ? (
            <div className="relative h-64">
              <ProjectCarousel images={project.images} name={project.name} className="h-full" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0d14]/85 via-[#0b0d14]/10 to-transparent" />
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-end justify-between p-5">
                <span className="rounded-lg bg-white/10 px-3 py-1 font-mono text-xs text-accent2 backdrop-blur-sm">
                  {labels.featuredBadge}
                </span>
                <span className="font-mono text-4xl font-bold text-white/15">0{index + 1}</span>
              </div>
            </div>
          ) : (
            <div className="glass p-8">
              <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-accent/40 to-accent3/30 blur-3xl" />
              <div className="relative flex h-56 flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-white/5 px-3 py-1 font-mono text-xs text-accent2">
                    {labels.featuredBadge}
                  </span>
                  <span className="font-mono text-5xl font-bold text-white/10">0{index + 1}</span>
                </div>
                <div className="font-mono text-sm text-white/40">
                  <p className="text-white/70">{'<'}{project.name.replace(/\s/g, '')} {'/>'}</p>
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {project.tags.map((t) => (
                      <span key={t} className="text-accent3/80">#{t}</span>
                    ))}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <div className={reverse ? 'lg:order-1' : ''}>
        <h3 className="text-2xl font-semibold sm:text-3xl">{project.name}</h3>
        <p className="mt-4 leading-relaxed text-white/60">{project.description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {project.tags.map((t) => (
            <span key={t} className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/65">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-7 flex items-center gap-4">
          {project.live && (
            <a
              href={project.live}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent3 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              {labels.viewDemo} <ExternalLink size={15} />
            </a>
          )}
          <a
            href={project.repo}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-2.5 text-sm text-white/80 transition hover:border-white/40 hover:bg-white/5"
          >
            {labels.code} <Github size={15} />
          </a>
        </div>
      </div>
    </motion.article>
  )
}

export default function Projects() {
  const { t } = useI18n()
  const p = t.projects
  const featured = p.items.filter((x) => x.featured)
  const others = p.items.filter((x) => !x.featured)

  return (
    <section id="projects" className="relative mx-auto max-w-6xl px-5 py-28">
      <motion.span
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="font-mono text-sm text-accent2"
      >
        {p.eyebrow}
      </motion.span>
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="mt-4 max-w-2xl text-3xl font-semibold sm:text-4xl"
      >
        {p.titleStart}<span className="text-gradient">{p.titleHighlight}</span>
      </motion.h2>

      <div className="mt-16 flex flex-col gap-24">
        {featured.map((proj, i) => (
          <FeaturedCard key={proj.name} project={proj} index={i} labels={p} />
        ))}
      </div>

      <h3 className="mb-8 mt-24 font-mono text-sm uppercase tracking-wider text-white/40">
        {p.othersTitle}
      </h3>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {others.map((proj, i) => (
          <motion.div
            key={proj.name}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: i * 0.08 }}
            whileHover={{ y: -6 }}
            className="group flex flex-col rounded-2xl glass overflow-hidden transition-colors hover:border-accent/40"
          >
            {proj.images?.length > 0 && (
              <div className="relative h-40 flex-shrink-0">
                <ProjectCarousel images={proj.images} name={proj.name} className="h-full" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0d14]/60 to-transparent" />
              </div>
            )}
            <div className="flex flex-col flex-1 p-6">
              <div className="mb-4 flex items-center justify-between">
                <Star size={20} className="text-accent2" />
                <div className="flex gap-3 text-white/50">
                  <a href={proj.repo} target="_blank" rel="noreferrer" className="transition hover:text-white">
                    <Github size={18} />
                  </a>
                  {proj.live && (
                    <a href={proj.live} target="_blank" rel="noreferrer" className="transition hover:text-white">
                      <ExternalLink size={18} />
                    </a>
                  )}
                </div>
              </div>
              <h4 className="text-lg font-semibold">{proj.name}</h4>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-white/55">{proj.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {proj.tags.map((tag) => (
                  <span key={tag} className="font-mono text-xs text-accent3/80">#{tag}</span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-14 text-center">
        <a
          href="https://github.com/AgustinJaime99"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm text-white/80 transition hover:border-white/40 hover:bg-white/5"
        >
          {p.viewMore} <Github size={16} />
        </a>
      </div>
    </section>
  )
}
