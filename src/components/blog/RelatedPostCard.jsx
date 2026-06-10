import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useI18n } from '../../i18n/LanguageContext'
import { blogMeta } from '../../data/blog'
import CoverImage from './CoverImage'

// Small "keep reading" card shown at the bottom of an article.
export default function RelatedPostCard({ post }) {
  const { lang } = useI18n()
  const labels = blogMeta[lang]

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl glass text-left transition-colors hover:border-accent/40"
    >
      <CoverImage post={post} className="h-24" />
      <div className="p-5">
        <h3 className="font-semibold leading-snug transition-colors group-hover:text-accent2">
          {post[lang].title}
        </h3>
        <span className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-accent2 transition-transform group-hover:translate-x-1">
          {labels.readMore} <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  )
}
