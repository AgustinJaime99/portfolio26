import PostGallery from './PostGallery'

// Renders one typed content block. Open/Closed: to support a new block type add
// an entry to RENDERERS — no switch to edit and no consumer changes. Renderers
// receive (block, ctx) where ctx carries page-level data like the cover
// gradient. Unknown types fall back to a paragraph.
const RENDERERS = {
  h2: (block) => <h2 className="mt-12 text-2xl font-semibold sm:text-3xl">{block.text}</h2>,
  quote: (block) => (
    <blockquote className="my-8 border-l-2 border-accent/60 pl-5 text-lg italic text-white/75">
      {block.text}
    </blockquote>
  ),
  code: (block) => (
    <pre className="my-6 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-5 font-mono text-sm leading-relaxed text-accent3/90">
      <code>{block.text}</code>
    </pre>
  ),
  gallery: (block, ctx) => <PostGallery items={block.items} caption={block.caption} cover={ctx.cover} />,
  p: (block) => <p className="mt-5 leading-relaxed text-white/70">{block.text}</p>,
}

export default function ContentBlock({ block, cover }) {
  const render = RENDERERS[block.type] ?? RENDERERS.p
  return render(block, { cover })
}
