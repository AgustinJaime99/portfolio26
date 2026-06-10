import { useMemo, useState } from 'react'
import { posts } from '../data/blog'
import { useI18n } from '../i18n/LanguageContext'

// Owns the blog list's data concern: holds the search query and derives the
// filtered/partitioned posts for the active language. Keeps the page component
// purely about layout (separation of concerns).
export function useBlogPosts() {
  const { lang } = useI18n()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return posts
    return posts.filter((post) => {
      const l = post[lang]
      return (
        l.title.toLowerCase().includes(q) ||
        l.excerpt.toLowerCase().includes(q) ||
        post.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    })
  }, [query, lang])

  return {
    query,
    setQuery,
    featured: filtered.filter((p) => p.featured),
    rest: filtered.filter((p) => !p.featured),
    isEmpty: filtered.length === 0,
  }
}
