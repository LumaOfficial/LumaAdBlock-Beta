import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import { compileRules } from './engine'
import { DEFAULT_LISTS, FILTER_LISTS } from './blocklists'

const STORAGE_KEY = 'luma.state.v2'

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
  if (typeof window === 'undefined') return fallback
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
    case 'record': {
      const { events = [], screened = 0 } = action
      const daily = { ...state.daily }
      const key = dayKey()
      daily[key] = (daily[key] || 0) + events.length
      const domains = { ...state.domains }
      let trackers = 0
      let megabytes = state.totals.megabytes
      for (const event of events) {
        if (event.host) domains[event.host] = (domains[event.host] || 0) + 1
        if (event.listId === 'tracker-shield') trackers += 1
        megabytes += 0.04
      }
      return {
        ...state,
        daily,
        domains,
        runs: state.runs + 1,
        totals: {
          blocked: state.totals.blocked + events.length,
          trackers: state.totals.trackers + trackers,
          screened: state.totals.screened + screened,
          megabytes: Math.round(megabytes * 10) / 10,
        },
        activity: [...events, ...state.activity].slice(0, 40),
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

  useEffect(() => {
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
      recordBlocked: (events, screened) => dispatch({ type: 'record', events, screened }),
      resetData: () => dispatch({ type: 'reset' }),
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
