import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { setSceneReady } from '../../transition/warpStore'

/**
 * WARM UP — turn one long freeze into many short ones.
 *
 * THE PROBLEM, measured with a PerformanceObserver on longtask entries:
 * clicking EXPLORE produced two visible freezes.
 *
 *     986ms  @  898ms   mounting the scene graph
 *    2325ms  @ 1885ms   building the PMREM environment
 *    3634ms  @10305ms   <Preload all /> compiling every shader at once
 *
 * The third is the one that lands on the reveal, and it is the least obvious:
 * three.js builds a material's GPU program the first time its object is drawn,
 * so the work was always going to arrive at the worst possible moment.
 *
 * Mounting earlier does not fix that. It moves it. The fix is to do the work
 * DELIBERATELY, a few objects per frame, while nothing is on screen — and to
 * report when it is genuinely finished so the transition can wait for it.
 *
 * WHY IT IS SPREAD: compiling ~40 materials in one call blocks for seconds.
 * Compiling four per frame blocks for a few milliseconds at a time, which the
 * browser interleaves with paint. Identical total work; the distribution is the
 * entire trick.
 *
 * WHY useFrame AND NOT useEffect: this component sits inside the scene's
 * <Suspense> boundary, and effects run before suspended siblings have resolved.
 * An effect-driven version found an EMPTY scene, compiled nothing, and reported
 * ready immediately — verified: the completion log never fired once, and the
 * transition gate was falling through on its timeout every single run. useFrame
 * only ticks once the tree is actually live.
 */

/**
 * Time budget per frame, in milliseconds — NOT a fixed object count.
 *
 * The scene holds 381 drawables (measured, not estimated: an early fixed batch
 * of 4/frame would have needed 95 frames and never finished inside the
 * transition). But object count is the wrong unit anyway: most of those share
 * a handful of materials and compile instantly once the program is cached,
 * while a few shader-heavy ones cost tens of milliseconds each.
 *
 * So the loop compiles until it runs out of budget. Fast objects stream through
 * dozens per frame; expensive ones get a frame to themselves. 8ms leaves the
 * rest of a 60fps frame intact.
 */
const FRAME_BUDGET_MS = 8

/** Hard floor so a pathologically slow machine still makes progress. */
const MIN_PER_FRAME = 2

/**
 * Frames to let elapse after materials are done, so the post-processing chain
 * builds its own programs while still hidden. Bloom's downsample ladder, the
 * grade pass and the output pass each compile on their first render, which
 * gl.compile() does not cover.
 */
const POST_WARM_FRAMES = 8

/**
 * @param {boolean}    active   set false to skip the warm-up entirely
 * @param {() => void} onReady  called once, after everything is compiled
 *
 * Set `window.__WARM_TRACE = true` before loading to log how many objects were
 * queued and how long the pass took. Silent otherwise — useful for checking the
 * real cost on a specific machine, since these numbers vary enormously between
 * a discrete GPU and software rendering.
 */
export default function WarmUp({ active = true, onReady }) {
  const { gl, scene, camera } = useThree()

  const queue = useRef(null)
  const index = useRef(0)
  const postFrames = useRef(0)
  const done = useRef(false)
  const began = useRef(0)

  useFrame(() => {
    if (!active || done.current) return

    if (queue.current === null) {
      began.current = performance.now()
      const list = []
      scene.traverse((o) => {
        if (o.isMesh || o.isPoints || o.isLine || o.isSprite) list.push(o)
      })
      queue.current = list
      if (typeof window !== 'undefined' && window.__WARM_TRACE) {
        console.log(`WARM start: ${list.length} objects queued`)
      }
    }

    const q = queue.current

    if (index.current < q.length) {
      const deadline = performance.now() + FRAME_BUDGET_MS
      let n = 0
      while (index.current < q.length) {
        try {
          /* Per-object rather than gl.compile(scene, camera): the whole-scene
             form does everything in one uninterruptible block, which IS the
             freeze this component exists to remove. */
          gl.compile(q[index.current], camera)
        } catch {
          // One unbuildable material must not abort the warm-up.
        }
        index.current++
        n++
        // Always clear the floor, then stop as soon as the budget is spent.
        if (n >= MIN_PER_FRAME && performance.now() >= deadline) break
      }
      return
    }

    if (postFrames.current < POST_WARM_FRAMES) {
      postFrames.current++
      return
    }

    done.current = true
    setSceneReady(true)
    onReady?.()

    if (typeof window !== 'undefined' && window.__WARM_TRACE) {
      console.log(
        `WARM done: ${q.length} objects in ${Math.round(performance.now() - began.current)}ms`,
      )
    }
  })

  return null
}
