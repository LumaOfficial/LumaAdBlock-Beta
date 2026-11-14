import { Fragment, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  FlaskConical,
  Gauge,
  History,
  ShieldCheck,
  UserRound,
  Wrench,
} from 'lucide-react'
import { useApp } from '../lib/useApp'
import AccountMenu from './AccountMenu'
import { toolById } from './tools/registry'
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
]

// Ways to look at protection working — kept out of the protection settings.
// The URL inspector lives inside All tools, next to the rest of them.
const TOOLS = [
  { to: '/tools', label: 'All tools', icon: Wrench, end: true },
  { to: '/tools/experiments', label: 'Experiments', icon: FlaskConical },
  { to: '/account', label: 'Account & settings', icon: UserRound },
]

const TITLES = {
  '/': 'Overview',
  '/protection': 'Protection',
  '/activity': 'Activity',
  '/account': 'Account & settings',
  '/tools': 'Tools',
  '/diagnostics': 'Diagnostics',
  '/owner': 'Owner console',
}

export default function Layout() {
  const { state, setProtection, setPrivacy, protectionNow } = useApp()
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Tool pages name themselves: /tools/<id> takes the tool's label.
  const toolId = location.pathname.startsWith('/tools/') ? location.pathname.slice('/tools/'.length) : ''
  const title = TITLES[location.pathname] || (toolId ? toolById(toolId)?.label : '') || 'Overview'

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
                  <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
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
            // Any other tool page keeps "All tools" lit; the shortcuts light themselves.
            const active =
              tool.to === '/tools'
                ? location.pathname.startsWith('/tools') &&
                  !TOOLS.some((other) => other.to !== '/tools' && other.to === location.pathname)
                : location.pathname === tool.to
            return (
              <NavLink
                key={tool.to}
                to={tool.to}
                end={tool.end}
                className={'nav-link' + (active ? ' active' : '')}
              >
                <Icon />
                {tool.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="side-status">
            <div className="status-line">
              <span className={protectionNow ? 'dot' : 'dot off'} />
              {state.privacy ? 'Privacy mode' : protectionNow ? 'Protected' : 'Paused'}
            </div>
            <p>
              {state.privacy ? (
                <>
                  Blocking is off. Diagnostics
                  <br />
                  continue, without your details
                </>
              ) : (
                <>
                  Ads, trackers and annoyances
                  <br />
                  filtered before they load
                </>
              )}
            </p>
          </div>
          <div className="side-links">
            <span>Luma v1.0.3</span>
            <span>·</span>
            <span>Local data</span>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="topbar-title">{title}</span>
          <div className="topbar-right">
            <span className={'badge ' + (state.privacy ? 'warn' : state.protection ? 'good' : 'plain')}>
              {state.privacy ? 'Private' : state.protection ? 'On' : 'Paused'}
            </span>
            <div className="quick-toggle">
              <span>
                {state.privacy ? 'Privacy mode' : state.protection ? 'Protection on' : 'Protection off'}
              </span>
              <Switch
                on={state.privacy ? false : state.protection}
                onChange={(next) => (state.privacy ? setPrivacy(false) : setProtection(next))}
                label="Toggle protection"
              />
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
