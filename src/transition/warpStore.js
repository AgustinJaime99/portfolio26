/**
 * WARP STORE — the one clock the Home→/interactive transition runs on.
 *
 * THE PROBLEM THIS SOLVES: the transition spans two routes, two React trees and
 * two WebGL canvases. Nothing can own it from inside a component, because every
 * component involved unmounts partway through. So it lives here, at module
 * scope, and everyone reads from it.
 *
 * Two tiers, the same split the flight store already uses in /interactive:
 *
 *   WARP    a single number, 0→1, mutated every frame and read inside useFrame.
 *           React never sees it. Camera z, FOV, streak length and star speed
 *           are all derived from this one value, which is what keeps them in
 *           agreement — three separate easing curves would drift apart.
 *
 *   PHASE   the discrete stage, published through a tiny subscription so the UI
 *           can fade and the router can fire. Changes ~8 times per transition,
 *           not 60 times a second.
 *
 * The phase list is deliberately explicit rather than a chain of timeouts. At
 * any instant the system can say exactly where it is, which matters because the
 * route swap has to happen at one specific point and a dropped frame must not
 * be able to skip it.
 */

/* ------------------------------------------------------------------ */
/* Continuous tier                                                     */
/* ------------------------------------------------------------------ */

/**
 * Mutated per frame by ExploreTransition, read per frame by Scene3D and the
 * breach overlay. Plain object, never state.
 */
export const warp = {
  /** 0 = home at rest, 1 = fully immersed. Drives everything visual. */
  value: 0,
  /** Seconds since the push began. Lets consumers derive their own curves. */
  elapsed: 0,
  /**
   * Carried into /interactive so the arrival continues this motion instead of
   * restarting it. Read once by ApproachSequence, then cleared.
   */
  handoff: null,
}

export function resetWarp() {
  warp.value = 0
  warp.elapsed = 0
  /* Readiness is per-transition: a second run stages a fresh scene and must
     wait for it rather than trusting a flag left over from the first. */
  sceneReady = false
  /* handoff is deliberately NOT cleared here.
   *
   * It is consumed exactly once, by ApproachSequence, on the first frame it
   * runs — and that frame races the 'complete' phase that calls this. Clearing
   * it from both ends means whichever wins decides whether the arrival keeps
   * its velocity, so on a slow chunk load the ship would silently start from a
   * standstill and the seam would show. One owner, one clear: the consumer. */
}

/* ------------------------------------------------------------------ */
/* Discrete tier                                                       */
/* ------------------------------------------------------------------ */

/**
 * @typedef {'idle'|'scrolling-to-hero'|'preparing'|'ui-fade'|'entering-space'
 *          |'accelerating'|'routing'|'interactive-entry'|'complete'} TransitionPhase
 */

/** Every phase, in order. Exported so consumers can compare by index. */
export const PHASES = [
  'idle',
  'scrolling-to-hero',
  'preparing',
  'ui-fade',
  'entering-space',
  'accelerating',
  'routing',
  'interactive-entry',
  'complete',
]

const listeners = new Set()

let phase = 'idle'

export function getPhase() {
  return phase
}

export function setPhase(next) {
  if (phase === next) return
  phase = next
  listeners.forEach((fn) => fn(phase))
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/* ------------------------------------------------------------------ */
/* Scene readiness                                                     */
/* ------------------------------------------------------------------ */

/**
 * True once the staged /interactive scene has finished compiling its shaders.
 *
 * NOT the same as "the canvas element exists". The element appears the instant
 * React mounts it, but three.js compiles each material's GPU program the first
 * time that object is drawn — which, without a warm-up, happens at the reveal
 * and blocks the main thread for seconds. Measured at 3.6s.
 *
 * WarmUp sets this after walking the graph and compiling everything a few
 * objects per frame. The transition gate waits on THIS, not on the DOM.
 */
let sceneReady = false

export function setSceneReady(v) {
  sceneReady = v
}

export function isSceneReady() {
  return sceneReady
}

/** True once the UI should be fading — i.e. from 'ui-fade' onward. */
export function isDimming(p = phase) {
  return PHASES.indexOf(p) >= PHASES.indexOf('ui-fade')
}

/** True while a transition is running, so a second click cannot start another. */
export function isTransitioning(p = phase) {
  return p !== 'idle' && p !== 'complete'
}

/* ------------------------------------------------------------------ */
/* Timing                                                              */
/* ------------------------------------------------------------------ */

/**
 * Phase durations in seconds, from the moment the hero is in view.
 *
 * These sum to ~2.1s before the route changes and ~3.0s to controls — fast
 * enough that a visitor will run it more than once, which is the actual test.
 * Anything longer stops being an entrance and becomes a cutscene.
 */
export const TIMING = {
  /** Interactions locked, menu closed, scroll frozen. Nothing visible yet. */
  preparing: 0.2,
  /** HTML fades out. The camera has not moved — the site simply steps aside. */
  uiFade: 0.4,
  /** Camera pushes into the field, easeInCubic. Slow, then building. */
  entering: 0.9,
  /** Hard acceleration. FOV opens, streaks stretch, field saturates. */
  accelerating: 0.6,
  /** Deceleration on the far side, inside /interactive. */
  arrival: 0.8,
}

/**
 * Where in the 0→1 warp curve each phase lands. Consumers that need to know
 * "how far in are we" use warp.value; these are for the controller only.
 */
export const WARP_AT = {
  enteringStart: 0.0,
  enteringEnd: 0.45,
  accelEnd: 1.0,
}
