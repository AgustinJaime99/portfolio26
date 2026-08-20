import { Suspense, lazy } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../i18n/LanguageContext'
/* Lazy so three.js does not ship with the initial page.
 * These decorative scenes pulled the whole 3D engine (~1.3MB raw) into the
 * home bundle, which every reader paid for before the first paragraph
 * rendered. The Suspense boundary below already existed, so deferring the
 * import is the entire change — nothing about how the scene looks moves. */
const SkillsScene = lazy(() => import('./SkillsScene'))

export default function Skills() {
  const { t } = useI18n()
  const s = t.skills
  return (
    <section id="skills" className="relative isolate mx-auto max-w-6xl px-5 pt-28 pb-12 sm:overflow-hidden sm:pt-20 sm:pb-0 sm:min-h-[820px] lg:min-h-[900px]">
      <div className="relative z-10 pointer-events-none">
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="font-mono text-sm text-accent2"
        >
          {s.eyebrow}
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mt-3 max-w-xl text-3xl font-semibold sm:text-4xl"
        >
          {s.titleStart}<span className="text-gradient">{s.titleHighlight}</span>
        </motion.h2>
        <p className="mt-2 text-xs text-white/35 font-mono">
          {s.hint ?? 'hover · move cursor to interact'}
        </p>
      </div>

      {/* Offset the 3D scene below the title block on desktop so the graph
          doesn't overlap the heading. On mobile SkillsScene renders a normal
          list (not absolute), so this wrapper is a no-op there. */}
      <div className="sm:absolute sm:inset-x-5 sm:bottom-0 sm:top-40">
        <Suspense fallback={null}>
          <SkillsScene />
        </Suspense>
      </div>
    </section>
  )
}
