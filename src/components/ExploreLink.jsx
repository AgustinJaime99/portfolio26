import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Rocket, ChevronRight } from 'lucide-react'
import { useI18n } from '../i18n/LanguageContext'
import { launchExplore, prefetchInteractive } from '../transition/ExploreTransition'

/**
 * EXPLORE LINK — the doorway to /interactive.
 *
 * Everything else in the nav scrolls the page. This leaves it entirely, so it
 * gets its own treatment: an instrument panel rather than a menu row.
 *
 * The animation is layered so it reads as hardware powering up rather than as a
 * button with effects bolted on:
 *
 *   1. A gradient border that RUNS. Two conic sweeps at different speeds mean
 *      the seam never lands in the same place twice, so it never reads as a
 *      looping GIF.
 *   2. Corner brackets that push outward on hover — the same open-cornered
 *      reticle vocabulary the 3D HUD uses, so the button belongs to the world
 *      it opens.
 *   3. A rocket in a scanning viewport: the ring rotates continuously, the
 *      rocket lifts and tilts on hover.
 *   4. A sheen that crosses once per hover, not on a loop. A permanent shimmer
 *      is decoration; a single pass reads as light catching a surface.
 *
 * All of it collapses to a static panel under prefers-reduced-motion. The
 * component still looks designed there — the motion is a layer on top, never
 * the thing carrying the design.
 */

const EASE = [0.16, 1, 0.3, 1]

export default function ExploreLink({ variant = 'panel', onNavigate }) {
  const { t } = useI18n()
  const reduce = useReducedMotion()

  /* Stays a real <Link>, so middle-click, ⌘/Ctrl-click and "open in new tab"
   * behave like any other link and the href is present for crawlers. Only the
   * plain left click is intercepted, and that one flies there instead of
   * navigating — the transition IS the navigation. */
  const handleClick = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    onNavigate?.()
    launchExplore()
  }

  /* Start fetching the 3D chunk when the pointer arrives, typically a few
     hundred milliseconds before the click. Free if it is never clicked — the
     browser caches it — and it removes that download from the critical path. */
  const warm = { onMouseEnter: prefetchInteractive, onFocus: prefetchInteractive }

  /* ---- Compact variant: the inline desktop nav ---- */
  if (variant === 'inline') {
    return (
      <Link
        to="/interactive"
        onClick={handleClick}
        {...warm}
        className="group relative inline-flex shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:text-white"
      >
        {/* Border rendered as a gradient sheet masked to a 1px ring, so the
            colour can animate without repainting a border property. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-lg p-px opacity-60 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              'linear-gradient(120deg, rgba(34,211,238,0.7), rgba(168,85,247,0.7))',
            WebkitMask:
              'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />
        <Rocket
          size={15}
          className="relative text-accent2 transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:rotate-12"
        />
        <span className="relative">{t.nav.interactive}</span>
      </Link>
    )
  }

  /* ---- Panel variant: the mobile sheet, and anywhere with room ---- */
  return (
    <Link
      to="/interactive"
      onClick={handleClick}
      {...warm}
      className="group relative block overflow-hidden rounded-xl"
    >
      {/* RUNNING BORDER.
          Two conic gradients at different speeds and opposite directions. A
          single rotating gradient reads as a spinner; two out of phase read as
          current moving through a circuit. */}
      {!reduce && (
        <>
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl p-px"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg, #22d3ee 60deg, transparent 140deg, transparent 360deg)',
              WebkitMask:
                'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          />
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl p-px opacity-70"
            style={{
              background:
                'conic-gradient(from 180deg, transparent 0deg, #a855f7 50deg, transparent 120deg, transparent 360deg)',
              WebkitMask:
                'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
          />
        </>
      )}

      {/* Static ring underneath, so the frame exists even with motion off. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl p-px"
        style={{
          background:
            'linear-gradient(120deg, rgba(34,211,238,0.45), rgba(168,85,247,0.45))',
          WebkitMask:
            'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />

      {/* Body. Sits above the border sheets and hides their centres. */}
      <span className="relative flex items-center gap-4 rounded-xl bg-[#0a0b14]/92 px-4 py-4 backdrop-blur-sm">
        {/* CORNER BRACKETS — same open-corner reticle as the 3D HUD. They push
            outward on hover, which reads as an instrument acquiring a target. */}
        {['tl', 'tr', 'bl', 'br'].map((c) => (
          <span
            key={c}
            aria-hidden
            className={`pointer-events-none absolute h-2.5 w-2.5 border-accent2/70 transition-all duration-300 ease-out ${
              c === 'tl'
                ? 'left-1.5 top-1.5 border-l border-t group-hover:left-1 group-hover:top-1'
                : c === 'tr'
                  ? 'right-1.5 top-1.5 border-r border-t group-hover:right-1 group-hover:top-1'
                  : c === 'bl'
                    ? 'bottom-1.5 left-1.5 border-b border-l group-hover:bottom-1 group-hover:left-1'
                    : 'bottom-1.5 right-1.5 border-b border-r group-hover:bottom-1 group-hover:right-1'
            }`}
          />
        ))}

        {/* SHEEN — one pass per hover, not a loop. */}
        {!reduce && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/8 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
          />
        )}

        {/* ROCKET IN A SCANNING VIEWPORT */}
        <span className="relative grid h-12 w-12 shrink-0 place-items-center">
          {/* Dashed ring, continuously rotating: the viewport is scanning. */}
          {!reduce && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-dashed border-accent2/35"
              animate={{ rotate: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            />
          )}
          <span aria-hidden className="absolute inset-2 rounded-full bg-accent2/5" />
          {/* Tick marks at the cardinals — instrumentation, not decoration. */}
          {[0, 90, 180, 270].map((deg) => (
            <span
              key={deg}
              aria-hidden
              className="absolute h-1 w-1 rounded-full bg-accent2/60 transition-all duration-500 group-hover:bg-accent2"
              style={{
                transform: `rotate(${deg}deg) translateY(-22px)`,
              }}
            />
          ))}
          <Rocket
            size={19}
            className="relative text-accent2 transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:rotate-12"
          />
        </span>

        {/* LABELS */}
        <span className="relative flex min-w-0 flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent2/80">
            {t.nav.interactiveEyebrow}
          </span>
          <span className="text-lg font-medium leading-none text-white">
            {t.nav.interactive}
          </span>
        </span>

        {/* CHEVRON — nudges on hover, the universal "this goes somewhere". */}
        <ChevronRight
          size={20}
          className="relative ml-auto shrink-0 text-white/50 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:text-white"
        />
      </span>
    </Link>
  )
}
