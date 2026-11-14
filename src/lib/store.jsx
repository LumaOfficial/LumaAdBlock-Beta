import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react'
import { compileRules } from './engine'
import { DEFAULT_LISTS, FILTER_LISTS } from './blocklists'
import {
  buildPayload,
  isExtension,
  postSettings,
  readSettings,
  readStats,
  resetStats,
  subscribeStats,
} from './platform'

// v3: counters now come from the extension instead of the old demo recorder.
const STORAGE_KEY = 'luma.state.v3'

export function dayKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function emptyState() {
  return {
    protection: true,
    lists: { ...DEFAULT_LISTS },
    customRules: [],
    allowlist: [],
    totals: { blocked: 0, trackers: 0, screened: 0, megabytes: 0 },
    domains: {},
    daily: {},
    activity: [],
    runs: 0,
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
      }
    }
    case 'reset':
      return emptyState()
    default:
      return state
  }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  const [hydrated, setHydrated] = useState(!isExtension)

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
    return compiled
  }, [state.lists, state.customRules])

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

  // Settings the browser has to enforce; posted only when they actually change.
  const settingsPayload = useMemo(
    () => (isExtension ? buildPayload(state) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.protection, state.lists, state.customRules, state.allowlist],
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
      resetData: () => {
        resetStats()
        dispatch({ type: 'reset' })
      },
    }),
    [state, rules, networkRuleCount, cosmeticRuleCount, activeListCount],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}

export function lastNDays(state, n = 7) {
  const series = []
  for (let offset = n - 1; offset >= 0; offset -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - offset)
    const key = dayKey(date)
    series.push({
      key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      count: state.daily[key] || 0,
    })
  }
  return series
}

export function useTopDomains(limit = 6) {
  const { state } = useApp()
  return useMemo(
    () =>
      Object.entries(state.domains)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([host, count]) => ({ host, count })),
    [state.domains, limit],
  )
}

export function useBlockedToday() {
  const { state } = useApp()
  return state.daily[dayKey()] || 0
}
