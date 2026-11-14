import { useEffect, useState } from 'react'
import { ArrowUpRight, History, LayoutGrid } from 'lucide-react'
import { Switch } from '../components/ui'
import { isExtension, readPageBlocks } from '../lib/platform'
import { useApp, useBlockedToday } from '../lib/useApp'

/** Opens the full dashboard in a tab, whichever build is running. */
function openPage(route) {
  const base = window.location.href.split('#')[0]
  window.open(base + '#' + route, '_blank', 'noopener')
}

const SHORTCUTS = [
  { route: '/activity', label: 'Activity', sub: 'What Luma stopped', icon: History },
  { route: '/tools', label: 'All tools', sub: 'Checks, lists and tidy-up', icon: LayoutGrid },
]

/**
 * The compact panel a browser shows when the toolbar icon is clicked — small
 * enough for a Chromium/Opera side panel, so the app is never opened wide
 * just to flip protection.
 */
export default function Panel() {
  const { state, protectionNow, setProtection, setPrivacy } = useApp()
  const blockedToday = useBlockedToday()
  const [pageBlocks, setPageBlocks] = useState(0)

  useEffect(() => {
    document.documentElement.classList.add('is-panel')
    return () => document.documentElement.classList.remove('is-panel')
  }, [])

  // The packaged extension cannot read the per-request feed; the browser's own
  // per-tab count is the live number it can show.
  useEffect(() => {
    if (!isExtension) return undefined
    let alive = true
    readPageBlocks().then((count) => alive && setPageBlocks(count))
    return () => {
      alive = false
    }
  }, [])

  return (
    <main className="panel">
      <header className="panel-head">
        <span className="brand-mark" />
        <span className="brand-name">
          Luma
          <span>Ad blocker</span>
        </span>
      </header>

      <div className="panel-stat">
        <span className="eyebrow">{isExtension ? 'Stopped on this page' : 'Stopped today'}</span>
        <strong>{(isExtension ? pageBlocks : blockedToday).toLocaleString()}</strong>
        <span className="small muted">ads, trackers and annoyances</span>
      </div>

      <div className="panel-row">
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>
            {state.privacy ? 'Privacy mode' : protectionNow ? 'Protection on' : 'Protection off'}
          </div>
          <div className="small muted">
            {state.privacy
              ? 'Blocking is off, diagnostics are anonymised'
              : protectionNow
                ? 'Filtering before anything loads'
                : 'Nothing is being filtered'}
          </div>
        </div>
        <Switch
          on={state.privacy ? false : state.protection}
          onChange={(next) => (state.privacy ? setPrivacy(false) : setProtection(next))}
          label="Toggle protection"
        />
      </div>

      <div className="panel-links">
        {SHORTCUTS.map((item) => {
          const Icon = item.icon
          return (
            <button key={item.route} type="button" className="panel-link" onClick={() => openPage(item.route)}>
              <span className="feed-icon">
                <Icon />
              </span>
              <span className="grow" style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>{item.label}</span>
                <span className="small muted">{item.sub}</span>
              </span>
              <ArrowUpRight width={15} height={15} />
            </button>
          )
        })}
      </div>

      <button type="button" className="btn sm ghost" onClick={() => openPage('/')}>
        Open Luma
      </button>

      <p className="footer-note">Luma v1.0.3 · Runs on this device</p>
    </main>
  )
}
