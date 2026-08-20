/**
 * DEPLOYMENT MACHINE
 *
 * The launch sequence as an explicit state machine, advanced by delta from the
 * existing render loop.
 *
 * WHY NOT setTimeout: a chain of timers drifts out of sync with the frame clock
 * the moment the tab is backgrounded, a frame is long, or the user's machine
 * stutters — and when that happens the camera, the UI and the 3D scene each end
 * up at a different point in the sequence. Driving everything from one clock
 * that the renderer also uses makes desync structurally impossible.
 *
 * Every state declares its duration. Progress is normalised 0→1 within the
 * state, and every animated value derived from it is also normalised, so the
 * whole sequence can be re-timed by editing one table.
 */

/** @typedef {'idle'|'armed'|'countdown'|'ignition'|'launch'|'lightspeed'|'flash'|'confirmation'|'returning'} DeploymentState */

/**
 * THE TENSION CURVE.
 *
 *   0.0  submit          form accepted, sequence begins
 *   0.7  ui gone         panel has withdrawn
 *   1.0  03              first digit
 *   1.8  02
 *   2.6  01
 *   3.3  SILENCE         ~200ms of nothing at all
 *   3.5  ignition
 *   4.0  movement        ship starts to move
 *   4.8  hard accel      exponential curve bites
 *   5.5  warp            streaks begin
 *   6.7  peak            full speed tunnel
 *   7.3  flash
 *   8.0  message
 *
 * THE SILENCE IS THE POINT. Cutting straight from "01" to ignition gives the
 * brain nothing to anticipate with; a beat of held breath before the engines
 * light is what makes the change in velocity land. It is the same reason the
 * monolith at ARCHIVES pauses before it opens — the gap does the work, not the
 * animation on either side of it.
 */
export const DURATION = {
  armed: 0.7, // submit → UI gone
  hold: 0.3, // beat before the count starts
  // 2.3 not 2.4: the third digit is held slightly shorter so `silence` starts
  // on the requested 3.3s mark rather than drifting past it.
  countdown: 2.3, // 0.8 + 0.8 + 0.7
  silence: 0.2, // the held breath
  ignition: 0.5,
  launch: 1.48, // movement → hard acceleration, lands warp on 5.5s
  lightspeed: 1.8, // warp → peak, held long enough to register
  flash: 0.7,
  confirmation: Infinity, // waits for the user
  returning: 1.4,
}

/** Order of automatic progression. `confirmation` is terminal until dismissed. */
const NEXT = {
  armed: 'hold',
  hold: 'countdown',
  countdown: 'silence',
  silence: 'ignition',
  ignition: 'launch',
  launch: 'lightspeed',
  lightspeed: 'flash',
  flash: 'confirmation',
  returning: 'idle',
}

/**
 * Live sequence values. All normalised 0→1 unless noted.
 *
 * Mutable object rather than React state: these change every frame and are read
 * inside useFrame. Only the discrete `state` is published to React.
 */
export const deployment = {
  state: /** @type {DeploymentState} */ ('idle'),
  /** Seconds elapsed in the current state. */
  elapsed: 0,
  /** Progress through the current state, 0→1. */
  progress: 0,

  /* ---- animated values, all 0→1 ---- */
  /** Engine emissive / glow / light multiplier. Exceeds 1 during ignition. */
  enginePower: 0,
  /** Star streak length and the effects that ride with it. */
  warpFactor: 0,
  /** Camera shake amplitude. */
  cameraShake: 0,
  /** Right-hand panel and HUD opacity. */
  uiOpacity: 1,
  /** White flash at the transition to confirmation. */
  flashAmount: 0,
  /** How far the camera has closed in on the ship, 0 = normal, 1 = tight. */
  cameraClose: 0,
  /** Distance travelled during launch, in world units. */
  launchDistance: 0,

  /** Countdown number currently showing: 3, 2, 1, or null. */
  countNumber: /** @type {number|null} */ (null),
  /** Progress within the current countdown digit, for its own animation. */
  countProgress: 0,

  /** Set when the backend rejects — aborts before lightspeed. */
  error: /** @type {string|null} */ (null),
  /** True once past the point of no return. */
  committed: false,

  /** Short-form sequence for prefers-reduced-motion. */
  reduced: false,
}

const listeners = new Set()

/** Subscribe to DISCRETE state changes only. Never called per frame. */
export function subscribeDeployment(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit() {
  listeners.forEach((fn) => fn(deployment.state))
}

/* ------------------------------------------------------------------ */
/* Easing                                                              */
/* ------------------------------------------------------------------ */

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * Exponential ease-in for the launch.
 *
 * This curve is the whole reason the launch reads as acceleration rather than
 * as travel: the ship barely moves for the first half, then covers enormous
 * distance in the last few frames. A linear ramp feels like a camera pan.
 */
const easeInExpo = (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10))

/* ------------------------------------------------------------------ */
/* Transitions                                                         */
/* ------------------------------------------------------------------ */

function enter(next) {
  deployment.state = next
  deployment.elapsed = 0
  deployment.progress = 0

  /* Clear the digit on ENTRY to silence — not on its first update.
   *
   * Otherwise the last "01" survives one frame into the beat, and the whole
   * point of the beat is that there is NOTHING on screen. A single frame of
   * leftover numeral is enough to break it. */
  if (next === 'silence') {
    deployment.countNumber = null
    deployment.countProgress = 0
  }

  if (next === 'ignition') {
    // Point of no return: abort is refused from here on.
    deployment.committed = true
    deployment.countNumber = null
    deployment.countProgress = 0
  }
  if (next === 'idle') {
    reset()
  }
  emit()
}

export function reset() {
  deployment.state = 'idle'
  deployment.elapsed = 0
  deployment.progress = 0
  deployment.enginePower = 0
  deployment.warpFactor = 0
  deployment.cameraShake = 0
  deployment.uiOpacity = 1
  deployment.flashAmount = 0
  deployment.cameraClose = 0
  deployment.launchDistance = 0
  deployment.countNumber = null
  deployment.countProgress = 0
  deployment.error = null
  deployment.committed = false
}

/** Begin the sequence. Called once the backend has accepted the submission. */
export function beginDeployment({ reduced = false } = {}) {
  reset()
  deployment.reduced = reduced
  // Reduced motion skips straight to the quiet confirmation: no countdown, no
  // launch, no warp. The message still arrives; the spectacle does not.
  enter(reduced ? 'flash' : 'armed')
}

/** Abort before ignition. Returns false if the sequence is already committed. */
export function abortDeployment() {
  if (deployment.committed) return false
  reset()
  emit()
  return true
}

/** Fail the sequence — backend rejected. Only valid before ignition. */
export function failDeployment(message) {
  if (deployment.committed) return false
  reset()
  deployment.error = message || 'Deployment rejected'
  emit()
  return true
}

/** Dismiss the confirmation and fly the scene back to its normal state. */
export function returnToNavigation() {
  if (deployment.state !== 'confirmation') return
  enter('returning')
}

/* ------------------------------------------------------------------ */
/* Per-frame update                                                    */
/* ------------------------------------------------------------------ */

/**
 * Advance the machine. Call once per frame from the render loop.
 * @param {number} delta seconds
 */
export function updateDeployment(delta) {
  const s = deployment.state
  if (s === 'idle') return

  deployment.elapsed += delta
  const dur = DURATION[s]
  deployment.progress = dur === Infinity ? 0 : Math.min(1, deployment.elapsed / dur)
  const p = deployment.progress

  switch (s) {
    case 'armed': {
      // UI withdraws; the system is taking over navigation.
      deployment.uiOpacity = 1 - easeOutCubic(p)
      deployment.enginePower = p * 0.25
      deployment.cameraClose = easeInOutCubic(p) * 0.3
      break
    }

    case 'hold': {
      // UI is gone; the camera keeps closing. Nothing announced yet — this gap
      // is what makes the first digit feel like an event rather than a label
      // that was always going to appear.
      deployment.uiOpacity = 0
      deployment.enginePower = 0.25
      deployment.cameraClose = 0.3 + easeInOutCubic(p) * 0.12
      break
    }

    case 'silence': {
      /* THE BEAT. Everything holds: no digit, no label, no movement.
       *
       * Engine power actually DIPS very slightly here — the pre-ignition spool
       * down before the burn. That tiny drop is what makes the ignition that
       * follows feel like a release rather than a continuation. */
      deployment.countNumber = null
      deployment.enginePower = 0.7 - easeOutCubic(p) * 0.12
      deployment.cameraShake = 0.35 * (1 - p * 0.5)
      deployment.cameraClose = 1
      break
    }

    case 'countdown': {
      /* Digits at 0.8 / 0.8 / 0.7 so 03 and 02 land exactly on their marks and
       * the last one shortens slightly into the silence. Explicit boundaries
       * rather than an even split, because an even split over 2.3s would put
       * every digit 0.03s off. */
      const e = deployment.elapsed
      const idx = e < 0.8 ? 0 : e < 1.6 ? 1 : 2
      const start = idx === 0 ? 0 : idx === 1 ? 0.8 : 1.6
      const span = idx === 2 ? 0.7 : 0.8
      deployment.countNumber = 3 - idx
      deployment.countProgress = Math.min(1, (e - start) / span)

      deployment.uiOpacity = 0
      // Engines spin up across the whole count, not in steps.
      deployment.enginePower = 0.25 + easeInOutCubic(p) * 0.45
      // The camera physically closes on the ship — not an FOV zoom. Picks up
      // where `hold` left it (0.42) and arrives tight by the last digit.
      deployment.cameraClose = 0.42 + easeInOutCubic(p) * 0.58
      // Hull tremor builds as power rises.
      deployment.cameraShake = p * 0.35
      break
    }

    case 'ignition': {
      deployment.countNumber = null
      deployment.enginePower = 0.7 + easeOutCubic(p) * 1.6
      deployment.cameraShake = 0.35 + easeOutCubic(p) * 0.65
      deployment.cameraClose = 1
      break
    }

    case 'launch': {
      /* Movement, then hard acceleration.
       *
       * The first ~40% is a slow build — the ship unsticks and starts to move,
       * which is the 4.0s "movement" mark. After that easeInExpo takes over and
       * the distance curve goes near-vertical, giving the 4.8s "hard accel".
       * A single linear ramp would read as a camera pan, not as thrust. */
      const e = easeInExpo(p)
      deployment.launchDistance = e * 1400
      deployment.enginePower = 2.3
      // Streaks start appearing near the end of this state (~5.5s absolute).
      deployment.warpFactor = Math.max(0, (p - 0.62) / 0.38) * 0.45
      deployment.cameraShake = 0.5 + p * 0.3
      break
    }

    case 'lightspeed': {
      // Warp climbs to a full tunnel by the peak at ~6.7s.
      deployment.launchDistance = 1400 + easeInExpo(p) * 7200
      deployment.enginePower = 2.6
      deployment.warpFactor = 0.45 + easeOutCubic(p) * 0.55
      deployment.cameraShake = 0.55
      break
    }

    case 'flash': {
      // Bloom out to white, then fall to black. Short and clean.
      const up = Math.min(1, p / 0.35)
      const down = Math.max(0, (p - 0.35) / 0.65)
      deployment.flashAmount = up * (1 - easeInOutCubic(down))
      deployment.warpFactor = 1 - easeOutCubic(down)
      deployment.enginePower = 2.6 * (1 - down)
      deployment.cameraShake = 0.55 * (1 - down)
      deployment.uiOpacity = 0
      break
    }

    case 'confirmation': {
      // Terminal. Everything is quiet; the machine waits for the user.
      deployment.warpFactor = 0
      deployment.enginePower = 0
      deployment.cameraShake = 0
      deployment.flashAmount = 0
      return
    }

    case 'returning': {
      // Ease every value home. The scene reassembles rather than cutting back.
      const e = easeInOutCubic(p)
      deployment.uiOpacity = e
      deployment.cameraClose = 1 - e
      deployment.launchDistance = (1 - e) * 11600
      break
    }

    default:
      break
  }

  if (deployment.progress >= 1 && dur !== Infinity) {
    const next = NEXT[s]
    if (next) enter(next)
  }
}
