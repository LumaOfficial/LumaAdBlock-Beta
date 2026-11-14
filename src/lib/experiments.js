/**
 * Monthly experiments.
 *
 * A small pool of diagnostics that rotate with the calendar: each month picks
 * three of them that run on this device only. The pick is derived from the
 * month itself, so every device sees the same set and nothing has to be
 * fetched. Results are kept in local storage and, in privacy mode, without a
 * date or any detail that could point back at the person.
 */

export const EXPERIMENTS = [
  {
    id: 'sites',
    title: 'Simulated sites',
    blurb:
      'Four pretend websites, one real filter engine. Watch every request and ad slot get a verdict.',
    minutes: 2,
  },
  {
    id: 'ping',
    title: 'Signal chase',
    blurb:
      'A reaction game that times how fast a signal reaches the page and comes back — your own ping, in milliseconds.',
    minutes: 1,
  },
  {
    id: 'sprint',
    title: 'Ruleset sprint',
    blurb:
      'A speed test for the filter engine: thousands of requests screened as fast as it can, measured right here.',
    minutes: 1,
  },
  {
    id: 'hunt',
    title: 'Ad hunt',
    blurb:
      'A small grid of page tiles. Find the ads as quickly as you can and Luma blocks them for you.',
    minutes: 1,
  },
]

const EPOCH_YEAR = 2026
const PER_MONTH = 3
const RESULTS_KEY = 'luma.experiments.v1'
const RESULTS_LIMIT = 40

export function experimentById(id) {
  return EXPERIMENTS.find((experiment) => experiment.id === id) || null
}

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(date = new Date()) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/** When the current set is replaced, so the UI can say so. */
export function nextRotation(date = new Date()) {
  const next = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  return next.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
}

/** The three experiments this month: same set everywhere, changes monthly. */
export function monthlyPreset(date = new Date()) {
  const months = (date.getFullYear() - EPOCH_YEAR) * 12 + date.getMonth()
  const start = ((months % EXPERIMENTS.length) + EXPERIMENTS.length) % EXPERIMENTS.length
  const picked = []
  for (let step = 0; step < PER_MONTH; step += 1) {
    picked.push(EXPERIMENTS[(start + step) % EXPERIMENTS.length])
  }
  return { key: monthKey(date), label: monthLabel(date), next: nextRotation(date), picked }
}

export function readResults() {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RESULTS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Keep one result. In privacy mode the date is dropped and only the number
 * and the experiment name are stored.
 */
export function saveExperimentResult(experimentId, { value, unit, label, anonymous = false }) {
  const entry = {
    id: `${experimentId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    experimentId,
    month: monthKey(),
    value,
    unit,
    label,
    anonymous: Boolean(anonymous),
    at: anonymous ? null : new Date().toISOString(),
  }
  if (typeof window === 'undefined') return entry
  try {
    const next = [entry, ...readResults()].slice(0, RESULTS_LIMIT)
    window.localStorage.setItem(RESULTS_KEY, JSON.stringify(next))
  } catch {
    /* storage can be unavailable in private windows */
  }
  return entry
}

export function clearExperimentResults() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(RESULTS_KEY)
  } catch {
    /* ignore */
  }
}

/** Real addresses from the rules the person has enabled, used by the sprint. */
export function buildSprintRequests(rules, count = 1200) {
  const hosts = []
  for (const rule of rules) {
    if (rule.kind !== 'network' || rule.exception) continue
    if (!rule.pattern.startsWith('||')) continue
    const host = rule.pattern.slice(2).match(/^[a-z0-9.-]+/i)
    if (host) hosts.push(host[0].toLowerCase())
    if (hosts.length >= 140) break
  }
  if (!hosts.length) return []

  const types = ['script', 'image', 'xmlhttprequest', 'ping', 'stylesheet']
  const requests = []
  for (let index = 0; index < count; index += 1) {
    requests.push({
      url: `https://${hosts[index % hosts.length]}/luma-bench-${index}.${index % 3 === 0 ? 'gif' : 'js'}`,
      type: types[index % types.length],
    })
  }
  return requests
}
