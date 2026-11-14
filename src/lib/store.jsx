import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { api } from './api'
import { useAuth } from './useAuth'
import { compileRules, hostnameOf } from './engine'
import { MAX_LEARNED, MAX_OBSERVATIONS, learnCandidate, runHealthChecks } from './learning'
import { DEFAULT_LISTS, FILTER_LISTS } from './blocklists'
import { DEFAULT_SCHEDULE, isQuietNow, normalizeSchedule } from './schedule'
import {
  buildPayload,
  isExtension,
  postSettings,
  readSettings,
  readStats,
  resetStats,
  subscribeStats,
} from './platform'
import { AppContext } from './appContext'

// v3: counters now come from the extension instead of the old demo recorder.
const STORAGE_KEY = 'luma.state.v3'

function emptyState() {
  return {
    protection: true,
    lists: { ...DEFAULT_LISTS },
    customRules: [],
    allowlist: [],
    schedule: { ...DEFAULT_SCHEDULE },
    totals: { blocked: 0, trackers: 0, screened: 0, megabytes: 0 },
    domains: {},
    daily: {},
    activity: [],
    runs: 0,
    learned: [],
    learningSince: 0,
    observations: [],
    scans: 0,
    lastScan: null,
    health: null,
  }
}

function loadState() {
  const fallback = emptyState()
  // Inside the extension the service worker holds the authoritative settings
  // (chrome.storage); they arrive a moment later through the hydrate action.
  if (isExtension || typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return {
      ...fallback,
      ...parsed,
      lists: { ...DEFAULT_LISTS, ...(parsed.lists || {}) },
      schedule: normalizeSchedule(parsed.schedule, DEFAULT_SCHEDULE),
      totals: { ...fallback.totals, ...(parsed.totals || {}) },
    }
  } catch {
    return fallback
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'protection':
      return { ...state, protection: action.value }
    case 'toggleList':
      return {
        ...state,
        lists: { ...state.lists, [action.id]: !state.lists[action.id] },
      }
    case 'addRule':
      return { ...state, customRules: [action.rule, ...state.customRules] }
    case 'removeRule':
      return {
        ...state,
        customRules: state.customRules.filter((rule) => rule !== action.rule),
      }
    case 'addAllow':
      return { ...state, allowlist: [action.host, ...state.allowlist] }
    case 'removeAllow':
      return { ...state, allowlist: state.allowlist.filter((host) => host !== action.host) }
    case 'schedule':
      return { ...state, schedule: normalizeSchedule(action.schedule, state.schedule) }
    case 'restore': {
      // A backup file replaces the settings; counters stay on this device.
      const settings = action.settings || {}
      return {
        ...state,
        protection: typeof settings.protection === 'boolean' ? settings.protection : state.protection,
        lists: { ...DEFAULT_LISTS, ...(settings.lists || {}) },
        customRules: Array.isArray(settings.customRules) ? settings.customRules : state.customRules,
        allowlist: Array.isArray(settings.allowlist) ? settings.allowlist : state.allowlist,
        schedule: normalizeSchedule(settings.schedule, state.schedule),
      }
    }
    case 'stats': {
      // Live counters reported by the extension's service worker.
      const stats = action.stats || {}
      return {
        ...state,
        totals: { ...state.totals, ...(stats.totals || {}) },
        domains: stats.domains || {},
        daily: stats.daily || {},
        activity: stats.activity || [],
        runs: stats.runs || 0,
      }
    }
    case 'hydrate': {
      const settings = action.settings || {}
      return {
        ...state,
        protection: settings.protection ?? state.protection,
        lists: { ...DEFAULT_LISTS, ...(settings.lists || {}) },
        customRules: settings.customRules || [],
        allowlist: settings.allowlist || [],
        schedule: normalizeSchedule(settings.schedule, state.schedule),
        learned: settings.learned || [],
      }
    }
    case 'syncIn': {
      // Settings pulled from the account; device-learned rules stay as they are.
      const settings = action.settings || {}
      return {
        ...state,
        protection: settings.protection ?? state.protection,
        lists: { ...DEFAULT_LISTS, ...(settings.lists || {}) },
        customRules: settings.customRules || [],
        allowlist: settings.allowlist || [],
        schedule: normalizeSchedule(settings.schedule, state.schedule),
      }
    }
    case 'observe': {
      const known = new Set(state.observations.map((item) => item.key))
      const fresh = []
      for (const item of action.items || []) {
        if (!item || !item.url) continue
        const key = [item.pageHost || '', item.url, item.blocked ? 'blocked' : 'allowed'].join('|')
        if (known.has(key)) continue
        known.add(key)
        fresh.push({
          ...item,
          id: key,
          key,
          host: hostnameOf(item.url),
          at: new Date().toISOString(),
        })
      }
      if (!fresh.length) return state
      return { ...state, observations: [...fresh, ...state.observations].slice(0, MAX_OBSERVATIONS) }
    }
    case 'learn': {
      const known = new Set(state.learned.map((item) => item.rule))
      const fresh = []
      for (const item of action.items || []) {
        if (known.has(item.rule)) continue
        known.add(item.rule)
        fresh.push(item)
      }
      if (!fresh.length) return state
      return { ...state, learned: [...fresh, ...state.learned].slice(0, MAX_LEARNED) }
    }
    case 'forgetLearned':
      // Older observations must not re-learn what was just reset.
      return { ...state, learned: [], learningSince: Date.now() }
    case 'scan':
      return { ...state, scans: state.scans + 1, lastScan: action.at, health: action.health }
    case 'reset':
      return emptyState()
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  const [hydrated, setHydrated] = useState(!isExtension)
  const { user } = useAuth()
  const userId = user?.id
  const [accountSynced, setAccountSynced] = useState(false)

  // Account sync: pull the account's settings on sign-in, then keep them current.
  useEffect(() => {
    setAccountSynced(false)
    if (!userId) return undefined
    let alive = true
    api('/api/settings')
      .then((data) => {
        if (!alive) return
        if (data.settings) dispatch({ type: 'syncIn', settings: data.settings })
        setAccountSynced(true)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [userId])

  // The latest settings ride in a ref so a save can be flushed the moment the
  // tab is hidden or the person signs out, instead of being lost with the timer.
  const settingsSnapshot = useMemo(
    () => ({
      protection: state.protection,
      lists: state.lists,
      customRules: state.customRules,
      allowlist: state.allowlist,
      schedule: state.schedule,
    }),
    [state.protection, state.lists, state.customRules, state.allowlist, state.schedule],
  )
  const syncRef = useRef({ userId: null, ready: false, settings: null })
  syncRef.current = { userId: userId || null, ready: accountSynced, settings: settingsSnapshot }
  const saveTimer = useRef(0)

  const pushSettings = useCallback(() => {
    const current = syncRef.current
    if (!current.userId || !current.ready || !current.settings) return
    api('/api/settings', { method: 'PUT', body: { settings: current.settings } }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!userId || !accountSynced) return undefined
    const timer = window.setTimeout(pushSettings, 1200)
    saveTimer.current = timer
    return () => {
      window.clearTimeout(timer)
      if (saveTimer.current === timer) saveTimer.current = 0
    }
  }, [userId, accountSynced, settingsSnapshot, pushSettings])

  useEffect(() => {
    const flush = () => {
      if (!saveTimer.current) return
      window.clearTimeout(saveTimer.current)
      saveTimer.current = 0
      pushSettings()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener('luma:before-signout', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('luma:before-signout', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [pushSettings])

  useEffect(() => {
    if (isExtension) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage can be unavailable in private windows */
    }
  }, [state])

  const rules = useMemo(() => {
    const compiled = []
    for (const list of FILTER_LISTS) {
      if (!state.lists[list.id]) continue
      compiled.push(...compileRules(list.rules, list.id))
    }
    const custom = state.customRules.map((rule) => rule.trim()).filter(Boolean)
    compiled.push(...compileRules(custom, 'custom'))
    const learned = state.learned.map((item) => item.rule)
    compiled.push(...compileRules(learned, 'learned'))
    return compiled
  }, [state.lists, state.customRules, state.learned])

  const networkRuleCount = useMemo(
    () => rules.filter((rule) => rule.kind === 'network').length,
    [rules],
  )

  const cosmeticRuleCount = useMemo(
    () => rules.filter((rule) => rule.kind === 'cosmetic').length,
    [rules],
  )

  const activeListCount = useMemo(
    () => Object.values(state.lists).filter(Boolean).length,
    [state.lists],
  )

  // Quiet hours pause protection without touching the person's own switch.
  // The window moves with the clock, so it is re-evaluated once a minute.
  const [clockTick, setClockTick] = useState(0)
  useEffect(() => {
    if (!state.schedule.enabled) return undefined
    const id = window.setInterval(() => setClockTick((tick) => tick + 1), 60000)
    return () => window.clearInterval(id)
  }, [state.schedule.enabled])

  const pausedBySchedule = useMemo(
    () => state.protection && isQuietNow(state.schedule),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.protection, state.schedule, clockTick],
  )
  const protectionNow = state.protection && !pausedBySchedule

  // Settings the browser has to enforce; posted only when they actually change.
  const settingsPayload = useMemo(
    () => (isExtension ? buildPayload(state, protectionNow) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      state.protection,
      state.lists,
      state.customRules,
      state.allowlist,
      state.schedule,
      state.learned,
      protectionNow,
    ],
  )

  useEffect(() => {
    if (hydrated && settingsPayload) postSettings(settingsPayload)
  }, [hydrated, settingsPayload])

  useEffect(() => {
    if (!isExtension) return undefined
    let alive = true
    readSettings().then((settings) => {
      if (!alive) return
      if (settings) dispatch({ type: 'hydrate', settings })
      setHydrated(true)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!isExtension) return undefined
    let alive = true
    readStats().then((stats) => {
      if (alive && stats) dispatch({ type: 'stats', stats })
    })
    const unsubscribe = subscribeStats((stats) => dispatch({ type: 'stats', stats }))
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  const observe = useCallback((items) => {
    if (!items || !items.length) return
    dispatch({ type: 'observe', items })
  }, [])

  // Self-improvement: anything ad-like that slipped through becomes a rule.
  useEffect(() => {
    const known = new Set(state.learned.map((item) => item.rule))
    const added = []
    for (const observation of state.observations) {
      if (Date.parse(observation.at) < state.learningSince) continue
      const candidate = learnCandidate(observation, {
        rules,
        allowlist: state.allowlist,
        protection: protectionNow,
      })
      if (candidate && !known.has(candidate.rule)) {
        known.add(candidate.rule)
        added.push(candidate)
      }
    }
    if (added.length) dispatch({ type: 'learn', items: added })
  }, [
    state.observations,
    state.learned,
    state.learningSince,
    state.allowlist,
    protectionNow,
    rules,
  ])

  // Continuous diagnostics: the engine re-checks itself on a short interval.
  const scan = useRef(() => {})
  scan.current = () => {
    dispatch({ type: 'scan', at: Date.now(), health: runHealthChecks({ state, rules }) })
  }
  useEffect(() => {
    scan.current()
    const id = window.setInterval(() => scan.current(), 10000)
    return () => window.clearInterval(id)
  }, [])

  const value = useMemo(
    () => ({
      state,
      rules,
      networkRuleCount,
      cosmeticRuleCount,
      activeListCount,
      setProtection: (value) => dispatch({ type: 'protection', value }),
      toggleList: (id) => dispatch({ type: 'toggleList', id }),
      addCustomRule: (rule) => dispatch({ type: 'addRule', rule }),
      removeCustomRule: (rule) => dispatch({ type: 'removeRule', rule }),
      addAllow: (host) => dispatch({ type: 'addAllow', host }),
      removeAllow: (host) => dispatch({ type: 'removeAllow', host }),
      protectionNow,
      pausedBySchedule,
      setSchedule: (schedule) => dispatch({ type: 'schedule', schedule }),
      importSettings: (settings) => dispatch({ type: 'restore', settings }),
      observe,
      clearLearned: () => dispatch({ type: 'forgetLearned' }),
      resetData: () => {
        resetStats()
        dispatch({ type: 'reset' })
      },
    }),
    [
      state,
      rules,
      networkRuleCount,
      cosmeticRuleCount,
      activeListCount,
      protectionNow,
      pausedBySchedule,
      observe,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

