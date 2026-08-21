import { Suspense, lazy } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, Github, Linkedin, Sparkles } from 'lucide-react'
/* Lazy so three.js does not ship with the initial page.
 * These decorative scenes pulled the whole 3D engine (~1.3MB raw) into the
 * home bundle, which every reader paid for before the first paragraph
 * rendered. The Suspense boundary below already existed, so deferring the
 * import is the entire change — nothing about how the scene looks moves. */
const Scene3D = lazy(() => import('./Scene3D'))
import { useI18n } from '../i18n/LanguageContext'
import { useTransitionPhase } from '../transition/useTransitionPhase'
import { isDimming } from '../transition/warpStore'

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

  /* When EXPLORE is engaged, everything in this section that is NOT the canvas
   * steps aside. The scene keeps rendering underneath and becomes the whole
   * screen — which is the trick: the visitor never sees a new surface appear,
   * they see the site get out of the way of one that was already there. */
  const phase = useTransitionPhase()
  const dimming = isDimming(phase)

  /* The moment the destination takes over. Separate from `dimming`: the UI
     yields early and gradually, but the section itself only disappears at the
     very end, once the breach is at full white and there is nothing to see. */
  const handingOver = phase === 'routing' || phase === 'interactive-entry'

  /* Subtle and uniform: opacity to 0 with an 8px lift. The brief is explicit
     that the UI must not "fly away" — it yields, it does not exit. */
  const fade = dimming
    ? { opacity: 0, y: -8, transition: { duration: 0.5, ease: [0.4, 0, 1, 1] } }
    : {}

  return (
    /* z-10 and an opaque background so the hero reliably covers the staged
     * /interactive scene sitting at z-1 behind it. Without both, that scene's
     * own fixed, opaque root shows through during the warm-up.
     *
     * At the peak the whole section fades out, which is what UNCOVERS the
     * staged scene — the reveal is the Home getting out of the way, not the
     * destination arriving. That is the entire trick, expressed in one
     * property. */
    <section
      id="home"
      style={{
        opacity: handingOver ? 0 : 1,
        transition: 'opacity 220ms linear',
      }}
      className="relative z-10 flex min-h-screen items-center overflow-hidden bg-[#05060a]"
    >
      {/* UNMOUNT THE HERO CANVAS ONCE THE DESTINATION HAS TAKEN OVER.
       *
       * Two live WebGL contexts is one more than some machines allow. Verified:
       * with both canvases mounted the browser logged "THREE.WebGLRenderer:
       * Context Lost" four times, the staged scene's warm-up never ran, and the
       * multi-second stall at the reveal was the context being recovered — not
       * shader compilation, which is what it looked like from the outside.
       *
       * Dropping this one at handover keeps exactly one context alive at a
       * time. It is safe precisely here: the hero has already faded to zero, so
       * there is nothing on screen to lose. */}
      {!handingOver && (
        <Suspense fallback={null}>
          <Scene3D />
        </Suspense>
      )}

      {/* These two sit ABOVE the canvas and tint it. They have to clear as
          well, or the dive happens behind a scrim and a grid — the starfield
          would visibly stay muted at exactly the moment it should take over. */}
      <motion.div
        aria-hidden
        animate={{ opacity: dimming ? 0 : 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 1, 1] }}
        className="pointer-events-none absolute inset-0 -z-[5] bg-gradient-to-b from-transparent via-transparent to-ink"
      />
      <motion.div
        aria-hidden
        animate={{ opacity: dimming ? 0 : 0.4 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 1, 1] }}
        className="pointer-events-none absolute inset-0 -z-[5] grid-bg"
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate={dimming ? fade : 'show'}
        style={dimming ? { pointerEvents: 'none' } : undefined}
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
        animate={{ opacity: dimming ? 0 : 1 }}
        transition={dimming ? { duration: 0.35 } : { delay: 1.4 }}
        style={dimming ? { pointerEvents: 'none' } : undefined}
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
