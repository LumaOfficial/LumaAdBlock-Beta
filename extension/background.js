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

// Host a rule targets, read from its ||domain^ filter (used when the browser
// reports a match without the request URL).
function hostFromFilter(raw) {
  const match = /^\|\|([a-z0-9.-]+)/i.exec(String(raw || ''))
  return match ? match[1].toLowerCase() : ''
}

async function recordMatch(info, at = Date.now()) {
  const [stats, settings] = await Promise.all([getStats(), getSettings()])
  const request = info.request || {}
  const rule = info.rule || {}
  const meta = settings?.ruleIndex?.[rule.rulesetId + ':' + rule.ruleId] || null

  let host = ''
  try {
    host = new URL(request.url).hostname
  } catch {
    host = hostFromFilter(meta?.raw)
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
      at: new Date(at).toISOString(),
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

// Live counting. Unpacked installs get a per-request feed
// (onRuleMatchedDebug). Store installs do not, so every install also reads the
// browser's own matched-rule history (getMatchedRules), which works for any
// install. The browser limits that call to roughly 20 per 10 minutes, so it is
// throttled, and only one source counts at a time so nothing is double counted.
const ruleFeedback = chrome.declarativeNetRequest.onRuleMatchedDebug
if (ruleFeedback) ruleFeedback.addListener((info) => void recordMatch(info))

const POLL_KEY = 'luma:last-match'
const POLL_GAP_MS = 35000
let lastPoll = 0
let polling = null

async function pollMatches(force = false) {
  if (ruleFeedback || !chrome.declarativeNetRequest.getMatchedRules) return
  const now = Date.now()
  if (polling) return polling
  if (!force && now - lastPoll < POLL_GAP_MS) return
  lastPoll = now
  polling = (async () => {
    try {
      const stored = await chrome.storage.local.get(POLL_KEY)
      const since = stored[POLL_KEY] || now - 1000
      const { rulesMatchedInfo = [] } = await chrome.declarativeNetRequest.getMatchedRules({
        minTimeStamp: since + 1,
      })
      let newest = since
      for (const info of rulesMatchedInfo.sort((a, b) => a.timeStamp - b.timeStamp)) {
        await recordMatch({ rule: info.rule, request: {} }, info.timeStamp)
        newest = Math.max(newest, info.timeStamp)
      }
      await chrome.storage.local.set({ [POLL_KEY]: newest })
    } catch {
      /* feedback unavailable in this browser; the toolbar badge still counts */
    } finally {
      polling = null
    }
  })()
  return polling
}

chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status === 'complete') void pollMatches()
})
chrome.tabs.onRemoved.addListener(() => void pollMatches())

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
  void pollMatches(true)
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
    pollMatches(true)
      .then(getStats)
      .then((stats) => respond?.({ stats }))
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
