import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Database,
  EyeOff,
  FlaskConical,
  Search,
  ShieldCheck,
  UserX,
  Zap,
} from 'lucide-react'
import { useApp, lastNDays, useTopDomains, useBlockedToday } from '../lib/store'
import { useAuth } from '../lib/auth'
import { formatNumber, formatCompact, formatMegabytes, relativeTime, percent } from '../lib/format'
import { CardHead, PageHead } from '../components/ui'

const ACTIONS = [
  {
    to: '/protection?view=lab',
    icon: FlaskConical,
    title: 'Run the test lab',
    text: 'Watch Luma strip ads from four simulated sites.',
  },
  {
    to: '/protection?view=lists',
    icon: ShieldCheck,
    title: 'Tune your lists',
    text: 'Add filter lists, custom rules and allowlisted sites.',
  },
  {
    to: '/protection?view=inspector',
    icon: Search,
    title: 'Inspect any request',
    text: 'Paste a URL and see exactly which rule decides.',
  },
]

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { state, setProtection } = useApp()
  const { user } = useAuth()
  const firstName = user?.name?.split(/\s+/)[0]
  const blockedToday = useBlockedToday()
  const series = lastNDays(state, 7)
  const domains = useTopDomains(6)

  const week = series.reduce((sum, day) => sum + day.count, 0)
  const max = Math.max(...series.map((day) => day.count), 1)
  const data = formatMegabytes(state.totals.megabytes)
  const topDomainMax = domains.length ? domains[0].count : 1
  const blockedShare = percent(state.totals.blocked, state.totals.screened)

  return (
    <>
      <PageHead
        eyebrow={firstName ? `${greeting()}, ${firstName}` : greeting()}
        title={state.protection ? 'The web, quiet again.' : 'Protection is paused.'}
        lede={
          state.protection
            ? 'Ads, trackers and annoyances are filtered before they ever reach the page.'
            : 'Ads and trackers are loading everywhere while Luma is off. Flip it back on when you are ready.'
        }
      />

      <section className={'card hero-card'}>
        <div className="hero-copy">
          <h2>{state.protection ? 'You are protected.' : 'Nothing is being blocked.'}</h2>
          <p>
            {state.protection
              ? `Luma has blocked ${formatNumber(state.totals.blocked)} ads and trackers so far, and ${formatNumber(blockedToday)} of them today.`
              : 'Turn protection on to resume blocking ads, trackers, cookie walls and noisy widgets.'}
          </p>
        </div>
        <div className="hero-controls">
          <button
            type="button"
            className="switch"
            role="switch"
            aria-checked={state.protection}
            aria-label="Protection"
            data-on={state.protection ? 'true' : 'false'}
            onClick={() => setProtection(!state.protection)}
          />
          <div className="state">
            {state.protection ? 'Protection on' : 'Protection off'}
            <small>{state.protection ? 'All engines running' : 'Tap to resume blocking'}</small>
          </div>
        </div>
      </section>

      <section className="stat-grid">
        <div className="stat">
          <div className="stat-label">
            <EyeOff />
            Ads &amp; trackers blocked
          </div>
          <div className="stat-value">{formatNumber(state.totals.blocked)}</div>
          <div className="stat-foot">+{formatNumber(blockedToday)} today</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <UserX />
            Trackers stopped
          </div>
          <div className="stat-value">{formatNumber(state.totals.trackers)}</div>
          <div className="stat-foot">Pixels, beacons and analytics</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <Database />
            Estimated data saved
          </div>
          <div className="stat-value">
            {data.value}
            <small>{data.unit}</small>
          </div>
          <div className="stat-foot">No creatives downloaded</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <Zap />
            Requests screened
          </div>
          <div className="stat-value">{formatNumber(state.totals.screened)}</div>
          <div className="stat-foot">{blockedShare}% blocked</div>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <CardHead
            title="Blocked this week"
            sub="Requests stopped per day, your local timezone"
          />

          <div className="chart" role="img" aria-label={`Blocked requests for the last 7 days, totaling ${week}`}>
            {series.map((day, index) => (
              <div className="chart-col" key={day.key}>
                <div className="chart-bar-track">
                  <div
                    className={'chart-bar' + (index === series.length - 1 ? ' today' : '')}
                    style={{
                      height: day.count ? Math.max(7, Math.round((day.count / max) * 100)) + '%' : '0%',
                    }}
                    title={`${formatNumber(day.count)} blocked`}
                  />
                </div>
                <span>{day.label}</span>
              </div>
            ))}
          </div>

          <div className="chart-foot">
            <strong>{formatNumber(week)}</strong>
            <span className="small muted">
              blocked in 7 days · {formatNumber(Math.round(week / 7))} per day
            </span>
          </div>
        </div>

        <div className="card">
          <CardHead title="Top blocked domains" sub="Where the noise comes from" />
          <div className="domain-list">
            {domains.map((domain, index) => (
              <div className="domain-row" key={domain.host}>
                <span className="domain-rank">{index + 1}</span>
                <div>
                  <div className="domain-name">{domain.host}</div>
                  <div className="domain-track">
                    <div
                      className="domain-fill"
                      style={{ width: Math.max(4, (domain.count / topDomainMax) * 100) + '%' }}
                    />
                  </div>
                </div>
                <span className="domain-count">{formatCompact(domain.count)}</span>
              </div>
            ))}
            {!domains.length ? (
              <div className="empty">
                No blocked domains yet. They show up here as you browse with protection on.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <CardHead title="Recent activity" sub="The last requests Luma stopped">
            <Link to="/protection?view=lab" className="btn sm ghost">
              Live demo
              <ArrowRight />
            </Link>
          </CardHead>
          <div className="feed">
            {state.activity.slice(0, 6).map((event) => (
              <div className="feed-row" key={event.id}>
                <span className="feed-icon">
                  <EyeOff />
                </span>
                <div className="feed-main">
                  <div className="host">{event.host}</div>
                  <div className="rule">Stopped before it loaded</div>
                </div>
                <div className="feed-side">
                  <time>{relativeTime(event.at)}</time>
                </div>
              </div>
            ))}
            {!state.activity.length ? (
              <div className="empty">Nothing blocked yet. Every request Luma stops shows up here.</div>
            ) : null}
          </div>
        </div>

        <div className="card">
          <CardHead title="Where to next" />
          <div className="stack" style={{ gap: 10 }}>
            {ACTIONS.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.to}
                  to={action.to}
                  className="row"
                  style={{
                    padding: '11px 12px',
                    border: '1px solid var(--line)',
                    borderRadius: 12,
                    background: 'var(--white)',
                  }}
                >
                  <span className="feed-icon">
                    <Icon />
                  </span>
                  <div className="grow">
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{action.title}</div>
                    <div className="small muted">{action.text}</div>
                  </div>
                  <ArrowRight width={15} height={15} />
                </Link>
              )
            })}
          </div>
          <p className="footer-note">
            Your counters stay on this device — nothing about your browsing leaves it.
          </p>
        </div>
      </section>
    </>
  )
}
