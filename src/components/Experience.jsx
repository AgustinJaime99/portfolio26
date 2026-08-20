import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { Briefcase } from 'lucide-react'
import { useI18n } from '../i18n/LanguageContext'
/* Lazy so three.js does not ship with the initial page.
 * These decorative scenes pulled the whole 3D engine (~1.3MB raw) into the
 * home bundle, which every reader paid for before the first paragraph
 * rendered. The Suspense boundary below already existed, so deferring the
 * import is the entire change — nothing about how the scene looks moves. */
const ExperienceScene = lazy(() => import('./ExperienceScene'))

const NODE_COLORS = ['#22d3ee', '#a855f7', '#6366f1', '#818cf8', '#c084fc']

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

// Detail card for the currently focused experience.
function ExperienceCard({ item, index, color }) {
  return (
    <motion.article
      key={item.company}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl glass p-6 sm:p-7"
    >
      <div className="flex items-center gap-2 font-mono text-xs text-white/40">
        <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
        {item.period}
        <span className="ml-auto text-2xl font-bold text-white/10">0{index + 1}</span>
      </div>
      <h3 className="mt-3 text-xl font-semibold sm:text-2xl">{item.role}</h3>
      <p className="font-mono text-sm" style={{ color }}>{item.company}</p>
      <p className="mt-3 leading-relaxed text-white/60">{item.summary}</p>
      <ul className="mt-4 space-y-2">
        {item.highlights.map((h, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-white/65">
            <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full" style={{ background: color }} />
            {h}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        {item.tags.map((t) => (
          <span key={t} className="rounded-md border border-white/10 px-2.5 py-1 font-mono text-xs text-white/65">
            {t}
          </span>
        ))}
      </div>
    </motion.article>
  )
}

// Desktop: a tall scroll track with a sticky 3D scene; scrolling walks the
// camera from one experience node to the next and swaps the detail card.
function ScrollExperience({ items, copy }) {
  const trackRef = useRef(null)
  const progress = useRef(0) // shared with the Canvas, read per frame
  const [active, setActive] = useState(0)

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  })

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    progress.current = v
    const idx = Math.min(items.length - 1, Math.round(v * (items.length - 1)))
    setActive(idx)
  })

  return (
    // Track height gives one viewport of scroll per experience (+1 for breathing room).
    <div ref={trackRef} className="relative" style={{ height: `${(items.length + 1) * 100}vh` }}>
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-6 px-5 lg:grid-cols-2">
          <div className="relative h-[45vh] lg:h-[70vh]">
            <Suspense fallback={null}>
              <ExperienceScene items={items} progress={progress} />
            </Suspense>
            {/* Progress dots */}
            <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-2">
              {items.map((_, i) => (
                <span
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === active ? 22 : 6,
                    background: i === active ? NODE_COLORS[i % NODE_COLORS.length] : 'rgba(255,255,255,0.25)',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
              <ExperienceCard
                key={items[active].company}
                item={items[active]}
                index={active}
                color={NODE_COLORS[active % NODE_COLORS.length]}
              />
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

// Mobile: lightweight vertical timeline, no Canvas — better performance and
// touch ergonomics.
function MobileTimeline({ items }) {
  return (
    <div className="relative mt-10 pl-6">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-accent2 via-accent3 to-accent/40" />
      <div className="flex flex-col gap-8">
        {items.map((item, i) => {
          const color = NODE_COLORS[i % NODE_COLORS.length]
          return (
            <motion.article
              key={item.company}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="relative"
            >
              <span
                className="absolute -left-[22px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-ink"
                style={{ background: color, boxShadow: `0 0 10px ${color}` }}
              />
              <div className="rounded-2xl glass p-5">
                <p className="font-mono text-xs text-white/40">{item.period}</p>
                <h3 className="mt-1 text-lg font-semibold">{item.role}</h3>
                <p className="font-mono text-sm" style={{ color }}>{item.company}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{item.summary}</p>
                <ul className="mt-3 space-y-1.5">
                  {item.highlights.map((h, hi) => (
                    <li key={hi} className="flex gap-2 text-[13px] leading-relaxed text-white/65">
                      <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full" style={{ background: color }} />
                      {h}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.tags.map((t) => (
                    <span key={t} className="font-mono text-xs text-accent3/80">#{t}</span>
                  ))}
                </div>
              </div>
            </motion.article>
          )
        })}
      </div>
    </div>
  )
}

export default function Experience() {
  const { t } = useI18n()
  const e = t.experience
  const isMobile = useIsMobile()

  return (
    <section id="experience" className="relative">
      <div className="mx-auto max-w-6xl px-5 pt-24 sm:pt-28">
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="font-mono text-sm text-accent2"
        >
          {e.eyebrow}
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mt-3 max-w-xl text-3xl font-semibold sm:text-4xl"
        >
          {e.titleStart}<span className="text-gradient">{e.titleHighlight}</span>
        </motion.h2>
        <p className="mt-2 flex items-center gap-2 font-mono text-xs text-white/35">
          <Briefcase size={13} /> {e.hint}
        </p>
      </div>

      {isMobile ? (
        <div className="mx-auto max-w-6xl px-5 pb-8">
          <MobileTimeline items={e.items} />
        </div>
      ) : (
        <ScrollExperience items={e.items} copy={e} />
      )}
    </section>
  )
}
