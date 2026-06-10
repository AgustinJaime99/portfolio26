import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Bridges react-router with the in-page #anchors the portfolio uses: when the
// location includes a hash, scroll that section into view; otherwise this is a
// no-op (individual pages manage their own scroll).
export default function ScrollToHash() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }, [pathname, hash])

  return null
}
