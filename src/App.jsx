import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useLenis } from './hooks/useLenis'
import { LanguageProvider } from './i18n/LanguageContext'
import ScrollProgress from './components/ScrollProgress'
import ScrollToHash from './components/ScrollToHash'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import Blog from './components/Blog'
import BlogPost from './components/BlogPost'
import ExploreTransition from './transition/ExploreTransition'
import LaunchTransition from './components/LaunchTransition'
import { useTransitionPhase } from './transition/useTransitionPhase'
import { getPhase, isTransitioning } from './transition/warpStore'


// The 3D bundle is heavy and must never load on the classic portfolio routes.
const InteractiveExperience = lazy(() =>
  import('./interactive/InteractiveExperience'),
)

/**
 * /interactive owns the whole viewport: no site chrome, no scroll progress,
 * no footer. Anything else would betray the premise that the space IS the
 * navigation.
 */
function SiteChrome() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/interactive')) return null

  return (
    <>
      <ScrollProgress />
      <ScrollToHash />
    </>
  )
}

function SiteFooter() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/interactive')) return null
  return <Footer />
}

/**
 * STAGING LAYER — why the transition has no seam.
 *
 * THE PROBLEM: a route change tears down one React tree and builds another.
 * During that swap there is a window — measured at ~1s with a cold chunk, and
 * visible as ESTABLISHING UPLINK painted over the white-out — where NEITHER
 * scene is on screen. No amount of overlay tuning fixes that, because the
 * overlay is covering a genuine gap rather than a fast cut.
 *
 * THE FIX: stop making it a swap. From the moment the camera starts moving,
 * /interactive is mounted BEHIND the still-visible Home, at full size, already
 * compiling shaders and rendering frames. When the warp peaks, the Home simply
 * stops being drawn over it. Nothing mounts at the critical moment because
 * everything already mounted a second and a half earlier.
 *
 * The route still changes — the URL must be correct and the back button must
 * work — but by then it is bookkeeping, not a visual event. The <Routes> render
 * of /interactive finds the module cached and the WebGL context warm.
 *
 * Deliberately NOT a shared canvas: that would require hoisting three.js above
 * the route split and shipping ~1.3MB of it to every reader of the written
 * portfolio. This gets the same seamlessness for zero bytes on the home path,
 * because the mount is still lazy — just earlier.
 */
function InteractiveStage() {
  const phase = useTransitionPhase()
  const { pathname } = useLocation()

  const onRoute = pathname.startsWith('/interactive')

  /* Stage from the FIRST phase, before the camera has moved at all.
   *
   * Mounting a WebGL scene is not free and it is not asynchronous: compiling
   * shaders, building the PMREM environment and uploading geometry all block
   * the main thread, and the transition's rAF loop lives on that same thread.
   * Measured with staging starting at 'entering-space': the warp froze for over
   * six seconds mid-dive and the screen went black — the stall landed in the
   * middle of the motion it was supposed to protect.
   *
   * Starting at 'preparing' moves that cost to the one moment where a stalled
   * frame is invisible: the page is still fully drawn and nothing has begun to
   * move. By the time the camera pushes, the scene is built and idle. */
  const staging = isTransitioning(phase)

  /* Once staged, stay mounted. Unmounting the instant the route catches up
     would destroy the very context we spent the transition warming, and the
     route render would build a second one from scratch. */
  const [staged, setStaged] = useState(false)
  useEffect(() => {
    if (staging) setStaged(true)
    else if (!onRoute && phase === 'idle') setStaged(false)
  }, [staging, onRoute, phase])

  /* Revealed only at the peak, when the Home has fully faded and the breach
     is at full white. Before that the staged scene is running but invisible. */
  const revealed = phase === 'routing' || phase === 'interactive-entry'

  // The route owns it now; this layer steps aside so there is exactly one.
  if (onRoute || !staged) return null

  return (
    <div
      aria-hidden
      /* Behind the Home (which sits at default stacking) and inert. It is a
         warm engine idling out of sight, not something the visitor can touch. */
      style={{
        position: 'fixed',
        inset: 0,
        /* Above the body background but below the site.
         *
         * A negative z-index is wrong here even though it sounds right: it puts
         * the layer BEHIND body's own opaque #05060a, so the scene would be
         * invisible even after the reveal. And zIndex:0 is wrong the other way
         * — verified in a capture, the cold-start checklist covered the hero at
         * 700ms, because .ix-root is position:fixed with an opaque background
         * and escapes any container that has no stacking context of its own.
         *
         * z-index 1 with the site chrome above it gives both properties: hidden
         * while the Home is drawn, visible the moment the Home clears. */
        zIndex: 1,
        pointerEvents: 'none',
        /* Invisible while staging, revealed only as the Home clears.
         *
         * Opacity rather than `visibility` or `display` so the canvas keeps
         * rendering: a hidden canvas is throttled by the browser and would
         * defeat the entire warm-up this layer exists for.
         *
         * The opacity value ALSO establishes a stacking context, which is what
         * makes zIndex:-20 bite. Without it the staged scene's own .ix-root —
         * position:fixed, inset:0, opaque background — escaped this container
         * and covered the whole viewport in flat #08090b. That was the black
         * frame: not a stall, but the destination sitting on top of the hero
         * a full second before it should have been visible. */
        opacity: revealed ? 1 : 0.001,
        transition: 'opacity 260ms linear',
      }}
    >
      <Suspense fallback={null}>
        <InteractiveExperience />
      </Suspense>
    </div>
  )
}

export default function App() {
  useLenis()

  return (
    <BrowserRouter>
      <LanguageProvider>
        <SiteChrome />

        {/* Mounted before <Routes> so it renders underneath the Home. */}
        <InteractiveStage />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route
            path="/interactive"
            element={
              <Suspense fallback={<InteractiveBoot />}>
                <InteractiveExperience />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <SiteFooter />

        {/* Both live ABOVE the routes on purpose.
         *
         * The controller must keep advancing its clock while HomePage unmounts,
         * and the breach canvas must keep painting across that same moment.
         * Mounted inside a route, both would be torn down exactly when they
         * matter most.
         *
         * Neither pulls in three.js, so the home bundle is unaffected. */}
        <ExploreTransition />
        <LaunchTransition />
      </LanguageProvider>
    </BrowserRouter>
  )
}

/**
 * Matches the cold-start aesthetic so the chunk load reads as part of the boot.
 *
 * EXCEPT when the visitor flew here. The staging layer means the scene is
 * normally already mounted and this never renders during a transition — but if
 * hardware is slow enough that the route wins the race anyway, an opaque panel
 * with a status line is precisely the seam the feature exists to remove. Plain
 * dark, and let the streaks above cover it.
 */
function InteractiveBoot() {
  const flying = isTransitioning(getPhase())

  if (flying) {
    return <div style={{ position: 'fixed', inset: 0, background: '#08090B' }} />
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#08090B',
        display: 'grid',
        placeItems: 'center',
        zIndex: 100,
      }}
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: '#6E747F',
        }}
      >
        Establishing uplink
      </span>
    </div>
  )
}
