export const numberFormat = new Intl.NumberFormat('en-US')

export function formatNumber(value) {
  return numberFormat.format(Math.round(value || 0))
}

export function formatCompact(value) {
  const n = Number(value) || 0
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + 'M'
  if (n >= 10_000) return Math.round(n / 1000) + 'K'
  if (n >= 1_000) return (n / 1000).toFixed(1) + 'K'
  return String(Math.round(n))
}

export function formatMegabytes(megabytes) {
  const mb = Number(megabytes) || 0
  if (mb >= 1024) return { value: (mb / 1024).toFixed(1), unit: 'GB' }
  // Small totals still deserve a readable number instead of a bare 0.
  if (mb > 0 && mb < 10) return { value: mb.toFixed(1), unit: 'MB' }
  return { value: String(Math.round(mb)), unit: 'MB' }
}

export function relativeTime(iso) {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return 'just now'
  const diff = Date.now() - then
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function percent(part, whole) {
  if (!whole) return '0'
  return ((part / whole) * 100).toFixed(1)
}
