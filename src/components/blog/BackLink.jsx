import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// Reusable "go back" link. Uses react-router's Link so it participates in
// client-side routing instead of a manual hash mutation.
export default function BackLink({ to, label, className = '' }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 font-mono text-sm text-white/55 transition hover:text-white ${className}`}
    >
      <ArrowLeft size={15} /> {label}
    </Link>
  )
}
