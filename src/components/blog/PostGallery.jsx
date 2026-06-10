import { motion } from 'framer-motion'
import { ImageIcon } from 'lucide-react'

// Image gallery for an article. Each item may carry a real `src`; when it
// doesn't, the slot falls back to the post's cover gradient as a placeholder so
// the section looks intentional even before real screenshots exist.
export default function PostGallery({ items = [], cover, caption }) {
  if (!items.length) return null

  return (
    <figure className="my-10">
      <div className={`grid gap-4 ${items.length === 1 ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="group relative aspect-video overflow-hidden rounded-2xl border border-white/10"
            style={{ background: cover }}
          >
            <div className="absolute inset-0 grid-bg opacity-30" />
            {item.src ? (
              <img
                src={item.src}
                alt={item.alt || ''}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
                <ImageIcon size={26} />
                {item.label && <span className="font-mono text-xs">{item.label}</span>}
              </div>
            )}
          </motion.div>
        ))}
      </div>
      {caption && (
        <figcaption className="mt-3 text-center font-mono text-xs text-white/40">{caption}</figcaption>
      )}
    </figure>
  )
}
