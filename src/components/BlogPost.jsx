import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useI18n } from '../i18n/LanguageContext'
import { posts, getPost, blogMeta } from '../data/blog'
import BackLink from './blog/BackLink'
import CoverImage from './blog/CoverImage'
import PostHeader from './blog/PostHeader'
import ContentBlock from './blog/ContentBlock'
import RelatedPostCard from './blog/RelatedPostCard'

// Single-article page. Reads :slug from the route, then composes the header,
// content blocks and related posts. Each concern is its own component.
export default function BlogPost() {
  const { slug } = useParams()
  const { lang } = useI18n()
  const labels = blogMeta[lang]
  const post = getPost(slug)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  if (!post) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center bg-ink px-5 text-center">
        <p className="font-mono text-sm text-white/50">404</p>
        <BackLink to="/blog" label={labels.backToBlog} className="mt-4 text-accent2" />
      </main>
    )
  }

  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 2)

  return (
    <main className="relative min-h-screen bg-ink">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.07]" />

      <CoverImage post={post} className="h-64 w-full sm:h-80" overlay />

      <div className="relative mx-auto -mt-28 max-w-3xl px-5 pb-28">
        <BackLink to="/blog" label={labels.backToBlog} className="mb-8 text-white/60" />

        <PostHeader post={post} />

        <motion.article
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-2"
        >
          {post[lang].body.map((block, i) => (
            <ContentBlock key={i} block={block} cover={post.cover} />
          ))}
        </motion.article>

        {related.length > 0 && (
          <div className="mt-20 border-t border-white/10 pt-10">
            <h2 className="mb-6 font-mono text-sm uppercase tracking-wider text-white/40">{labels.relatedTitle}</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {related.map((r) => (
                <RelatedPostCard key={r.slug} post={r} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
