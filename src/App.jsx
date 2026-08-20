import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useLenis } from './hooks/useLenis'
import { LanguageProvider } from './i18n/LanguageContext'
import ScrollProgress from './components/ScrollProgress'
import ScrollToHash from './components/ScrollToHash'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import Blog from './components/Blog'
import BlogPost from './components/BlogPost'

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

export default function App() {
  useLenis()

  return (
    <BrowserRouter>
      <LanguageProvider>
        <SiteChrome />
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
      </LanguageProvider>
    </BrowserRouter>
  )
}

/** Matches the cold-start aesthetic so the chunk load reads as part of the boot. */
function InteractiveBoot() {
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
