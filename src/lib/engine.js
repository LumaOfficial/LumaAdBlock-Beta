/**
 * Luma filter engine
 * Parses Adblock Plus style filter syntax and evaluates requests / cosmetic
 * selectors against it. Runs entirely in the browser.
 *
 * Supported syntax
 *   ||example.com^          domain anchored patterns
 *   |https://x.y/z          start anchor (trailing | anchors the end too)
 *   ^ *                     separator / wildcard
 *   @@||example.com^        exception (allow) rule
 *   $third-party,script     request options, ~ negates
 *   $domain=a.com|~b.com    initiator domains
 *   example.com##.ad        element hiding (empty domain part = generic)
 *   example.com#@#.ad       element hiding exception
 *   /banner\d+/             regular expression filters
 */

export const RESOURCE_TYPES = [
  'document',
  'subdocument',
  'script',
  'image',
  'stylesheet',
  'media',
  'font',
  'xmlhttprequest',
  'websocket',
  'ping',
  'other',
]

const TYPE_SET = new Set(RESOURCE_TYPES)

const SECOND_LEVEL = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'co.nz',
  'co.jp', 'co.in', 'com.br', 'com.mx', 'co.za', 'com.tr', 'com.cn',
])

const RE_SPECIAL = /[.+?^${}()|[\]\\]/g
const OPTION_RE =
  /^(.*)\$((?:~?[a-z][a-z0-9-]*(?:=[^,]*)?)(?:,(?:~?[a-z][a-z0-9-]*(?:=[^,]*)?))*)$/i

const sourceCache = new Map()

export function hostnameOf(input) {
  if (!input) return ''
  const value = String(input).trim()
  try {
    const parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : 'http://' + value)
    return parsed.hostname.toLowerCase()
  } catch {
    return ''
  }
}

/** Registrable-ish domain: last two labels, aware of a few two-part suffixes. */
export function siteOf(host) {
  const labels = String(host || '').toLowerCase().split('.').filter(Boolean)
  if (labels.length <= 2) return labels.join('.')
  const lastTwo = labels.slice(-2).join('.')
  if (SECOND_LEVEL.has(lastTwo) && labels.length >= 3) return labels.slice(-3).join('.')
  return lastTwo
}

export function hostMatches(host, domain) {
  const h = String(host || '').toLowerCase()
  const d = String(domain || '').toLowerCase().replace(/^\./, '')
  if (!h || !d) return false
  return h === d || h.endsWith('.' + d)
}

export function isThirdParty(pageHost, requestHost) {
  if (!pageHost || !requestHost) return undefined
  return siteOf(pageHost) !== siteOf(requestHost)
}

function patternToSource(pattern) {
  const cached = sourceCache.get(pattern)
  if (cached) return cached

  let rest = pattern
  let source = ''

  if (rest.startsWith('||')) {
    source += '^[a-z][a-z0-9+.-]*:\\/\\/(?:[^\\/?#]*\\.)?'
    rest = rest.slice(2)
  } else if (rest.startsWith('|')) {
    source += '^'
    rest = rest.slice(1)
  }

  let endAnchor = false
  if (rest.endsWith('|')) {
    endAnchor = true
    rest = rest.slice(0, -1)
  }

  for (const char of rest) {
    if (char === '*') source += '.*'
    else if (char === '^') source += '(?:[^a-zA-Z0-9_\\-.%]|$)'
    else source += char.replace(RE_SPECIAL, '\\$&')
  }

  if (endAnchor) source += '$'
  sourceCache.set(pattern, source)
  return source
}

function defaultOptions() {
  return {
    thirdParty: undefined,
    types: [],
    notTypes: [],
    includeDomains: [],
    excludeDomains: [],
    important: false,
  }
}

export function parseFilter(rawInput, listId = 'custom') {
  const raw = String(rawInput ?? '').trim()
  const base = {
    raw,
    listId,
    kind: 'network',
    exception: false,
    regex: null,
    pattern: '',
    selector: null,
    domains: [],
    options: defaultOptions(),
    note: '',
  }

  if (!raw) return { ...base, kind: 'invalid', note: 'Empty rule' }
  if (raw.startsWith('!') || raw.startsWith('[')) return { ...base, kind: 'comment' }

  let body = raw
  let exception = false
  if (body.startsWith('@@')) {
    exception = true
    body = body.slice(2).trim()
  }

  const hideIdx = body.indexOf('##')
  const hideExcIdx = body.indexOf('#@#')
  let cosmeticIdx = -1
  let cosmeticException = false
  if (hideExcIdx >= 0 && (hideIdx < 0 || hideExcIdx <= hideIdx)) {
    cosmeticIdx = hideExcIdx
    cosmeticException = true
  } else if (hideIdx >= 0) {
    cosmeticIdx = hideIdx
  }

  if (cosmeticIdx >= 0) {
    // "##" is two characters, "#@#" is three.
    const selector = body.slice(cosmeticIdx + (cosmeticException ? 3 : 2)).trim()
    const domainText = body.slice(0, cosmeticIdx).trim()
    if (!selector) return { ...base, kind: 'invalid', note: 'Cosmetic rule needs a selector' }
    if (!isValidSelector(selector)) {
      return { ...base, kind: 'invalid', note: 'This is not a valid CSS selector' }
    }
    const domainList = domainText
      ? domainText.split(',').map((d) => d.trim()).filter(Boolean)
      : []
    return {
      ...base,
      kind: 'cosmetic',
      exception: cosmeticException,
      selector,
      domains: domainList.filter((d) => !d.startsWith('~')),
      options: {
        ...base.options,
        excludeDomains: domainList.filter((d) => d.startsWith('~')).map((d) => d.slice(1)),
      },
      note: cosmeticException ? 'Shows elements again' : 'Hides matching elements',
    }
  }

  let pattern = body
  let optionText = ''
  const optionSplit = body.match(OPTION_RE)
  if (optionSplit) {
    pattern = optionSplit[1]
    optionText = optionSplit[2]
  }

  if (!pattern) return { ...base, kind: 'invalid', note: 'This rule has no pattern' }

  const options = defaultOptions()
  for (const token of optionText ? optionText.split(',') : []) {
    const trimmed = token.trim()
    if (!trimmed) continue
    const negated = trimmed.startsWith('~')
    const name = (negated ? trimmed.slice(1) : trimmed).toLowerCase()

    if (name === 'third-party') options.thirdParty = !negated
    else if (name === 'first-party') options.thirdParty = negated
    else if (name === 'important') options.important = true
    else if (name.startsWith('domain=')) {
      for (const entry of name.slice('domain='.length).split('|')) {
        const value = entry.trim()
        if (!value) continue
        if (value.startsWith('~')) options.excludeDomains.push(value.slice(1))
        else options.includeDomains.push(value)
      }
    } else if (TYPE_SET.has(name)) {
      ;(negated ? options.notTypes : options.types).push(name)
    }
  }

  let regex
  try {
    if (pattern.length > 2 && pattern.startsWith('/') && pattern.endsWith('/')) {
      regex = new RegExp(pattern.slice(1, -1), 'i')
    } else {
      regex = new RegExp(patternToSource(pattern), 'i')
    }
  } catch {
    return { ...base, kind: 'invalid', note: 'This pattern could not be compiled' }
  }

  return {
    ...base,
    exception,
    pattern,
    regex,
    options,
    note: exception ? 'Allows matching requests' : 'Blocks matching requests',
  }
}

export function isValidSelector(selector) {
  if (typeof document === 'undefined') return true
  try {
    document.createDocumentFragment().querySelector(selector)
    return true
  } catch {
    return false
  }
}

const parseCache = new Map()

export function compileRules(lines, listId) {
  return lines
    .map((line) => {
      const key = listId + '::' + line
      if (parseCache.has(key)) return parseCache.get(key)
      const parsed = parseFilter(line, listId)
      const usable = parsed.kind === 'network' || parsed.kind === 'cosmetic' ? parsed : null
      parseCache.set(key, usable)
      return usable
    })
    .filter(Boolean)
}

function requestFrom(input, pageHost) {
  return {
    url: input.url,
    type: input.type || 'script',
    pageHost: input.pageHost ?? pageHost ?? '',
  }
}

function ruleMatchesRequest(rule, request) {
  if (!rule.regex || !rule.regex.test(request.url)) return false
  const opts = rule.options

  if (opts.types.length && !opts.types.includes(request.type)) return false
  if (opts.notTypes.includes(request.type)) return false

  if (opts.thirdParty !== undefined) {
    const third = isThirdParty(request.pageHost, hostnameOf(request.url))
    if (third !== undefined && third !== opts.thirdParty) return false
  }

  if (opts.includeDomains.length) {
    const ok = opts.includeDomains.some((d) => hostMatches(request.pageHost, d))
    if (!ok) return false
  }
  if (opts.excludeDomains.some((d) => hostMatches(request.pageHost, d))) return false

  return true
}

/** Full decision for one request against a rule set. */
export function evaluateRequest(input, rules, pageHost = '') {
  const request = requestFrom(input, pageHost)
  const matches = []
  for (const rule of rules) {
    if (rule.kind !== 'network') continue
    if (ruleMatchesRequest(rule, request)) matches.push(rule)
  }

  const blocks = matches.filter((r) => !r.exception)
  const allows = matches.filter((r) => r.exception)
  const important = blocks.find((r) => r.options.important)

  let winner = null
  if (important) winner = important
  else if (allows.length) winner = allows[0]
  else if (blocks.length) winner = blocks[0]

  const blocked = Boolean(important) || (!allows.length && blocks.length > 0)

  return {
    blocked,
    rule: winner,
    matches,
    request,
    reason: !winner
      ? 'No rule matched this request'
      : winner.exception
        ? 'An exception rule allows this request'
        : 'A block rule matched this request',
  }
}

/** Cosmetic rules that apply to a page host. */
export function cosmeticFor(host, rules) {
  const hide = []
  const show = []
  for (const rule of rules) {
    if (rule.kind !== 'cosmetic') continue
    if (rule.options.excludeDomains.some((d) => hostMatches(host, d))) continue
    const applies = rule.domains.length === 0 || rule.domains.some((d) => hostMatches(host, d))
    if (!applies) continue
    ;(rule.exception ? show : hide).push(rule)
  }
  return { hide, show }
}

/**
 * One-stop screening used by the UI: protection state, allowlist, lists and
 * reporting information all resolved together.
 */
export function screenRequest(input, context) {
  const { rules = [], allowlist = [], protection = true, pageHost = '' } = context || {}
  const host = hostnameOf(input.url)

  if (!protection) {
    return {
      blocked: false,
      status: 'paused',
      reason: 'Protection is paused',
      rule: null,
      matches: [],
      host,
      listId: null,
    }
  }

  const siteAllowed = allowlist.some((entry) => hostMatches(pageHost, entry))
  if (siteAllowed) {
    return {
      blocked: false,
      status: 'allowlisted',
      reason: 'This site is on your allowlist',
      rule: null,
      matches: [],
      host,
      listId: null,
    }
  }

  const result = evaluateRequest(input, rules, pageHost)
  return {
    ...result,
    status: result.blocked ? 'blocked' : 'allowed',
    host,
    listId: result.rule ? result.rule.listId : null,
  }
}

/** Convert network rules into Chrome declarativeNetRequest rules. */
export function toDeclarativeNetRequest(rules) {
  const output = []
  let id = 1
  for (const rule of rules) {
    if (rule.kind !== 'network') continue
    const isRegex = rule.pattern.length > 2 && rule.pattern.startsWith('/') && rule.pattern.endsWith('/')
    const condition = isRegex
      ? { regexFilter: rule.pattern.slice(1, -1) }
      : { urlFilter: rule.pattern }
    if (rule.options.types.length) condition.resourceTypes = rule.options.types
    if (rule.options.notTypes.length) condition.excludedResourceTypes = rule.options.notTypes
    if (rule.options.thirdParty === true) condition.domainType = 'thirdParty'
    if (rule.options.thirdParty === false) condition.domainType = 'firstParty'
    if (rule.options.includeDomains.length) condition.initiatorDomains = rule.options.includeDomains
    if (rule.options.excludeDomains.length) {
      condition.excludedInitiatorDomains = rule.options.excludeDomains
    }
    output.push({
      id: id++,
      priority: rule.exception ? 10 : rule.options.important ? 20 : 1,
      action: { type: rule.exception ? 'allow' : 'block' },
      condition,
    })
  }
  return output
}
