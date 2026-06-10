import { motion } from 'framer-motion'
import { useI18n } from '../i18n/LanguageContext'
import { blogMeta } from '../data/blog'
import { useBlogPosts } from '../hooks/useBlogPosts'
import BackLink from './blog/BackLink'
import PostSearch from './blog/PostSearch'
import FeaturedPostCard from './blog/FeaturedPostCard'
import PostCard from './blog/PostCard'
import NewsletterCTA from './blog/NewsletterCTA'

// Blog landing page. A thin layout container: data lives in useBlogPosts and
// every visual piece is its own component.
export default function Blog() {
  const { lang } = useI18n()
  const labels = blogMeta[lang]
  const { query, setQuery, featured, rest, isEmpty } = useBlogPosts()

  return (
    <main className="relative min-h-screen bg-ink">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.07]" />
      <div className="relative mx-auto max-w-6xl px-5 pb-28 pt-32 flex flex-col">
        <BackLink to="/" label={labels.backToHome} className="mb-5" />
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono text-md text-accent2">
          {labels.eyebrow}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mt-4 max-w-2xl text-4xl font-semibold sm:text-5xl"
        >
          {labels.title}
          <span className="text-gradient">{labels.titleHighlight}</span>
        </motion.h1>
        <p className="mt-5 max-w-xl leading-relaxed text-white/55">{labels.intro}</p>

        <PostSearch
          value={query}
          onChange={setQuery}
          placeholder={labels.searchPlaceholder}
          className="mt-10 max-w-md"
        />

        {featured.length > 0 && (
          <div className="mt-12 flex flex-col gap-10">
            {featured.map((post) => (
              <FeaturedPostCard key={post.slug} post={post} />
            ))}
          </div>
        )}

        {/* {rest.length > 0 && (
          <>
            <h2 className="mb-8 mt-16 font-mono text-sm uppercase tracking-wider text-white/40">{labels.allPosts}</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post, i) => (
                <PostCard key={post.slug} post={post} index={i} />
              ))}
            </div>
          </>
        )} */}

        {isEmpty && <p className="mt-16 text-center font-mono text-sm text-white/40">{labels.noResults}</p>}

        <div className="mt-24">
          {/* <NewsletterCTA /> */}
        </div>
      </div>
    </main>
  )
}
