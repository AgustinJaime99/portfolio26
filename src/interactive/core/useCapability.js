import { useEffect, useState } from 'react'

/**
 * CAPABILITY DETECTION
 *
 * Decides up front whether to run the full experience or the reduced one.
 * Getting this wrong in the pessimistic direction costs a little fidelity;
 * getting it wrong in the optimistic direction costs the whole piece, because
 * a 20fps space sim is worse than no space sim.
 */

function detect() {
  if (typeof window === 'undefined') {
    return { reduced: true, dpr: 1, touch: false }
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const touch = window.matchMedia('(pointer: coarse)').matches
  const narrow = window.innerWidth < 860
  const cores = navigator.hardwareConcurrency ?? 4
  const memory = navigator.deviceMemory ?? 4

  // WebGL sanity check — no context means no experience at all.
  let hasWebGL = true
  try {
    const canvas = document.createElement('canvas')
    hasWebGL = !!(
      canvas.getContext('webgl2') || canvas.getContext('webgl')
    )
  } catch {
    hasWebGL = false
  }

  const weak = cores <= 4 || memory <= 4

  return {
    reduced: reducedMotion || touch || narrow || weak || !hasWebGL,
    reducedMotion,
    touch,
    hasWebGL,
    // Cap DPR at 1.6 even on capable machines: a 3x retina buffer is the
    // fastest way to lose 60fps for pixels nobody can resolve in motion.
    dpr: weak ? 1 : Math.min(window.devicePixelRatio || 1, 1.6),
  }
}

export function useCapability() {
  const [caps, setCaps] = useState(detect)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setCaps(detect())
    mq.addEventListener('change', onChange)
    window.addEventListener('resize', onChange)
    return () => {
      mq.removeEventListener('change', onChange)
      window.removeEventListener('resize', onChange)
    }
  }, [])

  return caps
}
