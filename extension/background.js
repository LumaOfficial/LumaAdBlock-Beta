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

function matchPatterns(host) {
  return ['*://' + host + '/*', '*://*.' + host + '/*']
}

async function syncCosmetic(enabledLists, allowlist = [], visual = false) {
  const registered = await chrome.scripting.getRegisteredContentScripts()
  const stale = registered.filter((script) => script.id.startsWith('luma-css-')).map((s) => s.id)
  if (stale.length) await chrome.scripting.unregisterContentScripts({ ids: stale })
  // Visual mode outlines a slot before collapsing it, which a static sheet
  // cannot do: it would remove the element before the content script sees it.
  if (visual) return
  // A site the person allowlisted keeps its own layout, so the hiding
  // stylesheets skip it entirely.
  const excludeMatches = allowlist.filter(Boolean).flatMap(matchPatterns)
  for (const id of enabledLists) {
    // Register each list separately: one unreadable stylesheet must not stop
    // the others from hiding anything.
    const script = {
      id: 'luma-css-' + id,
      css: ['cosmetic/' + id + '.css'],
      matches: ['<all_urls>'],
      allFrames: true,
      runAt: 'document_start',
      persistAcrossSessions: true,
    }
    if (excludeMatches.length) script.excludeMatches = excludeMatches
    try {
      await chrome.scripting.registerContentScripts([script])
    } catch (error) {
      console.warn('Luma: could not register hiding stylesheet for ' + id, error)
    }
  }
}

/** Enable the chosen rulesets; one rejected ruleset must not disable the rest. */
async function enableRulesets(enabled) {
  const disableRulesetIds = RULESET_IDS.filter((id) => !enabled.includes(id))
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: enabled,
      disableRulesetIds,
    })
    return
  } catch (error) {
    console.warn('Luma: a ruleset was rejected, enabling the others one at a time', error)
  }
  for (const id of enabled) {
    try {
      await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: [id] })
    } catch (error) {
      console.warn('Luma: ruleset ' + id + ' could not be enabled', error)
    }
  }
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds })
  } catch {
    /* the rejected ruleset stays off */
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
  await enableRulesets(enabled)

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

  // A paused site is excluded the same way a trusted one is: its hiding
  // stylesheets are not registered, so nothing disappears there.
  const allowlist = active ? payload.dashboard?.allowlist || [] : []
  const paused = active ? payload.dashboard?.paused || [] : []
  const visual = payload.dashboard?.feedback === 'visual'
  await syncCosmetic(enabledLists, [...allowlist, ...paused], visual)
}

/**
 * The browser's own per-tab count of blocked requests (the toolbar badge).
 * It is the only live counter a store install exposes, so the panel reads it.
 */
async function readPageBlocks() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return 0
    const text = await chrome.action.getBadgeText({ tabId: tab.id })
    const count = Number(text)
    return Number.isFinite(count) ? count : 0
  } catch {
    return 0
  }
}

/** The site in the tab the panel was opened from, for its per-site controls. */
async function readActiveSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const host = tab?.url ? new URL(tab.url).hostname.toLowerCase() : ''
    return /^[a-z0-9.-]+$/.test(host) ? host : ''
  } catch {
    return ''
  }
}

function dayKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return date.getFullYear() + '-' + month + '-' + day
}

/**
 * What a page's content script actually hid. A store install cannot read the
 * browser's matched-rule feed, so the elements Luma removed are the only live
 * count it can honestly report — and the dashboard reads exactly this.
 */
async function recordHidden(message) {
  const count = Number(message?.count) || 0
  if (!count) return
  const stats = await getStats()
  const at = new Date()
  const key = dayKey(at)
  const host = String(message.host || '').replace(/^www\./, '')
  const next = {
    ...stats,
    totals: {
      ...stats.totals,
      blocked: (stats.totals.blocked || 0) + count,
      screened: (stats.totals.screened || 0) + count,
      megabytes: Number(((stats.totals.megabytes || 0) + count * 0.09).toFixed(2)),
    },
    daily: { ...stats.daily, [key]: (stats.daily[key] || 0) + count },
  }
  if (host) {
    next.domains = { ...stats.domains, [host]: (stats.domains[host] || 0) + count }
    next.activity = [
      { id: host + '|' + at.getTime(), host, at: at.toISOString() },
      ...(stats.activity || []),
    ].slice(0, 200)
  }
  statsCache = next
  await chrome.storage.local.set({ [STATS_KEY]: next })
  try {
    // The dashboard may be open in another tab.
    const sent = chrome.runtime.sendMessage({ type: 'luma:stats', stats: next })
    if (sent && sent.catch) sent.catch(() => {})
  } catch {
    /* no dashboard open */
  }
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
  if (message?.type === 'luma:page:read') {
    readPageBlocks().then((blocked) => respond?.({ blocked }))
    return true
  }
  if (message?.type === 'luma:site:read') {
    readActiveSite().then((host) => respond?.({ host }))
    return true
  }
  if (message?.type === 'luma:hidden') {
    recordHidden(message)
      .then(() => respond?.({ ok: true }))
      .catch(() => respond?.({ ok: false }))
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
