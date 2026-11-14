import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  FlaskConical,
  Gauge,
  ListFilter,
  Search,
} from 'lucide-react'
import { useApp } from '../lib/store'
import { Switch } from './ui'

const NAV = [
  { to: '/', label: 'Dashboard', icon: Gauge, end: true },
  { to: '/lists', label: 'Filter lists', icon: ListFilter },
  { to: '/lab', label: 'Test lab', icon: FlaskConical },
  { to: '/inspector', label: 'URL inspector', icon: Search },
]

const TITLES = {
  '/': 'Overview',
  '/lists': 'Filter lists',
  '/lab': 'Test lab',
  '/inspector': 'URL inspector',
}

export default function Layout() {
  const { state, setProtection, activeListCount, networkRuleCount } = useApp()
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const title = TITLES[location.pathname] || 'Overview'

  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand" aria-label="Luma home">
          <span className="brand-mark" />
          <span className="brand-name">
            Luma
            <span>Ad blocker</span>
          </span>
        </NavLink>

        <nav className="nav" aria-label="Sections">
          <div className="nav-label">Protection</div>
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
              >
                <Icon />
                {item.label}
                {item.to === '/lists' ? <span className="nav-count">{activeListCount}</span> : null}
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="side-status">
            <div className="status-line">
              <span className={state.protection ? 'dot' : 'dot off'} />
              {state.protection ? 'Protected' : 'Paused'}
            </div>
            <p>
              {activeListCount} lists active
              <br />
              {networkRuleCount} network rules
            </p>
          </div>
          <div className="side-links">
            <span>Luma 0.1</span>
            <span>·</span>
            <span>Local data</span>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="topbar-title">{title}</span>
          <div className="topbar-right">
            <span className={'badge ' + (state.protection ? 'good' : 'plain')}>
              {state.protection ? 'On' : 'Paused'}
            </span>
            <div className="quick-toggle">
              <span>{state.protection ? 'Protection on' : 'Protection off'}</span>
              <Switch on={state.protection} onChange={setProtection} label="Toggle protection" />
            </div>
          </div>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function ListBadge({ listId }) {
  const names = {
    'luma-core': 'Luma Core',
    'tracker-shield': 'Tracker Shield',
    'annoyance-cleaner': 'Annoyance Cleaner',
    'social-widgets': 'Social Widgets',
    custom: 'Custom rule',
  }
  return <span className={'badge ' + (listId === 'custom' ? 'accent' : 'plain')}>{names[listId] || listId}</span>
}

export function StatusDot({ on }) {
  return <span className={on ? 'dot' : 'dot off'} aria-hidden="true" />
}
