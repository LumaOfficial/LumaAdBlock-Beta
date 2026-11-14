import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  FlaskConical,
  Gauge,
  ListFilter,
  Search,
} from 'lucide-react'
import { useApp } from '../lib/store'
import AccountMenu from './AccountMenu'
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
  '/diagnostics': 'Diagnostics',
}

export default function Layout() {
  const { state, setProtection } = useApp()
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
              Ads, trackers and annoyances
              <br />
              filtered before they load
            </p>
          </div>
          <div className="side-links">
            <span>Luma 0.1 beta</span>
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
            <AccountMenu />
          </div>
        </header>

        <main className="page">
          <div className="beta-note">
            <span className="badge accent">Beta</span>
            <span>
              This is the Luma beta. Diagnostics are monitored continuously so blocking problems get
              found and fixed quickly.
            </span>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function StatusDot({ on }) {
  return <span className={on ? 'dot' : 'dot off'} aria-hidden="true" />
}
