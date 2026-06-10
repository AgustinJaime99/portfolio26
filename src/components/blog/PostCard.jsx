import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useI18n } from '../../i18n/LanguageContext'
import CoverImage from './CoverImage'
import PostMeta from './PostMeta'
import TagList from './TagList'

// Compact grid card for non-featured posts.
export default function PostCard({ post, index = 0 }) {
  const { lang } = useI18n()
  const l = post[lang]

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: index * 0.08 }}
      whileHover={{ y: -6 }}
    >
      <Link
        to={`/blog/${post.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl glass transition-colors hover:border-accent/40"
      >
        <CoverImage post={post} className="h-36" />
        <div className="flex flex-1 flex-col p-6">
          <PostMeta post={post} className="mb-3" />
          <h4 className="text-lg font-semibold leading-snug transition-colors group-hover:text-accent2">
            {l.title}
          </h4>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-white/55">{l.excerpt}</p>
          <TagList tags={post.tags} variant="mono" className="mt-4" />
        </div>
      </Link>
    </motion.div>
  )
}
