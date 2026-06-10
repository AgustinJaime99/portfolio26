import { Mail } from 'lucide-react'
import { useI18n } from '../../i18n/LanguageContext'
import { blogMeta } from '../../data/blog'

// Newsletter signup mock. Self-contained block with its own copy.
export default function NewsletterCTA() {
  const { lang } = useI18n()
  const labels = blogMeta[lang]

  return (
    <section className="overflow-hidden rounded-3xl glass p-8 text-center sm:p-12">
      <Mail size={28} className="mx-auto text-accent2" />
      <h3 className="mt-4 text-2xl font-semibold">{labels.newsletterTitle}</h3>
      <p className="mx-auto mt-3 max-w-md text-white/55">{labels.newsletterText}</p>
      <form onSubmit={(e) => e.preventDefault()} className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
        <input
          type="email"
          placeholder={labels.newsletterPlaceholder}
          aria-label={labels.newsletterPlaceholder}
          className="flex-1 rounded-xl glass px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-accent/50"
        />
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-accent to-accent3 px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
        >
          {labels.newsletterCta}
        </button>
      </form>
    </section>
  )
}
