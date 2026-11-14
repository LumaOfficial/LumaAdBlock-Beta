/**
 * Backup file for the dashboard's settings. Pure helpers so the store and the
 * UI stay small: build the file, read one back, hand it to a download.
 *
 * A backup carries a person's chosen lists, rules and trusted sites, so it is
 * written in a sealed form: the settings are scrambled (never readable as
 * plain text) and stamped with an integrity tag, so a shared file still
 * restores but an edited one is refused.
 */
import { DEFAULT_LISTS } from './blocklists.js'
import { DEFAULT_SCHEDULE, normalizeSchedule } from './schedule.js'

const APP = 'luma'
const VERSION = 1
const SEAL = 'LUMA1'
const KEY = 'luma.backup.v1'

export function buildBackup(state) {
  return {
    app: APP,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    protection: Boolean(state.protection),
    theme: state.theme === 'light' || state.theme === 'dark' ? state.theme : 'system',
    privacy: Boolean(state.privacy),
    lists: { ...DEFAULT_LISTS, ...(state.lists || {}) },
    customRules: [...(state.customRules || [])],
    allowlist: [...(state.allowlist || [])],
    schedule: normalizeSchedule(state.schedule, DEFAULT_SCHEDULE),
  }
}

/** Scramble or unscramble the payload bytes; the same pass works both ways. */
function seal(bytes) {
  const out = new Uint8Array(bytes.length)
  let s = (0x9e3779b9 ^ bytes.length) >>> 0
  for (let i = 0; i < bytes.length; i += 1) {
    s ^= (s << 13) >>> 0
    s >>>= 0
    s ^= s >>> 17
    s ^= (s << 5) >>> 0
    s >>>= 0
    out[i] = bytes[i] ^ (s & 0xff) ^ KEY.charCodeAt(i % KEY.length)
  }
  return out
}

function toBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text) {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

/** Short stamp over the body; any edit to the file changes it. */
function stamp(body) {
  let a = 0x811c9dc5
  let b = 0x27d4eb2f
  const text = `${KEY}|${body}`
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i)
    a = Math.imul(a ^ code, 0x01000193) >>> 0
    b = Math.imul(b ^ code, 0x85ebca6b) >>> 0
  }
  return a.toString(36) + b.toString(36)
}

/** The text written to the file: sealed settings plus their stamp. */
export function encodeBackup(state) {
  const body = toBase64Url(seal(new TextEncoder().encode(JSON.stringify(buildBackup(state)))))
  return `${SEAL}.${body}.${stamp(body)}`
}

function parseBackup(text) {
  const trimmed = String(text || '').trim()
  if (trimmed.startsWith(`${SEAL}.`)) {
    const parts = trimmed.split('.')
    const body = parts[1] || ''
    if (parts.length !== 3 || parts[2] !== stamp(body)) return { altered: true }
    try {
      return { parsed: JSON.parse(new TextDecoder().decode(seal(fromBase64Url(body)))) }
    } catch {
      return { altered: true }
    }
  }
  // Backups exported before the file was sealed were plain JSON.
  try {
    return { parsed: JSON.parse(trimmed) }
  } catch {
    return {}
  }
}

/** Validate a file the person picked; never restore half-understood data. */
export function readBackup(text) {
  const { parsed, altered } = parseBackup(text)
  if (altered) {
    return { ok: false, error: 'That backup has been changed since it was exported, so it was not restored.' }
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
      theme: parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : 'system',
      privacy: parsed.privacy === true,
      lists,
      customRules,
      allowlist,
      schedule: normalizeSchedule(parsed.schedule, DEFAULT_SCHEDULE),
    },
  }
}

export function downloadBackup(state) {
  const file = new Blob([encodeBackup(state)], { type: 'text/plain' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = 'luma-settings.luma'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
