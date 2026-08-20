/**
 * ORBIT CONTROL — drag to look around a docked site.
 *
 * The design rule, and the reason this is not just an OrbitControls drop-in:
 *
 *   DRAGGING NUDGES THE ORBIT. IT DOES NOT TAKE IT OVER.
 *
 * The camera's slow automatic orbit is what keeps a docked section feeling
 * alive while you read. If a drag stopped it permanently, the first person to
 * touch the mouse would freeze the scene for the rest of their visit and the
 * whole "motion never fully stops" principle dies with one click.
 *
 * So a drag adds an OFFSET on top of the running orbit. Release it and the
 * automatic rotation carries on from wherever you left it, with the offset
 * easing back toward neutral — the view drifts home rather than snapping.
 *
 * Vertical drag is clamped hard. Free pitch in a scene with no horizon is how
 * you end up upside down with no idea which way is up.
 */

export const orbit = {
  /** Horizontal offset in radians, applied on top of the automatic orbit. */
  yaw: 0,
  /** Vertical offset in radians. Clamped — see PITCH_LIMIT. */
  pitch: 0,
  /** True while the pointer is down and dragging. */
  dragging: false,
  /** True once the user has dragged at all this session; retires the hint. */
  hasDragged: false,
}

const PITCH_LIMIT = 0.55
const YAW_SENSITIVITY = 0.0052
const PITCH_SENSITIVITY = 0.0034

/** How fast the manual offset decays back to neutral once released. */
const RECENTRE_RATE = 0.35

let startX = 0
let startY = 0
let startYaw = 0
let startPitch = 0

export function resetOrbit() {
  orbit.yaw = 0
  orbit.pitch = 0
  orbit.dragging = false
}

/**
 * Attach drag handlers. Returns a teardown function.
 * @param {HTMLElement} el element to listen on (the canvas wrapper)
 * @param {() => boolean} isEnabled called on pointerdown; drag only starts if true
 */
export function attachOrbitDrag(el, isEnabled) {
  function onPointerDown(e) {
    // Never hijack a click meant for the panel, a button or a 3D object.
    if (e.button !== 0) return
    if (!isEnabled()) return
    const target = e.target
    if (target && target.closest && target.closest('.ix-hud')) {
      // Pointer is over HUD chrome; let the HUD have it.
      const interactive = target.closest('button, a, input, textarea, [data-interactive]')
      if (interactive) return
    }

    orbit.dragging = true
    startX = e.clientX
    startY = e.clientY
    startYaw = orbit.yaw
    startPitch = orbit.pitch
    el.setPointerCapture?.(e.pointerId)
    document.body.style.cursor = 'grabbing'
  }

  function onPointerMove(e) {
    if (!orbit.dragging) return
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    orbit.yaw = startYaw - dx * YAW_SENSITIVITY
    orbit.pitch = Math.max(
      -PITCH_LIMIT,
      Math.min(PITCH_LIMIT, startPitch - dy * PITCH_SENSITIVITY),
    )

    // Only count as a real drag past a small threshold, so a stray click does
    // not retire the hint.
    if (!orbit.hasDragged && Math.hypot(dx, dy) > 12) orbit.hasDragged = true
  }

  function onPointerUp(e) {
    if (!orbit.dragging) return
    orbit.dragging = false
    el.releasePointerCapture?.(e.pointerId)
    document.body.style.cursor = ''
  }

  el.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)

  return () => {
    el.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
  }
}

/**
 * Called every frame by the camera rig. Eases the manual offset back toward
 * neutral while the pointer is up, so the view returns home on its own.
 */
export function decayOrbit(delta) {
  if (orbit.dragging) return
  const k = Math.min(1, RECENTRE_RATE * delta)
  orbit.yaw += (0 - orbit.yaw) * k
  orbit.pitch += (0 - orbit.pitch) * k
}
