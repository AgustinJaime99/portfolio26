import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useI18n } from '../../i18n/LanguageContext'
import { blogMeta } from '../../data/blog'
import CoverImage from './CoverImage'
import PostMeta from './PostMeta'
import TagList from './TagList'

// Large split card for featured posts. Single responsibility: present one
// featured post and link to it.
export default function FeaturedPostCard({ post }) {
  const { lang } = useI18n()
  const labels = blogMeta[lang]
  const l = post[lang]

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={`/blog/${post.slug}`}
        className="group grid items-stretch gap-6 overflow-hidden rounded-3xl glass transition-colors hover:border-accent/40 lg:grid-cols-2"
      >
        <CoverImage post={post} className="min-h-56">
          <span className="absolute left-5 top-5 rounded-lg bg-black/30 px-3 py-1 font-mono text-xs text-white backdrop-blur-sm">
            {labels.featured}
          </span>
          <TagList tags={post.tags} variant="overlay" className="absolute bottom-0 left-0 right-0 p-5" />
        </CoverImage>

        <div className="flex flex-col justify-center p-7">
          <PostMeta post={post} className="mb-4" />
          <h3 className="text-2xl font-semibold leading-snug transition-colors group-hover:text-gradient sm:text-3xl">
            {l.title}
          </h3>
          <p className="mt-4 leading-relaxed text-white/55">{l.excerpt}</p>
          <span className="mt-6 inline-flex items-center gap-2 font-mono text-sm text-accent2 transition-transform group-hover:translate-x-1">
            {labels.readMore} <ArrowRight size={15} />
          </span>
        </div>
      </Link>
    </motion.div>
  )
}
