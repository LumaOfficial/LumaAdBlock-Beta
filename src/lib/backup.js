/**
 * Backup file for the dashboard's settings. Pure helpers so the store and the
 * UI stay small: build the file, read one back, hand it to a download.
 */
import { DEFAULT_LISTS } from './blocklists.js'
import { DEFAULT_SCHEDULE, normalizeSchedule } from './schedule.js'

const APP = 'luma'
const VERSION = 1

export function buildBackup(state) {
  return {
    app: APP,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    protection: Boolean(state.protection),
    lists: { ...DEFAULT_LISTS, ...(state.lists || {}) },
    customRules: [...(state.customRules || [])],
    allowlist: [...(state.allowlist || [])],
    schedule: normalizeSchedule(state.schedule, DEFAULT_SCHEDULE),
  }
}

/** Validate a file the person picked; never restore half-understood data. */
export function readBackup(text) {
  let parsed
  try {
    parsed = JSON.parse(String(text || ''))
  } catch {
    return { ok: false, error: 'That file is not a Luma backup.' }
  }
  if (!parsed || parsed.app !== APP || typeof parsed !== 'object') {
    return { ok: false, error: 'That file is not a Luma backup.' }
  }
  const lists = parsed.lists && typeof parsed.lists === 'object' ? parsed.lists : {}
  const customRules = Array.isArray(parsed.customRules) ? parsed.customRules.map(String) : []
  const allowlist = Array.isArray(parsed.allowlist) ? parsed.allowlist.map(String) : []
  if (!customRules.length && !allowlist.length && !Object.values(lists).some(Boolean)) {
    return { ok: false, error: 'That backup has no settings to restore.' }
  }
  return {
    ok: true,
    settings: {
      protection: typeof parsed.protection === 'boolean' ? parsed.protection : true,
      lists,
      customRules,
      allowlist,
      schedule: normalizeSchedule(parsed.schedule, DEFAULT_SCHEDULE),
    },
  }
}

export function downloadBackup(state) {
  const file = new Blob([JSON.stringify(buildBackup(state), null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = 'luma-settings.json'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
