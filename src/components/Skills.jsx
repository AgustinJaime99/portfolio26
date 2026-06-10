import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../i18n/LanguageContext'
import SkillsScene from './SkillsScene'

export default function Skills() {
  const { t } = useI18n()
  const s = t.skills
  return (
    <section id="skills" className="relative isolate mx-auto max-w-6xl px-5 pt-16 pb-12 sm:overflow-hidden sm:pt-20 sm:pb-0 sm:min-h-[680px]">
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

      <Suspense fallback={null}>
        <SkillsScene />
      </Suspense>
    </section>
  )
}
