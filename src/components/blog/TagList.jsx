// Renders a post's tags. Two visual variants share the same data so callers
// don't reimplement the list (DRY): `pill` (bordered chips) and `mono` (inline).
const VARIANTS = {
  pill: 'rounded-md border border-white/10 px-2.5 py-1 text-xs text-accent3/80',
  mono: 'font-mono text-xs text-accent3/80',
  overlay: 'rounded-md bg-black/30 px-2 py-0.5 font-mono text-xs text-white/90 backdrop-blur-sm',
}

export default function TagList({ tags, variant = 'mono', className = '' }) {
  const itemClass = VARIANTS[variant] ?? VARIANTS.mono
  const prefix = variant === 'mono' ? '#' : variant === 'overlay' ? '#' : ''
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <span key={tag} className={`font-mono ${itemClass}`}>
          {prefix}
          {tag}
        </span>
      ))}
    </div>
  )
}
