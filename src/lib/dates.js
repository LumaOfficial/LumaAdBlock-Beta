/**
 * Date helpers for the dashboard's counters and charts.
 *
 * Kept out of store.jsx: exporting plain functions from the provider module
 * stopped Fast Refresh, so every edit force-reloaded the whole page.
 */
export function dayKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Blocked requests across a window that ends `offset` days before today. */
export function windowTotal(state, days = 7, offset = 0) {
  let total = 0
  for (let index = 0; index < days; index += 1) {
    const date = new Date()
    date.setDate(date.getDate() - offset - index)
    total += state.daily[dayKey(date)] || 0
  }
  return total
}

export function lastNDays(state, n = 7) {
  const series = []
  for (let offset = n - 1; offset >= 0; offset -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - offset)
    const key = dayKey(date)
    series.push({
      key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      count: state.daily[key] || 0,
    })
  }
  return series
}
