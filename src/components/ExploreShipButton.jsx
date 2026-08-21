import { useCallback, useEffect, useRef, useState } from 'react'
import { Rocket, ChevronRight } from 'lucide-react'
import { useI18n } from '../i18n/LanguageContext'
import { launchExplore, prefetchInteractive } from '../transition/ExploreTransition'

/**
 * EXPLORE SHIP BUTTON — the way into the interactive experience.
 *
 * Every other row in the menu scrolls this page. This one leaves it for a
 * different medium entirely, so it is built as an access module rather than as
 * a link: something you engage, not something you follow.
 *
 * Reuses the existing system throughout — Space Grotesk for the label, JetBrains
 * Mono for the technical eyebrow, accent2/accent3 for the border, the same
 * white/10 rule and rounded geometry as the rest of the menu. Nothing here
 * introduces a second visual language.
 *
 * WHAT THE MOTION IS FOR, in order:
 *   idle scan   a pulse crosses part of the border every few seconds — enough
 *               to say the system is powered, never enough to read as a loader
 *   hover       border firms up, gradient drifts right, rocket hints at lift
 *   press       arm sequence: the border charges, the craft brightens, the
 *               module contracts, and only then does the route change
 *
 * All of it is opacity/colour-only under prefers-reduced-motion. The design has
 * to hold without a single moving pixel.
 */

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

/** Arm sequence length before navigation. Long enough to register, short
 *  enough that it never feels like being made to wait. */
const ARM_MS = 460

/**
 * @param {() => void}  onNavigate  close the menu
 */
export default function ExploreShipButton({ onNavigate }) {
  const { t } = useI18n()
  const [arming, setArming] = useState(false)
  const [pressed, setPressed] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  /* Prefetch the moment this button exists.
   *
   * There is no hover on touch, so the desktop trick of warming on pointer-
   * enter does not apply. But this component only mounts when the menu is
   * already open, which is itself a strong signal — and it buys the whole
   * duration of the visitor reading the menu before they tap. */
  useEffect(() => {
    prefetchInteractive()
  }, [])

  /* Track the pointer as CSS custom properties on the element itself.
   *
   * Writing --mx/--my directly rather than through React state is deliberate:
   * this fires on every pointermove, and routing that through a re-render would
   * rebuild the subtree dozens of times a second for a value only CSS consumes.
   * The mask that lights the grid reads these straight from the style object. */
  const trackPointer = useCallback((e) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }, [])

  const engage = useCallback(() => {
    if (arming) return
    setArming(true)

    /* The arm sequence finishes, the menu closes, and the transition takes
     * over. Closing the menu first matters: the camera flies through the hero's
     * own starfield, so the panel has to be out of the way for the visitor to
     * see that it is the background they are entering.
     *
     * Reduced motion is handled inside the controller rather than branched
     * here — it owns the scroll-to-hero case too, and that has to happen either
     * way. This button's job ends at "engage". */
    timer.current = setTimeout(() => {
      onNavigate?.()
      launchExplore()
    }, ARM_MS)
  }, [arming, onNavigate])

  const handleKey = (e) => {
    // Space and Enter both activate, matching native button behaviour.
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      engage()
    }
  }

  return (
    <button
      type="button"
      onClick={engage}
      onKeyDown={handleKey}
      onPointerMove={trackPointer}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      aria-label={`${t.nav.interactiveEyebrow} — ${t.nav.interactive}`}
      data-arming={arming ? 'true' : 'false'}
      data-pressed={pressed ? 'true' : 'false'}
      className="esb group"
    >
      {/* Ambient field. Two low-opacity radials over near-black, so the colour
          reads as energy inside the panel rather than as a coloured button. */}
      <span aria-hidden className="esb__field" />

      {/* Dot grid, in two layers.
       *
       * The base sits at very low opacity so the texture is felt rather than
       * seen. The lit copy is identical but bright, revealed through a radial
       * mask that follows the pointer — so the cursor appears to energise the
       * grid it passes over instead of dragging a glow across a flat surface.
       *
       * Two layers rather than one animated layer because a mask can only
       * reveal; the dim grid has to already be there for the bright one to
       * read as the same grid lighting up. */}
      <span aria-hidden className="esb__grid" />
      <span aria-hidden className="esb__grid esb__grid--lit" />

      {/* Outer frame: a masked sheet, because a border-color cannot carry a
          gradient. Cyan on the left running to violet on the right. */}
      <span aria-hidden className="esb__border" />

      {/* Inner frame, inset 6px. The gap between the two rings is what makes
          this read as machined hardware instead of as a bordered card. */}
      <span aria-hidden className="esb__inset" />

      {/* Idle scan: a highlight travelling part of the ring on a long delay.
          Separate from the static border so it animates independently. */}
      <span aria-hidden className="esb__scan" />

      {/* Corner brackets on all four corners, sitting in the gap between the
          frames — which is what the gap is for. Plus one vent panel. */}
      <span aria-hidden className="esb__mark esb__mark--tl" />
      <span aria-hidden className="esb__mark esb__mark--tr" />
      <span aria-hidden className="esb__mark esb__mark--bl" />
      <span aria-hidden className="esb__mark esb__mark--br" />
      <span aria-hidden className="esb__dots" />

      <span className="esb__inner">
        {/* Navigation indicator: an incomplete ring with orbital ticks. */}
        <span className="esb__visor">
          <span aria-hidden className="esb__ring" />
          <span aria-hidden className="esb__tick esb__tick--n" />
          <span aria-hidden className="esb__tick esb__tick--e" />
          <span aria-hidden className="esb__tick esb__tick--s" />
          <Rocket size={18} className="esb__rocket" strokeWidth={1.6} />
        </span>

        <span className="esb__text">
          <span className="esb__eyebrow">{t.nav.interactiveEyebrow}</span>
          <span className="esb__label">{t.nav.interactive}</span>
        </span>

        <ChevronRight size={20} className="esb__chevron" strokeWidth={1.75} />
      </span>
    </button>
  )
}
