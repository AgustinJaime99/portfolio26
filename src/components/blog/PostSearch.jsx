import { Search } from 'lucide-react'

// Controlled search input. Presentational only — state lives in the page so
// the filtering logic stays in one place (useBlogPosts).
export default function PostSearch({ value, onChange, placeholder, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl glass py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-accent/50"
      />
    </div>
  )
}
