// Luma service worker.
//
// Owns the browser side of the extension: turns the dashboard's settings into
// declarative network rules and element-hiding stylesheets, counts what gets
// blocked, and answers the dashboard when it opens.

const SETTINGS_KEY = 'luma:settings'
const STATS_KEY = 'luma:stats'
const TAB_KEY = 'luma:dashboard-tab'
const APPLIED_KEY = 'luma:applied'
const QUIET_ALARM = 'luma-quiet-hours'

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

async function syncCosmetic(enabledLists) {
  const registered = await chrome.scripting.getRegisteredContentScripts()
  const stale = registered.filter((script) => script.id.startsWith('luma-css-')).map((s) => s.id)
  if (stale.length) await chrome.scripting.unregisterContentScripts({ ids: stale })
  for (const id of enabledLists) {
    // Register each list separately: one unreadable stylesheet must not stop
    // the others from hiding anything.
    try {
      await chrome.scripting.registerContentScripts([
        {
          id: 'luma-css-' + id,
          css: ['cosmetic/' + id + '.css'],
          matches: ['<all_urls>'],
          allFrames: true,
          runAt: 'document_start',
          persistAcrossSessions: true,
        },
      ])
    } catch (error) {
      console.warn('Luma: could not register hiding stylesheet for ' + id, error)
    }
  }
}

/**
 * First run: nothing has sent settings yet, so apply the shipped defaults. This
 * registers the element-hiding stylesheets, which are what make ad slots
 * disappear; without it a fresh install only blocks requests.
 */
async function applyDefaultsIfUnset() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY)
  if (stored[SETTINGS_KEY]) return
  let defaults = { protection: true, lists: {} }
  try {
    const response = await fetch(chrome.runtime.getURL('luma-defaults.json'))
    defaults = await response.json()
  } catch {
    defaults = { protection: true, lists: Object.fromEntries(RULESET_IDS.map((id) => [id, true])) }
  }
  const lists = { ...(defaults.lists || {}) }
  const enabledLists = Object.keys(lists).filter((id) => lists[id])
  await applySettings({
    protection: defaults.protection !== false,
    enabledLists,
    dynamicRules: [],
    ruleIndex: {},
    cosmeticSelectors: { generic: [], site: {} },
    dashboard: { protection: true, lists, customRules: [], allowlist: [], learned: [] },
  })
}

// Quiet hours are evaluated here too, so the schedule keeps working while the
// dashboard is closed.
function quietNow(schedule, date = new Date()) {
  if (!schedule?.enabled) return false
  const parse = (value) => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ''))
    return match ? Number(match[1]) * 60 + Number(match[2]) : null
  }
  const from = parse(schedule.from)
  const to = parse(schedule.to)
  if (from === null || to === null || from === to) return false
  const now = date.getHours() * 60 + date.getMinutes()
  return from < to ? now >= from && now < to : now >= from || now < to
}

/** The person's own switch, minus an active quiet hours window. */
function protectionFor(payload) {
  const master = payload.dashboard?.protection ?? payload.protection
  return Boolean(master) && !quietNow(payload.dashboard?.schedule)
}

async function applySettings(payload) {
  settingsCache = payload
  const active = protectionFor(payload)
  await chrome.storage.local.set({ [SETTINGS_KEY]: payload, [APPLIED_KEY]: active })

  const enabledLists = active ? payload.enabledLists || [] : []
  const enabled = enabledLists.filter((id) => RULESET_IDS.includes(id))
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enabled,
    disableRulesetIds: RULESET_IDS.filter((id) => !enabled.includes(id)),
  })

  const current = await chrome.declarativeNetRequest.getDynamicRules()
  const removeRuleIds = current.map((rule) => rule.id)
  const addRules = active ? payload.dynamicRules || [] : []
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules })
  } catch (error) {
    // One malformed custom rule must not take the whole extension down.
    console.warn('Luma: custom rules rejected', error)
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds })
  }

  await syncCosmetic(enabledLists)
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

// Blocked-request counts for the dashboard need the matched-rule feed, which
// Chromium only grants to unpacked extensions. The packaged build therefore
// declares no debug permission and the toolbar badge is what counts blocks:
// setExtensionActionOptions keeps that number for every install.
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.declarativeNetRequest.setExtensionActionOptions({
      displayActionCountAsBadgeText: true,
    })
  } catch {
    /* badge counting is a nice-to-have */
  }
  await applyDefaultsIfUnset()
  const stored = await chrome.storage.local.get(SETTINGS_KEY)
  if (stored[SETTINGS_KEY]) await applySettings(stored[SETTINGS_KEY])
  chrome.alarms.create(QUIET_ALARM, { periodInMinutes: 1 })
})

chrome.runtime.onStartup.addListener(async () => {
  await applyDefaultsIfUnset()
  const stored = await chrome.storage.local.get(SETTINGS_KEY)
  if (stored[SETTINGS_KEY]) await applySettings(stored[SETTINGS_KEY])
  chrome.alarms.create(QUIET_ALARM, { periodInMinutes: 1 })
})

// Quiet hours start and end on the clock, not on a dashboard visit.
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== QUIET_ALARM) return
  const stored = await chrome.storage.local.get([SETTINGS_KEY, APPLIED_KEY])
  const payload = stored[SETTINGS_KEY]
  if (!payload) return
  if (protectionFor(payload) === stored[APPLIED_KEY]) return
  await applySettings(payload)
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
