import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TIMING,
  getPhase,
  isSceneReady,
  isTransitioning,
  setPhase,
  warp,
  resetWarp,
} from './warpStore'

/**
 * EXPLORE TRANSITION — the controller.
 *
 * Owns the machine that carries a visitor from the portfolio into /interactive
 * without a page load, a fade, or a visible seam. It renders nothing. Its whole
 * job is to advance phases on one rAF clock and fire the route change at the
 * exact moment the screen is saturated enough to hide it.
 *
 * WHY ONE rAF LOOP AND NOT A CHAIN OF TIMEOUTS: the visual half of this runs
 * inside Three's render loop, and a setTimeout chain drifts against it on any
 * frame drop. Advancing by delta from the same kind of clock the scene uses
 * keeps the camera push and the phase boundaries locked together — and lets the
 * route swap key off warp.value rather than off elapsed time, so a stutter can
 * delay the cut but never expose it.
 *
 * THE SCROLL CASE IS PART OF THE NARRATIVE. Clicking EXPLORE from the footer
 * does not teleport to the hero and then launch. The page travels up to the
 * stars first, settles, and only then does the camera start moving — one
 * continuous action from one click, which is why the scroll lives inside this
 * machine instead of in the button.
 */

const easeInCubic = (t) => t * t * t
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

/** How centred the hero must be before the push may begin. */
const HERO_READY_RATIO = 0.55

/**
 * Ceiling on the scroll wait. Lenis reports completion, but a user grabbing the
 * page mid-scroll (or a browser that never fires the callback) must not be able
 * to strand the machine in 'scrolling-to-hero' forever with the UI locked.
 */
const SCROLL_WATCHDOG_MS = 1400

/**
 * Pull the destination chunk down ahead of the click.
 *
 * Idempotent — the module cache makes repeat calls free — so it is safe to fire
 * from hover, focus and touchstart alike. Downloading and parsing ~140KB is a
 * meaningful slice of the freeze measured at the moment of the click, and a
 * pointer arriving at the button is a strong enough signal to spend it on.
 */
let prefetched = false
export function prefetchInteractive() {
  if (prefetched) return
  prefetched = true
  import('../interactive/InteractiveExperience').catch(() => {
    // Allow a retry if it failed — the click path imports again anyway.
    prefetched = false
  })
}

export default function ExploreTransition() {
  const navigate = useNavigate()
  const rafRef = useRef(0)
  const navigatedRef = useRef(false)

  /* The transition is started from elsewhere (nav links, mobile CTA) via a
   * window event. A custom event rather than context because the triggers live
   * in three different subtrees and one of them — the mobile menu — unmounts
   * itself as part of the sequence. */
  const run = useCallback(() => {
    if (isTransitioning()) return

    navigatedRef.current = false
    resetWarp()

    /* MOUNT THE SCENE BEFORE ANYTHING ANIMATES.
     *
     * Staging begins on the 'preparing' phase, and the mount blocks the main
     * thread for ~1s (measured: 986ms) plus another ~2.3s for the PMREM
     * environment. If the UI fade were already running, both would land as a
     * stutter in the middle of it.
     *
     * So the fade does not start until the scene is up: setPhase('preparing')
     * happens below, the staging layer mounts synchronously in response, and
     * only then does the clock begin. The cost is a beat of stillness after the
     * click — which reads as the system acknowledging the command, not as lag,
     * because the button's own arm animation is playing over it. */

    /* WARM THE DESTINATION NOW, not at the swap.
     *
     * /interactive is a lazy chunk (~140KB plus the shared three.js bundle).
     * Navigating first and loading second means the white-out has to cover a
     * network fetch AND a parse of unknown duration — measured at over five
     * seconds on a cold cache with software rendering. The flash cannot stretch
     * to cover that, so the seam would reopen precisely where it matters.
     *
     * Kicking the import off here gives it the full ~2.1s of the transition to
     * arrive in parallel with the camera push. By the time warp hits 0.97 the
     * module is almost always resolved and the swap is a synchronous remount.
     * If it is not, the Suspense fallback still catches it — this makes the
     * common case seamless rather than pretending the slow case cannot happen. */
    prefetchInteractive()

    /* REDUCED MOTION: no acceleration, no immersion. Scroll if needed, brief
     * fade, navigate. The destination is identical — only the journey is
     * removed, which is the correct reading of the preference. */
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /* Staging begins HERE, on the first phase — which means it also runs during
     * the scroll-to-hero leg. The warm-up therefore gets the whole scroll for
     * free, and by the time the camera is ready to push it has usually already
     * finished. The gate below measures from this moment, not from the start of
     * the flight, so that head start actually counts. */
    const engagedAt = performance.now()
    setPhase('preparing')

    // Freeze the page. The camera is about to become the only thing moving.
    const prevOverflow = document.body.style.overflow

    const hero = document.getElementById('home')
    const heroReady = () => {
      if (!hero) return true
      const r = hero.getBoundingClientRect()
      // Hero counts as "in view" once most of the viewport is showing it.
      const visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)
      return visible / window.innerHeight >= HERO_READY_RATIO
    }

    const startFlight = () => {
      document.body.style.overflow = 'hidden'

      if (reduce) {
        setPhase('ui-fade')
        // A short fade, then hand over. No push, no warp.
        window.setTimeout(() => {
          setPhase('routing')
          warp.handoff = { reduced: true }
          navigate('/interactive')
          setPhase('interactive-entry')
          document.body.style.overflow = prevOverflow
          window.setTimeout(() => setPhase('complete'), 400)
        }, 420)
        return
      }

      let last = performance.now()
      let t = 0

      /* THE STALL GATE.
       *
       * Mounting the destination scene blocks the main thread for as long as it
       * takes to compile its shaders — and this loop runs on that thread, so a
       * naive clock simply loses that time mid-motion. Measured: a six-second
       * freeze during the dive, on a black screen.
       *
       * So the clock does not advance past the UI fade until the scene reports
       * mounted. The wait happens with the page still fully drawn, where a
       * stalled frame is indistinguishable from a still one. Bounded, because a
       * scene that never mounts must not hold the visitor hostage — past the
       * cap we fly anyway and the Suspense fallback covers it. */
      let gateReleased = false
      /* Seeded with time already spent since the click — the scroll leg counts,
         because staging has been warming throughout it. */
      let gateWait = (performance.now() - engagedAt) / 1000

      const tick = (now) => {
        const rawDelta = (now - last) / 1000
        last = now
        // Long frames are the stall itself; clamping stops it corrupting t.
        const delta = Math.min(rawDelta, 0.05)

        const { preparing, uiFade, entering, accelerating } = TIMING
        const pushStart = preparing + uiFade

        if (!gateReleased) {
          gateWait += rawDelta

          /* Wait for the scene to report itself COMPILED, not merely mounted.
           *
           * The canvas element appears the instant React mounts it, but
           * three.js builds each material's GPU program the first time that
           * object is drawn — so a DOM check passes while seconds of shader
           * compilation are still ahead. WarmUp does that work a few objects
           * per frame and flips this flag when it is genuinely finished.
           *
           * The extra rawDelta test catches the tail: even after compiling,
           * one more long frame can be in flight. Resuming on a short frame
           * means we start moving when the thread is actually free. */
          const ready = isSceneReady() && rawDelta < 0.12

          /* The cap is generous because the warm-up has real work to do — 381
             drawables in this scene — and falling through early reinstates the
             freeze it exists to prevent. On any GPU this resolves in well under
             a second; the cap only matters on hardware where the alternative
             was a multi-second stall anyway. */
          if (ready || gateWait > 12) {
            gateReleased = true
          } else if (t >= pushStart - 0.02) {
            /* Hold right at the edge of the push. The UI has finished fading,
               the starfield is untouched, and nothing is moving yet — the one
               frame in the whole sequence that can be held indefinitely
               without reading as a stutter. */
            setPhase('ui-fade')
            warp.value = 0
            rafRef.current = requestAnimationFrame(tick)
            return
          }
        }

        t += delta
        warp.elapsed = t

        const accelStart = pushStart + entering
        const peak = accelStart + accelerating

        if (t < preparing) {
          setPhase('preparing')
        } else if (t < pushStart) {
          // UI steps aside. Camera still at rest — the site clears the frame
          // before anything moves, so the movement is never competing with
          // text sliding around.
          setPhase('ui-fade')
        } else if (t < accelStart) {
          setPhase('entering-space')
          /* easeInCubic: begins almost imperceptibly. The first 200ms of this
             phase should read as "did something just move?" rather than as a
             launch — that hesitation is what sells the acceleration later. */
          const p = (t - pushStart) / entering
          warp.value = easeInCubic(p) * 0.45
        } else if (t < peak) {
          setPhase('accelerating')
          const p = (t - accelStart) / accelerating
          // Continues from 0.45 to full. Steeper, but eased out at the top so
          // the peak is a plateau the route change can hide inside.
          warp.value = 0.45 + easeOutCubic(p) * 0.55
        } else {
          warp.value = 1
        }

        /* THE ROUTE SWAP.
         *
         * Keyed off warp.value, not off elapsed time: the screen has to be
         * saturated before the DOM changes underneath it. At 0.97 the star
         * field is a wall of motion and the breach overlay is at full white —
         * there is nothing left on screen that could reveal a remount. */
        if (!navigatedRef.current && warp.value >= 0.97) {
          navigatedRef.current = true
          setPhase('routing')

          /* Hand the arrival its entry conditions. /interactive reads this once
             and continues the motion rather than starting from a standstill. */
          warp.handoff = { reduced: false, speed: 1 }

          navigate('/interactive')
          setPhase('interactive-entry')

          // Release the scroll lock we took; /interactive sets its own.
          document.body.style.overflow = prevOverflow

          /* HOLD THE OVERLAY UNTIL THE DESTINATION HAS ACTUALLY PAINTED.
           *
           * A fixed timer here assumes the new route is on screen by the time
           * it fires. When the chunk is slow that assumption breaks and the
           * overlay lifts onto a blank frame — the exact black cut this feature
           * exists to prevent. Waiting for the canvas to exist makes the cover
           * last precisely as long as it needs to and no longer.
           *
           * Bounded, because a WebGL failure on the far side must not leave the
           * screen covered forever; at that point the fallback UI is the honest
           * thing to show. */
          const settleFrom = performance.now()
          const settle = () => {
            const painted = !!document.querySelector('.ix-canvas')
            const waited = performance.now() - settleFrom
            if ((painted && waited > TIMING.arrival * 1000) || waited > 6000) {
              setPhase('complete')
              resetWarp()
              return
            }
            requestAnimationFrame(settle)
          }
          requestAnimationFrame(settle)
          return
        }

        rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    /* CASE 1 — already at the hero. Start immediately. */
    if (heroReady()) {
      startFlight()
      return
    }

    /* CASE 2 — somewhere else on the page. Travel up first.
     *
     * Reuses the site's existing anchor handling: Lenis intercepts clicks on
     * href="#..." globally, so dispatching through a real anchor gets the same
     * smoothed scroll the rest of the nav uses rather than a second, subtly
     * different scrolling behaviour. */
    setPhase('scrolling-to-hero')

    if (hero) {
      hero.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const began = performance.now()
    const waitForHero = () => {
      const timedOut = performance.now() - began > SCROLL_WATCHDOG_MS
      if (heroReady() || timedOut) {
        // A beat at the top before the push. Without it the two motions run
        // together and the arrival at the hero is never felt.
        window.setTimeout(startFlight, 160)
        return
      }
      requestAnimationFrame(waitForHero)
    }
    requestAnimationFrame(waitForHero)
  }, [navigate])

  useEffect(() => {
    window.addEventListener('explore:launch', run)
    return () => {
      window.removeEventListener('explore:launch', run)
      cancelAnimationFrame(rafRef.current)
    }
  }, [run])

  // Safety: if this unmounts mid-transition (route change), never leave the
  // page scroll-locked.
  useEffect(
    () => () => {
      if (getPhase() !== 'idle') document.body.style.overflow = ''
    },
    [],
  )

  return null
}

/** Fire the transition from anywhere. */
export function launchExplore() {
  window.dispatchEvent(new CustomEvent('explore:launch'))
}
