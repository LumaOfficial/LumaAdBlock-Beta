/**
 * Detection and self-improvement.
 *
 * Every request the dashboard observes is scored for ad/tracker signals. When
 * something that looks like an ad gets past every rule, Luma promotes a host
 * rule for it automatically and keeps doing that as new traffic arrives. The
 * same module runs the health checks behind the internal diagnostics page.
 * All of it stays in the browser.
 */
import { FILTER_LISTS } from './blocklists'
import {
  hostMatches,
  hostnameOf,
  isThirdParty,
  isValidSelector,
  parseFilter,
  screenRequest,
} from './engine'

const AD_HOST_TOKENS = new Set([
  'ad', 'ads', 'adv', 'advert', 'adverts', 'adserver', 'adservice', 'adtech', 'adsrv',
  'analytics', 'track', 'tracker', 'trackers', 'tracking', 'telemetry', 'metrics', 'metric',
  'pixel', 'pixels', 'beacon', 'beacons', 'sponsor', 'sponsored', 'promo', 'promotion',
  'campaign', 'campaigns', 'banner', 'banners', 'bid', 'bids', 'prebid', 'popup', 'collect',
])

const AD_PATH_HINTS = [
  '/ad/', '/ads/', '/adserver', '/advertis', '/banner', '/pagead', '/prebid',
  '/vast', '/preroll', '/pixel', '/beacon', '/sponsor', '/promo', '/track',
  '/collect', '/analytics', '/telemetry', '/rtb/',
]

export const MAX_OBSERVATIONS = 120
export const MAX_LEARNED = 300

/** How much a request looks like advertising or tracking. */
export function adSignals(url) {
  const host = hostnameOf(url)
  const tokens = host ? host.split(/[.-]/) : []
  const hostHits = tokens.filter((token) => AD_HOST_TOKENS.has(token))

  let path = ''
  try {
    const parsed = new URL(url)
    path = (parsed.pathname + parsed.search).toLowerCase()
  } catch {
    path = ''
  }
  const pathHits = AD_PATH_HINTS.filter((hint) => path.includes(hint))

  return {
    host,
    hostHits,
    pathHits,
    score: hostHits.length * 2 + pathHits.length,
    strong: hostHits.length > 0 || pathHits.length >= 2,
  }
}

/** Is this host already covered by a domain rule the engine ships or learned? */
function coveredByHostRule(host, rules) {
  return rules.some((rule) => {
    if (rule.kind !== 'network' || rule.exception) return false
    if (!rule.pattern.startsWith('||')) return false
    const domain = rule.pattern.slice(2).match(/^[a-z0-9.-]+/i)
    return domain ? hostMatches(host, domain[0]) : false
  })
}

/**
 * Decide whether one observed request justifies a learned rule.
 *
 * Only requests Luma let through are considered: an existing block needs no
 * new rule, while a missed ad is exactly what learning is for. Requests the
 * user allowlisted, and anything first-party, are left alone.
 */
export function learnCandidate(observation, context) {
  const { rules = [], allowlist = [], protection = true } = context || {}
  if (!protection || !observation || observation.blocked) return null

  const url = String(observation.url || '')
  const host = hostnameOf(url)
  if (!host) return null

  const pageHost = observation.pageHost || ''
  if (pageHost && allowlist.some((entry) => hostMatches(pageHost, entry))) return null
  if (pageHost && isThirdParty(pageHost, host) === false) return null
  if (rules.some((rule) => rule.exception && rule.regex && rule.regex.test(url))) return null

  const signals = adSignals(url)
  if (!signals.strong) return null
  if (coveredByHostRule(host, rules)) return null

  return {
    rule: '||' + host + '^',
    host,
    score: signals.score,
    reason: signals.hostHits.length ? 'ad-like host' : 'ad-like request path',
    at: new Date().toISOString(),
  }
}

/** The self-checks the diagnostics page reports every ten seconds. */
export function runHealthChecks({ state, rules = [] }) {
  const checks = []
  const activeLists = Object.values(state?.lists || {}).filter(Boolean).length

  checks.push({
    id: 'lists',
    label: 'Filter lists',
    detail: activeLists + ' enabled · ' + rules.length + ' compiled rules',
    ok: rules.length > 0,
  })

  let invalid = 0
  for (const list of FILTER_LISTS) {
    if (!state?.lists?.[list.id]) continue
    for (const line of list.rules) {
      if (!line || line.startsWith('!') || line.startsWith('[')) continue
      if (parseFilter(line, list.id).kind === 'invalid') invalid += 1
    }
  }
  for (const line of state?.customRules || []) {
    if (parseFilter(line, 'custom').kind === 'invalid') invalid += 1
  }
  checks.push({
    id: 'parse',
    label: 'Rule parsing',
    detail: invalid ? invalid + ' unreadable rules skipped' : 'Every rule parsed',
    ok: invalid === 0,
  })

  const seen = new Set()
  let duplicates = 0
  for (const rule of rules) {
    const key = rule.kind + '|' + rule.raw
    if (seen.has(key)) duplicates += 1
    else seen.add(key)
  }
  checks.push({
    id: 'duplicates',
    label: 'Duplicate rules',
    detail: duplicates ? duplicates + ' duplicates' : 'No duplicates',
    ok: duplicates === 0,
  })

  const selectors = [
    ...new Set(
      rules.filter((rule) => rule.kind === 'cosmetic' && !rule.exception).map((rule) => rule.selector),
    ),
  ]
  const broken = selectors.filter((selector) => !isValidSelector(selector))
  checks.push({
    id: 'cosmetic',
    label: 'Element hiding',
    detail: broken.length ? broken.length + ' selectors cannot compile' : selectors.length + ' selectors compile',
    ok: broken.length === 0,
  })

  const clock = typeof performance !== 'undefined' ? performance : Date
  const started = clock.now()
  screenRequest(
    { url: 'https://ad.doubleclick.net/ddm/adi/N4821/banner.gif', type: 'image' },
    { rules, allowlist: state?.allowlist || [], protection: true, pageHost: 'news.dailybyte.test' },
  )
  const latency = Math.round((clock.now() - started) * 100) / 100
  checks.push({
    id: 'latency',
    label: 'Engine response',
    detail: latency + ' ms per decision',
    ok: latency < 25,
  })

  return {
    ok: checks.every((check) => check.ok),
    checks,
    latency,
    checkedAt: Date.now(),
  }
}
