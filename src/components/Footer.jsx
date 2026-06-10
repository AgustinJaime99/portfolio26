import { Github, Linkedin } from 'lucide-react'
import { useI18n } from '../i18n/LanguageContext'

export default function Footer() {
  const { t, meta } = useI18n()
  return (
    <footer className="border-t border-white/5 px-5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="font-mono text-sm text-white/40">
          <span className="text-gradient">AJ</span>.dev — © {new Date().getFullYear()} {meta.name}
        </p>
        <p className="text-xs text-white/30">
          {t.footer.built}
        </p>
        <div className="flex gap-4">
          <a href={meta.github} target="_blank" rel="noreferrer" className="text-white/50 transition hover:text-accent2">
            <Github size={19} />
          </a>
          <a href={meta.linkedin} target="_blank" rel="noreferrer" className="text-white/50 transition hover:text-accent2">
            <Linkedin size={19} />
          </a>
        </div>
      </div>
    </footer>
  )
}
