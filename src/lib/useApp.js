import { useContext, useMemo } from 'react'
import { AppContext } from './appContext'
import { dayKey } from './dates'

/** Reads the protection settings shared by the dashboard. */
export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
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
