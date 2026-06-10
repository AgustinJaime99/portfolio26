import { Calendar, Clock } from 'lucide-react'
import { useI18n } from '../../i18n/LanguageContext'
import { blogMeta } from '../../data/blog'
import { formatDate } from '../../lib/formatDate'

// Date + reading-time line. Owns its own copy/locale lookup so any card or
// header can drop it in without wiring labels through props.
export default function PostMeta({ post, dateStyle = 'short', withPrefix = false, className = '' }) {
  const { lang } = useI18n()
  const labels = blogMeta[lang]
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-white/45 ${className}`}>
      <span className="inline-flex items-center gap-1.5">
        <Calendar size={13} />
        {withPrefix ? `${labels.publishedOn} ` : ''}
        {formatDate(post.date, lang, dateStyle)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock size={13} /> {post.readingTime} {labels.minRead}
      </span>
    </div>
  )
}
