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

export function subscribeStats(handler) {
  if (!isExtension) return () => {}
  const listener = (message) => {
    if (message?.type === 'luma:stats' && message.stats) handler(message.stats)
  }
  chrome.runtime.onMessage.addListener(listener)
  return () => chrome.runtime.onMessage.removeListener(listener)
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
export function buildPayload(state) {
  const enabledLists = FILTER_LISTS.filter((list) => state.lists[list.id]).map((list) => list.id)
  const ruleIndex = {}
  const dynamicRules = []
  let nextId = 1

  if (state.protection) {
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

    for (const host of state.allowlist) {
      dynamicRules.push({
        id: nextId,
        priority: 200,
        action: { type: 'allow' },
        condition: { initiatorDomains: [host] },
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

  return {
    protection: state.protection,
    enabledLists,
    dynamicRules,
    ruleIndex,
    cosmeticSelectors,
    dashboard: {
      protection: state.protection,
      lists: state.lists,
      customRules: state.customRules,
      allowlist: state.allowlist,
      learned: state.learned || [],
    },
  }
}
