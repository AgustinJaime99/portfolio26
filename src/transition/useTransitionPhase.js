import { useEffect, useState } from 'react'
import { getPhase, subscribe } from './warpStore'

/**
 * Subscribe a component to the transition phase.
 *
 * Phase changes ~8 times across a 3-second transition, so unlike warp.value
 * this is cheap to route through React — and the things that consume it (a
 * navbar fading, a hero dimming) are DOM, not frame-loop.
 */
export function useTransitionPhase() {
  const [phase, setLocal] = useState(getPhase)
  useEffect(() => subscribe(setLocal), [])
  return phase
}
