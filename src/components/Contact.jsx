import { motion } from 'framer-motion'
import { Github, Linkedin, Mail, ArrowUpRight } from 'lucide-react'
import { useI18n } from '../i18n/LanguageContext'

const icons = { github: Github, linkedin: Linkedin }

export default function Contact() {
  const { t, meta } = useI18n()
  const c = t.contact
  const hrefs = { github: meta.github, linkedin: meta.linkedin }
  return (
    <section id="contact" className="relative mx-auto max-w-6xl px-5 py-28">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl border border-white/10 glass p-10 text-center sm:p-16"
      >
        <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/30 blur-[100px]" />
        <span className="relative font-mono text-sm text-accent2">{c.eyebrow}</span>
        <h2 className="relative mt-5 text-4xl font-bold sm:text-6xl">
          {c.titleStart}<span className="text-gradient">{c.titleHighlight}</span>{c.titleEnd}
        </h2>
        <p className="relative mx-auto mt-5 max-w-xl text-white/60">
          {c.description}
        </p>

        <div className="relative mt-9 flex flex-wrap justify-center gap-4">
          <a
            href={meta.linkedin}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent3 px-7 py-3.5 font-medium text-white transition hover:opacity-90 glow"
          >
            <Mail size={18} /> {c.sendMessage}
          </a>
        </div>

        <div className="relative mx-auto mt-12 grid max-w-lg gap-4 sm:grid-cols-2">
          {c.links.map((l) => {
            const Icon = icons[l.key]
            return (
            <a
              key={l.key}
              href={hrefs[l.key]}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-accent/40 hover:bg-white/[0.07]"
            >
              <span className="rounded-xl bg-white/10 p-3 text-accent2">
                <Icon size={20} />
              </span>
              <span className="flex-1">
                <span className="block text-xs text-white/45">{l.label}</span>
                <span className="block text-sm text-white/85">{l.value}</span>
              </span>
              <ArrowUpRight size={18} className="text-white/40 transition group-hover:text-white" />
            </a>
          )})}
        </div>
      </motion.div>
    </section>
  )
}
