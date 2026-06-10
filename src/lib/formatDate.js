// Single source of truth for date formatting across the blog. `style` picks
// between the compact card format and the long article format.
const LOCALES = { es: 'es-ES', en: 'en-US' }

export function formatDate(iso, lang, style = 'short') {
  const options =
    style === 'long'
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' }
  return new Date(iso).toLocaleDateString(LOCALES[lang] ?? 'en-US', options)
}
