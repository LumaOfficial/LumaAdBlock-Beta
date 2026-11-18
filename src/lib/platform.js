/**
 * Bridge between the dashboard and the browser extension.
 *
 * The dashboard is the extension's own page: when it runs inside the packed
 * extension it talks to the service worker (which owns the browser's blocking
 * rules and the live counters). On the plain web build every call is a no-op,
 * so the same UI also works as a normal page.
 */
import { FILTER_LISTS } from './blocklists'
import { compileRules, toDeclarativeNetRequest } from './engine'
import { integrationById } from './integrations'

export const isExtension =
  typeof chrome !== 'undefined' && Boolean(chrome.runtime && chrome.runtime.id)

function safeSend(message) {
  if (!isExtension) return Promise.resolve(null)
  try {
    return chrome.runtime.sendMessage(message).catch(() => null)
  } catch {
    return Promise.resolve(null)
  }
}

/** Hand the current settings (and compiled browser rules) to the worker. */
export function postSettings(payload) {
  return safeSend({ type: 'luma:settings', payload })
}

/** Settings the worker kept from the last session, so a fresh page can restore them. */
export async function readSettings() {
  const reply = await safeSend({ type: 'luma:settings:read' })
  return reply?.settings || null
}

export async function readStats() {
  const reply = await safeSend({ type: 'luma:stats:read' })
  return reply?.stats || null
}

/**
 * Blocks the browser counted for the page in the active tab. The toolbar badge
 * is the only live counter a store install exposes, so the panel reads it.
 */
export async function readPageBlocks() {
  const reply = await safeSend({ type: 'luma:page:read' })
  return Number(reply?.blocked) || 0
}

/** The site the person is looking at, so the panel can control just that one. */
export async function readActiveSite() {
  const reply = await safeSend({ type: 'luma:site:read' })
  return reply?.host || ''
}

export function subscribeStats(handler) {
  if (!isExtension) return () => {}
  const listener = (message) => {
    if (message?.type === 'luma:stats' && message.stats) handler(message.stats)
  }
  chrome.runtime.onMessage.addListener(listener)
  return () => chrome.runtime.onMessage.removeListener(listener)
}

/** An element the person just picked on a page. */
export function subscribePicked(handler) {
  if (!isExtension) return () => {}
  const listener = (message) => {
    if (message?.type === 'luma:picked' && message.selector) {
      handler({ host: message.host, selector: message.selector })
    }
  }
  chrome.runtime.onMessage.addListener(listener)
  return () => chrome.runtime.onMessage.removeListener(listener)
}

/** Settings the browser changed on its own: context menu, shortcut, picker. */
export function subscribeSettings(handler) {
  if (!isExtension) return () => {}
  const listener = (message) => {
    if (message?.type === 'luma:settings:changed' && message.settings) handler(message.settings)
  }
  chrome.runtime.onMessage.addListener(listener)
  return () => chrome.runtime.onMessage.removeListener(listener)
}

/** Outline elements on the page in the active tab for one click. */
export function startPicker() {
  return safeSend({ type: 'luma:pick:start' })
}

export function resetStats() {
  return safeSend({ type: 'luma:stats:reset' })
}

export function openDashboard() {
  return safeSend({ type: 'luma:open' })
}

/**
 * Everything the worker needs to enforce the dashboard's settings:
 * which lists are on, the dynamic rules for custom filters and allowlisted
 * sites, a rule-id index so live blocks can be labelled, and the dashboard's
 * own element-hiding selectors.
 */
/** "Example.COM/path" and "https://example.com" both become "example.com". */
export function allowlistHost(value) {
  const text = String(value || '').trim().toLowerCase()
  if (!text) return ''
  try {
    const parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//.test(text) ? text : 'http://' + text)
    return /^[a-z0-9.-]+$/.test(parsed.hostname) ? parsed.hostname : ''
  } catch {
    return ''
  }
}

// Browsers cap the dynamic ruleset at 5,000 entries; leave room for the
// allow and pause rules that always have to be there.
const DYNAMIC_RULE_BUDGET = 4500
const MAX_GENERIC_COSMETIC = 2500

/** The platforms the person connected, as catalog entries. */
function connectedPlatforms(state) {
  return (state.integrations || []).map(integrationById).filter(Boolean)
}

export function buildPayload(state, protectionNow = state.protection) {
  const enabledLists = FILTER_LISTS.filter((list) => state.lists[list.id]).map((list) => list.id)
  const ruleIndex = {}
  const dynamicRules = []
  // One bad entry would make the browser reject every dynamic rule, so only
  // real host names are sent, once each.
  const allowlist = [...new Set((state.allowlist || []).map(allowlistHost).filter(Boolean))]
  const paused = [...new Set((state.pausedSites || []).map(allowlistHost).filter(Boolean))]
  let nextId = 1

  if (protectionNow) {
    for (const list of FILTER_LISTS) {
      if (!enabledLists.includes(list.id)) continue
      const compiled = compileRules(list.rules, list.id).filter((rule) => rule.kind === 'network')
      toDeclarativeNetRequest(compiled).forEach((rule, index) => {
        ruleIndex[list.id + ':' + rule.id] = { listId: list.id, raw: compiled[index].raw }
      })
    }

    const customNetwork = compileRules(state.customRules, 'custom').filter(
      (rule) => rule.kind === 'network',
    )
    for (const rule of toDeclarativeNetRequest(customNetwork)) {
      rule.id = nextId
      ruleIndex['_dynamic:' + rule.id] = {
        listId: 'custom',
        raw: customNetwork[nextId - 1].raw,
      }
      dynamicRules.push(rule)
      nextId += 1
    }

    const learnedNetwork = compileRules(
      (state.learned || []).map((item) => item.rule),
      'learned',
    ).filter((rule) => rule.kind === 'network')
    toDeclarativeNetRequest(learnedNetwork).forEach((rule, index) => {
      rule.id = nextId
      ruleIndex['_dynamic:' + rule.id] = { listId: 'learned', raw: learnedNetwork[index].raw }
      dynamicRules.push(rule)
      nextId += 1
    })

    // Subscribed lists ride in the dynamic ruleset; it has a hard limit, so
    // the allow rules below keep their ids and the list stops at the budget.
    const subscribed = (state.subscriptions || [])
      .filter((subscription) => subscription.enabled)
      .flatMap((subscription) => compileRules(subscription.lines || [], subscription.id))
      .filter((rule) => rule.kind === 'network')
    toDeclarativeNetRequest(subscribed).forEach((rule, index) => {
      if (nextId >= DYNAMIC_RULE_BUDGET) return
      rule.id = nextId
      ruleIndex['_dynamic:' + rule.id] = {
        listId: subscribed[index].listId,
        raw: subscribed[index].raw,
      }
      dynamicRules.push(rule)
      nextId += 1
    })

    // Connected platforms clean their own sites: ad requests from the platform
    // are dropped the same way a subscribed list's are.
    const platformNetwork = connectedPlatforms(state).flatMap((platform) =>
      compileRules(platform.lines, 'integration:' + platform.id).filter(
        (rule) => rule.kind === 'network',
      ),
    )
    toDeclarativeNetRequest(platformNetwork).forEach((rule, index) => {
      if (nextId >= DYNAMIC_RULE_BUDGET) return
      rule.id = nextId
      ruleIndex['_dynamic:' + rule.id] = {
        listId: platformNetwork[index].listId,
        raw: platformNetwork[index].raw,
      }
      dynamicRules.push(rule)
      nextId += 1
    })

    for (const host of allowlist) {
      dynamicRules.push({
        id: nextId,
        priority: 200,
        action: { type: 'allow' },
        condition: { initiatorDomains: [host] },
      })
      nextId += 1
    }

    // A paused site stops everything: the page and what it embeds are allowed
    // above every filter list, so pausing one site leaves the others alone.
    for (const host of paused) {
      dynamicRules.push({
        id: nextId,
        priority: 300,
        action: { type: 'allowAllRequests' },
        condition: { requestDomains: [host], resourceTypes: ['main_frame'] },
      })
      nextId += 1
    }
  }

  const cosmeticSelectors = { generic: [], site: {} }
  for (const rule of compileRules(state.customRules, 'custom')) {
    if (rule.kind !== 'cosmetic') continue
    if (rule.exception) continue
    if (rule.domains.length) {
      for (const domain of rule.domains) {
        cosmeticSelectors.site[domain] = cosmeticSelectors.site[domain] || []
        cosmeticSelectors.site[domain].push(rule.selector)
      }
    } else {
      cosmeticSelectors.generic.push(rule.selector)
    }
  }

  // Hiding rules from subscribed lists join the same sheet.
  for (const subscription of state.subscriptions || []) {
    if (!subscription.enabled) continue
    for (const rule of compileRules(subscription.lines || [], subscription.id)) {
      if (rule.kind !== 'cosmetic' || rule.exception) continue
      if (rule.domains.length) {
        for (const domain of rule.domains) {
          cosmeticSelectors.site[domain] = cosmeticSelectors.site[domain] || []
          cosmeticSelectors.site[domain].push(rule.selector)
        }
      } else if (cosmeticSelectors.generic.length < MAX_GENERIC_COSMETIC) {
        cosmeticSelectors.generic.push(rule.selector)
      }
    }
  }

  // What each connected platform removes on its own site.
  for (const platform of connectedPlatforms(state)) {
    for (const rule of compileRules(platform.lines, 'integration:' + platform.id)) {
      if (rule.kind !== 'cosmetic' || rule.exception) continue
      if (rule.domains.length) {
        for (const domain of rule.domains) {
          cosmeticSelectors.site[domain] = cosmeticSelectors.site[domain] || []
          cosmeticSelectors.site[domain].push(rule.selector)
        }
      } else if (cosmeticSelectors.generic.length < MAX_GENERIC_COSMETIC) {
        cosmeticSelectors.generic.push(rule.selector)
      }
    }
  }

  // Several lists often hide the same slot; the sheet only needs it once.
  cosmeticSelectors.generic = [...new Set(cosmeticSelectors.generic)]
  for (const domain of Object.keys(cosmeticSelectors.site)) {
    cosmeticSelectors.site[domain] = [...new Set(cosmeticSelectors.site[domain])]
  }

  return {
    protection: protectionNow,
    enabledLists,
    dynamicRules,
    ruleIndex,
    cosmeticSelectors,
    dashboard: {
      protection: state.protection,
      deep: Boolean(state.deep),
      theme: state.theme,
      // How the content script shows a removal: silent or outlined.
      feedback: state.feedback === 'visual' ? 'visual' : 'hidden',
      privacy: Boolean(state.privacy),
      lists: state.lists,
      customRules: state.customRules,
      // Elements picked by hand, and the lists downloaded from a URL. Both
      // must survive a page reload, so the worker keeps them too.
      pickerRules: state.pickerRules || {},
      subscriptions: state.subscriptions || [],
      integrations: state.integrations || [],
      allowlist,
      paused: protectionNow && !state.privacy ? paused : [],
      pausedSites: paused,
      schedule: state.schedule,
      learned: state.learned || [],
    },
  }
}
