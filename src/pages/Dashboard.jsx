import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Clock,
  Database,
  EyeOff,
  FlaskConical,
  Search,
  ShieldCheck,
  UserX,
  Zap,
} from 'lucide-react'
import { useApp, useBlockedToday } from '../lib/store'
import { useAuth } from '../lib/auth'
import { formatNumber, formatMegabytes, relativeTime, percent } from '../lib/format'
import { clockLabel } from '../lib/schedule'
import { CardHead, PageHead } from '../components/ui'
import TrendChart from '../components/dashboard/TrendChart'
import BreakdownCard from '../components/dashboard/BreakdownCard'
import SiteControls from '../components/dashboard/SiteControls'
import ScheduleCard from '../components/dashboard/ScheduleCard'
import BackupCard from '../components/dashboard/BackupCard'

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
  const { state, setProtection, protectionNow, pausedBySchedule } = useApp()
  const { user } = useAuth()
  const firstName = user?.name?.split(/\s+/)[0]
  const blockedToday = useBlockedToday()
  const data = formatMegabytes(state.totals.megabytes)
  const blockedShare = percent(state.totals.blocked, state.totals.screened)

  const title = pausedBySchedule
    ? 'Quiet hours are on.'
    : protectionNow
      ? 'The web, quiet again.'
      : 'Protection is paused.'
  const lede = pausedBySchedule
    ? `Luma is taking a break until ${clockLabel(state.schedule.to)}. Everything resumes on its own.`
    : protectionNow
      ? 'Ads, trackers and annoyances are filtered before they ever reach the page.'
      : 'Ads and trackers are loading everywhere while Luma is off. Flip it back on when you are ready.'

  return (
    <>
      <PageHead eyebrow={firstName ? `${greeting()}, ${firstName}` : greeting()} title={title} lede={lede} />

      <section className="card hero-card">
        <div className="hero-copy">
          <h2>{protectionNow ? 'You are protected.' : 'Nothing is being blocked.'}</h2>
          <p>
            {protectionNow
              ? `Luma has blocked ${formatNumber(state.totals.blocked)} ads and trackers so far, and ${formatNumber(blockedToday)} of them today.`
              : pausedBySchedule
                ? `Your quiet hours pause ends at ${clockLabel(state.schedule.to)}.`
                : 'Turn protection on to resume blocking ads, trackers, cookie walls and noisy widgets.'}
          </p>
          {pausedBySchedule ? (
            <span className="badge warn hero-badge">
              <Clock width={12} height={12} />
              Quiet hours until {clockLabel(state.schedule.to)}
            </span>
          ) : null}
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
            <small>
              {pausedBySchedule
                ? 'Quiet hours, resumes on its own'
                : state.protection
                  ? 'All engines running'
                  : 'Tap to resume blocking'}
            </small>
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
        <TrendChart />
        <BreakdownCard />
      </section>

      <section className="grid-2">
        <SiteControls />

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
      </section>

      <section className="grid-2">
        <ScheduleCard />
        <BackupCard />
      </section>

      <section className="grid-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.to} to={action.to} className="card action-tile">
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
      </section>

      <p className="footer-note">
        Your counters stay on this device — nothing about your browsing leaves it.
      </p>
    </>
  )
}
