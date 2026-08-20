import { Suspense, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor, Preload } from '@react-three/drei'
import * as THREE from 'three'

import './hud/hud.css'

import { useInput } from './core/useInput'
import { useCapability } from './core/useCapability'
import { resetFlight, setFlightState, useFlightState } from './core/flightStore'
import { attachOrbitDrag } from './core/orbitControl'
import FlightEngine from './core/FlightEngine'
import CaptureSequence from './core/CaptureSequence'
import LaunchSequence from './core/LaunchSequence'
import PostProcessing from './core/PostProcessing'
import TargetProjector from './core/TargetProjector'

import Vessel from './ship/Vessel'
import Starfield from './world/Starfield'
import Beacons from './world/Beacons'
import Lighting from './world/Lighting'
import SpaceEnvironment from './world/SpaceEnvironment'
import { DriftMotes, DustBands, DistantSun } from './world/Volumetrics'
import CelestialEvents from './world/CelestialEvents'
import TheWorks from './world/TheWorks'
import Signal from './world/Signal'
import Archives from './world/Archives'
import LaunchComplex from './world/LaunchComplex'

import ColdStart from './hud/ColdStart'
import Telemetry from './hud/Telemetry'
import ControlHint from './hud/ControlHint'
import TargetLock from './hud/TargetLock'
import SiteMarkers from './hud/SiteMarkers'
import DockedControls from './hud/DockedControls'
import TouchControls from './hud/TouchControls'
import NavigationPanel from './hud/NavigationPanel'

import WorksPanel from './content/WorksPanel'
import SignalPanel from './content/SignalPanel'
import ArchivesPanel from './content/ArchivesPanel'
import DeploymentPanel from './content/DeploymentPanel'
import ShipSystems from './content/ShipSystems'
import PanelViewer from './content/PanelViewer'

import { MOTION } from './data/artDirection'

/**
 * INTERACTIVE EXPERIENCE — /interactive
 *
 * The space is the navigation system, not a background. Everything reachable
 * in this route is reached by flying to it — by hand. There is no autopilot:
 * [NAVIGATION] is a directory of bearings and ranges, not a travel service.
 *
 * Deliberately kept out: post-processing bloom passes, depth of field and
 * chromatic aberration. All three are expensive, all three are the house style
 * of generated 3D work, and the composition here is built with light instead.
 */

function Scene({ input, reduced }) {
  const shipRef = useRef()

  return (
    <>
      {/* One sun, one light direction, for the whole world. Sites contribute
          practicals only — see Lighting.jsx for why that rule exists. */}
      <Lighting reduced={reduced} />
      {/* Reflections for the metals. Without this, every metalness>0.7 surface
          in the scene resolves to flat shading and reads as plastic. */}
      <SpaceEnvironment />
      <DistantSun />

      <Starfield reduced={reduced} />
      <DustBands reduced={reduced} />
      <DriftMotes reduced={reduced} />
      {/* Comets, reentries and distant drifters. Sporadic by design — an event
          every few seconds becomes wallpaper, and wallpaper is invisible. */}
      <CelestialEvents reduced={reduced} />
      <Beacons />

      <TheWorks />
      <Signal />
      <Archives />
      <LaunchComplex />

      <Vessel ref={shipRef} />

      <FlightEngine input={input} shipRef={shipRef} />
      <CaptureSequence shipRef={shipRef} />
      {/* Mounted AFTER CaptureSequence so its frame callback runs later and
          wins control of ship + camera during a deployment. */}
      <LaunchSequence shipRef={shipRef} />
      {/* Projects the locked destination into screen space so the HUD bracket
          can sit on the actual object instead of at screen centre. */}
      <TargetProjector />

      {/* Bloom is what makes emissives read as light rather than as bright
          paint. Disabled entirely in reduced mode — it is the first thing to
          go on weak hardware. */}
      <PostProcessing enabled={!reduced} quality={reduced ? 'low' : 'high'} />

      <Preload all />
    </>
  )
}

export default function InteractiveExperience() {
  const caps = useCapability()
  const input = useInput(true)
  const phase = useFlightState((s) => s.phase)
  const rootRef = useRef(null)

  /* Drag-to-rotate, live only while docked at a site.
   *
   * Reading phase through a ref inside the enable check (rather than
   * re-attaching listeners on every phase change) keeps the handler stable and
   * avoids dropping a drag mid-gesture if state updates while the pointer is
   * down. */
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    return attachOrbitDrag(el, () => phaseRef.current === 'docked')
  }, [])

  // Publish reduced mode once so the frame loop can branch on it cheaply.
  useEffect(() => {
    setFlightState({
      reducedMode: caps.reduced,
      // The accessibility preference, tracked independently of GPU capability.
      prefersReducedMotion: !!caps.reducedMotion,
    })
  }, [caps.reduced])

  // This route owns the viewport: no page scroll behind the canvas.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    resetFlight()
    setFlightState({
      phase: 'boot',
      lockedTarget: null,
      activeSection: null,
      activeSatellite: null,
      activeMission: null,
      navOpen: false,
      systemsOpen: false,
      deployPhase: null,
    })
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.cursor = ''
    }
  }, [])

  if (caps.hasWebGL === false) {
    return (
      <div className="ix-root">
        <div style={{ display: 'grid', placeItems: 'center', height: '100%', padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <h1 className="ix-display" style={{ fontSize: 34, marginBottom: 14 }}>
              No WebGL context
            </h1>
            <p style={{ color: 'var(--dust)', fontSize: 14, lineHeight: 1.6 }}>
              This experience needs hardware acceleration.
            </p>
            <a className="ix-link" href="/" style={{ display: 'inline-block', marginTop: 20 }}>
              Continue to portfolio
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ix-root" ref={rootRef}>
      <Canvas
        className="ix-canvas"
        dpr={[1, caps.dpr]}
        gl={{
          antialias: !caps.reduced,
          powerPreference: 'high-performance',
          alpha: false,
          stencil: false,
          depth: true,
        }}
        camera={{ fov: MOTION.fov.rest, near: 0.5, far: 4000, position: [0, 6, 22] }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x08090b, 1)
          /* Tone mapping.
           *
           * OutputPass reads gl.toneMapping — it does not carry its own. Setting
           * NoToneMapping here meant NO filmic curve was ever applied: every
           * value above 1.0 clipped straight to flat white, which is why lit
           * surfaces blew out into featureless paper instead of rolling off.
           *
           * ACES is the right curve for this: it compresses highlights
           * gracefully and keeps saturation in the shoulder, so a hot engine
           * plume stays cyan instead of going white. */
          gl.toneMapping = THREE.ACESFilmicToneMapping
          /* Exposure below 1 on purpose. The scene is lit by a single hard key
           * against a black void — the correct reference for a space shot is a
           * slightly under-exposed photograph, where highlights have headroom
           * and shadows are genuinely dark. */
          gl.toneMappingExposure = 0.82
          scene.fog = new THREE.FogExp2(0x08090b, 0.00036)
        }}
      >
        <Suspense fallback={null}>
          <PerformanceMonitor
            onDecline={() => setFlightState({ reducedMode: true })}
          />
          <AdaptiveDpr pixelated={false} />
          <Scene input={input} reduced={caps.reduced} />
        </Suspense>
      </Canvas>

      <div className="ix-hud">
        <ColdStart />
        <Telemetry />
        <ControlHint input={input} />
        <SiteMarkers />
        <TargetLock />
        <DockedControls />
        <TouchControls input={input} />
        <NavigationPanel />

        <WorksPanel />
        <SignalPanel />
        <ArchivesPanel />
        <DeploymentPanel />
        <ShipSystems />
        <PanelViewer />

        {phase !== 'boot' && (
          <a className="ix-exit" href="/">
            Exit to portfolio →
          </a>
        )}
      </div>
    </div>
  )
}
