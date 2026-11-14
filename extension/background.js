// Luma service worker: keeps the exported rule set in sync with the options
// page and updates the toolbar badge with a running block count.
const STATS_KEY = 'luma:stats'

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(STATS_KEY)
  if (!existing[STATS_KEY]) {
    await chrome.storage.local.set({ [STATS_KEY]: { blocked: 0, since: Date.now() } })
  }
})

chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener(async () => {
  const stored = await chrome.storage.local.get(STATS_KEY)
  const stats = stored[STATS_KEY] || { blocked: 0, since: Date.now() }
  stats.blocked += 1
  await chrome.storage.local.set({ [STATS_KEY]: stats })
})
