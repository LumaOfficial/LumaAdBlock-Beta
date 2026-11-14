// Luma service worker.
//
// Owns the browser side of the extension: turns the dashboard's settings into
// declarative network rules and element-hiding stylesheets, counts what gets
// blocked, and answers the dashboard when it opens.

const SETTINGS_KEY = 'luma:settings'
const STATS_KEY = 'luma:stats'
const TAB_KEY = 'luma:dashboard-tab'

// Rule sets this build actually ships (a list with no network rules has none).
const RULESET_IDS = (
  chrome.runtime.getManifest().declarative_net_request?.rule_resources || []
).map((resource) => resource.id)

const emptyStats = () => ({
  totals: { blocked: 0, trackers: 0, screened: 0, megabytes: 0 },
  domains: {},
  daily: {},
  activity: [],
  runs: 0,
  since: Date.now(),
})

let statsCache = null
let settingsCache = null
let flushTimer = null

function dayKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

async function getSettings() {
  if (settingsCache) return settingsCache
  const stored = await chrome.storage.local.get(SETTINGS_KEY)
  settingsCache = stored[SETTINGS_KEY] || null
  return settingsCache
}

async function getStats() {
  if (statsCache) return statsCache
  const stored = await chrome.storage.local.get(STATS_KEY)
  statsCache = stored[STATS_KEY] || emptyStats()
  return statsCache
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(async () => {
    flushTimer = null
    if (!statsCache) return
    await chrome.storage.local.set({ [STATS_KEY]: statsCache })
    try {
      await chrome.runtime.sendMessage({ type: 'luma:stats', stats: statsCache })
    } catch {
      /* no dashboard open */
    }
  }, 800)
}

async function syncCosmetic(enabledLists) {
  const registered = await chrome.scripting.getRegisteredContentScripts()
  const stale = registered.filter((script) => script.id.startsWith('luma-css-')).map((s) => s.id)
  if (stale.length) await chrome.scripting.unregisterContentScripts({ ids: stale })
  if (!enabledLists.length) return
  await chrome.scripting.registerContentScripts(
    enabledLists.map((id) => ({
      id: 'luma-css-' + id,
      css: ['cosmetic/' + id + '.css'],
      matches: ['<all_urls>'],
      allFrames: true,
      runAt: 'document_start',
      persistAcrossSessions: true,
    })),
  )
}

async function applySettings(payload) {
  settingsCache = payload
  await chrome.storage.local.set({ [SETTINGS_KEY]: payload })

  const enabledLists = payload.protection ? payload.enabledLists || [] : []
  const enabled = enabledLists.filter((id) => RULESET_IDS.includes(id))
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enabled,
    disableRulesetIds: RULESET_IDS.filter((id) => !enabled.includes(id)),
  })

  const current = await chrome.declarativeNetRequest.getDynamicRules()
  const removeRuleIds = current.map((rule) => rule.id)
  const addRules = payload.protection ? payload.dynamicRules || [] : []
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules })
  } catch (error) {
    // One malformed custom rule must not take the whole extension down.
    console.warn('Luma: custom rules rejected', error)
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds })
  }

  await syncCosmetic(enabledLists)
}

async function recordMatch(info) {
  const [stats, settings] = await Promise.all([getStats(), getSettings()])
  const request = info.request || {}
  const rule = info.rule || {}
  const meta = settings?.ruleIndex?.[rule.rulesetId + ':' + rule.ruleId] || null

  let host = ''
  try {
    host = new URL(request.url).hostname
  } catch {
    host = ''
  }

  stats.totals.blocked += 1
  stats.totals.megabytes = Math.round((stats.totals.megabytes + 0.04) * 10) / 10
  if (rule.rulesetId === 'tracker-shield' || meta?.listId === 'tracker-shield') {
    stats.totals.trackers += 1
  }
  if (host) stats.domains[host] = (stats.domains[host] || 0) + 1
  const key = dayKey()
  stats.daily[key] = (stats.daily[key] || 0) + 1

  stats.activity = [
    {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      host: host || 'unknown',
      url: request.url || '',
      rule: meta?.raw || (rule.ruleId ? 'rule #' + rule.ruleId + ' · ' + rule.rulesetId : 'matched a rule'),
      listId: meta?.listId || rule.rulesetId || 'custom',
      type: request.type || 'other',
      at: new Date().toISOString(),
    },
    ...stats.activity,
  ].slice(0, 40)

  scheduleFlush()
}

async function openDashboard() {
  const url = chrome.runtime.getURL('app/index.html')
  const session = await chrome.storage.session.get(TAB_KEY)
  if (session[TAB_KEY]) {
    try {
      await chrome.tabs.update(session[TAB_KEY], { active: true })
      return
    } catch {
      /* the tab was closed */
    }
  }
  const tab = await chrome.tabs.create({ url })
  await chrome.storage.session.set({ [TAB_KEY]: tab.id })
}

const ruleFeedback = chrome.declarativeNetRequest.onRuleMatchedDebug
if (ruleFeedback) ruleFeedback.addListener((info) => void recordMatch(info))

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.declarativeNetRequest.setExtensionActionOptions({
      displayActionCountAsBadgeText: true,
    })
  } catch {
    /* badge counting is a nice-to-have */
  }
  const stored = await chrome.storage.local.get(SETTINGS_KEY)
  if (stored[SETTINGS_KEY]) await applySettings(stored[SETTINGS_KEY])
})

chrome.runtime.onStartup.addListener(async () => {
  const stored = await chrome.storage.local.get(SETTINGS_KEY)
  if (stored[SETTINGS_KEY]) await applySettings(stored[SETTINGS_KEY])
})

chrome.action.onClicked.addListener(() => void openDashboard())

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type === 'luma:settings') {
    applySettings(message.payload)
      .then(() => respond?.({ ok: true }))
      .catch((error) => respond?.({ ok: false, error: String(error) }))
    return true
  }
  if (message?.type === 'luma:settings:read') {
    getSettings().then((settings) => respond?.({ settings: settings?.dashboard || null }))
    return true
  }
  if (message?.type === 'luma:stats:read') {
    getStats().then((stats) => respond?.({ stats }))
    return true
  }
  if (message?.type === 'luma:stats:reset') {
    statsCache = emptyStats()
    chrome.storage.local
      .set({ [STATS_KEY]: statsCache })
      .then(() => respond?.({ ok: true }))
    return true
  }
  if (message?.type === 'luma:open') {
    openDashboard().then(() => respond?.({ ok: true }))
    return true
  }
  return false
})
