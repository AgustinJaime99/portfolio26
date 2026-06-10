import { motion } from 'framer-motion'
import { useI18n } from '../i18n/LanguageContext'

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
}

export default function About() {
  const { t, meta } = useI18n()
  const a = t.about
  return (
    <section id="about" className="relative mx-auto max-w-6xl px-5 py-28">
      <motion.span
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="font-mono text-sm text-accent2"
      >
        {a.eyebrow}
      </motion.span>

      <div className="mt-10 grid items-start gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className="relative"
        >
          <div className="relative mx-auto w-fit">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-accent/40 via-accent3/30 to-accent2/40 blur-2xl" />
            <img
              src={meta.avatar}
              alt={meta.name}
              className="relative w-64 rounded-3xl border border-white/10 object-cover animate-float"
            />
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {a.stats.map((s, i) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                custom={i + 1}
                className="rounded-xl glass p-4 text-center"
              >
                <div className="text-2xl font-bold text-gradient">{s.value}</div>
                <div className="mt-1 text-xs text-white/50">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
        >
          <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
            {a.titleStart}
            <span className="text-gradient">{a.titleHighlight}</span>{a.titleEnd}
          </h2>
          <p className="mt-6 leading-relaxed text-white/60">
            {a.description}
          </p>

          <h3 className="mt-9 mb-4 font-mono text-sm uppercase tracking-wider text-white/40">
            {a.whatIDoTitle}
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {a.whatIDo.map((d, i) => (
              <motion.li
                key={d}
                variants={fadeUp}
                custom={i}
                className="flex items-start gap-3 text-sm text-white/75"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-accent to-accent2" />
                {d}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  )
}
