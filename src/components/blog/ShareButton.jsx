import { Share2 } from 'lucide-react'
import { useI18n } from '../../i18n/LanguageContext'
import { blogMeta } from '../../data/blog'

// Share via the Web Share API, falling back to copying the URL. Owns its own
// side effect so the article view stays declarative.
export default function ShareButton({ title }) {
  const { lang } = useI18n()
  const labels = blogMeta[lang]

  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {
        /* user cancelled */
      }
    } else {
      navigator.clipboard?.writeText(url)
    }
  }

  return (
    <button
      onClick={share}
      className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 font-mono text-xs text-white/70 transition hover:border-white/40 hover:text-white"
    >
      <Share2 size={14} /> {labels.share}
    </button>
  )
}
