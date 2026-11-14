import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EyeOff, FlaskConical, ShieldCheck, UserX, Zap } from 'lucide-react'
import { CardHead, PageHead } from '../components/ui'
import { useApp, useBlockedToday } from '../lib/useApp'
import { formatNumber, percent, relativeTime } from '../lib/format'

/**
 * One log out of two sources: the blocks the extension reported, plus the
 * requests the engine screened here (the test lab records those), newest first.
 */
function logRows(state) {
  const rows = []
  const seen = new Set()
  for (const event of state.activity) {
    if (!event?.host || seen.has(event.id)) continue
    seen.add(event.id)
    rows.push({ id: event.id, host: event.host, at: event.at, blocked: true })
  }
  for (const item of state.observations) {
    if (!item?.host || seen.has(item.id)) continue
    seen.add(item.id)
    rows.push({ id: item.id, host: item.host, at: item.at, blocked: Boolean(item.blocked) })
  }
  return rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 200)
}

export default function Activity() {
  const { state } = useApp()
  const blockedToday = useBlockedToday()
  const [query, setQuery] = useState('')
  const rows = useMemo(() => logRows(state), [state])
  const needle = query.trim().toLowerCase()
  const visible = needle ? rows.filter((row) => row.host.toLowerCase().includes(needle)) : rows
  const blockedShare = percent(state.totals.blocked, state.totals.screened)

  return (
    <>
      <PageHead
        eyebrow="Activity"
        title="Every request Luma saw."
        lede="A running log of what the engine screened on this device, newest first."
      >
        <span className="badge plain">
          <EyeOff />
          {formatNumber(rows.length)} logged
        </span>
      </PageHead>

      <section className="stat-grid">
        <div className="stat">
          <div className="stat-label">
            <EyeOff />
            Stopped today
          </div>
          <div className="stat-value">{formatNumber(blockedToday)}</div>
          <div className="stat-foot">Since midnight</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <ShieldCheck />
            Stopped all time
          </div>
          <div className="stat-value">{formatNumber(state.totals.blocked)}</div>
          <div className="stat-foot">Across every site</div>
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
            <Zap />
            Requests screened
          </div>
          <div className="stat-value">{formatNumber(state.totals.screened)}</div>
          <div className="stat-foot">{blockedShare}% blocked</div>
        </div>
      </section>

      <section className="card">
        <CardHead title="Request log" sub="The last 200 entries, newest first" />

        <div className="inline-form" style={{ marginBottom: 4 }}>
          <div className="field">
            <label htmlFor="activity-filter">Filter by site</label>
            <input
              id="activity-filter"
              className="input"
              value={query}
              placeholder="news.example"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="feed">
          {visible.map((row) => (
            <div className="feed-row" key={row.id}>
              <span className="feed-icon">{row.blocked ? <EyeOff /> : <ShieldCheck />}</span>
              <div className="feed-main">
                <div className="host">{row.host}</div>
                <div className="rule">{row.blocked ? 'Stopped before it loaded' : 'Allowed to load'}</div>
              </div>
              <div className="feed-side">
                <time>{relativeTime(row.at)}</time>
              </div>
            </div>
          ))}
          {!visible.length ? (
            <div className="empty">
              {needle
                ? 'No request from a site matching that filter.'
                : 'Nothing logged yet. Run the test lab to watch the engine work, or install the extension for live activity.'}
            </div>
          ) : null}
        </div>

        {!needle && !rows.length ? (
          <div className="row" style={{ marginTop: 14 }}>
            <Link to="/tools/lab" className="btn sm">
              <FlaskConical />
              Run the test lab
            </Link>
          </div>
        ) : null}
      </section>

      <p className="footer-note">This log never leaves your device.</p>
    </>
  )
}
