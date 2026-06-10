// The cover used by every post surface (cards, hero, related). Prefers a real
// `coverImage` when the post provides one and falls back to the `cover`
// gradient otherwise, so both styles share the same grid + overlay treatment.
export default function CoverImage({ post, className = '', children, overlay = false }) {
  const hasImage = Boolean(post.coverImage)
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={hasImage ? undefined : { background: post.cover }}
    >
      {hasImage && (
        <img
          src={post.coverImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 grid-bg opacity-30" />
      {overlay && <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />}
      {children}
    </div>
  )
}
