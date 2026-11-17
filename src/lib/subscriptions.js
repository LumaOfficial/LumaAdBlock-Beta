import { RESOURCE_TYPES } from './engine.js'

/**
 * Filter list subscriptions.
 *
 * A subscription is a filter list kept somewhere else: the person gives Luma a
 * URL, Luma downloads the text, and its rules join the protection like any
 * other. The bundled lists ship with the extension; these update on demand.
 */

// The browser keeps one dynamic ruleset at 5,000 rules. Luma leaves room for
// custom and learned rules by capping what one subscription may contribute.
export const MAX_NETWORK_LINES = 1200
export const MAX_COSMETIC_LINES = 600
export const MAX_SUBSCRIPTIONS = 6

export const PRESET_SUBSCRIPTIONS = [
  {
    id: 'easylist-adservers',
    title: 'EasyList · ad servers',
    description: 'The ad-server hosts EasyList maintains, on top of Luma Core.',
    url: 'https://raw.githubusercontent.com/easylist/easylist/master/easylist/easylist_adservers.txt',
  },
  {
    id: 'ublock-privacy',
    title: 'uBlock · privacy',
    description: 'Trackers and analytics endpoints beyond the ones Luma ships.',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt',
  },
  {
    id: 'ublock-badware',
    title: 'uBlock · badware risks',
    description: 'Sites and scripts flagged for malware and online scams.',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt',
  },
  {
    id: 'ublock-annoyances',
    title: 'uBlock · annoyances',
    description: 'Pop-ups, chat widgets and other page clutter.',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances-others.txt',
  },
]

export function isHttpUrl(value) {
  try {
    const url = new URL(String(value || '').trim())
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

/** "https://example.com/a.txt" becomes "example.com", for a readable title. */
export function subscriptionLabel(url) {
  try {
    const parsed = new URL(String(url || '').trim())
    const file = parsed.pathname.split('/').filter(Boolean).pop() || ''
    const name = file.replace(/\.(txt|json)$/i, '').replace(/[_-]+/g, ' ').trim()
    return name ? name + ' · ' + parsed.hostname : parsed.hostname
  } catch {
    return String(url || '')
  }
}

/** Does this line hide elements? Adblock Plus spells that with a # in the middle. */
function isCosmetic(line) {
  return line.includes('##') || line.includes('#@#')
}

/** Scriptlet and style rules use a marker Luma cannot honor; they are dropped. */
function isScriptlet(line) {
  return !isCosmetic(line) && /#[$?%]#/.test(line)
}

// Every option Luma understands. Anything else would make the rule broader
// than the list intended — "$removeparam" would block the whole host — so a
// line with an unknown option is left out instead of guessed at.
const SUPPORTED_OPTIONS = new Set([
  'third-party',
  'first-party',
  'important',
  'domain',
  ...RESOURCE_TYPES,
])

function supportedNetworkLine(line) {
  const marker = line.lastIndexOf('$')
  if (marker < 0) return true
  for (const token of line.slice(marker + 1).split(',')) {
    const name = token.trim().replace(/^~/, '').toLowerCase()
    if (!name) return false
    if (!SUPPORTED_OPTIONS.has(name) && !name.startsWith('domain=')) return false
  }
  return true
}

/**
 * Keep the rules a browser can actually enforce, split into blocking and
 * hiding, capped so a very long list cannot crowd out everything else.
 */
export function parseSubscriptionText(text) {
  const network = []
  const cosmetic = []
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('!') || line.startsWith('[')) continue
    // List headers: "[Adblock Plus 2.0]" is already skipped above, these are
    // the metadata lines AdGuard and uBlock put at the top of a file.
    if (/^(title|homepage|expires|version|last modified|checksum):/i.test(line)) continue
    if (isScriptlet(line)) continue
    if (isCosmetic(line)) {
      if (cosmetic.length < MAX_COSMETIC_LINES) cosmetic.push(line)
    } else if (supportedNetworkLine(line) && network.length < MAX_NETWORK_LINES) {
      network.push(line)
    }
  }
  return { lines: [...network, ...cosmetic], network: network.length, cosmetic: cosmetic.length }
}

export async function fetchSubscription(url) {
  const response = await fetch(url, { credentials: 'omit', cache: 'no-cache' })
  if (!response.ok) throw new Error('The list could not be downloaded (' + response.status + ').')
  const parsed = parseSubscriptionText(await response.text())
  if (!parsed.lines.length) throw new Error('That address did not return any filter rules.')
  return parsed
}
