import { useEffect, useRef } from 'react'
import { warp } from '../transition/warpStore'
import { useTransitionPhase } from '../transition/useTransitionPhase'

/**
 * BREACH LAYER — the last 40% of the journey, and the seam.
 *
 * WHAT THIS USED TO BE: a self-contained 2D starfield that played OVER the hero
 * and faked the whole journey. It worked, but it could never deliver the point
 * of the feature — the stars it drew had no relationship to the stars the
 * visitor had been looking at, so the moment it cut in, the real field was
 * replaced by a painted one and the illusion of entering the background died.
 *
 * WHAT IT IS NOW: additive only. The real Three.js field in Scene3D does the
 * travelling; this rides on top and supplies the two things Points cannot draw:
 *
 *   STREAKS   radial lines whose length tracks warp.value, so the field appears
 *             to elongate at speed. Drawn from the same centre the camera is
 *             flying toward, so they register as the same motion.
 *   SATURATION a late, brief white bloom under which the route changes.
 *
 * It is transparent until warp passes 0.3 — before that there is nothing to add
 * and the real scene shows through untouched. That is the difference between a
 * layer that enhances the moment and one that replaces it.
 *
 * Still 2D canvas, still zero dependencies, and still able to run before the
 * /interactive chunk has finished loading — which is the other job it does.
 */

/** Below this warp value the overlay draws nothing at all. */
const STREAK_ONSET = 0.3

/** Radial streaks. Far fewer than the old fake field — these garnish real
 *  motion rather than substituting for it. */
const STREAK_COUNT = 260

const PALETTE = ['#8b93ff', '#22d3ee', '#a855f7', '#c7d2fe']

const easeInCubic = (t) => t * t * t
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

export default function LaunchTransition() {
  const phase = useTransitionPhase()
  const canvasRef = useRef(null)
  const rafRef = useRef(0)

  /* Live from the moment the camera starts moving until the arrival settles.
   * Mounted across the route change on purpose: this canvas is the only thing
   * on screen that survives the swap, so it is what makes the two sides
   * continuous. */
  const active =
    phase === 'entering-space' ||
    phase === 'accelerating' ||
    phase === 'routing' ||
    phase === 'interactive-entry'

  useEffect(() => {
    if (!active) return undefined
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    const cx = w / 2
    const cy = h / 2
    const maxR = Math.hypot(cx, cy)

    /* Streaks are seeded by angle and radius, not by x/y: they only ever move
     * radially outward from the vanishing point, so polar is the natural space
     * and it makes the length calculation a single multiply. */
    const streaks = Array.from({ length: STREAK_COUNT }, () => ({
      angle: Math.random() * Math.PI * 2,
      // Biased outward — a uniform radius bunches everything at the centre
      // once projected, leaving the edges empty exactly where speed reads most.
      radius: Math.pow(Math.random(), 0.55),
      width: 0.6 + Math.random() * 1.5,
      color: PALETTE[(Math.random() * PALETTE.length) | 0],
      seed: Math.random(),
    }))

    const draw = () => {
      ctx.clearRect(0, 0, w, h)

      const v = warp.value

      if (v > STREAK_ONSET) {
        // Renormalise so streaks begin at zero length rather than popping in.
        const s = (v - STREAK_ONSET) / (1 - STREAK_ONSET)
        const intensity = easeInCubic(s)

        ctx.lineCap = 'round'
        for (const st of streaks) {
          /* Each streak drifts outward as warp builds, so the pattern expands
             rather than sitting still and merely growing longer — a static
             radial burst reads as a graphic, an expanding one reads as travel. */
          const r = st.radius * maxR * (1 + intensity * 0.55)
          const len = intensity * maxR * (0.1 + st.seed * 0.3)

          const ca = Math.cos(st.angle)
          const sa = Math.sin(st.angle)

          const x1 = cx + ca * r
          const y1 = cy + sa * r
          const x2 = cx + ca * (r + len)
          const y2 = cy + sa * (r + len)

          if (x1 < -200 && x2 < -200) continue
          if (x1 > w + 200 && x2 > w + 200) continue

          /* Fade in from the centre outward: streaks near the middle are
             travelling slowest and should stay subtle.
             Floor of 0.35 so mid-field streaks still register — at pure
             proportional alpha most of the frame sat under 0.2 and read as
             empty black in captures. */
          const near = Math.max(0.35, Math.min(1, st.radius * 1.5))
          ctx.globalAlpha = Math.min(0.92, intensity * near * 1.35)
          ctx.strokeStyle = st.color
          ctx.lineWidth = st.width * (1 + intensity)
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }
        ctx.globalAlpha = 1
      }

      /* SATURATION — the seam.
       *
       * Late and brief. It exists only to cover the DOM swap, so it starts at
       * 0.9 warp, peaks as the route changes, and is already receding by the
       * time /interactive has painted. A long white flash would announce the
       * cut it is supposed to conceal. */
      if (v > 0.9) {
        const f = (v - 0.9) / 0.1
        const bloom = easeOutCubic(f)
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR)
        g.addColorStop(0, `rgba(226, 240, 255, ${bloom * 0.9})`)
        g.addColorStop(0.45, `rgba(180, 205, 255, ${bloom * 0.5})`)
        g.addColorStop(1, `rgba(120, 150, 220, ${bloom * 0.12})`)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    const onResize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
    }
  }, [active])

  if (!active) return null

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none" aria-hidden>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  )
}
