import { Fragment, useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  FlaskConical,
  Gauge,
  History,
  ListFilter,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useApp } from '../lib/useApp'
import AccountMenu from './AccountMenu'
import { Switch } from './ui'

const NAV = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: Gauge, end: true }],
  },
  {
    label: 'Protection',
    items: [
      { to: '/protection', label: 'Protection', icon: ShieldCheck },
      { to: '/activity', label: 'Activity', icon: History },
    ],
  },
  {
    label: 'Account',
    items: [{ to: '/account', label: 'Account & settings', icon: UserRound }],
  },
]

// Shortcuts into the tools that live inside Protection.
const TOOLS = [
  { view: 'lab', to: '/protection?view=lab', label: 'Test lab', icon: FlaskConical },
  { view: 'lists', to: '/protection?view=lists', label: 'Filter lists', icon: ListFilter },
  { view: 'inspector', to: '/protection?view=inspector', label: 'URL inspector', icon: Search },
]

const TITLES = {
  '/': 'Overview',
  '/protection': 'Protection',
  '/activity': 'Activity',
  '/account': 'Account',
  '/diagnostics': 'Diagnostics',
  '/owner': 'Owner console',
}

const TOOL_TITLES = {
  lists: 'Protection',
  lab: 'Test lab',
  inspector: 'URL inspector',
}

export default function Layout() {
  const { state, setProtection } = useApp()
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // /protection hosts three tools; the query string says which one is open.
  const view = location.pathname === '/protection' ? new URLSearchParams(location.search).get('view') : ''
  const title = view ? TOOL_TITLES[view] || 'Protection' : TITLES[location.pathname] || 'Overview'

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
          {NAV.map((group, index) => (
            <Fragment key={group.label}>
              <div className="nav-label" style={{ marginTop: index ? 14 : 0 }}>
                {group.label}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      'nav-link' +
                      // A tool view inside Protection highlights that tool instead.
                      (isActive && !(item.to === '/protection' && view) ? ' active' : '')
                    }
                  >
                    <Icon />
                    {item.label}
                  </NavLink>
                )
              })}
            </Fragment>
          ))}

          <div className="nav-label" style={{ marginTop: 14 }}>
            Tools
          </div>
          {TOOLS.map((tool) => {
            const Icon = tool.icon
            return (
              <Link
                key={tool.to}
                to={tool.to}
                className={'nav-link' + ((view || 'lists') === tool.view ? ' active' : '')}
              >
                <Icon />
                {tool.label}
              </Link>
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
