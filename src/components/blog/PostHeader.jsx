import { motion } from 'framer-motion'
import { useI18n } from '../../i18n/LanguageContext'
import TagList from './TagList'
import PostMeta from './PostMeta'
import ShareButton from './ShareButton'

// Article header: tags, title, meta line and share action.
export default function PostHeader({ post }) {
  const { lang } = useI18n()
  const l = post[lang]

  return (
    <motion.header
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <TagList tags={post.tags} variant="pill" />
      <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">{l.title}</h1>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <PostMeta post={post} dateStyle="long" withPrefix />
        {/* <ShareButton title={l.title} /> */}
      </div>
    </motion.header>
  )
}
