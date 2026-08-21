import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Github, Linkedin, Languages } from 'lucide-react'
import { useI18n } from '../i18n/LanguageContext'
import ExploreLink from './ExploreLink'
import ExploreShipButton from './ExploreShipButton'
import { useTransitionPhase } from '../transition/useTransitionPhase'
import { isDimming } from '../transition/warpStore'

export default function Navbar() {
  const { t, meta, lang, toggle } = useI18n()
  const navLinks = t.nav.links
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('home')

  /* The header is the last piece of site chrome standing between the visitor
     and the space. It goes first, and slightly faster than the hero content —
     the frame clears before its contents do. */
  const phase = useTransitionPhase()
  const dimming = isDimming(phase)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id)
        })
      },
      { rootMargin: '-45% 0px -50% 0px' }
    )
    navLinks.forEach((l) => {
      const el = document.getElementById(l.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [navLinks])

  const LangToggle = ({ className = '' }) => (
    <button
      onClick={toggle}
      aria-label="toggle language"
      className={`inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/40 hover:text-white ${className}`}
    >
      <Languages size={15} />
      <span className="font-mono">{lang === 'es' ? 'EN' : 'ES'}</span>
    </button>
  )

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={
        dimming
          ? { y: -8, opacity: 0, transition: { duration: 0.42, ease: [0.4, 0, 1, 1] } }
          : { y: 0, opacity: 1 }
      }
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      // Pointer events die with the opacity so nothing here can be clicked
      // while it is fading out from under the cursor.
      style={dimming ? { pointerEvents: 'none' } : undefined}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'p-5' : 'py-5'
      }`}
    >
      <nav
        // Horizontal padding scales with the viewport: at a flat px-5 the logo
        // and menu button sat almost against the edges once the bar picked up
        // its glass background on scroll, which reads as a crop rather than a
        // panel.
        className={`mx-auto flex max-w-6xl items-center justify-between px-6 sm:px-8 lg:px-10 transition-all duration-300 ${
          scrolled ? 'glass rounded-2xl py-3' : ''
        }`}
        style={scrolled ? { marginLeft: 'auto', marginRight: 'auto', maxWidth: '64rem' } : {}}
      >
        <a href="#home" className="mr-4 shrink-0 font-mono text-lg font-bold tracking-tight">
          <span className="text-gradient">AJ</span>
          <span className="text-white/40">.dev</span>
        </a>

        {/* Only shown from lg up. Adding the Explore destination pushed this row
            past its width at md, wrapping "Sobre mí" onto two lines and running
            the logo into the first pill. Below lg the burger menu carries the
            same links, so nothing is lost. */}
        <ul className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                className={`relative whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
                  active === link.id ? 'text-white' : 'text-white/55 hover:text-white'
                }`}
              >
                {active === link.id && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 -z-10 rounded-lg bg-white/10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <Link
              to="/blog"
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-white/55 transition-colors hover:text-white"
            >
              {t.nav.blog}
            </Link>
          </li>
          <li>
            <ExploreLink variant="inline" />
          </li>
        </ul>

        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <a href={meta.github} target="_blank" rel="noreferrer" className="text-white/60 transition hover:text-accent2">
            <Github size={20} />
          </a>
          <a href={meta.linkedin} target="_blank" rel="noreferrer" className="text-white/60 transition hover:text-accent2">
            <Linkedin size={20} />
          </a>
          <LangToggle />
          <a
            href="#contact"
            className="rounded-lg bg-gradient-to-r from-accent to-accent3 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {t.nav.cta}
          </a>
        </div>

        <div className="flex items-center gap-3 lg:hidden">
          <LangToggle />
          <button className="text-white" onClick={() => setOpen((v) => !v)} aria-label="menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-5 mt-2 overflow-hidden rounded-2xl glass lg:hidden"
          >
            <ul className="flex flex-col p-3">
              {navLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-4 py-3 text-white/70 transition hover:bg-white/5 hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  to="/blog"
                  onClick={() => setOpen(false)}
                  className="block w-full rounded-lg px-4 py-3 text-left text-white/70 transition hover:bg-white/5 hover:text-white"
                >
                  {t.nav.blog}
                </Link>
              </li>
              {/* Separated by a rule: everything above scrolls the page, this
                  leaves it. */}
              <li className="mt-3 border-t border-white/10 pt-3">
                <ExploreShipButton onNavigate={() => setOpen(false)} />
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
