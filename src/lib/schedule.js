/**
 * Quiet hours: an optional daily window where protection steps aside.
 * Times are local, 24-hour ("22:00"), and may cross midnight.
 */

export const DEFAULT_SCHEDULE = { enabled: false, from: '22:00', to: '07:00' }

export function parseClock(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ''))
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

/** Keep only values the engine can trust, falling back to the saved window. */
export function normalizeSchedule(input, fallback = DEFAULT_SCHEDULE) {
  const next = { ...fallback, ...(input && typeof input === 'object' ? input : {}) }
  return {
    enabled: Boolean(next.enabled),
    from: parseClock(next.from) === null ? fallback.from : next.from,
    to: parseClock(next.to) === null ? fallback.to : next.to,
  }
}

export function isQuietNow(schedule, date = new Date()) {
  if (!schedule?.enabled) return false
  const from = parseClock(schedule.from)
  const to = parseClock(schedule.to)
  if (from === null || to === null || from === to) return false
  const now = date.getHours() * 60 + date.getMinutes()
  if (from < to) return now >= from && now < to
  return now >= from || now < to
}

/** "7:00 AM" from "07:00", for copy the dashboard can show. */
export function clockLabel(value) {
  const minutes = parseClock(value)
  if (minutes === null) return value
  const date = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60)
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function scheduleLabel(schedule) {
  return clockLabel(schedule.from) + ' – ' + clockLabel(schedule.to)
}
