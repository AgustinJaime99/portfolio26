import { useEffect, useMemo, useRef } from 'react'

/**
 * INPUT — flight assist, no pointer lock.
 *
 * The cursor is never captured. This is the single most important UX decision
 * in the piece: a portfolio that swallows the mouse cursor reads as hostile,
 * breaks trackpads, and strands anyone who wants to leave. Mouse position acts
 * as a soft bias on heading instead of a hard camera coupling.
 */

const KEY_MAP = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'boost',
  ShiftRight: 'boost',
}

/** Keys we consume, so the page never scrolls under the canvas. */
const SWALLOW = new Set(Object.keys(KEY_MAP).concat(['Space']))

export function useInput(enabled = true) {
  const input = useMemo(
    () => ({
      forward: false,
      back: false,
      left: false,
      right: false,
      boost: false,
      /** Normalised pointer offset from screen centre, -1..1. */
      pointerX: 0,
      pointerY: 0,
      /** True while the pointer is over the canvas at all. */
      pointerActive: false,

      /* ---- Analogue axes, written by the touch controls ----
       *
       * Keyboard is binary: a key is down or it is not. Touch is not, and
       * throwing away that resolution would make the stick feel like four
       * arrow keys taped to the screen. These carry the analogue value and the
       * flight engine prefers them when they are non-zero, falling back to the
       * boolean keys otherwise — so both input methods coexist without the
       * engine needing to know which is in use.
       */
      /** Steering, -1 (left) .. +1 (right). */
      axisX: 0,
      /** Pitch, -1 (down) .. +1 (up). */
      axisY: 0,
      /** Throttle, 0..1. */
      axisThrottle: 0,
      /** True while any touch control is being held. */
      touchActive: false,
    }),
    [],
  )

  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    function clearKeys() {
      input.forward = false
      input.back = false
      input.left = false
      input.right = false
      input.boost = false
    }

    function onKeyDown(e) {
      if (!enabledRef.current) return
      // Never hijack browser shortcuts or typing in the contact form.
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      const action = KEY_MAP[e.code]
      if (!action) return
      if (SWALLOW.has(e.code)) e.preventDefault()
      input[action] = true
    }

    function onKeyUp(e) {
      const action = KEY_MAP[e.code]
      if (!action) return
      input[action] = false
    }

    function onPointerMove(e) {
      input.pointerActive = true
      input.pointerX = (e.clientX / window.innerWidth) * 2 - 1
      input.pointerY = (e.clientY / window.innerHeight) * 2 - 1
    }

    function onPointerLeave() {
      input.pointerActive = false
      input.pointerX = 0
      input.pointerY = 0
    }

    // Releasing focus must not leave a key stuck down.
    function onBlur() {
      clearKeys()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('blur', onBlur)
    document.addEventListener('pointerleave', onPointerLeave)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [input])

  return input
}
